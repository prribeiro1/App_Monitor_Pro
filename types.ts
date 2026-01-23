
export interface Route {
  id: string;
  name: string; // e.g., "Russier-Varelinha"
  description?: string;
  order?: number;
}

export interface Stop {
  id: string;
  routeId: string;
  name: string; // e.g., "Túnel que chora"
  order: number;
  latitude?: number;
  longitude?: number;
}

export interface Student {
  id: string;
  stopId: string;
  name: string;
  active: boolean;
  guardianName?: string; // Nome do Responsável
  contact?: string; // Telefone/Contato
  responsibleCpf?: string;
  responsibleEmail?: string;
  responsiblePhone?: string;
  order?: number;
  monthlyFees?: number; // Valor da Mensalidade
  dueDay?: number; // Dia de Vencimento
  birthDate?: string; // Data de nascimento
  school?: string; // Escola
  shift?: 'integral' | 'manha' | 'tarde' | 'noite'; // Turno
  observation?: string; // Observações (alergias, condições, etc.)
  asaasSubscriptionId?: string;
  asaasCustomerId?: string;
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  UNMARKED = 'UNMARKED'
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // ISO Date string YYYY-MM-DD
  status: AttendanceStatus;
  timestamp: number;
}

export interface Incident {
  id: string;
  studentId: string;
  type: string;
  observation: string;
  date: string; // ISO Date string
  timestamp: number;
}

export interface Payment {
  id: string;
  studentId: string;
  month: number; // 1-12
  year: number; // e.g. 2024
  amount: number;
  paidAt: string; // ISO Date
  timestamp: number;
}

export interface BackupData {
  routes: Route[];
  stops: Stop[];
  students: Student[];
  attendance: AttendanceRecord[];
  incidents: Incident[];
  payments: Payment[];
  generatedAt: string;
}

// Maintenance Module Types
export interface MaintenanceItem {
  id: string;
  name: string;
  intervalKm: number;
  intervalMonths: number;
  lastKm: number;
  lastDate: string;
  nextKm?: number;
  nextDate?: string;
}

export interface MaintenanceLog {
  id: string;
  itemId: string;
  date: string;
  km: number;
  cost: number;
  notes?: string;
}

// Tipos de planos disponíveis
export type SubscriptionTier = 'basic' | 'pro' | 'pro_plus';

export interface UserSettings {
  id: string;
  currentKm: number;
  pixKey?: string;
  driverName?: string;
  driverNickname?: string;
  driverCpf?: string;
  driverPhone?: string;
  driverEmail?: string;
  driverAddress?: string;
  driverSignature?: string;
  contractClauses?: { title: string; content: string }[];
  subscriptionTier?: SubscriptionTier; // Plano do usuário
  asaasConfig?: AsaasConfig; // Configuração do Asaas (só Pro+)
  asaasWalletId?: string; // ID da subconta do condutor no Asaas (só Pro+)
  bankData?: BankData; // Dados bancários salvos localmente
}

// Dados bancários
export interface BankData {
  email: string;
  bank: string;
  bankName: string;
  agency: string;
  account: string;
  accountDigit: string;
  accountType: string;
}

// Configuração do Asaas
export interface AsaasConfig {
  apiKey: string;
  environment: 'sandbox' | 'production';
  enabled: boolean;
  autoNegativationDays?: number; // Dias de atraso para negativação automática
}

// Cobrança Asaas vinculada a um aluno
export interface StudentPayment {
  id: string;
  studentId: string;
  asaasCustomerId?: string; // ID do cliente no Asaas
  asaasSubscriptionId?: string; // ID da assinatura recorrente
  asaasPaymentId?: string; // ID da última cobrança
  status: 'active' | 'pending' | 'overdue' | 'cancelled';
  lastPaymentDate?: string;
  nextDueDate?: string;
  amount: number;
}
