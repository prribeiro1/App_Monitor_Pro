
import { Route, Stop, Student, AttendanceRecord, Incident, BackupData, Payment, MaintenanceItem, MaintenanceLog, UserSettings, VehicleDocument } from '../types';
import { cloudSync } from './cloudSync';
import { LocalNotifications } from '@capacitor/local-notifications';

const DB_NAME = 'SchoolMonitorDB';
const DB_VERSION = 3; // Incremented for Migration

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('routes')) db.createObjectStore('routes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('stops')) db.createObjectStore('stops', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('students')) db.createObjectStore('students', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('attendance')) {
        const store = db.createObjectStore('attendance', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('studentId', 'studentId', { unique: false });
      }
      if (!db.objectStoreNames.contains('incidents')) db.createObjectStore('incidents', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('payments')) {
        const store = db.createObjectStore('payments', { keyPath: 'id' });
        store.createIndex('studentId', 'studentId', { unique: false });
        store.createIndex('month_year', ['month', 'year'], { unique: false });
      }

      // New Maintenance Stores (v2)
      if (!db.objectStoreNames.contains('maintenance_items')) {
        const store = db.createObjectStore('maintenance_items', { keyPath: 'id' });
        // Seed Standard Data
        const standardItems: MaintenanceItem[] = [
          { id: crypto.randomUUID(), name: 'Óleo do Motor', intervalKm: 10000, intervalMonths: 6, lastKm: 0, lastDate: new Date().toISOString(), nextKm: 10000, nextDate: '' },
          { id: crypto.randomUUID(), name: 'Filtro de Óleo', intervalKm: 10000, intervalMonths: 6, lastKm: 0, lastDate: new Date().toISOString(), nextKm: 10000, nextDate: '' },
          { id: crypto.randomUUID(), name: 'Rodízio de Pneus', intervalKm: 10000, intervalMonths: 0, lastKm: 0, lastDate: new Date().toISOString(), nextKm: 10000, nextDate: '' },
          { id: crypto.randomUUID(), name: 'Alinhamento/Balanceamento', intervalKm: 10000, intervalMonths: 0, lastKm: 0, lastDate: new Date().toISOString(), nextKm: 10000, nextDate: '' },
          { id: crypto.randomUUID(), name: 'Filtro de Combustível', intervalKm: 20000, intervalMonths: 12, lastKm: 0, lastDate: new Date().toISOString(), nextKm: 20000, nextDate: '' },
          { id: crypto.randomUUID(), name: 'Filtro de Ar', intervalKm: 20000, intervalMonths: 12, lastKm: 0, lastDate: new Date().toISOString(), nextKm: 20000, nextDate: '' },
          { id: crypto.randomUUID(), name: 'Pastilhas de Freio', intervalKm: 20000, intervalMonths: 0, lastKm: 0, lastDate: new Date().toISOString(), nextKm: 20000, nextDate: '' },
          { id: crypto.randomUUID(), name: 'Correia Dentada', intervalKm: 50000, intervalMonths: 36, lastKm: 0, lastDate: new Date().toISOString(), nextKm: 50000, nextDate: '' },
          { id: crypto.randomUUID(), name: 'Vistoria Escolar (DETRAN)', intervalKm: 0, intervalMonths: 6, lastKm: 0, lastDate: new Date().toISOString(), nextKm: 0, nextDate: '' },
        ];
        standardItems.forEach(item => store.put(item));
      }
      if (!db.objectStoreNames.contains('maintenance_logs')) {
        const store = db.createObjectStore('maintenance_logs', { keyPath: 'id' });
        store.createIndex('itemId', 'itemId', { unique: false });
      }
      if (!db.objectStoreNames.contains('user_settings')) {
        db.createObjectStore('user_settings', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('contract_signatures')) {
        db.createObjectStore('contract_signatures', { keyPath: 'studentId' });
      }
      if (!db.objectStoreNames.contains('reminders')) {
        db.createObjectStore('reminders', { keyPath: 'id' });
      }
      // New Vehicle Documents Store (v3)
      if (!db.objectStoreNames.contains('vehicle_documents')) {
        db.createObjectStore('vehicle_documents', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Generic GetAll
const getAll = async <T>(storeName: string): Promise<T[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Generic Put
const putItem = async <T>(storeName: string, item: T): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Generic Delete
const deleteItem = async (storeName: string, id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Generic Get (Single)
const getItem = async <T>(storeName: string, id: string): Promise<T | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};


export const dbService = {
  // Routes
  getRoutes: () => getAll<Route>('routes'),
  saveRoute: async (route: Route) => {
    await putItem('routes', route);
    try { await cloudSync.saveRoute(route); } catch (e) {
      console.error("Cloud Sync Rota falhou", e);
    }
  },
  deleteRoute: async (id: string) => {
    await deleteItem('routes', id);
    try { await cloudSync.deleteRoute(id); } catch (e) { }
  },

  // Stops
  getStops: () => getAll<Stop>('stops'),
  saveStop: async (stop: Stop) => {
    await putItem('stops', stop);
    try {
      await cloudSync.saveStop(stop);
    } catch (e: any) {
      alert("Erro ao salvar Ponto na Nuvem. Verifique sua conexão. " + (e.message || ""));
    }
  },
  deleteStop: async (id: string) => {
    await deleteItem('stops', id);
    try { await cloudSync.deleteStop(id); } catch (e) { }
  },

  // Students
  getStudents: () => getAll<Student>('students'),
  saveStudent: async (student: Student) => {
    await putItem('students', student);
    try {
      await cloudSync.saveStudent(student);
    } catch (e: any) {
      alert("Erro ao salvar Aluno na Nuvem: " + (e.message || ""));
    }
  },
  deleteStudent: async (id: string) => {
    await deleteItem('students', id);
    try { await cloudSync.deleteStudent(id); } catch (e) { }
  },

  // Attendance
  getAttendance: () => getAll<AttendanceRecord>('attendance'),
  saveAttendance: async (record: AttendanceRecord) => {
    await putItem('attendance', record);
    try { await cloudSync.saveAttendance(record); } catch (e) { }
  },

  // Incidents
  getIncidents: () => getAll<Incident>('incidents'),
  saveIncident: async (incident: Incident) => {
    await putItem('incidents', incident);
    try { await cloudSync.saveIncident(incident); } catch (e) { }
  },

  // Payments
  getPayments: () => getAll<Payment>('payments'),
  savePayment: async (payment: Payment) => {
    await putItem('payments', payment);
    try { await cloudSync.savePayment(payment); } catch (e) { }
  },
  deletePayment: (id: string) => deleteItem('payments', id),

  // Maintenance
  getMaintenanceItems: () => getAll<MaintenanceItem>('maintenance_items'),
  saveMaintenanceItem: async (item: MaintenanceItem) => {
    await putItem('maintenance_items', item);
    try { await cloudSync.saveMaintenanceItem(item); } catch (e) { }
  },
  deleteMaintenanceItem: (id: string) => deleteItem('maintenance_items', id),

  getMaintenanceLogs: () => getAll<MaintenanceLog>('maintenance_logs'),
  saveMaintenanceLog: async (log: MaintenanceLog) => {
    await putItem('maintenance_logs', log);
    try { await cloudSync.saveMaintenanceLog(log); } catch (e) { }
  },

  // Settings (Single record with id 'settings')
  getUserSettings: async (): Promise<UserSettings> => {
    const s = await getItem<UserSettings>('user_settings', 'settings');
    return s || { id: 'settings', currentKm: 0 } as any;
  },
  saveUserSettings: async (partialSettings: Partial<UserSettings>) => {
    // Get existing settings first and merge
    const existing = await getItem<UserSettings>('user_settings', 'settings');
    const settings = { ...existing, ...partialSettings, id: 'settings' } as UserSettings;
    await putItem('user_settings', settings);
    try { await cloudSync.saveUserSettings(settings); } catch (e) { }
  },

  deleteContractSignature: (studentId: string) => deleteItem('contract_signatures', studentId),

  // Reminders
  getReminders: () => getAll<any>('reminders'),
  saveReminder: async (reminder: any) => {
    await putItem('reminders', reminder);
    try { await cloudSync.saveReminder(reminder); } catch (e) { }
  },
  deleteReminder: async (id: number) => {
    // O id dos reminders é number, então passamos direto sem converter para string
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('reminders', 'readwrite');
      const store = tx.objectStore('reminders');
      const request = store.delete(id);
      request.onsuccess = async () => {
        try { await cloudSync.deleteReminder(id); } catch (e) { }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  },


  // Full Backup Export
  exportAllData: async (): Promise<BackupData> => {
    const routes = await getAll<Route>('routes');
    const stops = await getAll<Stop>('stops');
    const students = await getAll<Student>('students');
    const attendance = await getAll<AttendanceRecord>('attendance');
    const incidents = await getAll<Incident>('incidents');
    const payments = await getAll<Payment>('payments');
    const maintenanceItems = await getAll<MaintenanceItem>('maintenance_items');
    const maintenanceLogs = await getAll<MaintenanceLog>('maintenance_logs');
    const userSettings = await getItem<UserSettings>('user_settings', 'settings');

    return {
      routes,
      stops,
      students,
      attendance,
      incidents,
      payments,
      maintenanceItems,
      maintenanceLogs,
      userSettings: userSettings || { currentKm: 0 },
      generatedAt: new Date().toISOString(),
    } as any;
  },

  // Clear DB (for restore or logout)
  clearDatabase: async (): Promise<void> => {
    const db = await openDB();
    const stores = [
      'routes', 'stops', 'students', 'attendance',
      'incidents', 'payments', 'maintenance_items',
      'maintenance_logs', 'user_settings', 'contract_signatures', 'reminders'
    ];

    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, 'readwrite');
      stores.forEach(storeName => {
        try {
          tx.objectStore(storeName).clear();
        } catch (e) {
          console.warn(`Erro ao limpar store ${storeName}:`, e);
        }
      });
      tx.oncomplete = async () => {
        // Limpar notificações locais para evitar vazamento entre usuários
        try {
          const pending = await LocalNotifications.getPending();
          if (pending.notifications.length > 0) {
            await LocalNotifications.cancel({ notifications: pending.notifications });
          }
          await LocalNotifications.removeAllDeliveredNotifications();
        } catch (e) {
          console.error("Erro ao limpar notificações:", e);
        }
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  },

  // Import Data (Restore)
  importData: async (data: BackupData): Promise<void> => {
    await dbService.clearDatabase();
    const db = await openDB();
    const stores = ['routes', 'stops', 'students', 'attendance', 'incidents', 'payments', 'maintenance_items', 'maintenance_logs', 'user_settings'];
    const tx = db.transaction(stores, 'readwrite');

    // Helper to add items
    const addItems = (storeName: string, items: any[]) => {
      const store = tx.objectStore(storeName);
      if (items) items.forEach(item => store.put(item));
    };

    addItems('routes', data.routes);
    addItems('stops', data.stops);
    addItems('students', data.students);
    addItems('attendance', data.attendance);
    addItems('incidents', data.incidents);
    addItems('payments', data.payments || []);

    // v2 Support
    if ((data as any).maintenanceItems) addItems('maintenance_items', (data as any).maintenanceItems);
    if ((data as any).maintenanceLogs) addItems('maintenance_logs', (data as any).maintenanceLogs);
    if ((data as any).userSettings) tx.objectStore('user_settings').put({ ...(data as any).userSettings, id: 'settings' });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // Vehicle Docs
  getVehicleDocuments: () => getAll<VehicleDocument>('vehicle_documents'),
  saveVehicleDocument: (doc: VehicleDocument) => putItem('vehicle_documents', doc),
  deleteVehicleDocument: (id: string) => deleteItem('vehicle_documents', id),

  // Cloud Pull (Sync from Server to Local)
  pullFromCloud: async (): Promise<void> => {
    try {
      const cloudData = await cloudSync.pullAllData();
      if (!cloudData) return;

      const db = await openDB();
      const stores = ['routes', 'stops', 'students', 'attendance', 'payments', 'user_settings', 'maintenance_items', 'maintenance_logs', 'incidents', 'reminders', 'vehicle_documents'];
      const tx = db.transaction(stores, 'readwrite');

      const restore = (storeName: string, items: any[]) => {
        const store = tx.objectStore(storeName);
        store.clear();
        if (items) items.forEach(item => store.put(item));
      };

      restore('routes', cloudData.routes);
      restore('stops', cloudData.stops);
      restore('students', cloudData.students);
      restore('attendance', cloudData.attendance);
      restore('payments', cloudData.payments);
      restore('incidents', cloudData.incidents);
      restore('reminders', cloudData.reminders);
      restore('maintenance_items', cloudData.maintenanceItems);
      restore('maintenance_logs', cloudData.maintenanceLogs);
      restore('vehicle_documents', cloudData.vehicleDocuments);

      if (cloudData.userSettings) {
        tx.objectStore('user_settings').put(cloudData.userSettings);
      }

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.error("Erro no Pull Cloud:", e);
    }
  }
};