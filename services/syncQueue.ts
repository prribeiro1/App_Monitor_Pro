import { supabase } from './auth';

// Tipos de operação que podem ser enfileiradas
export interface PendingOperation {
    id: string;
    type: 'save' | 'delete';
    entity: 'route' | 'stop' | 'student' | 'attendance' | 'payment' | 'incident' | 'maintenance_item' | 'maintenance_log' | 'user_settings' | 'reminder';
    data: any;
    timestamp: number;
    retryCount: number;
}

// Estado de sincronização
export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'offline' | 'error';

// Store name no IndexedDB
const QUEUE_STORE = 'sync_queue';

// Listeners para mudanças de status
type SyncStatusListener = (status: SyncStatus, pendingCount: number) => void;
const listeners: SyncStatusListener[] = [];

// Estado atual
let currentStatus: SyncStatus = 'synced';
let pendingCount = 0;
let isOnline = navigator.onLine;

// Listeners para estado de conexão
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        isOnline = true;
        console.log('📶 Conexão restaurada! Tentando sincronizar...');
        syncQueue.processQueue();
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        console.log('📴 Dispositivo offline');
        updateStatus('offline');
    });
}

// Atualiza status e notifica listeners
const updateStatus = (status: SyncStatus, count?: number) => {
    currentStatus = status;
    if (count !== undefined) pendingCount = count;
    listeners.forEach(listener => listener(currentStatus, pendingCount));
};

// Abre o IndexedDB e cria o store de fila se não existir
const openQueueDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SyncQueueDB', 1);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(QUEUE_STORE)) {
                db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const syncQueue = {
    /**
     * Adiciona uma operação à fila
     */
    enqueue: async (operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> => {
        const db = await openQueueDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(QUEUE_STORE, 'readwrite');
            const store = tx.objectStore(QUEUE_STORE);

            const fullOperation: PendingOperation = {
                ...operation,
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                retryCount: 0
            };

            store.put(fullOperation);
            tx.oncomplete = async () => {
                const count = await syncQueue.getPendingCount();
                updateStatus('pending', count);
                resolve();
            };
            tx.onerror = () => reject(tx.error);
        });
    },

    /**
     * Remove uma operação da fila
     */
    dequeue: async (id: string): Promise<void> => {
        const db = await openQueueDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(QUEUE_STORE, 'readwrite');
            const store = tx.objectStore(QUEUE_STORE);
            store.delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    /**
     * Retorna todas as operações pendentes
     */
    getAll: async (): Promise<PendingOperation[]> => {
        const db = await openQueueDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(QUEUE_STORE, 'readonly');
            const store = tx.objectStore(QUEUE_STORE);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Retorna contagem de operações pendentes
     */
    getPendingCount: async (): Promise<number> => {
        const operations = await syncQueue.getAll();
        return operations.length;
    },

    /**
     * Processa a fila de operações pendentes
     */
    processQueue: async (): Promise<void> => {
        if (!isOnline) {
            updateStatus('offline');
            return;
        }

        const operations = await syncQueue.getAll();
        if (operations.length === 0) {
            updateStatus('synced', 0);
            return;
        }

        updateStatus('syncing', operations.length);

        // Ordenar por timestamp (mais antigos primeiro)
        operations.sort((a, b) => a.timestamp - b.timestamp);

        let successCount = 0;
        let errorCount = 0;

        for (const op of operations) {
            try {
                await syncQueue.executeOperation(op);
                await syncQueue.dequeue(op.id);
                successCount++;
            } catch (error) {
                console.error(`❌ Erro ao processar operação ${op.id}:`, error);
                errorCount++;

                // Incrementa retry count
                op.retryCount++;

                // Se falhou mais de 5 vezes, remove da fila
                if (op.retryCount >= 5) {
                    console.warn(`⚠️ Operação ${op.id} falhou 5 vezes. Removendo da fila.`);
                    await syncQueue.dequeue(op.id);
                } else {
                    // Atualiza o retry count na fila
                    const db = await openQueueDB();
                    const tx = db.transaction(QUEUE_STORE, 'readwrite');
                    tx.objectStore(QUEUE_STORE).put(op);
                }
            }
        }

        const remaining = await syncQueue.getPendingCount();
        if (remaining > 0) {
            updateStatus('pending', remaining);
        } else if (errorCount > 0) {
            updateStatus('error', 0);
        } else {
            updateStatus('synced', 0);
        }

        console.log(`✅ Sync concluído: ${successCount} sucesso, ${errorCount} erros, ${remaining} pendentes`);
    },

    /**
     * Executa uma operação específica
     */
    executeOperation: async (op: PendingOperation): Promise<void> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const entityMap: Record<string, string> = {
            'route': 'routes',
            'stop': 'stops',
            'student': 'students',
            'attendance': 'attendance',
            'payment': 'payments',
            'incident': 'incidents',
            'maintenance_item': 'maintenance_items',
            'maintenance_log': 'maintenance_logs',
            'user_settings': 'user_settings',
            'reminder': 'reminders'
        };

        const tableName = entityMap[op.entity];
        if (!tableName) throw new Error(`Entidade desconhecida: ${op.entity}`);

        if (op.type === 'delete') {
            const { error } = await supabase.from(tableName).delete().eq('id', op.data.id);
            if (error) throw error;
        } else {
            // Adiciona user_id e updated_at
            const dataWithUser = {
                ...op.data,
                user_id: user.id,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase.from(tableName).upsert(dataWithUser);
            if (error) throw error;
        }
    },

    /**
     * Adiciona um listener para mudanças de status
     */
    onStatusChange: (listener: SyncStatusListener): (() => void) => {
        listeners.push(listener);
        // Notifica imediatamente com o status atual
        listener(currentStatus, pendingCount);
        // Retorna função para remover o listener
        return () => {
            const index = listeners.indexOf(listener);
            if (index > -1) listeners.splice(index, 1);
        };
    },

    /**
     * Retorna o status atual
     */
    getStatus: (): { status: SyncStatus; pendingCount: number } => {
        return { status: currentStatus, pendingCount };
    },

    /**
     * Verifica a conexão e atualiza status
     */
    checkConnection: async (): Promise<boolean> => {
        try {
            // Tenta fazer uma operação simples no Supabase
            const { error } = await supabase.from('routes').select('id').limit(1);
            if (error) throw error;
            isOnline = true;
            return true;
        } catch {
            isOnline = false;
            updateStatus('offline');
            return false;
        }
    },

    /**
     * Limpa a fila (usar com cuidado!)
     */
    clearQueue: async (): Promise<void> => {
        const db = await openQueueDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(QUEUE_STORE, 'readwrite');
            tx.objectStore(QUEUE_STORE).clear();
            tx.oncomplete = () => {
                updateStatus('synced', 0);
                resolve();
            };
            tx.onerror = () => reject(tx.error);
        });
    }
};
