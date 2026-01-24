import React, { useState, useEffect } from 'react';
import { syncQueue, SyncStatus } from '../services/syncQueue';
import { Icon, IconName } from './Icon';

interface SyncIndicatorProps {
    className?: string;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({ className = '' }) => {
    const [status, setStatus] = useState<SyncStatus>('synced');
    const [pendingCount, setPendingCount] = useState(0);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        const unsubscribe = syncQueue.onStatusChange((newStatus, count) => {
            setStatus(newStatus);
            setPendingCount(count);
        });

        // Verificar estado inicial
        const { status: initialStatus, pendingCount: initialCount } = syncQueue.getStatus();
        setStatus(initialStatus);
        setPendingCount(initialCount);

        return unsubscribe;
    }, []);

    const statusConfig: Record<SyncStatus, { icon: IconName; color: string; label: string; animate?: boolean }> = {
        synced: {
            icon: 'cloud',
            color: 'text-green-400',
            label: 'Sincronizado'
        },
        syncing: {
            icon: 'refresh-cw',
            color: 'text-blue-400',
            label: 'Sincronizando...',
            animate: true
        },
        pending: {
            icon: 'cloud-off',
            color: 'text-yellow-400',
            label: `${pendingCount} pendente(s)`
        },
        offline: {
            icon: 'wifi-off',
            color: 'text-gray-400',
            label: 'Sem conexão'
        },
        error: {
            icon: 'alert-circle',
            color: 'text-red-400',
            label: 'Erro de sync'
        }
    };

    const config = statusConfig[status];

    const handleClick = async () => {
        if (status === 'pending' || status === 'error') {
            // Tenta processar a fila
            syncQueue.processQueue();
        }
        setShowTooltip(!showTooltip);
    };

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={handleClick}
                className={`p-2 rounded-lg transition-colors ${config.color} hover:bg-white/10`}
                title={config.label}
            >
                <Icon
                    name={config.icon}
                    size={20}
                    className={config.animate ? 'animate-spin' : ''}
                />
                {pendingCount > 0 && status !== 'syncing' && (
                    <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                )}
            </button>

            {showTooltip && (
                <div className="absolute top-full right-0 mt-2 bg-navy-800 border border-navy-700 rounded-xl p-3 shadow-xl z-50 min-w-[180px]">
                    <div className="flex items-center gap-2 mb-2">
                        <Icon name={config.icon} size={16} className={config.color} />
                        <span className="text-white font-medium text-sm">{config.label}</span>
                    </div>

                    {status === 'pending' && (
                        <button
                            onClick={() => syncQueue.processQueue()}
                            className="w-full bg-primary-600 hover:bg-primary-500 text-white text-xs py-2 rounded-lg font-bold mt-2"
                        >
                            Sincronizar Agora
                        </button>
                    )}

                    {status === 'offline' && (
                        <p className="text-gray-400 text-xs">
                            Os dados serão sincronizados quando a conexão for restaurada.
                        </p>
                    )}

                    {status === 'synced' && (
                        <p className="text-gray-400 text-xs">
                            Todos os dados estão salvos na nuvem.
                        </p>
                    )}

                    {status === 'error' && (
                        <button
                            onClick={() => syncQueue.processQueue()}
                            className="w-full bg-red-600 hover:bg-red-500 text-white text-xs py-2 rounded-lg font-bold mt-2"
                        >
                            Tentar Novamente
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
