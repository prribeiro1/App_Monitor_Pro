import React, { useState, useEffect, PropsWithChildren, useRef } from 'react';
import { SignaturePad } from './components/SignaturePad';
import { Capacitor } from '@capacitor/core';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Icon, IconName } from './components/Icon';
import { RoutesScreen } from './pages/RoutesScreen';
import { StopsScreen } from './pages/StopsScreen';
import { StudentsScreen } from './pages/StudentsScreen';
import { AttendanceScreen } from './pages/AttendanceScreen';
import { IncidentsScreen } from './pages/IncidentsScreen';
import { ReportsScreen } from './pages/ReportsScreen';
import { RemindersScreen } from './pages/RemindersScreen';
import { TeamScreen } from './pages/TeamScreen';
import { FinancialScreen } from './pages/FinancialScreen';
import { MaintenanceScreen } from './pages/MaintenanceScreen';
import { ContractScreen } from './pages/ContractScreen';
import { ContractTemplateScreen } from './pages/ContractTemplateScreen';
import { LandingScreen } from './pages/LandingScreen';
import { LoginScreen } from './pages/LoginScreen';
import { PublicSignaturePage } from './pages/PublicSignaturePage';
import { dbService } from './services/db';
import { UserSettings } from './types';
import { backupRepository } from './services/BackupRepository';
import { authService, supabase } from './services/auth';
import { Session } from '@supabase/supabase-js';
import { LocalNotifications } from '@capacitor/local-notifications';

// Declare global property on window object to fix TypeScript errors
declare global {
  interface Window {
    Capacitor: any;
  }
}

// --- Layout Components ---
interface BottomNavItemProps {
  to: string;
  icon: IconName;
  label: string;
  active: boolean;
}

const BottomNavItem: React.FC<BottomNavItemProps> = ({ to, icon, label, active }) => {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(to)}
      className={`flex flex-col items-center justify-center w-full h-full cursor-pointer transition-colors ${active ? 'text-primary-500' : 'text-gray-400'}`}
    >
      <Icon name={icon} size={20} />
      <span className="text-[10px] mt-1 font-medium">{label}</span>
    </div>
  );
};

interface LayoutProps {
  onBackup: () => void;
  onImport: (file: File) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  isBackupLoading: boolean;
  permissions: Record<string, boolean>;
  settings: UserSettings | null;
  onSaveSettings: (settings: UserSettings) => Promise<void>;
}

