import React, { useState, useEffect, PropsWithChildren, useRef } from 'react';
import { SignaturePad } from './components/SignaturePad';
import { Capacitor } from '@capacitor/core';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Icon, IconName } from './components/Icon';
import { DashboardScreen } from './pages/DashboardScreen';
import { RoutesScreen } from './pages/RoutesScreen';
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
import { RegisterScreen } from './pages/RegisterScreen';
import { AsaasConfigScreen } from './pages/AsaasConfigScreen';
import { AutomaticBillingScreen } from './pages/AutomaticBillingScreen';
import { OnboardingBankScreen } from './pages/OnboardingBankScreen';
import { WelcomeScreen } from './pages/WelcomeScreen';
import { PublicSignaturePage } from './pages/PublicSignaturePage';
import { dbService } from './services/db';
import { UserSettings, Student } from './types';
import { backupRepository } from './services/BackupRepository';
import { authService, supabase } from './services/auth';
import { Session } from '@supabase/supabase-js';
import { LocalNotifications } from '@capacitor/local-notifications';

declare global {
  interface Window {
    Capacitor: any;
  }
}

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
  session: Session | null;
}

const Layout: React.FC<PropsWithChildren<LayoutProps>> = ({ children, onBackup, onImport, onLogout, onDeleteAccount, isBackupLoading, permissions, settings, onSaveSettings, session }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditContractOpen, setIsEditContractOpen] = useState(false);

  // Busca Global
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  const loadStudentsForSearch = async () => {
    const students = await dbService.getStudents();
    setAllStudents(students.filter(s => s.active));
  };

  useEffect(() => {
    loadStudentsForSearch();
  }, []);

  // Recarregar alunos quando abre a busca
  useEffect(() => {
    if (isSearchOpen) {
      loadStudentsForSearch();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      const filtered = allStudents.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.guardianName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filtered.slice(0, 10));
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, allStudents]);

  // Profile Form State
  const [profName, setProfName] = useState('');
  const [profNickname, setProfNickname] = useState('');
  const [profCpf, setProfCpf] = useState('');
  const [profPhone, setProfPhone] = useState('');
  const [profPix, setProfPix] = useState('');
  const [profEmail, setProfEmail] = useState('');
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
      setProfEmail(settings.driverEmail || '');
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
      driverEmail: profEmail,
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
      event.target.value = '';
    }
  };

  const allTabs = [
    { path: '/dashboard', icon: 'home' as IconName, label: 'Home', key: 'dashboard' },
    { path: '/routes', icon: 'map' as IconName, label: 'Rotas', key: 'routes' },
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
        {(() => {
          const metadata = session?.user?.user_metadata || {};
          const userTier = metadata.subscription_tier || settings?.subscriptionTier || 'basic';
          const tierToDisplay = permissions.tier || userTier;
          return (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Icon name="face" className="text-primary-500" size={28} />
                <div className="flex flex-col">
                  <h1 className="text-xl font-bold text-white leading-tight">{settings?.driverNickname || 'Monitor Escolar'}</h1>
                  {tierToDisplay && (tierToDisplay === 'pro' || tierToDisplay === 'pro_plus') && (
                    <div className={`flex items-center gap-1 self-start px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shadow-sm ${tierToDisplay === 'pro_plus'
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-navy-900'
                      : 'bg-blue-500 text-white'
                      }`}>
                      <Icon name={tierToDisplay === 'pro_plus' ? 'zap' : 'star'} size={8} />
                      {tierToDisplay === 'pro_plus' ? 'PRO+' : 'PRO'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
          <button onClick={() => setIsSearchOpen(true)} className="p-2 bg-gray-700/50 text-gray-300 rounded-full hover:bg-gray-700 transition" title="Buscar Aluno">
            <Icon name="search" size={20} />
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-gray-700/50 text-gray-300 rounded-full hover:bg-gray-700 transition" title="Configurações">
            <Icon name="settings" size={20} />
          </button>
        </div>
      </header>

      {/* Search Modal */}
      {
        isSearchOpen && (
          <div className="fixed inset-0 bg-black/80 z-50 p-4" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="bg-navy-800 rounded-2xl border border-navy-700 max-w-md mx-auto">
              <div className="p-4 border-b border-navy-700">
                <div className="flex items-center gap-3">
                  <Icon name="search" size={20} className="text-gray-400" />
                  <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar aluno ou responsável..." className="flex-1 bg-transparent text-white outline-none" autoFocus />
                  <button onClick={() => { setIsSearchOpen(false); setSearchTerm(''); }} className="text-gray-400 hover:text-white">
                    <Icon name="x" size={24} />
                  </button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {searchResults.length === 0 && searchTerm.length >= 2 && <p className="text-gray-500 text-center py-6">Nenhum resultado encontrado</p>}
                {searchTerm.length < 2 && <p className="text-gray-500 text-center py-6 text-sm">Digite pelo menos 2 caracteres</p>}
                {searchResults.map(student => (
                  <div key={student.id} onClick={() => { setIsSearchOpen(false); setSearchTerm(''); navigate(`/students?open=${student.id}`); }} className="p-4 border-b border-navy-700 hover:bg-navy-700/50 cursor-pointer">
                    <p className="text-white font-medium">{student.name}</p>
                    {student.guardianName && <p className="text-xs text-gray-400">Responsável: {student.guardianName}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      }

      {/* Settings Modal */}
      {
        isSettingsOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="bg-navy-800 p-6 rounded-2xl w-full max-w-sm border border-navy-700 shadow-2xl max-h-full overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Configurações</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-white"><Icon name="x" size={24} /></button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-navy-900 rounded-xl border border-navy-700">
                  <h4 className="text-gray-400 text-sm font-bold mb-3 uppercase">Perfil e Dados</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => { setIsSettingsOpen(false); setIsEditProfileOpen(true); }} className="flex flex-col items-center justify-center p-3 bg-primary-500/10 text-primary-400 rounded-lg hover:bg-primary-500/20 transition col-span-2">
                      <Icon name="user" size={24} className="mb-1" /><span className="text-xs font-bold">Editar Meu Perfil</span>
                    </button>
                    {permissions.team && (
                      <button onClick={() => { setIsSettingsOpen(false); navigate('/team'); }} className="flex flex-col items-center justify-center p-3 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition col-span-2">
                        <Icon name="users" size={24} className="mb-1" /><span className="text-xs font-bold">Gerenciar Equipe</span>
                      </button>
                    )}
                    {permissions.reminders && (
                      <button onClick={() => { setIsSettingsOpen(false); navigate('/reminders'); }} className="flex flex-col items-center justify-center p-3 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition col-span-2">
                        <Icon name="bell" size={24} className="mb-1" /><span className="text-xs font-bold">Lembretes</span>
                      </button>
                    )}
                    {permissions.maintenance && (
                      <button onClick={() => { setIsSettingsOpen(false); navigate('/maintenance'); }} className="flex flex-col items-center justify-center p-3 bg-teal-500/10 text-teal-400 rounded-lg hover:bg-teal-500/20 transition col-span-2">
                        <Icon name="tool" size={24} className="mb-1" /><span className="text-xs font-bold">Manutenção</span>
                      </button>
                    )}
                    <button onClick={() => { setIsSettingsOpen(false); window.location.hash = '/change-plan'; }} className="flex flex-col items-center justify-center p-3 bg-yellow-500/10 text-yellow-400 rounded-lg hover:bg-yellow-500/20 transition col-span-2">
                      <Icon name="zap" size={24} className="mb-1" /><span className="text-xs font-bold">Mudar Plano</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-3 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition">
                      <Icon name="download" size={24} className="mb-1" /><span className="text-xs font-bold">Importar</span>
                    </button>
                    <button onClick={onBackup} disabled={isBackupLoading} className="flex flex-col items-center justify-center p-3 bg-accent-500/10 text-accent-500 rounded-lg hover:bg-accent-500/20 transition">
                      <Icon name={isBackupLoading ? "save" : "cloud-upload"} size={24} className="mb-1" /><span className="text-xs font-bold">Backup</span>
                    </button>
                    <button onClick={() => { setIsSettingsOpen(false); navigate('/contracts'); }} className="flex flex-col items-center justify-center p-3 bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500/20 transition">
                      <Icon name="file-text" size={24} className="mb-1" /><span className="text-xs font-bold">Contratos</span>
                    </button>
                    <button onClick={() => { setIsSettingsOpen(false); setIsEditContractOpen(true); }} className="flex flex-col items-center justify-center p-3 bg-orange-500/10 text-orange-400 rounded-lg hover:bg-orange-500/20 transition">
                      <Icon name="pencil" size={24} className="mb-1" /><span className="text-xs font-bold">Editar Cláusulas</span>
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-navy-900 rounded-xl border border-navy-700">
                  <h4 className="text-gray-400 text-sm font-bold mb-3 uppercase">Conta</h4>
                  <button onClick={onLogout} className="w-full flex items-center gap-3 p-3 text-gray-300 hover:bg-navy-800 rounded-lg transition mb-2">
                    <Icon name="log-out" size={20} /><span>Sair da Conta</span>
                  </button>
                  <button onClick={() => { if (confirm("ATENÇÃO: Isso apagará TODOS os dados locais e desconectará sua conta. Tem certeza?")) { onDeleteAccount(); } }} className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-red-900/20 rounded-lg transition border border-transparent hover:border-red-900/50">
                    <Icon name="trash" size={20} /><span>Excluir Minha Conta</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Edit Profile Modal */}
      {
        isEditProfileOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="bg-navy-800 p-6 rounded-2xl w-full max-w-sm border border-navy-700 shadow-2xl overflow-y-auto max-h-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Editar Meu Perfil</h3>
                <button onClick={() => setIsEditProfileOpen(false)} className="text-gray-400 hover:text-white"><Icon name="x" size={24} /></button>
              </div>
              <div className="space-y-4">
                <div><label className="text-xs text-gray-400 uppercase font-bold">Nome Completo</label><input type="text" value={profName} onChange={e => setProfName(e.target.value)} className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg mt-1 outline-none focus:border-primary-500 transition" placeholder="Nome usado no contrato" /></div>
                <div><label className="text-xs text-gray-400 uppercase font-bold">Apelido</label><input type="text" value={profNickname} onChange={e => setProfNickname(e.target.value)} className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg mt-1 outline-none focus:border-primary-500 transition" placeholder="Ex: Tio João" /></div>
                <div><label className="text-xs text-gray-400 uppercase font-bold">CPF / CNPJ</label><input type="text" value={profCpf} onChange={e => setProfCpf(e.target.value)} className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg mt-1 outline-none focus:border-primary-500 transition" placeholder="000.000.000-00" /></div>
                <div><label className="text-xs text-gray-400 uppercase font-bold">Telefone</label><input type="text" value={profPhone} onChange={e => setProfPhone(e.target.value)} className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg mt-1 outline-none focus:border-primary-500 transition" placeholder="(00) 00000-0000" /></div>
                <div><label className="text-xs text-gray-400 uppercase font-bold">Email de Contato</label><input type="email" value={profEmail} onChange={e => setProfEmail(e.target.value)} className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg mt-1 outline-none focus:border-primary-500 transition" placeholder="seu-email-real@gmail.com" /></div>
                <div><label className="text-xs text-gray-400 uppercase font-bold">Chave Pix</label><input type="text" value={profPix} onChange={e => setProfPix(e.target.value)} className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg mt-1 outline-none focus:border-primary-500 transition" placeholder="CPF/Email/Celular" /></div>
                <div><label className="text-xs text-gray-400 uppercase font-bold">Endereço</label><input type="text" value={profAddress} onChange={e => setProfAddress(e.target.value)} className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg mt-1 outline-none focus:border-primary-500 transition" placeholder="Rua, Bairro..." /></div>
                <SignaturePad label="Minha Assinatura (Monitor)" initialSignature={profSignature} onSave={setProfSignature} />
                <button onClick={handleSaveProfile} className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-xl shadow-lg mt-2 transition">Salvar Alterações</button>
              </div>
            </div>
          </div>
        )
      }

      {/* Edit Contract Template Modal */}
      {
        isEditContractOpen && (
          <div className="fixed inset-0 bg-navy-900 z-[70] overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <ContractTemplateScreen settings={settings} onSave={onSaveSettings} onBack={() => setIsEditContractOpen(false)} />
          </div>
        )
      }

      {/* Content */}
      <main className="flex-1 overflow-y-auto bg-navy-900 relative">{children}</main>

      {/* Bottom Nav */}
      <nav className="bg-navy-800 h-14 flex items-center justify-around shadow-inner border-t border-navy-700 z-20 shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {tabs.map(tab => (<BottomNavItem key={tab.path} to={tab.path} icon={tab.icon} label={tab.label} active={location.pathname === tab.path} />))}
      </nav>
    </div >
  );
};

const APP_VERSION = '1.2.9';

const DashboardWrapper: React.FC = () => {
  const navigate = useNavigate();
  return <DashboardScreen onNavigate={(path) => navigate(path)} />;
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isUpdateRequired, setIsUpdateRequired] = useState(false);

  const fetchSettings = async () => {
    const s = await dbService.getUserSettings();
    setSettings(s);

    // Só redireciona se realmente não tiver nada no local E nada no servidor
    const { data: { user } } = await supabase.auth.getUser();
    const serverTier = user?.user_metadata?.subscription_tier;

    if (s && !s.subscriptionTier && !serverTier && !isSuperUser) {
      window.location.hash = '/change-plan';
    }
  };

  const checkAppVersion = async () => {
    try {
      const { data, error } = await supabase.from('app_constants').select('value').eq('key', 'min_version').single();
      if (error) { console.warn("Version check skipped:", error.message); return; }
      if (data.value > APP_VERSION) setIsUpdateRequired(true);
    } catch (e) { console.error("Error checking version:", e); }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
      if (session) {
        checkAppVersion();
        dbService.pullFromCloud(); // Sincroniza dados da nuvem ao abrir
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === 'SIGNED_IN') {
        dbService.pullFromCloud().then(() => {
          fetchSettings();
        });
      }
    });

    const scheduleReminder = async () => {
      try {
        if (!Capacitor.isNativePlatform()) return;
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') { const req = await LocalNotifications.requestPermissions(); if (req.display !== 'granted') return; }
        const pending = await LocalNotifications.getPending();
        if (!pending.notifications.some(n => n.id === 1001)) {
          await LocalNotifications.schedule({ notifications: [{ title: "⚠️ AVISO IMPORTANTE", body: "Não nos responsabilizamos pela perda de dados. Mantenha seu backup em dia!", id: 1001, schedule: { on: { weekday: 6, hour: 2, minute: 0 }, allowWhileIdle: true } }] });
        }
        if (!pending.notifications.some(n => n.id === 1002)) {
          await LocalNotifications.schedule({ notifications: [{ title: "☁️ Hora do Backup!", body: "Evite prejuízos! Clique aqui para salvar seus dados.", id: 1002, schedule: { on: { weekday: 6, hour: 2, minute: 1 }, allowWhileIdle: true } }] });
        }
      } catch (e) { console.error("Error scheduling notification:", e); }
    };
    scheduleReminder();
    fetchSettings();
    return () => subscription.unsubscribe();
  }, []);

  const handleSaveSettings = async (updated: UserSettings) => { await dbService.saveUserSettings(updated); setSettings(updated); };

  const performBackup = async () => {
    if (backupLoading) return;
    setBackupLoading(true);
    try { await backupRepository.shareDataLocal(); } catch (e: any) { console.error(e); alert(`Erro no backup: ${e.message || 'Erro desconhecido'}`); } finally { setBackupLoading(false); }
  };

  const performImport = async (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content) return;
      try { setBackupLoading(true); await backupRepository.importData(content); alert("Dados importados com sucesso!"); window.location.reload(); } catch (error: any) { console.error(error); alert("Erro ao importar: " + (error.message || "Arquivo inválido")); } finally { setBackupLoading(false); }
    };
    reader.readAsText(file);
  };

  const handleLogout = async () => {
    if (confirm("Deseja realmente sair? Os dados locais serão removidos, mas sua conta na nuvem permanecerá salva.")) {
      await dbService.clearDatabase();
      setSettings(null);
      await authService.signOut();
    }
  };
  const handleDeleteAccount = async () => {
    try {
      setBackupLoading(true);
      await dbService.clearDatabase();
      setSettings(null);
      await authService.signOut();
      alert("Conta desconectada e dados removidos.");
    } catch (error: any) {
      console.error(error);
      alert("Erro: " + error.message);
    } finally {
      setBackupLoading(false);
    }
  };

  if (loadingSession) return <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white">Carregando...</div>;

  if (!session) {
    const isNativeApp = Capacitor.isNativePlatform();
    return (
      <HashRouter>
        <Routes>
          <Route path="/sign-contract/:contractId?" element={<PublicSignaturePage />} />
          <Route path="/landing" element={<LandingScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route path="/" element={isNativeApp ? <Navigate to="/login" /> : <LandingScreen />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    );
  }

  const metadata = session.user.user_metadata || {};
  const role = metadata.role || 'monitor';
  const permissions = metadata.permissions || {};
  const currentUsername = authService.getUsernameFromEmail(session.user.email);
  // SuperUsers: apenas 'teste' e 'google_test'
  const isSuperUser = role === 'admin' || currentUsername === 'teste' || currentUsername === 'google_test';

  const checkPermission = (feature: string, defaultAccess = true) => {
    if (isSuperUser) return true;
    const key = `can_view_${feature}`;
    return permissions[key] !== undefined ? permissions[key] : defaultAccess;
  };

  // Plano atual (checa Metadata do Auth E Settings Logal do IndexedDB)
  const userTier = metadata.subscription_tier || settings?.subscriptionTier || 'basic';

  // Lógica de Trial (7 dias)
  const trialStartedAt = metadata.trial_started_at;
  const isTrialActive = trialStartedAt
    ? (new Date().getTime() - new Date(trialStartedAt).getTime()) < (7 * 24 * 60 * 60 * 1000)
    : false;

  const isPro = userTier !== 'basic' || isTrialActive || isSuperUser;
  const isProPlus = userTier === 'pro_plus' || isTrialActive || isSuperUser;

  const currentTier = isSuperUser ? 'pro_plus' : (isTrialActive ? 'pro_plus' : userTier);

  const canViewFinancial = checkPermission('financial', isPro);
  const canViewMaintenance = checkPermission('maintenance', isPro);
  const canViewContracts = checkPermission('contracts', isPro);
  const canViewGps = checkPermission('gps', isPro);
  const canViewReminders = checkPermission('reminders', true);
  const canViewReports = checkPermission('reports', true);
  const canViewAttendance = checkPermission('attendance', true);
  const canViewIncidents = checkPermission('incidents', true);
  const canViewStudents = checkPermission('students', true);
  const canViewRoutes = checkPermission('routes', true);

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
        session={session}
        permissions={{
          dashboard: true,
          routes: canViewRoutes,
          students: canViewStudents,
          attendance: canViewAttendance,
          incidents: canViewIncidents,
          reports: canViewReports,
          financial: canViewFinancial,
          reminders: canViewReminders,
          maintenance: canViewMaintenance,
          contracts: canViewContracts,
          gps: canViewGps,
          team: isSuperUser,
          tier: currentTier
        }}
      >
        <Routes>
          <Route path="/dashboard" element={<DashboardWrapper />} />
          {canViewRoutes && <Route path="/routes" element={<RoutesScreen canUseGps={canViewGps} />} />}
          {canViewStudents && <Route path="/students" element={<StudentsScreen />} />}
          {canViewAttendance && <Route path="/attendance" element={<AttendanceScreen />} />}
          {canViewIncidents && <Route path="/incidents" element={<IncidentsScreen />} />}
          {canViewReports && <Route path="/reports" element={<ReportsScreen />} />}
          {canViewReminders && <Route path="/reminders" element={<RemindersScreen />} />}
          {canViewMaintenance && <Route path="/maintenance" element={<MaintenanceScreen />} />}
          {canViewContracts && <Route path="/contracts" element={<ContractScreen settings={settings} />} />}
          {canViewFinancial && <Route path="/financial" element={<FinancialScreen settings={settings} onUpdateSettings={fetchSettings} isTrial={isTrialActive} isAdmin={isSuperUser} />} />}
          {isSuperUser && <Route path="/asaas-config" element={<AsaasConfigScreen onSave={async (config) => {
            const updated: UserSettings = { ...settings!, asaasConfig: config };
            await dbService.saveUserSettings(updated);
            fetchSettings();
          }} initialConfig={settings?.asaasConfig} />} />}
          {isProPlus && <Route path="/automatic-billing" element={<AutomaticBillingScreen />} />}
          {isProPlus && <Route path="/onboarding-bank" element={<OnboardingBankScreen settings={settings} onComplete={() => {
            fetchSettings();
            window.location.hash = '/automatic-billing';
          }} onSkip={() => {
            window.location.hash = '/dashboard';
          }} />} />}
          {isSuperUser && <Route path="/team" element={<TeamScreen />} />}
          <Route path="/change-plan" element={
            <div className="fixed inset-0 bg-navy-900 z-50 overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <WelcomeScreen
                settings={settings}
                onComplete={() => {
                  fetchSettings();
                  window.location.hash = '/dashboard';
                }}
              />
            </div>
          } />
          <Route path="/sign-contract/:contractId?" element={<PublicSignaturePage />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Layout>

      {isUpdateRequired && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-6 text-center">
          <div className="bg-navy-800 p-8 rounded-3xl border border-primary-500 max-w-sm shadow-2xl">
            <div className="w-20 h-20 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-6"><Icon name="refresh-cw" size={40} className="text-primary-500" /></div>
            <h2 className="text-2xl font-bold text-white mb-4">Nova Versão Disponível! 🚀</h2>
            <p className="text-gray-400 mb-8">Uma nova atualização obrigatória está disponível na Play Store.</p>
            <a href="https://play.google.com/store/apps/details?id=com.monitorescolar.pro" target="_blank" rel="noopener noreferrer" className="block w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-xl shadow-lg transition text-lg">Atualizar Agora</a>
          </div>
        </div>
      )}
    </HashRouter>
  );
}
