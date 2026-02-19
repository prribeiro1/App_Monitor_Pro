import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Student, Payment, MaintenanceItem, Route, Stop } from '../types';
import { Icon } from '../components/Icon';
import { useI18n } from '../i18n';

interface DashboardScreenProps {
  onNavigate: (path: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const { t, language } = useI18n();
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [st, pay, maint, rt, sp] = await Promise.all([
          dbService.getStudents(),
          dbService.getPayments(),
          dbService.getMaintenanceItems(),
          dbService.getRoutes(),
          dbService.getStops()
        ]);

        // Filtrar alunos válidos (com rota existente)
        const validStudents = st.filter(student => {
          const routeId = student.routeId || sp.find(s => s.id === student.stopId)?.routeId;
          const route = rt.find(r => r.id === routeId);
          return student.active && route;
        });

        setStudents(validStudents);
        setPayments(pay);
        setMaintenanceItems(maint);
        setRoutes(rt);
        setStops(sp);
      } catch (error) {
        console.error("❌ Erro ao carregar dados do Dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    // Carregar inicialmente
    loadData();

    // Ouvir evento de sync concluído
    const handleSync = () => {
      console.log("🔄 Dashboard detectou sync, recarregando...");
      loadData();
    };

    window.addEventListener('db-synced', handleSync);

    return () => {
      window.removeEventListener('db-synced', handleSync);
    };
  }, []);

  // Aniversariantes de hoje
  const birthdaysToday = students.filter(s => {
    if (!s.birthDate) return false;
    const [year, month, day] = s.birthDate.split('-').map(Number);
    return today.getDate() === day && (today.getMonth() + 1) === month;
  });

  // Mensalidades atrasadas (mês atual, não pagas, passou do vencimento)
  const overduePayments = students.filter(s => {
    if (!s.dueDay) return false;
    const isPaid = payments.some(p => p.studentId === s.id && p.month === currentMonth && p.year === currentYear);
    return !isPaid && currentDay > s.dueDay;
  });

  // Próxima manutenção - calcular baseado no km atual
  const [currentKm, setCurrentKm] = useState(0);

  useEffect(() => {
    const loadKm = async () => {
      const settings = await dbService.getUserSettings();
      setCurrentKm(settings.currentKm || 0);
    };
    loadKm();
  }, []);

  const getNextMaintenance = () => {
    if (maintenanceItems.length === 0 || currentKm === 0) return null;

    // Calcular quanto falta para cada item
    const allItems = maintenanceItems
      .filter(m => m.intervalKm > 0 && m.lastKm > 0)
      .map(m => {
        const nextKm = m.lastKm + m.intervalKm;
        const remaining = nextKm - currentKm;
        return { ...m, remaining, nextKm };
      });

    if (allItems.length === 0) return null;

    // Separar itens vencidos (remaining <= 0) dos pendentes (remaining > 0)
    const overdueItems = allItems.filter(m => m.remaining <= 0);
    const pendingItems = allItems.filter(m => m.remaining > 0);

    // PRIORIDADE 1: Se houver itens vencidos, mostrar o mais atrasado (mais negativo)
    if (overdueItems.length > 0) {
      // Ordenar do mais atrasado (mais negativo) para o menos atrasado
      overdueItems.sort((a, b) => a.remaining - b.remaining);
      return overdueItems[0];
    }

    // PRIORIDADE 2: Se não houver vencidos, mostrar o mais próximo de vencer
    if (pendingItems.length > 0) {
      pendingItems.sort((a, b) => a.remaining - b.remaining);
      return pendingItems[0];
    }

    return null;
  };

