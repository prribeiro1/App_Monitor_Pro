import { supabase } from './auth';
import { Route, Stop, Student, AttendanceRecord, Payment, MaintenanceItem, MaintenanceLog, UserSettings, Incident, VehicleDocument } from '../types';

export const cloudSync = {
    // Alunos
    saveStudent: async (student: Student) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Helper para limpar UUIDs vazios que causam erro no Postgres/Supabase
        const cleanUUID = (id: string | undefined | null) => (id && id.trim() !== '') ? id : null;

        const { error } = await supabase
            .from('students')
            .upsert({
                id: student.id,
                user_id: user.id,
                name: student.name,
                active: student.active,
                guardian_name: student.guardianName,
                contact: student.contact,
                responsible_cpf: student.responsibleCpf,
                responsible_email: student.responsibleEmail,
                responsible_phone: student.responsiblePhone,
                school: student.school,
                shift: student.shift,
                due_day: student.dueDay,
                monthly_fees: student.monthlyFees,
                stop_id: cleanUUID(student.stopId),
                route_id: cleanUUID(student.routeId),
                address: student.address,
                latitude: student.latitude,
                longitude: student.longitude,
                route_order: student.routeOrder,
                estimated_pickup_time: student.estimatedPickupTime,
                estimated_drop_time: student.estimatedDropTime,
                birth_date: student.birthDate,
                observation: student.observation,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error("Erro sync cloud (student):", error.message);
            throw error;
        }
    },

    deleteStudent: async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        const query = supabase.from('students').delete().eq('id', id);
        if (user) query.eq('user_id', user.id);
        const { error } = await query;
        if (error) throw error;
    },

    // Rotas
    saveRoute: async (route: Route) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('routes').upsert({
            id: route.id,
            user_id: user.id,
            name: route.name,
            description: route.description,
            order: route.order,
            updated_at: new Date().toISOString()
        });
        if (error) throw error;
    },

    deleteRoute: async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        const query = supabase.from('routes').delete().eq('id', id);
        if (user) query.eq('user_id', user.id);
        const { error } = await query;
        if (error) throw error;
    },

    // Pontos (Stops)
    saveStop: async (stop: Stop) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const cleanUUID = (id: string | undefined | null) => (id && id.trim() !== '') ? id : null;

        const { error } = await supabase.from('stops').upsert({
            id: stop.id,
            user_id: user.id,
            route_id: cleanUUID(stop.routeId),
            name: stop.name,
            order: stop.order,
            latitude: stop.latitude,
            longitude: stop.longitude,
            updated_at: new Date().toISOString()
        });
        if (error) {
            console.error("Erro sync cloud (stop):", error.message);
            throw error;
        }
    },

    deleteStop: async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        const query = supabase.from('stops').delete().eq('id', id);
        if (user) query.eq('user_id', user.id);
        const { error } = await query;
        if (error) throw error;
    },

    // Chamada (Attendance)
    saveAttendance: async (record: AttendanceRecord) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('attendance').upsert({
            id: record.id,
            user_id: user.id,
            student_id: record.studentId,
            date: record.date,
            status: record.status,
            timestamp: record.timestamp
        });
        if (error) throw error;
    },

    // Pagamentos (Payments)
    savePayment: async (payment: Payment) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('payments').upsert({
            id: payment.id,
            user_id: user.id,
            student_id: payment.studentId,
            month: payment.month,
            year: payment.year,
            amount: payment.amount,
            paid_at: payment.paidAt,
            timestamp: payment.timestamp
        });
        if (error) throw error;
    },

    // Ocorrências (Incidents)
    saveIncident: async (incident: Incident) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('incidents').upsert({
            id: incident.id,
            user_id: user.id,
            student_id: incident.studentId,
            type: incident.type,
            observation: incident.observation,
            date: incident.date,
            timestamp: incident.timestamp
        });
    },

    // Manutenção
    saveMaintenanceItem: async (item: MaintenanceItem) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('maintenance_items').upsert({
            id: item.id,
            user_id: user.id,
            name: item.name,
            interval_km: item.intervalKm,
            interval_months: item.intervalMonths,
            last_km: item.lastKm,
            last_date: item.lastDate,
            next_km: item.nextKm,
            next_date: item.nextDate
        });
    },

    saveMaintenanceLog: async (log: MaintenanceLog) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const cleanUUID = (id: string | undefined | null) => (id && id.trim() !== '') ? id : null;

        await supabase.from('maintenance_logs').upsert({
            id: log.id,
            user_id: user.id,
            item_id: cleanUUID(log.itemId),
            date: log.date,
            km: log.km,
            cost: log.cost,
            notes: log.notes
        });
    },

    // Perfil e Contrato
    saveUserSettings: async (settings: UserSettings) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // Na nuvem a PK agora é o user_id para evitar conflitos!
        await supabase.from('user_settings').upsert({
            user_id: user.id,
            id: 'settings',
            current_km: settings.currentKm,
            pix_key: settings.pixKey,
            driver_name: settings.driverName,
            driver_nickname: settings.driverNickname,
            driver_cpf: settings.driverCpf,
            driver_phone: settings.driverPhone,
            driver_email: settings.driverEmail,
            driver_address: settings.driverAddress,
            driver_signature: settings.driverSignature,
            contract_clauses: settings.contractClauses,
            subscription_tier: settings.subscriptionTier
        });
    },

    // Lembretes
    saveReminder: async (reminder: any) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('reminders').upsert({
            id: reminder.id,
            user_id: user.id,
            title: reminder.title,
            body: reminder.body,
            date: reminder.date
        });
    },

    deleteReminder: async (id: number) => {
        const { data: { user } } = await supabase.auth.getUser();
        const query = supabase.from('reminders').delete().eq('id', id);
        if (user) query.eq('user_id', user.id);
        await query;
    },

    // Documentos de Veículo
    saveVehicleDocument: async (doc: VehicleDocument) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { error } = await supabase.from('vehicle_documents').upsert({
            id: doc.id,
            user_id: user.id,
            name: doc.name,
            type: doc.type,
            path: doc.path,
            size: doc.size,
            date: doc.date
        });
        if (error) {
            console.error('Erro sync cloud (vehicle_document):', error.message);
            throw error;
        }
    },

    deleteVehicleDocument: async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        const query = supabase.from('vehicle_documents').delete().eq('id', id);
        if (user) query.eq('user_id', user.id);
        const { error } = await query;
        if (error) throw error;
    },

    // 🆕 ROUTE SESSIONS (Nova Estrutura)
    saveRouteSession: async (session: any) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const cleanUUID = (id: string | undefined | null) => (id && id.trim() !== '') ? id : null;

        const { error } = await supabase.from('route_sessions').upsert({
            id: session.id,
            user_id: user.id,
            route_id: cleanUUID(session.routeId),
            date: session.date,
            type: session.type,
            start_time: session.startTime,
            end_time: session.endTime,
            skipped_students: session.skippedStudents,
            status: session.status,
            updated_at: new Date().toISOString()
        });
        if (error) {
            console.error('Erro sync cloud (route_session):', error.message);
            throw error;
        }
    },

    deleteRouteSession: async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        const query = supabase.from('route_sessions').delete().eq('id', id);
        if (user) query.eq('user_id', user.id);
        const { error } = await query;
        if (error) throw error;
    },

    // 🆕 ROUTE EVENTS (Nova Estrutura)
    saveRouteEvent: async (event: any) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const cleanUUID = (id: string | undefined | null) => (id && id.trim() !== '') ? id : null;

        const { error } = await supabase.from('route_events').upsert({
            id: event.id,
            user_id: user.id,
            session_id: cleanUUID(event.sessionId),
            student_id: cleanUUID(event.studentId),
            event_type: event.eventType,
            timestamp: event.timestamp,
            latitude: event.latitude,
            longitude: event.longitude,
            notes: event.notes
        });
        if (error) {
            console.error('Erro sync cloud (route_event):', error.message);
            throw error;
        }
    },

    deleteRouteEvent: async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        const query = supabase.from('route_events').delete().eq('id', id);
        if (user) query.eq('user_id', user.id);
        const { error } = await query;
        if (error) throw error;
    },

    // FUNÇÃO PRINCIPAL: Puxar tudo da nuvem para o celular
    pullAllData: async (): Promise<any> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error("❌ pullAllData: Usuário não encontrado");
                return null;
            }

            console.log("✅ Iniciando PULL de dados da nuvem para usuário:", user.id);

            const [studentsRes, routesRes, stopsRes, attendanceRes, paymentsRes, settingsRes, maintRes, logsRes, incidentRes, reminderRes, vehicleDocsRes, routeSessionsRes, routeEventsRes] = await Promise.all([
                supabase.from('students').select('*').eq('user_id', user.id),
                supabase.from('routes').select('*').eq('user_id', user.id).order('order'),
                supabase.from('stops').select('*').eq('user_id', user.id).order('order'),
                supabase.from('attendance').select('*').eq('user_id', user.id),
                supabase.from('payments').select('*').eq('user_id', user.id),
                supabase.from('user_settings').select('*').eq('user_id', user.id).eq('id', 'settings').single(),
                supabase.from('maintenance_items').select('*').eq('user_id', user.id),
                supabase.from('maintenance_logs').select('*').eq('user_id', user.id),
                supabase.from('incidents').select('*').eq('user_id', user.id),
                supabase.from('reminders').select('*').eq('user_id', user.id),
                supabase.from('vehicle_documents').select('*').eq('user_id', user.id),
                supabase.from('route_sessions').select('*').eq('user_id', user.id), // 🆕
                supabase.from('route_events').select('*').eq('user_id', user.id) // 🆕
            ]);

            // 🔍 LOG DETALHADO DE CADA QUERY
            console.log("📊 Resultados das queries:");
            console.log("  students:", studentsRes.error ? `❌ ${studentsRes.error.message}` : `✅ ${studentsRes.data?.length || 0} registros`);
            console.log("  routes:", routesRes.error ? `❌ ${routesRes.error.message}` : `✅ ${routesRes.data?.length || 0} registros`);
            console.log("  stops:", stopsRes.error ? `❌ ${stopsRes.error.message}` : `✅ ${stopsRes.data?.length || 0} registros`);
            console.log("  attendance:", attendanceRes.error ? `❌ ${attendanceRes.error.message}` : `✅ ${attendanceRes.data?.length || 0} registros`);
            console.log("  payments:", paymentsRes.error ? `❌ ${paymentsRes.error.message}` : `✅ ${paymentsRes.data?.length || 0} registros`);
            console.log("  user_settings:", settingsRes.error ? `❌ ${settingsRes.error.message}` : `✅ OK`);
            console.log("  maintenance_items:", maintRes.error ? `❌ ${maintRes.error.message}` : `✅ ${maintRes.data?.length || 0} registros`);
            console.log("  maintenance_logs:", logsRes.error ? `❌ ${logsRes.error.message}` : `✅ ${logsRes.data?.length || 0} registros`);
            console.log("  incidents:", incidentRes.error ? `❌ ${incidentRes.error.message}` : `✅ ${incidentRes.data?.length || 0} registros`);
            console.log("  reminders:", reminderRes.error ? `❌ ${reminderRes.error.message}` : `✅ ${reminderRes.data?.length || 0} registros`);
            console.log("  vehicle_documents:", vehicleDocsRes.error ? `❌ ${vehicleDocsRes.error.message}` : `✅ ${vehicleDocsRes.data?.length || 0} registros`);
            console.log("  route_sessions:", routeSessionsRes.error ? `❌ ${routeSessionsRes.error.message}` : `✅ ${routeSessionsRes.data?.length || 0} registros`);
            console.log("  route_events:", routeEventsRes.error ? `❌ ${routeEventsRes.error.message}` : `✅ ${routeEventsRes.data?.length || 0} registros`);

            // 🚨 SE HOUVER ERRO EM ALGUMA QUERY, LOGAR E CONTINUAR
            if (studentsRes.error) console.error("❌ Erro em students:", studentsRes.error);
            if (routesRes.error) console.error("❌ Erro em routes:", routesRes.error);
            if (stopsRes.error) console.error("❌ Erro em stops:", stopsRes.error);
            if (attendanceRes.error) console.error("❌ Erro em attendance:", attendanceRes.error);
            if (paymentsRes.error) console.error("❌ Erro em payments:", paymentsRes.error);
            if (settingsRes.error) console.error("❌ Erro em user_settings:", settingsRes.error);
            if (maintRes.error) console.error("❌ Erro em maintenance_items:", maintRes.error);
            if (logsRes.error) console.error("❌ Erro em maintenance_logs:", logsRes.error);
            if (incidentRes.error) console.error("❌ Erro em incidents:", incidentRes.error);
            if (reminderRes.error) console.error("❌ Erro em reminders:", reminderRes.error);
            if (vehicleDocsRes.error) console.error("❌ Erro em vehicle_documents:", vehicleDocsRes.error);
            if (routeSessionsRes.error) console.error("❌ Erro em route_sessions:", routeSessionsRes.error);
            if (routeEventsRes.error) console.error("❌ Erro em route_events:", routeEventsRes.error);

            return {
                students: studentsRes.data?.map(s => ({
                    id: s.id,
                    name: s.name,
                    active: s.active,
                    guardianName: s.guardian_name,
                    contact: s.contact,
                    responsibleCpf: s.responsible_cpf,
                    responsibleEmail: s.responsible_email,
                    responsiblePhone: s.responsible_phone,
                    school: s.school,
                    shift: s.shift,
                    dueDay: s.due_day,
                    monthlyFees: s.monthly_fees ? parseFloat(s.monthly_fees) : 0,
                    stopId: s.stop_id,
                    routeId: s.route_id, // 🆕
                    address: s.address, // 🆕
                    latitude: s.latitude, // 🆕
                    longitude: s.longitude, // 🆕
                    routeOrder: s.route_order, // 🆕
                    estimatedPickupTime: s.estimated_pickup_time, // 🆕
                    estimatedDropTime: s.estimated_drop_time, // 🆕
                    birthDate: s.birth_date,
                    observation: s.observation
                })) || [],
                routes: routesRes.data || [],
                stops: stopsRes.data?.map(s => ({
                    id: s.id,
                    routeId: s.route_id,
                    name: s.name,
                    order: s.order,
                    latitude: s.latitude,
                    longitude: s.longitude
                })) || [],
                attendance: attendanceRes.data?.map(a => ({
                    id: a.id,
                    studentId: a.student_id,
                    date: a.date,
                    status: a.status,
                    timestamp: Number(a.timestamp)
                })) || [],
                payments: paymentsRes.data?.map(p => ({
                    id: p.id,
                    studentId: p.student_id,
                    month: p.month,
                    year: p.year,
                    amount: parseFloat(p.amount),
                    paidAt: p.paid_at,
                    timestamp: Number(p.timestamp)
                })) || [],
                incidents: incidentRes.data?.map(i => ({
                    id: i.id,
                    studentId: i.student_id,
                    type: i.type,
                    observation: i.observation,
                    date: i.date,
                    timestamp: Number(i.timestamp)
                })) || [],
                maintenanceItems: maintRes.data?.map(m => ({
                    id: m.id,
                    name: m.name,
                    intervalKm: m.interval_km,
                    intervalMonths: m.interval_months,
                    lastKm: m.last_km,
                    lastDate: m.last_date,
                    nextKm: m.next_km,
                    nextDate: m.next_date
                })) || [],
                maintenanceLogs: logsRes.data?.map(l => ({
                    id: l.id,
                    itemId: l.item_id,
                    date: l.date,
                    km: l.km,
                    cost: parseFloat(l.cost || 0),
                    notes: l.notes
                })) || [],
                reminders: reminderRes.data?.map(r => ({
                    id: r.id,
                    title: r.title,
                    body: r.body,
                    date: r.date
                })) || [],
                vehicleDocuments: vehicleDocsRes.data?.map(d => ({
                    id: d.id,
                    name: d.name,
                    type: d.type,
                    path: d.path,
                    size: d.size,
                    date: d.date
                })) || [],
                routeSessions: routeSessionsRes.data?.map(rs => ({ // 🆕
                    id: rs.id,
                    routeId: rs.route_id,
                    userId: rs.user_id,
                    date: rs.date,
                    type: rs.type,
                    startTime: rs.start_time,
                    endTime: rs.end_time,
                    skippedStudents: rs.skipped_students,
                    status: rs.status,
                    createdAt: rs.created_at,
                    updatedAt: rs.updated_at
                })) || [],
                routeEvents: routeEventsRes.data?.map(re => ({ // 🆕
                    id: re.id,
                    sessionId: re.session_id,
                    studentId: re.student_id,
                    userId: re.user_id,
                    eventType: re.event_type,
                    timestamp: re.timestamp,
                    latitude: re.latitude,
                    longitude: re.longitude,
                    notes: re.notes,
                    createdAt: re.created_at
                })) || [],
                userSettings: settingsRes.data ? {
                    id: 'settings',
                    currentKm: settingsRes.data.current_km,
                    pixKey: settingsRes.data.pix_key,
                    driverName: settingsRes.data.driver_name,
                    driverNickname: settingsRes.data.driver_nickname,
                    driverCpf: settingsRes.data.driver_cpf,
                    driverPhone: settingsRes.data.driver_phone,
                    driverEmail: settingsRes.data.driver_email,
                    driverAddress: settingsRes.data.driver_address,
                    driverSignature: settingsRes.data.driver_signature,
                    contractClauses: settingsRes.data.contract_clauses,
                    subscriptionTier: settingsRes.data.subscription_tier
                } : null
            };
        } catch (error) {
            console.error("❌❌❌ Erro crítico ao puxar dados da nuvem:", error);
            console.error("Stack trace:", error);
            alert("ERRO AO CARREGAR DADOS: " + (error as any).message);
            return null;
        }
    },

    // Deletar todos os dados do usuário na nuvem (para exclusão de conta)
    deleteUserCloudData: async (): Promise<boolean> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            console.log("🗑️ Deletando dados do usuário na nuvem...", user.id);

            // Deletar em ordem para evitar problemas de FK
            await supabase.from('route_events').delete().eq('user_id', user.id); // 🆕
            await supabase.from('route_sessions').delete().eq('user_id', user.id); // 🆕
            await supabase.from('vehicle_documents').delete().eq('user_id', user.id);
            await supabase.from('maintenance_logs').delete().eq('user_id', user.id);
            await supabase.from('maintenance_items').delete().eq('user_id', user.id);
            await supabase.from('attendance').delete().eq('user_id', user.id);
            await supabase.from('payments').delete().eq('user_id', user.id);
            await supabase.from('incidents').delete().eq('user_id', user.id);
            await supabase.from('students').delete().eq('user_id', user.id);
            await supabase.from('stops').delete().eq('user_id', user.id);
            await supabase.from('routes').delete().eq('user_id', user.id);
            await supabase.from('user_settings').delete().eq('user_id', user.id);
            await supabase.from('reminders').delete().eq('user_id', user.id);
            await supabase.from('expenses').delete().eq('user_id', user.id);

            console.log("✅ Dados do usuário deletados da nuvem com sucesso");

            // Tentar deletar a conta do Auth (libera o username)
            await cloudSync.deleteAuthAccount();

            return true;
        } catch (error) {
            console.error("❌ Erro ao deletar dados da nuvem:", error);
            return false;
        }
    },

    // Deletar a conta do Supabase Auth (libera o username para reuso)
    deleteAuthAccount: async (): Promise<boolean> => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return false;

            console.log("🗑️ Deletando conta do Auth...");

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.warn("⚠️ Não foi possível deletar conta do Auth:", errorData);
                return false;
            }

            console.log("✅ Conta do Auth deletada, username liberado");
            return true;
        } catch (error) {
            console.warn("⚠️ Erro ao deletar conta do Auth (username pode permanecer reservado):", error);
            return false;
        }
    },

    // Buscar constantes do app (preços, links, etc)
    getAppConstants: async (): Promise<any> => {
        const { data, error } = await supabase.from('app_constants').select('*');
        if (error) return null;

        // Transforma o array em um objeto chave-valor
        return data.reduce((acc, item) => ({ ...acc, [item.key]: item.value }), {});
    }
};