const Layout: React.FC<PropsWithChildren<LayoutProps>> = ({ children, onBackup, onImport, onLogout, onDeleteAccount, isBackupLoading, permissions, settings, onSaveSettings }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditContractOpen, setIsEditContractOpen] = useState(false);

  // Profile Form State
  const [profName, setProfName] = useState('');
  const [profNickname, setProfNickname] = useState('');
  const [profCpf, setProfCpf] = useState('');
  const [profPhone, setProfPhone] = useState('');
  const [profPix, setProfPix] = useState('');
  const [profAddress, setProfAddress] = useState('');
  const [profSignature, setProfSignature] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setProfName(settings.driverName || '');
      setProfNickname(settings.driverNickname || '');
      setProfCpf(settings.driverCpf || '');
      setProfPhone(settings.driverPhone || '');
      setProfPix(settings.pixKey || '');
      setProfAddress(settings.driverAddress || '');
      setProfSignature(settings.driverSignature || '');
    }
  }, [settings]);

  const handleSaveProfile = async () => {
    if (!settings) return;
    const updated: UserSettings = {
      ...settings,
      driverName: profName,
      driverNickname: profNickname,
      driverCpf: profCpf,
      driverPhone: profPhone,
      pixKey: profPix,
      driverAddress: profAddress,
      driverSignature: profSignature
    };
    await onSaveSettings(updated);
    setIsEditProfileOpen(false);
    alert("Perfil atualizado com sucesso!");
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (confirm("ATENÇÃO: Importar um backup irá APAGAR todos os dados atuais e substituir pelos do arquivo. Deseja continuar?")) {
        onImport(file);
      }
      // Reset input
      event.target.value = '';
    }
  };

  const allTabs = [
    { path: '/routes', icon: 'map' as IconName, label: 'Rotas', key: 'routes' },
    { path: '/stops', icon: 'map-pin' as IconName, label: 'Pontos', key: 'stops' },
    { path: '/students', icon: 'users' as IconName, label: 'Alunos', key: 'students' },
    { path: '/attendance', icon: 'check' as IconName, label: 'Chamada', key: 'attendance' },
    { path: '/incidents', icon: 'alert-triangle' as IconName, label: 'Ocor.', key: 'incidents' },
    { path: '/reports', icon: 'bar-chart' as IconName, label: 'Relat.', key: 'reports' },
    { path: '/financial', icon: 'dollar-sign' as IconName, label: 'Financ.', key: 'financial' },
  ];

  const tabs = allTabs.filter(t => permissions[t.key]);

  return (
    <div className="flex flex-col h-screen bg-navy-900 text-gray-100 overflow-hidden">
      {/* Header */}
      <header className="bg-navy-800 px-4 pb-4 shadow-lg flex justify-between items-center z-10" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2">
          <Icon name="face" className="text-primary-500" size={28} />
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            {settings?.driverNickname || 'Monitor Escolar'}
          </h1>
        </div>
        <div className="flex gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 bg-gray-700/50 text-gray-300 rounded-full hover:bg-gray-700 transition"
            title="Configurações"
          >
            <Icon name="settings" size={20} />
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="bg-navy-800 p-6 rounded-2xl w-full max-w-sm border border-navy-700 shadow-2xl max-h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Configurações</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-white">
                <Icon name="x" size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-navy-900 rounded-xl border border-navy-700">
                <h4 className="text-gray-400 text-sm font-bold mb-3 uppercase">Perfil e Dados</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setIsEditProfileOpen(true);
                    }}
                    className="flex flex-col items-center justify-center p-3 bg-primary-500/10 text-primary-400 rounded-lg hover:bg-primary-500/20 transition col-span-2"
                  >
                    <Icon name="user" size={24} className="mb-1" />
                    <span className="text-xs font-bold">Editar Meu Perfil</span>
                  </button>

                  {permissions.team && (
                    <button
                      onClick={() => {
                        setIsSettingsOpen(false);
                        navigate('/team');
                      }}
                      className="flex flex-col items-center justify-center p-3 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition col-span-2"
                    >
                      <Icon name="users" size={24} className="mb-1" />
                      <span className="text-xs font-bold">Gerenciar Equipe</span>
                    </button>
                  )}

                  {permissions.reminders && (
                    <button
                      onClick={() => {
                        setIsSettingsOpen(false);
                        navigate('/reminders');
                      }}
                      className="flex flex-col items-center justify-center p-3 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition col-span-2"
                    >
                      <Icon name="bell" size={24} className="mb-1" />
                      <span className="text-xs font-bold">Lembretes</span>
                    </button>
                  )}

                  {permissions.maintenance && (
                    <button
                      onClick={() => {
                        setIsSettingsOpen(false);
                        navigate('/maintenance');
                      }}
                      className="flex flex-col items-center justify-center p-3 bg-teal-500/10 text-teal-400 rounded-lg hover:bg-teal-500/20 transition col-span-2"
                    >
                      <Icon name="tool" size={24} className="mb-1" />
                      <span className="text-xs font-bold">Manutenção</span>
                    </button>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-3 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition"
                  >
                    <Icon name="download" size={24} className="mb-1" />
                    <span className="text-xs font-bold">Importar</span>
                  </button>
                  <button
                    onClick={onBackup}
                    disabled={isBackupLoading}
                    className="flex flex-col items-center justify-center p-3 bg-accent-500/10 text-accent-500 rounded-lg hover:bg-accent-500/20 transition"
                  >
                    <Icon name={isBackupLoading ? "save" : "cloud-upload"} size={24} className="mb-1" />
                    <span className="text-xs font-bold">Backup</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      navigate('/contracts');
                    }}
                    className="flex flex-col items-center justify-center p-3 bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500/20 transition"
                  >
                    <Icon name="file-text" size={24} className="mb-1" />
                    <span className="text-xs font-bold">Contratos</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setIsEditContractOpen(true);
                    }}
                    className="flex flex-col items-center justify-center p-3 bg-orange-500/10 text-orange-400 rounded-lg hover:bg-orange-500/20 transition"
                  >
                    <Icon name="pencil" size={24} className="mb-1" />
                    <span className="text-xs font-bold">Editar Cláusulas</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-navy-900 rounded-xl border border-navy-700">
                <h4 className="text-gray-400 text-sm font-bold mb-3 uppercase">Conta</h4>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 p-3 text-gray-300 hover:bg-navy-800 rounded-lg transition mb-2"
                >
                  <Icon name="log-out" size={20} />
                  <span>Sair da Conta</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm("ATENÇÃO: Isso apagará TODOS os dados locais (alunos, rotas, etc) e desconectará sua conta. Esta ação não pode ser desfeita sem um backup. Tem certeza?")) {
                      onDeleteAccount();
                    }
                  }}
                  className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-red-900/20 rounded-lg transition border border-transparent hover:border-red-900/50"
                >
                  <Icon name="trash" size={20} />
                  <span>Excluir Minha Conta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="bg-navy-800 p-6 rounded-2xl w-full max-w-sm border border-navy-700 shadow-2xl overflow-y-auto max-h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Editar Meu Perfil</h3>
              <button onClick={() => setIsEditProfileOpen(false)} className="text-gray-400 hover:text-white">
                <Icon name="x" size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold">Nome Completo</label>
                <input
                  type="text"
                  value={profName}
                  onChange={e => setProfName(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg mt-1 outline-none focus:border-primary-500 transition"
                  placeholder="Nome usado no contrato"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold">Apelido (Exibição Superior)</label>
                <input
                  type="text"
                  value={profNickname}
                  onChange={e => setProfNickname(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg mt-1 outline-none focus:border-primary-500 transition"
                  placeholder="Ex: Tio João"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold">CPF / CNPJ</label>
                <input
                  type="text"
                  value={profCpf}
                  onChange={e => setProfCpf(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg mt-1 outline-none focus:border-primary-500 transition"
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold">Telefone</label>
                <input
                  type="text"
                  value={profPhone}
                  onChange={e => setProfPhone(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg mt-1 outline-none focus:border-primary-500 transition"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold">Chave Pix</label>
                <input
                  type="text"
                  value={profPix}
                  onChange={e => setProfPix(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg mt-1 outline-none focus:border-primary-500 transition"
                  placeholder="CPF/Email/Celular"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold">Endereço (opcional)</label>
                <input
                  type="text"
                  value={profAddress}
                  onChange={e => setProfAddress(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg mt-1 outline-none focus:border-primary-500 transition"
                  placeholder="Rua, Bairro..."
                />
              </div>

              <SignaturePad
                label="Minha Assinatura (Monitor)"
                initialSignature={profSignature}
                onSave={setProfSignature}
              />

              <button
                onClick={handleSaveProfile}
                className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-xl shadow-lg mt-2 transition"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contract Template Modal */}
      {isEditContractOpen && (
        <div className="fixed inset-0 bg-navy-900 z-[70] overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <ContractTemplateScreen
            settings={settings}
            onSave={onSaveSettings}
            onBack={() => setIsEditContractOpen(false)}
          />
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto bg-navy-900 relative">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="bg-navy-800 h-auto pt-3 flex items-center justify-around shadow-inner border-t border-navy-700 z-20 shrink-0 pb-safe">
        {tabs.map(tab => (
          <BottomNavItem
            key={tab.path}
            to={tab.path}
            icon={tab.icon}
            label={tab.label}
            active={location.pathname === tab.path}
          />
        ))}
      </nav>
    </div>
  );
};

const APP_VERSION = '1.2.8';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isUpdateRequired, setIsUpdateRequired] = useState(false);

  // --- FETCH SETTINGS ---
  const fetchSettings = async () => {
    const s = await dbService.getUserSettings();
    setSettings(s);
  };

  // --- VERSION CHECK ---
  const checkAppVersion = async () => {
    try {
      const { data, error } = await supabase
        .from('app_constants')
        .select('value')
        .eq('key', 'min_version')
        .single();

      if (error) {
        // Silently fail if table doesn't exist yet (to avoid breaking on first run)
        console.warn("Version check skipped:", error.message);
        return;
      }

      const minVersion = data.value; // ex: "1.2.3"
      if (minVersion > APP_VERSION) {
        setIsUpdateRequired(true);
      }
    } catch (e) {
      console.error("Error checking version:", e);
    }
  };

  // --- AUTHENTICATION CHECK ---
  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
      if (session) checkAppVersion();
    });

    // 2. Listen for changes (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // 3. Schedule Backup Reminder (Weekly: Friday 02:00 AM)
    const scheduleReminder = async () => {
      try {
        if (!Capacitor.isNativePlatform()) return;

        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          const req = await LocalNotifications.requestPermissions();
          if (req.display !== 'granted') return;
        }

        const pending = await LocalNotifications.getPending();

        // Notification 1: Liability Warning
        const idDisclaimer = 1001;
        const existsDisclaimer = pending.notifications.some(n => n.id === idDisclaimer);
        if (!existsDisclaimer) {
          await LocalNotifications.schedule({
            notifications: [{
              title: "⚠️ AVISO IMPORTANTE",
              body: "Não nos responsabilizamos pela perda de dados em caso de troca ou perda do aparelho. Mantenha seu backup em dia!",
              id: idDisclaimer,
              schedule: {
                on: { weekday: 6, hour: 2, minute: 0 }, // 6 = Friday
                allowWhileIdle: true
              }
            }]
          });
        }

        // Notification 2: Action Call (1 minute later to appear on top/after)
        const idAction = 1002;
        const existsAction = pending.notifications.some(n => n.id === idAction);
        if (!existsAction) {
          await LocalNotifications.schedule({
            notifications: [{
              title: "☁️ Hora do Backup!",
              body: "Evite prejuízos! Clique aqui agora para salvar seus dados manualmente.",
              id: idAction,
              schedule: {
                on: { weekday: 6, hour: 2, minute: 1 }, // Friday 02:01
                allowWhileIdle: true
              }
            }]
          });
        }

        console.log("Weekly backup reminders scheduled.");
      } catch (e) {
        console.error("Error scheduling notification:", e);
      }
    };
    scheduleReminder();
    fetchSettings();

    return () => subscription.unsubscribe();
  }, []);

  const handleSaveSettings = async (updated: UserSettings) => {
    await dbService.saveUserSettings(updated);
    setSettings(updated);
  };

  const performBackup = async (silent = false) => {
    if (backupLoading) return;
    setBackupLoading(true);
    try {
      await backupRepository.shareDataLocal();
      if (!silent) {
        // alert("Backup gerado com sucesso!"); // Silent by default as per request
      }
    } catch (e: any) {
      console.error(e);
      alert(`Erro no backup: ${e.message || 'Erro desconhecido'}`);
    } finally {
      setBackupLoading(false);
    }
  };

  const performImport = async (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      try {
        setBackupLoading(true);
        await backupRepository.importData(content);
        alert("Dados importados com sucesso! O aplicativo será recarregado.");
        window.location.reload();
      } catch (error: any) {
        console.error(error);
        alert("Erro ao importar: " + (error.message || "Arquivo inválido"));
      } finally {
        setBackupLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleLogout = async () => {
    await authService.signOut();
  };

  const handleDeleteAccount = async () => {
    try {
      setBackupLoading(true);
      // 1. Clear Local Data
      await dbService.clearDatabase();
      // 2. Sign Out
      await authService.signOut();
      alert("Conta desconectada e dados locais removidos com sucesso.");
    } catch (error: any) {
      console.error(error);
      alert("Erro ao excluir conta: " + error.message);
    } finally {
      setBackupLoading(false);
    }
  };

  if (loadingSession) {
    return <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white">Carregando...</div>;
  }

  if (!session) {
    // Use Capacitor API for reliable native detection
    const isNativeApp = Capacitor.isNativePlatform();

    return (
      <HashRouter>
        <Routes>
          <Route path="/sign-contract/:contractId?" element={<PublicSignaturePage />} />
          <Route path="/landing" element={<LandingScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route
            path="/"
            element={isNativeApp ? <Navigate to="/login" /> : <LandingScreen />}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    );
  }

  // Check for PRO plan and Permissions
  const metadata = session.user.user_metadata || {};
  const role = metadata.role || 'monitor';
  const permissions = metadata.permissions || {};
  const currentUsername = authService.getUsernameFromEmail(session.user.email);
  const isSuperUser = role === 'admin' || currentUsername === 'teste' || currentUsername === 'google_test';

  const checkPermission = (feature: string, defaultAccess = true) => {
    if (isSuperUser) return true;
    const key = `can_view_${feature}`;
    return permissions[key] !== undefined ? permissions[key] : defaultAccess;
  };

  const isPro = metadata.subscription_tier !== 'basic' || isSuperUser;

  const canViewFinancial = checkPermission('financial', isPro);
  const canViewMaintenance = checkPermission('maintenance', isPro);
  const canViewContracts = checkPermission('contracts', isPro);
  const canViewGps = checkPermission('gps', isPro);

  return (
    <HashRouter>
      <Layout
        onBackup={performBackup}
        onImport={performImport}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
        isBackupLoading={backupLoading}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        // Pass permissions to Layout for Tabs
        permissions={{
          routes: checkPermission('routes'),
          stops: checkPermission('stops'),
          students: checkPermission('students'),
          attendance: checkPermission('attendance'),
          incidents: checkPermission('incidents'),
          reports: checkPermission('reports'),
          financial: canViewFinancial,
          reminders: checkPermission('reminders'),
          maintenance: canViewMaintenance,
          contracts: canViewContracts,
          gps: canViewGps,
          team: isSuperUser
        }}
      >
        <Routes>
          {checkPermission('routes') && <Route path="/routes" element={<RoutesScreen />} />}
          {checkPermission('stops') && <Route path="/stops" element={<StopsScreen canUseGps={canViewGps} />} />}
          {checkPermission('students') && <Route path="/students" element={<StudentsScreen />} />}
          {checkPermission('attendance') && <Route path="/attendance" element={<AttendanceScreen />} />}
          {checkPermission('incidents') && <Route path="/incidents" element={<IncidentsScreen />} />}
          {checkPermission('reports') && <Route path="/reports" element={<ReportsScreen />} />}
          {checkPermission('reminders') && <Route path="/reminders" element={<RemindersScreen />} />}
          {checkPermission('maintenance') && <Route path="/maintenance" element={<MaintenanceScreen />} />}
          {canViewContracts && <Route path="/contracts" element={<ContractScreen settings={settings} />} />}
          {canViewFinancial && <Route path="/financial" element={<FinancialScreen settings={settings} onUpdateSettings={fetchSettings} />} />}
          {isSuperUser && <Route path="/team" element={<TeamScreen />} />}

          {/* Public Routes */}
          <Route path="/sign-contract/:contractId?" element={<PublicSignaturePage />} />

          <Route path="*" element={<Navigate to="/attendance" />} />
        </Routes>
      </Layout>

      {/* Update Required Modal */}
      {isUpdateRequired && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-6 text-center">
          <div className="bg-navy-800 p-8 rounded-3xl border border-primary-500 max-w-sm shadow-2xl">
            <div className="w-20 h-20 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="refresh-cw" size={40} className="text-primary-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Nova Versão Disponível! 🚀</h2>
            <p className="text-gray-400 mb-8">
              Uma nova atualização obrigatória está disponível na Play Store para garantir que seu app continue funcionando perfeitamente.
            </p>
            <a
              href="https://play.google.com/store/apps/details?id=com.monitorescolar.pro"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-xl shadow-lg transition text-lg"
            >
              Atualizar Agora
            </a>
          </div>
        </div>
      )}
    </HashRouter>
  );
}