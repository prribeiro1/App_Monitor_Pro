import React, { useState, useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Icon } from '../components/Icon';
import { Capacitor } from '@capacitor/core';
import { dbService } from '../services/db';

interface Reminder {
    id: number;
    title: string;
    body: string;
    date: string; // ISO string 
}

export const RemindersScreen: React.FC = () => {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    useEffect(() => {
        loadReminders();
        requestPermissions();
    }, []);

    const requestPermissions = async () => {
        if (Capacitor.isNativePlatform()) {
            const result = await LocalNotifications.requestPermissions();
            if (result.display !== 'granted') {
                alert('Precisamos de permissão para enviar notificações!');
            }
        }
    };

    const loadReminders = async () => {
        try {
            // Primeiro pegamos os agendados no sistema
            const pending = await LocalNotifications.getPending();

            // Depois pegamos o histórico no nosso banco (que sincroniza com a nuvem)
            const localReminders = await dbService.getReminders();

            // Unificamos ou priorizamos o banco local
            setReminders(localReminders);
        } catch (e) {
            console.error(e);
        }
    };

    const scheduleReminder = async () => {
        if (!title || !date || !time) {
            alert('Preencha todos os campos!');
            return;
        }

        const scheduledTime = new Date(`${date}T${time}:00`);
        const now = new Date();

        if (scheduledTime <= now) {
            alert('A data/hora deve ser no futuro!');
            return;
        }

        const id = Math.floor(Math.random() * 1000000);

        try {
            // 1. Salva no banco (Local + Nuvem)
            const newReminder: Reminder = {
                id,
                title,
                body,
                date: scheduledTime.toISOString()
            };
            await dbService.saveReminder(newReminder);

            // 2. Agenda no sistema do celular
            if (Capacitor.isNativePlatform()) {
                await LocalNotifications.schedule({
                    notifications: [
                        {
                            title,
                            body,
                            id,
                            schedule: { at: scheduledTime },
                            sound: undefined,
                            attachments: undefined,
                            actionTypeId: "",
                            extra: null
                        }
                    ]
                });
            }

            alert('Lembrete agendado!');
            setIsModalOpen(false);
            resetForm();
            loadReminders();
        } catch (e: any) {
            alert(`Erro ao agendar: ${e.message}`);
        }
    };

    const cancelReminder = async (id: number) => {
        if (!confirm("Deseja remover este lembrete?")) return;
        try {
            // 1. Remove do banco
            await dbService.deleteReminder(id);

            // 2. Cancela no sistema
            if (Capacitor.isNativePlatform()) {
                await LocalNotifications.cancel({ notifications: [{ id }] });
            }
            loadReminders();
        } catch (e) {
            console.error(e);
        }
    };

    const resetForm = () => {
        setTitle('');
        setBody('');
        setDate('');
        setTime('');
    };

    return (
        <div className="p-4 pb-20">
            <h2 className="text-2xl font-bold text-white mb-4">Lembretes</h2>

            {/* List */}
            <div className="space-y-4">
                {reminders.length === 0 ? (
                    <div className="text-gray-400 text-center mt-10">
                        Nenhum lembrete agendado.
                    </div>
                ) : (
                    reminders.map(r => (
                        <div key={r.id} className="bg-navy-800 p-4 rounded-xl border border-navy-700 flex justify-between items-center">
                            <div>
                                <h3 className="text-white font-bold">{r.title}</h3>
                                <p className="text-gray-400 text-sm">{r.body}</p>
                                <p className="text-primary-400 text-xs mt-1">
                                    {new Date(r.date).toLocaleString()}
                                </p>
                            </div>
                            <button
                                onClick={() => cancelReminder(r.id)}
                                className="p-2 text-red-400 hover:bg-navy-700 rounded-full"
                            >
                                <Icon name="trash" size={20} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* FAB */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-20 right-4 bg-primary-600 hover:bg-primary-500 text-white p-4 rounded-full shadow-xl shadow-primary-600/30 flex items-center justify-center z-30"
            >
                <Icon name="plus" size={24} />
            </button>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-navy-800 p-6 rounded-2xl w-full max-w-sm border border-navy-600 relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <Icon name="x" />
                        </button>

                        <h3 className="text-xl font-bold text-white mb-4">Novo Lembrete</h3>

                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Título"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-navy-900 text-white p-3 rounded-xl border border-navy-700 focus:border-primary-500 outline-none"
                            />
                            <textarea
                                placeholder="Detalhes (Opcional)"
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                className="w-full bg-navy-900 text-white p-3 rounded-xl border border-navy-700 focus:border-primary-500 outline-none h-24"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="bg-navy-900 text-white p-3 rounded-xl border border-navy-700 focus:border-primary-500 outline-none"
                                />
                                <input
                                    type="time"
                                    value={time}
                                    onChange={e => setTime(e.target.value)}
                                    className="bg-navy-900 text-white p-3 rounded-xl border border-navy-700 focus:border-primary-500 outline-none"
                                />
                            </div>

                            <button
                                onClick={scheduleReminder}
                                className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-xl mt-4 transition"
                            >
                                Agendar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
