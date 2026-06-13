
import { Route, Stop, Student, AttendanceRecord, Incident, BackupData, Payment, MaintenanceItem, MaintenanceLog, UserSettings, VehicleDocument, Expense } from '../types';
import { cloudSync } from './cloudSync';
import { syncQueue } from './syncQueue';
import { LocalNotifications } from '@capacitor/local-notifications';

const DB_NAME = 'SchoolMonitorDB';
const DB_VERSION = 5; // Incremented for expenses store

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('routes')) db.createObjectStore('routes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('stops')) db.createObjectStore('stops', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('students')) db.createObjectStore('students', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('attendance')) {
        const store = db.createObjectStore('attendance', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('studentId', 'studentId', { unique: false });
      }
      if (!db.objectStoreNames.contains('incidents')) db.createObjectStore('incidents', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('payments')) {
        const store = db.createObjectStore('payments', { keyPath: 'id' });
        store.createIndex('studentId', 'studentId', { unique: false });
        store.createIndex('month_year', ['month', 'year'], { unique: false });
      }

      // New Maintenance Stores (v2)
      if (!db.objectStoreNames.contains('maintenance_items')) {
        const store = db.createObjectStore('maintenance_items', { keyPath: 'id' });
        // Seed Standard Data
        const standardItems: MaintenanceItem[] = [
          { id: crypto.randomUUID(), name: 'Óleo do Motor', intervalKm: 10000, intervalMonths: 6, lastKm: 0, lastDate: new Date().toISOString(), nextKm: 10000, nextDate: '' },
          { id: crypto.randomUUID(), name: 'Filtro de Óleo', intervalKm: 10000, intervalMonths: 6, lastKm: 0, lastDate: new Date().toISOString(), nextKm: 10000, nextDate: '' },
          { id: crypto.randomUUID(), name: 'Rodízio de Pneus', intervalKm: 10000, intervalMonths: 0, lastKm: 0, lastDate: new Date().toISOString(), nextKm: 10000, nextDate: '' },
          { id: crypto.randomUUID(), name: 'Alinhamento/Balanceamento', intervalKm: 10000, intervalMonths: 0, lastKm: 0, lastDate: new Date().toISOString(), nextKm: 10000, nextDate: '' },
          { id: crypto.randomUUID(), name: 'Filtro de Combustível', intervalKm: 20000, intervalMonths: 12, lastKm: 0, lastDate: new Date().toISOString(), nextKm: 20000, nextDate: '' },
          { id: crypto.randomUUID(), name: 'Filtro de Ar', intervalKm: 20000, intervalMonths: 12, lastKm: 0, lastDate: new Date().toISOString(), nextKm: 20000, nextDate: '' },
          { id: crypto.randomUUID(), name: 'Pastilhas de Freio', intervalKm: 20000, intervalMonths: 0, lastKm: 0, lastDate: new Date().toISOString(), nextKm: 20000, nextDate: '' },
          { id: crypto.randomUUID(), name: 'Correia Dentada', intervalKm: 50000, intervalMonths: 36, lastKm: 0, lastDate: new Date().toISOString(), nextKm: 50000, nextDate: '' },
          { id: crypto.randomUUID(), name: 'Vistoria Escolar (DETRAN)', intervalKm: 0, intervalMonths: 6, lastKm: 0, lastDate: new Date().toISOString(), nextKm: 0, nextDate: '' },
        ];
        standardItems.forEach(item => store.put(item));
      }
            if (!db.objectStoreNames.contains('expenses')) {
        db.createObjectStore('expenses', { keyPath: 'id' });
      }
if (!db.objectStoreNames.contains('maintenance_logs')) {
        const store = db.createObjectStore('maintenance_logs', { keyPath: 'id' });
        store.createIndex('itemId', 'itemId', { unique: false });
      }
      if (!db.objectStoreNames.contains('user_settings')) {
        db.createObjectStore('user_settings', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('contract_signatures')) {
        db.createObjectStore('contract_signatures', { keyPath: 'studentId' });
      }
      if (!db.objectStoreNames.contains('reminders')) {
        db.createObjectStore('reminders', { keyPath: 'id' });
      }
      // New Vehicle Documents Store (v3)
      if (!db.objectStoreNames.contains('vehicle_documents')) {
        db.createObjectStore('vehicle_documents', { keyPath: 'id' });
      }
      // 🆕 New Route Structure Stores (v4)
      if (!db.objectStoreNames.contains('route_sessions')) {
        const store = db.createObjectStore('route_sessions', { keyPath: 'id' });
        store.createIndex('routeId', 'routeId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('route_events')) {
        const store = db.createObjectStore('route_events', { keyPath: 'id' });
        store.createIndex('sessionId', 'sessionId', { unique: false });
        store.createIndex('studentId', 'studentId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Generic GetAll
const getAll = async <T>(storeName: string): Promise<T[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Generic Put
const putItem = async <T>(storeName: string, item: T): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Generic Delete
const deleteItem = async (storeName: string, id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Generic Get (Single)
const getItem = async <T>(storeName: string, id: string): Promise<T | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};


const getTimeFieldValue = (item: any): number | string | null => {
  if (!item) return null;
  const fields = ['timestamp', 'updated_at', 'updatedAt', 'lastDate', 'date', 'created_at', 'createdAt'];
  for (const f of fields) {
    if (item[f] !== undefined && item[f] !== null) {
      return item[f];
    }
  }
  return null;
};

const getNewerStatus = (localItem: any, cloudItem: any): boolean => {
  const localVal = getTimeFieldValue(localItem);
  const cloudVal = getTimeFieldValue(cloudItem);
  if (localVal === null || localVal === undefined) return false;
  if (cloudVal === null || cloudVal === undefined) return true;
  
  if (typeof localVal === 'number' && typeof cloudVal === 'number') {
    return localVal > cloudVal;
  }
  if (typeof localVal === 'string' && typeof cloudVal === 'string') {
    return localVal.localeCompare(cloudVal) > 0;
  }
  const localMs = typeof localVal === 'string' ? new Date(localVal).getTime() : localVal;
  const cloudMs = typeof cloudVal === 'string' ? new Date(cloudVal).getTime() : cloudVal;
  if (!isNaN(localMs) && !isNaN(cloudMs)) {
    return localMs > cloudMs;
  }
  return false;
};

const isRecentLocalItem = (localItem: any): boolean => {
  const val = getTimeFieldValue(localItem);
  if (val === null || val === undefined) return false;
  const ms = typeof val === 'string' ? new Date(val).getTime() : val;
  if (isNaN(ms)) return false;
  return (Date.now() - ms) < 60000; // 1 minute
};

export const dbService = {
  // Routes
  getRoutes: () => getAll<Route>('routes'),
  saveRoute: async (route: Route) => {
    await putItem('routes', route);
    try {
      await cloudSync.saveRoute(route);
    } catch (e) {
      console.warn("Cloud Sync Rota falhou, enfileirando...", e);
      await syncQueue.enqueue({
        type: 'save',
        entity: 'route',
        data: route
      });
    }
  },
  deleteRoute: async (id: string) => {
    await deleteItem('routes', id);
    try {
      await cloudSync.deleteRoute(id);
    } catch (e) {
      await syncQueue.enqueue({
        type: 'delete',
        entity: 'route',
        data: { id }
      });
    }
  },

  // Stops
  getStops: () => getAll<Stop>('stops'),
  saveStop: async (stop: Stop) => {
    await putItem('stops', stop);
    try {
      await cloudSync.saveStop(stop);
    } catch (e: any) {
      console.warn("Cloud Sync Ponto falhou, enfileirando...", e);
      await syncQueue.enqueue({
        type: 'save',
        entity: 'stop',
        data: stop
      });
    }
  },
  deleteStop: async (id: string) => {
    await deleteItem('stops', id);
    try {
      await cloudSync.deleteStop(id);
    } catch (e) {
      await syncQueue.enqueue({
        type: 'delete',
        entity: 'stop',
        data: { id }
      });
    }
  },

  // Students
  getStudents: () => getAll<Student>('students'),
  saveStudent: async (student: Student) => {
    await putItem('students', student);
    try {
      await cloudSync.saveStudent(student);
    } catch (e: any) {
      console.warn("Cloud Sync Aluno falhou, enfileirando...", e);
      await syncQueue.enqueue({
        type: 'save',
        entity: 'student',
        data: student
      });
    }
  },
  deleteStudent: async (id: string) => {
    await deleteItem('students', id);
    try {
      await cloudSync.deleteStudent(id);
    } catch (e) {
      await syncQueue.enqueue({
        type: 'delete',
        entity: 'student',
        data: { id }
      });
    }
  },

  // Attendance
  getAttendance: () => getAll<AttendanceRecord>('attendance'),
  saveAttendance: async (record: AttendanceRecord) => {
    await putItem('attendance', record);
    try {
      await cloudSync.saveAttendance(record);
    } catch (e) {
      await syncQueue.enqueue({
        type: 'save',
        entity: 'attendance',
        data: record
      });
    }
  },

  // Incidents
  getIncidents: () => getAll<Incident>('incidents'),
  saveIncident: async (incident: Incident) => {
    await putItem('incidents', incident);
    try {
      await cloudSync.saveIncident(incident);
    } catch (e) {
      await syncQueue.enqueue({
        type: 'save',
        entity: 'incident',
        data: incident
      });
    }
  },

  // Payments
  getPayments: () => getAll<Payment>('payments'),
  savePayment: async (payment: Payment) => {
    await putItem('payments', payment);
    try {
      await cloudSync.savePayment(payment);
    } catch (e) {
      await syncQueue.enqueue({
        type: 'save',
        entity: 'payment',
        data: payment
      });
    }
  },
  deletePayment: async (id: string) => {
    await deleteItem('payments', id);
    try {
      // Nota: cloudSync ainda não tem deletePayment explicitamente, usando executeOperation genérico se necessário
      await syncQueue.enqueue({
        type: 'delete',
        entity: 'payment',
        data: { id }
      });
    } catch (e) { }
  },


  // Expenses (Gastos)
  getExpenses: () => getAll<Expense>('expenses'),
  saveExpense: async (expense: Expense) => {
    await putItem('expenses', expense);
    try {
      await cloudSync.saveExpense(expense);
    } catch (e) {
      console.warn("Cloud Sync Expense falhou, enfileirando...", e);
      await syncQueue.enqueue({
        type: 'save',
        entity: 'expense',
        data: expense
      });
    }
  },
  deleteExpense: async (id: string) => {
    await deleteItem('expenses', id);
    try {
      await cloudSync.deleteExpense(id);
    } catch (e) {
      await syncQueue.enqueue({
        type: 'delete',
        entity: 'expense',
        data: { id }
      });
    }
  },

  // Maintenance
  getMaintenanceItems: () => getAll<MaintenanceItem>('maintenance_items'),
  saveMaintenanceItem: async (item: MaintenanceItem) => {
    await putItem('maintenance_items', item);
    try {
      await cloudSync.saveMaintenanceItem(item);
    } catch (e) {
      await syncQueue.enqueue({
        type: 'save',
        entity: 'maintenance_item',
        data: item
      });
    }
  },
  deleteMaintenanceItem: async (id: string) => {
    await deleteItem('maintenance_items', id);
    try {
      await syncQueue.enqueue({
        type: 'delete',
        entity: 'maintenance_item',
        data: { id }
      });
    } catch (e) { }
  },

  getMaintenanceLogs: () => getAll<MaintenanceLog>('maintenance_logs'),
  saveMaintenanceLog: async (log: MaintenanceLog) => {
    await putItem('maintenance_logs', log);
    try {
      await cloudSync.saveMaintenanceLog(log);
    } catch (e) {
      await syncQueue.enqueue({
        type: 'save',
        entity: 'maintenance_log',
        data: log
      });
    }
  },

  // Settings (Single record with id 'settings')
  getUserSettings: async (): Promise<UserSettings> => {
    const s = await getItem<UserSettings>('user_settings', 'settings');
    return s || { id: 'settings', currentKm: 0 } as any;
  },
  saveUserSettings: async (partialSettings: Partial<UserSettings>) => {
    // Get existing settings first and merge
    const existing = await getItem<UserSettings>('user_settings', 'settings');
    const settings = { ...existing, ...partialSettings, id: 'settings' } as UserSettings;
    await putItem('user_settings', settings);
    try {
      await cloudSync.saveUserSettings(settings);
    } catch (e) {
      await syncQueue.enqueue({
        type: 'save',
        entity: 'user_settings',
        data: settings
      });
    }
  },

  getContractSignature: (studentId: string) => getItem<any>('contract_signatures', studentId),
  saveContractSignature: (studentId: string, signature: string) => putItem('contract_signatures', { studentId, signature }),
  deleteContractSignature: (studentId: string) => deleteItem('contract_signatures', studentId),

  // Reminders
  getReminders: () => getAll<any>('reminders'),
  saveReminder: async (reminder: any) => {
    await putItem('reminders', reminder);
    try {
      await cloudSync.saveReminder(reminder);
    } catch (e) {
      await syncQueue.enqueue({
        type: 'save',
        entity: 'reminder',
        data: reminder
      });
    }
  },
  deleteReminder: async (id: number) => {
    await deleteItem('reminders', id.toString()); // Convertendo para string para compatibilidade com a assinatura genérica
    try {
      await cloudSync.deleteReminder(id);
    } catch (e) {
      await syncQueue.enqueue({
        type: 'delete',
        entity: 'reminder',
        data: { id }
      });
    }
  },


  // Full Backup Export
  exportAllData: async (): Promise<BackupData> => {
    const routes = await getAll<Route>('routes');
    const stops = await getAll<Stop>('stops');
    const students = await getAll<Student>('students');
    const attendance = await getAll<AttendanceRecord>('attendance');
    const incidents = await getAll<Incident>('incidents');
    const payments = await getAll<Payment>('payments');
    const maintenanceItems = await getAll<MaintenanceItem>('maintenance_items');
    const maintenanceLogs = await getAll<MaintenanceLog>('maintenance_logs');
    const userSettings = await getItem<UserSettings>('user_settings', 'settings');
    const expenses = await getAll<Expense>('expenses');

    return {
      routes,
      stops,
      students,
      attendance,
      incidents,
      payments,
      maintenanceItems,
      maintenanceLogs,
      userSettings: userSettings || { currentKm: 0 },
      generatedAt: new Date().toISOString(),
    } as any;
  },

  // Clear DB (for restore or logout)
  clearDatabase: async (): Promise<void> => {
    const db = await openDB();
    const stores = [
      'routes', 'stops', 'students', 'attendance',
      'incidents', 'payments', 'maintenance_items',
      'maintenance_logs', 'user_settings', 'contract_signatures', 'reminders',
      'vehicle_documents', 'route_sessions', 'route_events', 'expenses'
    ];

    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, 'readwrite');
      stores.forEach(storeName => {
        try {
          tx.objectStore(storeName).clear();
        } catch (e) {
          console.warn(`Erro ao limpar store ${storeName}:`, e);
        }
      });
      tx.oncomplete = async () => {
        // Limpar notificações locais para evitar vazamento entre usuários
        try {
          const pending = await LocalNotifications.getPending();
          if (pending.notifications.length > 0) {
            await LocalNotifications.cancel({ notifications: pending.notifications });
          }
          await LocalNotifications.removeAllDeliveredNotifications();
        } catch (e) {
          console.error("Erro ao limpar notificações:", e);
        }
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  },

  // Import Data (Restore)
  importData: async (data: BackupData): Promise<void> => {
    console.log("📥 db.ts: Iniciando importData...");
    await dbService.clearDatabase();
    const db = await openDB();
    const stores = [
      'routes', 'stops', 'students', 'attendance', 'incidents', 'payments',
      'maintenance_items', 'maintenance_logs', 'user_settings', 'reminders',
      'vehicle_documents', 'route_sessions', 'route_events', 'expenses'
    ];
    const tx = db.transaction(stores, 'readwrite');

    // Helper to add items
    const addItems = (storeName: string, items: any[]) => {
      if (!items) return;
      const store = tx.objectStore(storeName);
      items.forEach(item => store.put(item));
    };

    addItems('routes', data.routes);
    addItems('stops', data.stops);
    addItems('students', data.students);
    addItems('attendance', data.attendance);
    addItems('incidents', data.incidents);
    addItems('payments', data.payments || []);
    addItems('reminders', (data as any).reminders || []);
    addItems('vehicle_documents', (data as any).vehicleDocuments || []);
    addItems('route_sessions', (data as any).routeSessions || []);
    addItems('route_events', (data as any).routeEvents || []);
    addItems('expenses', data.expenses || []);

    // v2 Support
    if ((data as any).maintenanceItems) addItems('maintenance_items', (data as any).maintenanceItems);
    if ((data as any).maintenanceLogs) addItems('maintenance_logs', (data as any).maintenanceLogs);

    if ((data as any).userSettings) {
      tx.objectStore('user_settings').put({ ...(data as any).userSettings, id: 'settings' });
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = async () => {
        console.log("✅ Importação local concluída. Iniciando push para a nuvem...");
        // Após importar com sucesso, tentamos subir tudo para a nuvem para garantir sincronia
        try {
          // Disparamos o push em background para não travar a UI após o import
          dbService.pushAllToCloud().catch(e => console.error("Erro no push automático após import:", e));
        } catch (e) { }
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  },

  // Vehicle Docs
  getVehicleDocuments: () => getAll<VehicleDocument>('vehicle_documents'),
  saveVehicleDocument: (doc: VehicleDocument) => putItem('vehicle_documents', doc),
  deleteVehicleDocument: (id: string) => deleteItem('vehicle_documents', id),

    // Cloud Pull (Sync from Server to Local)
  pullFromCloud: async (): Promise<void> => {
    try {
      console.log("🔄 db.ts: Iniciando pullFromCloud com Smart Merge...");
      const cloudData = await cloudSync.pullAllData();
      if (!cloudData) {
        console.warn("⚠️ pullAllData retornou null, abortando sync");
        return;
      }

      // ⚠️ SEGURANÇA CONTRA PERDA DE DADOS:
      const isCloudEmpty = (!cloudData.students || cloudData.students.length === 0) &&
        (!cloudData.routes || cloudData.routes.length === 0);

      const localStudents = await dbService.getStudents();
      const localRoutes = await dbService.getRoutes();
      const localAttendance = await dbService.getAttendance();
      const localPayments = await dbService.getPayments();
      const localIncidents = await dbService.getIncidents();
      const localReminders = await dbService.getReminders();
      const localMaintItems = await dbService.getMaintenanceItems();
      const localMaintLogs = await dbService.getMaintenanceLogs();
      const localVehicleDocs = await dbService.getVehicleDocuments();
      const localRouteSessions = await dbService.getRouteSessions();
      const localRouteEvents = await dbService.getRouteEvents();
      const localExpenses = await dbService.getExpenses();
      const localStops = await dbService.getStops();

      const isLocalNotEmpty = localStudents.length > 0 || localRoutes.length > 0;

      if (isCloudEmpty && isLocalNotEmpty) {
        console.warn("⚠️ Nuvem vazia detectada, mas o local possui dados. Abortando pull para evitar perda de dados. Sincronizando local -> nuvem...");
        dbService.pushAllToCloud().catch(err => console.error("Erro no push emergencial:", err));
        return;
      }

      console.log("🔄 Dados recebidos da nuvem, iniciando smart merge no IndexedDB...");
      const db = await openDB();
      const stores = [
        'routes', 'stops', 'students', 'attendance', 'payments', 
        'user_settings', 'maintenance_items', 'maintenance_logs', 
        'incidents', 'reminders', 'vehicle_documents', 'route_sessions', 
        'route_events', 'expenses'
      ];
      const tx = db.transaction(stores, 'readwrite');

      const restore = (storeName: string, items: any[], localItems: any[]) => {
        console.log(`  🚀 Smart Merge ${storeName}: ${items?.length || 0} itens da nuvem`);
        const store = tx.objectStore(storeName);
        
        const localMap = new Map((localItems || []).map(i => [i.id, i]));
        const cloudIds = new Set(items ? items.map(i => i.id) : []);

        // 1. Put items from cloud if they are newer or local does not exist
        if (items) {
          items.forEach(item => {
            const localItem = localMap.get(item.id);
            if (localItem && getNewerStatus(localItem, item)) {
              console.log(`[Sync Merge] Mantendo local mais novo para ${storeName} ID ${item.id}`);
              return;
            }
            store.put(item);
          });
        }

        // 2. Delete local items not in cloud, unless they were modified/created in the last 1 minute
        if (localItems) {
          localItems.forEach(localItem => {
            if (!cloudIds.has(localItem.id)) {
              if (isRecentLocalItem(localItem)) {
                console.log(`[Sync Merge] Preservando item local recém-criado fora da nuvem em ${storeName} ID ${localItem.id}`);
              } else {
                store.delete(localItem.id);
              }
            }
          });
        }
      };

      restore('routes', cloudData.routes, localRoutes);
      restore('stops', cloudData.stops, localStops);
      restore('students', cloudData.students, localStudents);
      restore('attendance', cloudData.attendance, localAttendance);
      restore('payments', cloudData.payments, localPayments);
      restore('incidents', cloudData.incidents, localIncidents);
      restore('reminders', cloudData.reminders, localReminders);
      restore('maintenance_items', cloudData.maintenanceItems, localMaintItems);
      restore('maintenance_logs', cloudData.maintenanceLogs, localMaintLogs);
      restore('vehicle_documents', cloudData.vehicleDocuments, localVehicleDocs);
      restore('route_sessions', cloudData.routeSessions || [], localRouteSessions);
      restore('route_events', cloudData.routeEvents || [], localRouteEvents);
      restore('expenses', cloudData.expenses || [], localExpenses);

      if (cloudData.userSettings) {
        console.log("  👤 Restaurando user_settings");
        tx.objectStore('user_settings').put(cloudData.userSettings);
      }

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => {
          console.log("✅ Sync completo! Disparando evento db-synced");
          window.dispatchEvent(new Event('db-synced'));
          resolve();
        };
        tx.onerror = () => {
          console.error("❌ Erro na transação do IndexedDB:", tx.error);
          reject(tx.error);
        };
      });
    } catch (e) {
      console.error("❌❌❌ Erro no Pull Cloud:", e);
      throw e;
    }
  },

// ☁️ Pushes all local data to cloud (Force Sync Up)
  pushAllToCloud: async (): Promise<void> => {
    try {
      console.log("☁️ db.ts: Iniciando pushAllToCloud...");
      const routes = await dbService.getRoutes();
      const stops = await dbService.getStops();
      const students = await dbService.getStudents();
      const attendance = await dbService.getAttendance();
      const payments = await dbService.getPayments();
      const incidents = await dbService.getIncidents();
      const reminders = await dbService.getReminders();
      const maintItems = await dbService.getMaintenanceItems();
      const maintLogs = await dbService.getMaintenanceLogs();
      const vehicleDocs = await dbService.getVehicleDocuments();
      const routeSessions = await dbService.getRouteSessions();
      const routeEvents = await dbService.getRouteEvents();
      const settings = await dbService.getUserSettings();

      // Envia sequencialmente ou em blocos para não sobrecarregar
      console.log(`  ⬆️ Subindo ${students.length} alunos...`);
      for (const s of students) await cloudSync.saveStudent(s);

      console.log(`  ⬆️ Subindo ${routes.length} rotas e ${stops.length} pontos...`);
      for (const r of routes) await cloudSync.saveRoute(r);
      for (const st of stops) await cloudSync.saveStop(st);

      console.log(`  ⬆️ Subindo atendimentos, pagamentos e ocorrências...`);
      for (const a of attendance) await cloudSync.saveAttendance(a);
      for (const p of payments) await cloudSync.savePayment(p);
      for (const i of incidents) await cloudSync.saveIncident(i);

      console.log(`  ⬆️ Subindo manutenção e documentos...`);
      for (const mi of maintItems) await cloudSync.saveMaintenanceItem(mi);
      for (const ml of maintLogs) await cloudSync.saveMaintenanceLog(ml);
      for (const vd of vehicleDocs) await cloudSync.saveVehicleDocument(vd);

      console.log(`  ⬆️ Subindo sessões e lembretes...`);
      for (const rs of routeSessions) await cloudSync.saveRouteSession(rs);
      for (const re of routeEvents) await cloudSync.saveRouteEvent(re);
      for (const rem of reminders) await cloudSync.saveReminder(rem);

      console.log(`  🚀 Subindo despesas/gastos...`);
      const expenses = await dbService.getExpenses();
      for (const exp of expenses) await cloudSync.saveExpense(exp);

      if (settings) {
        console.log(`  ⬆️ Subindo configurações...`);
        await cloudSync.saveUserSettings(settings);
      }

      console.log("✅ pushAllToCloud concluído com sucesso!");
    } catch (error) {
      console.error("❌ Erro no pushAllToCloud:", error);
      throw error;
    }
  },

  // 🆕 ROUTE SESSIONS (Nova Estrutura)
  getRouteSessions: () => getAll<any>('route_sessions'),
  saveRouteSession: async (session: any) => {
    await putItem('route_sessions', session);
    try { await cloudSync.saveRouteSession(session); } catch (e) { }
  },
  deleteRouteSession: async (id: string) => {
    await deleteItem('route_sessions', id);
    try { await cloudSync.deleteRouteSession(id); } catch (e) { }
  },

  // 🆕 ROUTE EVENTS (Nova Estrutura)
  getRouteEvents: () => getAll<any>('route_events'),
  saveRouteEvent: async (event: any) => {
    await putItem('route_events', event);
    try { await cloudSync.saveRouteEvent(event); } catch (e) { }
  },
  deleteRouteEvent: async (id: string) => {
    await deleteItem('route_events', id);
    try { await cloudSync.deleteRouteEvent(id); } catch (e) { }
  }
};