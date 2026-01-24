
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { MaintenanceItem, MaintenanceLog } from '../types';
import { Icon } from '../components/Icon';
import { useI18n } from '../i18n';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../services/auth'; // Import for Storage

export const MaintenanceScreen: React.FC = () => {
    const { t, language } = useI18n();
    const [items, setItems] = useState<MaintenanceItem[]>([]);
    const [currentKm, setCurrentKm] = useState<number>(0);
    const [isEditingKm, setIsEditingKm] = useState(false);
    const [newKmValue, setNewKmValue] = useState('');

    // Maintenance Action Modal
    const [selectedItem, setSelectedItem] = useState<MaintenanceItem | null>(null);
    const [actionModalOpen, setActionModalOpen] = useState(false);
    const [actionCost, setActionCost] = useState('');
    const [actionDate, setActionDate] = useState(new Date().toISOString().split('T')[0]);
    const [actionKm, setActionKm] = useState('');
    const [attachmentPath, setAttachmentPath] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    // Add Item Modal
    const [addItemModalOpen, setAddItemModalOpen] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemIntervalKm, setNewItemIntervalKm] = useState('');
    const [newItemIntervalMonths, setNewItemIntervalMonths] = useState('');

    const loadData = async () => {
        const [storedItems, settings] = await Promise.all([
            dbService.getMaintenanceItems(),
            dbService.getUserSettings()
        ]);
        setItems(storedItems);
        setCurrentKm(settings.currentKm || 0);

        // Initial load for action form
        setActionKm((settings.currentKm || 0).toString());
    };

    useEffect(() => {
        loadData();
    }, []);

    // Helper to format YYYY-MM-DD to DD/MM/YYYY
    const formatDateLocal = (dateString: string) => {
        if (!dateString) return '-';
        if (dateString.includes('T')) {
            return new Date(dateString).toLocaleDateString();
        }
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const [y, m, d] = parts;
            return `${d}/${m}/${y}`;
        }
        return dateString;
    };

    const handleUpdateKm = async () => {
        const nextKm = parseInt(newKmValue);
        if (isNaN(nextKm)) return;

        await dbService.saveUserSettings({ currentKm: nextKm });
        setCurrentKm(nextKm);
        setIsEditingKm(false);
    };

    const calculateStatus = (item: MaintenanceItem) => {
        if (item.lastKm === 0 && currentKm > 0 && item.intervalKm > 0) {
            return { status: 'unknown', label: 'PENDENTE', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30' };
        }

        let kmStatus = 'ok';
        let kmRemaining = 0;

        if (item.intervalKm > 0) {
            const dueKm = item.lastKm + item.intervalKm;
            kmRemaining = dueKm - currentKm;
            if (kmRemaining < 0) kmStatus = 'overdue';
            else if (kmRemaining < 1000) kmStatus = 'warning';
        }

        let dateStatus = 'ok';
        let daysRemaining = 0;

        if (item.intervalMonths > 0) {
            const lastDate = new Date(item.lastDate);
            const dueDate = new Date(lastDate);
            dueDate.setMonth(lastDate.getMonth() + item.intervalMonths);
            const now = new Date();
            const diffTime = dueDate.getTime() - now.getTime();
            daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (daysRemaining < 0) dateStatus = 'overdue';
            else if (daysRemaining < 30) dateStatus = 'warning';
        }

        if (kmStatus === 'overdue' || dateStatus === 'overdue') return { status: 'overdue', label: 'VENCIDO', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' };
        if (kmStatus === 'warning' || dateStatus === 'warning') return { status: 'warning', label: 'ATENÇÃO', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
        return { status: 'ok', label: 'OK', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' };
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;

        try {
            setUploading(true);
            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { data, error } = await supabase.storage
                .from('maintenance-docs')
                .upload(filePath, file);

            if (error) throw error;

            // Get public URL just for feedback, but we store the path
            setAttachmentPath(data?.path || filePath);
            alert('Arquivo anexado com sucesso!');
        } catch (error: any) {
            alert('Erro ao enviar arquivo: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handlePerformMaintenance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;

        const km = parseInt(actionKm);

        const newLog: MaintenanceLog = {
            id: crypto.randomUUID(),
            itemId: selectedItem.id,
            date: actionDate,
            km: km,
            cost: parseFloat(actionCost) || 0,
            notes: 'Manutenção registrada via app',
            attachmentPath: attachmentPath || undefined
        };
        await dbService.saveMaintenanceLog(newLog);

        const updatedItem = {
            ...selectedItem,
            lastKm: km,
            lastDate: actionDate
        };
        await dbService.saveMaintenanceItem(updatedItem);

        if (km > currentKm) {
            await dbService.saveUserSettings({ currentKm: km });
        }

        setActionModalOpen(false);
        setAttachmentPath(null);
        setActionCost('');
        loadData();
    };

    const handleQuickReset = async (item: MaintenanceItem) => {
        if (!confirm(`Marcar "${item.name}" como realizado HOJE (${currentKm} km)?`)) return;

        const today = new Date().toISOString().split('T')[0];

        const newLog: MaintenanceLog = {
            id: crypto.randomUUID(),
            itemId: item.id,
            date: today,
            km: currentKm,
            cost: 0,
            notes: 'Reset Rápido (Inicialização)'
        };
        await dbService.saveMaintenanceLog(newLog);

        const updatedItem = {
            ...item,
            lastKm: currentKm,
            lastDate: today
        };
        await dbService.saveMaintenanceItem(updatedItem);
        loadData();
    }

    const handleCreateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        const newItem: MaintenanceItem = {
            id: crypto.randomUUID(),
            name: newItemName,
            intervalKm: parseInt(newItemIntervalKm) || 0,
            intervalMonths: parseInt(newItemIntervalMonths) || 0,
            lastKm: 0,
            lastDate: new Date().toISOString().split('T')[0],
            nextKm: 0,
            nextDate: ''
        };
        await dbService.saveMaintenanceItem(newItem);
        setAddItemModalOpen(false);
        setNewItemName('');
        setNewItemIntervalKm('');
        setNewItemIntervalMonths('');
        loadData();
    }

    const handleDeleteItem = async (id: string, name: string) => {
        if (confirm(`Tem certeza que deseja excluir "${name}"?`)) {
            await dbService.deleteMaintenanceItem(id);
            loadData();
        }
    }

    const exportHistory = async () => {
        try {
            const logs = await dbService.getMaintenanceLogs();
            if (logs.length === 0) {
                alert("Nenhum histórico encontrado para exportar.");
                return;
            }

            const itemsMap = new Map<string, string>();
            items.forEach(i => itemsMap.set(i.id, i.name));

            const doc = new jsPDF();
            doc.text('Histórico de Manutenção - Monitor Pro', 14, 20);

            let totalCost = 0;
            const tableData = logs.map(log => {
                totalCost += log.cost;
                return [
                    itemsMap.get(log.itemId) || 'Item Excluído',
                    formatDateLocal(log.date),
                    `${log.km.toLocaleString()} km`,
                    `R$ ${log.cost.toFixed(2)}`,
                    log.notes || '-',
                    log.attachmentPath ? 'SIM' : 'NÃO'
                ];
            });

            autoTable(doc, {
                head: [['Item', 'Data', 'KM', 'Custo', 'Obs', 'Anexo']],
                body: tableData,
                startY: 30,
            });

            doc.text(`Custo Total: R$ ${totalCost.toFixed(2)}`, 14, (doc as any).lastAutoTable.finalY + 10);

            const fileName = `historico_manutencao_${new Date().getTime()}.pdf`;

            if (Capacitor.isNativePlatform()) {
                const base64 = doc.output('datauristring').split(',')[1];
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: base64,
                    directory: Directory.Cache
                });

                await Share.share({
                    title: 'Histórico de Manutenção',
                    text: 'Segue em anexo o histórico de manutenção.',
                    url: result.uri,
                    dialogTitle: 'Compartilhar Histórico'
                });
            } else {
                doc.save(fileName);
            }
        } catch (e: any) {
            console.error(e);
            alert("Erro ao exportar PDF: " + e.message);
        }
    }


    return (
        <div className="p-4 pb-20 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Icon name="tool" /> {t('maintenance_title')}
                </h2>
                <div className="flex gap-2">
                    <button onClick={exportHistory} className="p-2 bg-navy-800 text-blue-400 rounded-lg hover:bg-navy-700 border border-navy-700">
                        <Icon name="file-text" size={20} />
                    </button>
                    <button onClick={() => setAddItemModalOpen(true)} className="p-2 bg-navy-800 text-primary-400 rounded-lg hover:bg-navy-700 border border-navy-700">
                        <Icon name="plus" size={20} />
                    </button>
                </div>
            </div>

            {/* Odometer Panel */}
            <div className="bg-navy-800 p-6 rounded-2xl border border-navy-700 mb-6 flex flex-col items-center">
                <span className="text-gray-400 text-sm uppercase font-bold tracking-wider mb-2">{t('maintenance_odometer')}</span>

                {isEditingKm ? (
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={newKmValue}
                            autoFocus
                            onChange={e => setNewKmValue(e.target.value)}
                            className="bg-navy-900 border border-primary-500 text-white text-3xl font-mono p-2 rounded-lg w-40 text-center outline-none"
                        />
                        <button onClick={handleUpdateKm} className="bg-primary-600 text-white p-2 rounded-lg">
                            <Icon name="check" />
                        </button>
                    </div>
                ) : (
                    <div onClick={() => { setNewKmValue(currentKm.toString()); setIsEditingKm(true); }} className="flex items-end gap-2 cursor-pointer group">
                        <h3 className="text-5xl font-mono text-white group-hover:text-primary-400 transition-colors">
                            {currentKm.toLocaleString()}
                        </h3>
                        <span className="text-gray-500 mb-2">km</span>
                        <Icon name="edit" size={16} className="text-gray-600 mb-3 group-hover:text-primary-400" />
                    </div>
                )}
            </div>

            {/* Items List */}
            <div className="space-y-4">
                {items.length === 0 && (
                    <div className="text-center text-gray-500 py-10">
                        <p>Nenhum item de monitoramento.</p>
                        <p className="text-xs mt-2">Adicione itens no botão (+) acima.</p>
                    </div>
                )}
                {items.map(item => {
                    const status = calculateStatus(item);
                    const nextKm = item.lastKm + item.intervalKm;

                    return (
                        <div key={item.id} className={`bg-navy-800 rounded-xl border ${status.border} p-5 relative overflow-hidden group`}>
                            <div className={`absolute top-0 right-0 p-1 px-3 text-xs font-bold ${status.bg} ${status.color} rounded-bl-xl`}>
                                {status.label}
                            </div>

                            <div className="flex justify-between items-start mb-4 pr-16">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{item.name}</h3>
                                    <p className="text-xs text-gray-500">
                                        Última: {item.lastKm.toLocaleString()} km ({formatDateLocal(item.lastDate)})
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDeleteItem(item.id, item.name)}
                                    className="p-2 text-gray-600 hover:text-red-500 transition-colors bg-navy-900/50 rounded-lg ml-2"
                                >
                                    <Icon name="trash" size={18} />
                                </button>
                            </div>

                            {/* Progress Bar (KM) */}
                            {item.intervalKm > 0 && status.status !== 'unknown' && (
                                <div className="mb-2">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-400">Próx: {nextKm.toLocaleString()} km</span>
                                        <span className={status.color}>
                                            {status.status === 'overdue'
                                                ? `Venceu há ${Math.abs(nextKm - currentKm).toLocaleString()} km`
                                                : `Faltam ${(nextKm - currentKm).toLocaleString()} km`}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-navy-900 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${status.bg.replace('/10', '')} transition-all duration-500`}
                                            style={{ width: `${Math.min(100, Math.max(0, ((currentKm - item.lastKm) / item.intervalKm) * 100))}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {status.status === 'unknown' ? (
                                <button
                                    onClick={() => handleQuickReset(item)}
                                    className="w-full mt-3 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Icon name="check-circle" size={16} />
                                    Marcar como OK Agora
                                </button>
                            ) : (
                                <button
                                    onClick={() => { setSelectedItem(item); setActionModalOpen(true); setAttachmentPath(null); setActionCost(''); }}
                                    className="w-full mt-3 bg-navy-700 hover:bg-navy-600 border border-navy-600 text-gray-300 hover:text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Icon name="check-circle" size={16} />
                                    Registrar Manutenção
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Maintenance Action Modal */}
            {actionModalOpen && selectedItem && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-navy-800 p-6 rounded-2xl w-full max-w-md border border-navy-700 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <h3 className="text-xl font-bold text-white mb-1">Registrar Manutenção</h3>
                        <p className="text-primary-400 text-sm mb-6">{selectedItem.name}</p>

                        <form onSubmit={handlePerformMaintenance} className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 font-bold uppercase">Data</label>
                                <input
                                    type="date"
                                    value={actionDate}
                                    onChange={e => setActionDate(e.target.value)}
                                    className="w-full bg-navy-900 border border-navy-600 text-white p-3 rounded-lg outline-none focus:border-primary-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1 font-bold uppercase">KM Atual</label>
                                <input
                                    type="number"
                                    value={actionKm}
                                    onChange={e => setActionKm(e.target.value)}
                                    className="w-full bg-navy-900 border border-navy-600 text-white p-3 rounded-lg outline-none focus:border-primary-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1 font-bold uppercase">Custo (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={actionCost}
                                    onChange={e => setActionCost(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-navy-900 border border-navy-600 text-white p-3 rounded-lg outline-none focus:border-primary-500"
                                />
                            </div>

                            <div className="pt-2 border-t border-navy-700">
                                <label className="block text-xs text-gray-400 mb-2 font-bold uppercase flex items-center gap-2">
                                    <Icon name="paperclip" size={14} /> Anexar Documento (Foto/PDF)
                                </label>

                                <div className="flex gap-2 items-center">
                                    <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border border-dashed cursor-pointer transition-colors ${attachmentPath ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-gray-600 hover:border-primary-500 bg-navy-900 text-gray-400'}`}>
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                            disabled={uploading}
                                        />
                                        {uploading ? (
                                            <span className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                Enviando...
                                            </span>
                                        ) : attachmentPath ? (
                                            <span className="flex items-center gap-2 text-sm font-medium">
                                                <Icon name="check" size={16} /> Arquivo Anexado
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2 text-sm">
                                                <Icon name="camera" size={16} /> Escolher Arquivo
                                            </span>
                                        )}
                                    </label>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">
                                    Requer internet para envio. O arquivo será salvo na nuvem segura.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setActionModalOpen(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className={`px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-bold shadow-lg shadow-primary-600/20 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Confirmar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Item Modal */}
            {addItemModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-navy-800 p-6 rounded-2xl w-full max-w-md border border-navy-700 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-6">Novo Item de Monitoramento</h3>

                        <form onSubmit={handleCreateItem} className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 font-bold uppercase">Nome do Item</label>
                                <input
                                    type="text"
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                    placeholder="Ex: Troca de Fluido de Freio"
                                    className="w-full bg-navy-900 border border-navy-600 text-white p-3 rounded-lg outline-none focus:border-primary-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 font-bold uppercase">Intervalo (KM)</label>
                                    <input
                                        type="number"
                                        value={newItemIntervalKm}
                                        onChange={e => setNewItemIntervalKm(e.target.value)}
                                        placeholder="Ex: 50000"
                                        className="w-full bg-navy-900 border border-navy-600 text-white p-3 rounded-lg outline-none focus:border-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 font-bold uppercase">Intervalo (Meses)</label>
                                    <input
                                        type="number"
                                        value={newItemIntervalMonths}
                                        onChange={e => setNewItemIntervalMonths(e.target.value)}
                                        placeholder="Ex: 12"
                                        className="w-full bg-navy-900 border border-navy-600 text-white p-3 rounded-lg outline-none focus:border-primary-500"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setAddItemModalOpen(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-bold shadow-lg shadow-primary-600/20"
                                >
                                    Adicionar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
