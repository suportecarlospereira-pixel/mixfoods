import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy,
  deleteDoc,
  Firestore
} from 'firebase/firestore';
import { Order, Table, TableStatus } from '../types';

// Configuração Hardcoded (Como solicitado)
const firebaseConfig = {
  apiKey: "AIzaSyANvrHIoDjbBI71_TkC75MHzILLcVRcuyY",
  authDomain: "mixfoods-e5066.firebaseapp.com",
  projectId: "mixfoods-e5066",
  storageBucket: "mixfoods-e5066.firebasestorage.app",
  messagingSenderId: "1028838333300",
  appId: "1:1028838333300:web:9cf70c681516cee467ea21",
  measurementId: "G-7296W9WXQ3"
};

let db: Firestore | null = null;
let useFirebase = false;

try {
  // Inicializa apenas se estiver no ambiente navegador/cliente
  if (typeof window !== 'undefined') {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    useFirebase = true;
  }
} catch (e) {
  console.warn("Mix Foods Cloud: Rodando Offline (Erro na conexão Firebase).", e);
}

// Helpers para LocalStorage
const localDb = {
  getOrders: (): Order[] => {
    try { return JSON.parse(localStorage.getItem('mix_orders') || '[]'); } catch { return []; }
  },
  getTables: (): Table[] => {
    try { return JSON.parse(localStorage.getItem('mix_tables') || '[]'); } catch { return []; }
  },
  saveOrders: (orders: Order[]) => {
    localStorage.setItem('mix_orders', JSON.stringify(orders));
    window.dispatchEvent(new Event('storage_sync'));
  },
  saveTables: (tables: Table[]) => {
    localStorage.setItem('mix_tables', JSON.stringify(tables));
    window.dispatchEvent(new Event('storage_sync'));
  }
};

export const dbService = {
  isCloudActive: () => useFirebase,

  subscribeOrders(callback: (orders: Order[]) => void) {
    if (useFirebase && db) {
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      // Escuta mudanças em tempo real
      return onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
        callback(orders);
      }, (err) => {
        console.error("Erro Firestore (Orders):", err);
        callback(localDb.getOrders()); // Fallback
      });
    } else {
      // Fallback para LocalStorage
      const handler = () => callback(localDb.getOrders());
      window.addEventListener('storage_sync', handler);
      handler();
      return () => window.removeEventListener('storage_sync', handler);
    }
  },

  subscribeTables(callback: (tables: Table[]) => void) {
    if (useFirebase && db) {
      const q = query(collection(db, "tables"), orderBy("id", "asc"));
      return onSnapshot(q, (snapshot) => {
        const tables = snapshot.docs.map(doc => doc.data() as Table);
        callback(tables);
      }, (err) => {
        console.error("Erro Firestore (Tables):", err);
        callback(localDb.getTables());
      });
    } else {
      const handler = () => callback(localDb.getTables());
      window.addEventListener('storage_sync', handler);
      handler();
      return () => window.removeEventListener('storage_sync', handler);
    }
  },

  async saveOrder(order: Order): Promise<void> {
    // 1. Salva Local (Optimistic UI)
    const orders = localDb.getOrders();
    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx >= 0) orders[idx] = order; else orders.push(order);
    localDb.saveOrders(orders);

    // 2. Salva na Nuvem
    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "orders", order.id), order, { merge: true });
      } catch (e) {
        console.error("Erro ao salvar pedido na nuvem:", e);
      }
    }
  },

  async deleteOrder(orderId: string, tableId: number): Promise<void> {
    const allOrders = localDb.getOrders();
    localDb.saveOrders(allOrders.filter((o) => o.id !== orderId));
    
    const tables = localDb.getTables();
    const tIdx = tables.findIndex((t) => t.id === tableId);
    if (tIdx >= 0) {
      tables[tIdx].status = 'AVAILABLE';
      localDb.saveTables(tables);
    }

    if (useFirebase && db) {
      try {
        await deleteDoc(doc(db, "orders", orderId));
        await setDoc(doc(db, "tables", tableId.toString()), { id: tableId, status: 'AVAILABLE' }, { merge: true });
      } catch (e) {
        console.error("Erro ao deletar pedido:", e);
      }
    }
  },

  async deleteHistoryOrder(orderId: string): Promise<void> {
    const allOrders = localDb.getOrders();
    localDb.saveOrders(allOrders.filter((o) => o.id !== orderId));

    if (useFirebase && db) {
      await deleteDoc(doc(db, "orders", orderId)).catch(console.error);
    }
  },

  async updateTableStatus(tableId: number, status: TableStatus): Promise<void> {
    const tables = localDb.getTables();
    const idx = tables.findIndex((t) => t.id === tableId);
    if (idx >= 0) {
      tables[idx].status = status;
      localDb.saveTables(tables);
    }

    if (useFirebase && db) {
      await setDoc(doc(db, "tables", tableId.toString()), { id: tableId, status }, { merge: true }).catch(console.error);
    }
  },

  async init(tableCount: number): Promise<void> {
    // Inicializa mesas locais se vazio
    if (localDb.getTables().length === 0) {
      const initialTables = Array.from({ length: tableCount }, (_, i) => ({ id: i + 1, status: 'AVAILABLE' as TableStatus }));
      localDb.saveTables(initialTables);
    }
    
    // Inicializa mesas no Firebase se vazio
    if (useFirebase && db) {
      try {
        const snapshot = await getDocs(collection(db, "tables"));
        if (snapshot.empty) {
          for (let i = 1; i <= tableCount; i++) {
            await setDoc(doc(db, "tables", i.toString()), { id: i, status: 'AVAILABLE' });
          }
        }
      } catch (e) {
        console.error("Erro init firebase:", e);
      }
    }
  }
};
