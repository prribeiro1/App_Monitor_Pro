

import { Route, Stop, Student, AttendanceRecord, Incident, BackupData, Payment, MaintenanceItem, MaintenanceLog, UserSettings } from '../types';

const DB_NAME = 'SchoolMonitorDB';
const DB_VERSION = 2; // Incremented for Migration

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
  saveRoute: (route: Route) => putItem('routes', route),
  deleteRoute: (id: string) => deleteItem('routes', id),

  // Stops
  getStops: () => getAll<Stop>('stops'),
  saveStop: (stop: Stop) => putItem('stops', stop),
  deleteStop: (id: string) => deleteItem('stops', id),

  // Students
  getStudents: () => getAll<Student>('students'),
  saveStudent: (student: Student) => putItem('students', student),
  deleteStudent: (id: string) => deleteItem('students', id),

  // Attendance
  getAttendance: () => getAll<AttendanceRecord>('attendance'),
  saveAttendance: (record: AttendanceRecord) => putItem('attendance', record),

  // Incidents
  getIncidents: () => getAll<Incident>('incidents'),
  saveIncident: (incident: Incident) => putItem('incidents', incident),

  // Payments
  getPayments: () => getAll<Payment>('payments'),
  savePayment: (payment: Payment) => putItem('payments', payment),
  deletePayment: (id: string) => deleteItem('payments', id),

  // Maintenance
  getMaintenanceItems: () => getAll<MaintenanceItem>('maintenance_items'),
  saveMaintenanceItem: (item: MaintenanceItem) => putItem('maintenance_items', item),
  deleteMaintenanceItem: (id: string) => deleteItem('maintenance_items', id),

  getMaintenanceLogs: () => getAll<MaintenanceLog>('maintenance_logs'),
  saveMaintenanceLog: (log: MaintenanceLog) => putItem('maintenance_logs', log),

  // Settings (Single record with id 'settings')
  getUserSettings: async (): Promise<UserSettings> => {
    const s = await getItem<UserSettings>('user_settings', 'settings');
    return s || { id: 'settings', currentKm: 0 } as any;
  },
  saveUserSettings: (settings: UserSettings) => putItem('user_settings', { ...settings, id: 'settings' }),

  // Contract Signatures
  getContractSignature: (studentId: string) => getItem<{ studentId: string, signature: string }>('contract_signatures', studentId),
  saveContractSignature: (studentId: string, signature: string) => putItem('contract_signatures', { studentId, signature }),
  deleteContractSignature: (studentId: string) => deleteItem('contract_signatures', studentId),


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

  // Clear DB (for restore)
  clearDatabase: async (): Promise<void> => {
    const db = await openDB();
    const stores = ['routes', 'stops', 'students', 'attendance', 'incidents', 'payments', 'maintenance_items', 'maintenance_logs', 'user_settings'];
    const tx = db.transaction(stores, 'readwrite');
    stores.forEach(store => tx.objectStore(store).clear());
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
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
  }
};