const fs = require('fs');

const backupFile = 'Backup Monitor Escolar.json';
const userEmail = '11967819654@monitorescolar.app';
const outputFile = 'FIX_USER_DATA.sql';

const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

let sql = `
-- =====================================================
-- SCRIPT DE RECUPERAÇÃO DE DADOS - MONITOR ESCOLAR PRO
-- Usuário: ${userEmail}
-- =====================================================

DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- 1. Buscar o ID do usuário
    SELECT id INTO target_user_id FROM auth.users WHERE email = '${userEmail}';
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário ${userEmail} não encontrado no Supabase Auth.';
    END IF;

    RAISE NOTICE 'Iniciando restauração para o usuário % (%)', '${userEmail}', target_user_id;

    -- 2. Limpar dados antigos (para evitar conflitos de PK ou duplicidade)
    -- As FKs estão com ON DELETE CASCADE, então deletar das tabelas principais limpa o resto
    DELETE FROM public.routes WHERE user_id = target_user_id;
    DELETE FROM public.user_settings WHERE user_id = target_user_id;
    DELETE FROM public.reminders WHERE user_id = target_user_id;

    -- 3. Restaurar Rotas
`;

// Routes
data.routes.forEach(r => {
    sql += `    INSERT INTO public.routes (id, user_id, name, "order") VALUES ('${r.id}', target_user_id, '${r.name.replace(/'/g, "''")}', ${r.order || 0});\n`;
});

sql += `\n    -- 4. Restaurar Pontos (Stops)\n`;
data.stops.forEach(s => {
    const lat = s.latitude || 'NULL';
    const lon = s.longitude || 'NULL';
    sql += `    INSERT INTO public.stops (id, user_id, route_id, name, "order", latitude, longitude) VALUES ('${s.id}', target_user_id, '${s.routeId}', '${s.name.replace(/'/g, "''")}', ${s.order || 0}, ${lat}, ${lon});\n`;
});

sql += `\n    -- 5. Restaurar Alunos (Students)\n`;
data.students.forEach(s => {
    const stopId = s.stopId ? `'${s.stopId}'` : 'NULL';
    const routeId = s.routeId ? `'${s.routeId}'` : s.stopId ? `(SELECT route_id FROM public.stops WHERE id = '${s.stopId}')` : 'NULL';
    const fees = s.monthlyFees || 0;
    const due = s.dueDay || 10;
    const active = s.active ? 'TRUE' : 'FALSE';

    sql += `    INSERT INTO public.students (id, user_id, stop_id, route_id, name, active, guardian_name, responsible_cpf, responsible_phone, monthly_fees, due_day, school, shift, "order") 
    VALUES ('${s.id}', target_user_id, ${stopId}, ${routeId}, '${s.name.replace(/'/g, "''")}', ${active}, '${(s.guardianName || '').replace(/'/g, "''")}', '${s.responsibleCpf || ''}', '${s.responsiblePhone || ''}', ${fees}, ${due}, '${(s.school || '').replace(/'/g, "''")}', '${s.shift || ''}', ${s.order || 0});\n`;
});

sql += `\n    -- 6. Restaurar Chamada (Attendance)\n`;
data.attendance.forEach(a => {
    sql += `    INSERT INTO public.attendance (id, user_id, student_id, date, status, timestamp) VALUES ('${a.id}', target_user_id, '${a.studentId}', '${a.date}', '${a.status}', ${a.timestamp});\n`;
});

sql += `\n    -- 7. Restaurar Pagamentos (Payments)\n`;
data.payments.forEach(p => {
    sql += `    INSERT INTO public.payments (id, user_id, student_id, month, year, amount, paid_at, timestamp) VALUES ('${p.id}', target_user_id, '${p.studentId}', ${p.month}, ${p.year}, ${p.amount}, '${p.paidAt}', ${p.timestamp});\n`;
});

sql += `\n    -- 8. Restaurar Configurações (UserSettings)\n`;
if (data.userSettings) {
    const km = data.userSettings.currentKm || 0;
    sql += `    INSERT INTO public.user_settings (id, user_id, current_km) VALUES ('settings', target_user_id, ${km}) ON CONFLICT (id, user_id) DO UPDATE SET current_km = EXCLUDED.current_km;\n`;
}

sql += `
    RAISE NOTICE 'Restauração concluída com sucesso!';
END $$;
`;

fs.writeFileSync(outputFile, sql);
console.log('SQL gerado com sucesso em ' + outputFile);
