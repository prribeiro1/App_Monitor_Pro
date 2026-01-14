
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
  // photoUrl removed for Local-First privacy
  active: boolean;
  guardianName?: string; // Nome do Responsável
  contact?: string; // Telefone/Contato
  responsibleCpf?: string;
  responsiblePhone?: string;
  order?: number;
  monthlyFees?: number; // Valor da Mensalidade
  dueDay?: number; // Dia de Vencimento
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

export interface UserSettings {
  id: string;
  currentKm: number;
  pixKey?: string;
  driverName?: string;
  driverNickname?: string;
  driverCpf?: string;
  driverPhone?: string;
  driverAddress?: string;
  driverSignature?: string;
  contractClauses?: { title: string; content: string }[];
}