  const nextMaintenance = getNextMaintenance();

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center h-64">
        <div className="text-gray-400">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">{t('dashboard_title')}</h2>
        <p className="text-gray-400 text-sm">
          {today.toLocaleDateString(language === 'es' ? 'es-ES' : 'pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div
          onClick={() => onNavigate('/students')}
          className="bg-navy-800 p-4 rounded-xl border border-navy-700 cursor-pointer hover:bg-navy-700/50 transition"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-primary-500/20 p-2 rounded-lg">
              <Icon name="users" size={18} className="text-primary-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{students.length}</p>
          <p className="text-xs text-gray-400">{t('dashboard_active_students')}</p>
        </div>

        <div
          onClick={() => onNavigate('/routes')}
          className="bg-navy-800 p-4 rounded-xl border border-navy-700 cursor-pointer hover:bg-navy-700/50 transition"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-accent-500/20 p-2 rounded-lg">
              <Icon name="map" size={18} className="text-accent-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{routes.length}</p>
          <p className="text-xs text-gray-400">{t('dashboard_routes')}</p>
        </div>
      </div>

      {/* Aniversariantes */}
      {birthdaysToday.length > 0 && (
        <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-4 mb-4">
          <h3 className="text-pink-400 font-bold text-sm flex items-center gap-2 mb-3">
            🎂 {t('dashboard_birthdays_today')}
          </h3>
          <div className="space-y-2">
            {birthdaysToday.map(student => (
              <div key={student.id} className="flex items-center gap-2 text-white">
                <span className="text-pink-300">•</span>
                <span>{student.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensalidades Atrasadas */}
      {overduePayments.length > 0 && (
        <div
          onClick={() => onNavigate('/financial')}
          className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 cursor-pointer hover:bg-red-500/20 transition"
        >
          <h3 className="text-red-400 font-bold text-sm flex items-center gap-2 mb-2">
            <Icon name="alert-triangle" size={16} />
            {t('dashboard_overdue_payments')}
          </h3>
          <p className="text-2xl font-bold text-red-400">{overduePayments.length}</p>
          <p className="text-xs text-gray-400">{language === 'es' ? 'alumno(s) con pago pendiente' : `aluno${overduePayments.length > 1 ? 's' : ''} com pagamento pendente`}</p>
        </div>
      )}

      {/* Próxima Manutenção */}
      {nextMaintenance && (
        <div
          onClick={() => onNavigate('/maintenance')}
          className={`${nextMaintenance.remaining <= 0
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-orange-500/10 border-orange-500/30'
            } border rounded-xl p-4 mb-4 cursor-pointer hover:opacity-80 transition`}
        >
          <h3 className={`${nextMaintenance.remaining <= 0 ? 'text-red-400' : 'text-orange-400'} font-bold text-sm flex items-center gap-2 mb-2`}>
            <Icon name={nextMaintenance.remaining <= 0 ? 'alert-triangle' : 'tool'} size={16} />
            {nextMaintenance.remaining <= 0
              ? (language === 'es' ? '⚠️ Mantenimiento Atrasado!' : '⚠️ Manutenção Atrasada!')
              : t('dashboard_next_maintenance')
            }
          </h3>
          <p className="text-white font-medium">{nextMaintenance.name}</p>
          <p className={`text-xs ${nextMaintenance.remaining <= 0 ? 'text-red-300' : 'text-gray-400'}`}>
            {nextMaintenance.remaining > 0
              ? t('maintenance_remaining', { km: nextMaintenance.remaining.toLocaleString() })
              : t('maintenance_overdue', { km: Math.abs(nextMaintenance.remaining).toLocaleString() })
            }
            {nextMaintenance.nextKm && ` (${language === 'es' ? 'próx' : 'próx'}: ${nextMaintenance.nextKm.toLocaleString()} km)`}
          </p>
        </div>
      )}

      {/* Atalhos Rápidos */}
      <div className="mt-6">
        <h3 className="text-gray-400 text-xs font-bold uppercase mb-3">{t('dashboard_quick_access')}</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate('/attendance')}
            className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl text-left hover:bg-green-500/20 transition"
          >
            <Icon name="check" size={24} className="text-green-400 mb-2" />
            <p className="text-white font-medium">{t('dashboard_attendance')}</p>
            <p className="text-xs text-gray-400">{t('dashboard_do_attendance')}</p>
          </button>

          <button
            onClick={() => onNavigate('/financial')}
            className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl text-left hover:bg-blue-500/20 transition"
          >
            <Icon name="dollar-sign" size={24} className="text-blue-400 mb-2" />
            <p className="text-white font-medium">{t('dashboard_financial')}</p>
            <p className="text-xs text-gray-400">{t('dashboard_payment_control')}</p>
          </button>
        </div>
      </div>
    </div>
  );
};
