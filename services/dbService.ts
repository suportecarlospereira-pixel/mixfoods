
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy,
  deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { Order, Table, TableStatus } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyANvrHIoDjbBI71_TkC75MHzILLcVRcuyY",
  authDomain: "mixfoods-e5066.firebaseapp.com",
  projectId: "mixfoods-e5066",
  storageBucket: "mixfoods-e5066.firebasestorage.app",
  messagingSenderId: "1028838333300",
  appId: "1:1028838333300:web:9cf70c681516cee467ea21",
  measurementId: "G-7296W9WXQ3"
};

let db: any = null;
let useFirebase = false;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  useFirebase = true;
} catch (e) {
  console.warn("Mix Foods: Cloud Sync offline.");
}

const localDb = {
  getOrders: () => JSON.parse(localStorage.getItem('mix_orders') || '[]'),
  getTables: () => JSON.parse(localStorage.getItem('mix_tables') || '[]'),
  saveOrders: (orders: any) => {
    localStorage.setItem('mix_orders', JSON.stringify(orders));
    window.dispatchEvent(new Event('storage_sync'));
  },
  saveTables: (tables: any) => {
    localStorage.setItem('mix_tables', JSON.stringify(tables));
    window.dispatchEvent(new Event('storage_sync'));
  }
};

export const dbService = {
  isCloudActive: () => useFirebase,

  subscribeOrders(callback: (orders: Order[]) => void) {
    if (useFirebase && db) {
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
        callback(orders);
      });
    } else {
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
      });
    } else {
      const handler = () => callback(localDb.getTables());
      window.addEventListener('storage_sync', handler);
      handler();
      return () => window.removeEventListener('storage_sync', handler);
    }
  },

  async saveOrder(order: Order): Promise<void> {
    const orders = localDb.getOrders();
    const idx = orders.findIndex((o: any) => o.id === order.id);
    if (idx >= 0) orders[idx] = order; else orders.push(order);
    localDb.saveOrders(orders);

    if (useFirebase && db) {
      await setDoc(doc(db, "orders", order.id), order, { merge: true });
    }
  },

  async deleteOrder(orderId: string, tableId: number): Promise<void> {
    // 1. Atualização Local Imediata
    const allOrders = localDb.getOrders();
    localDb.saveOrders(allOrders.filter((o: any) => o.id !== orderId));
    
    const tables = localDb.getTables();
    const tIdx = tables.findIndex((t: any) => t.id === tableId);
    if (tIdx >= 0) {
      tables[tIdx].status = 'AVAILABLE';
      localDb.saveTables(tables);
    }

    // 2. Firebase - Exclusão Definitiva
    if (useFirebase && db) {
      try {
        // Deleta o pedido da coleção principal
        await deleteDoc(doc(db, "orders", orderId));
        // Atualiza a mesa para disponível no banco
        await setDoc(doc(db, "tables", tableId.toString()), { id: tableId, status: 'AVAILABLE' }, { merge: true });
      } catch (e) {
        console.error("Erro ao cancelar pedido no Firebase:", e);
        throw e; // Lança para o App.tsx tratar
      }
    }
  },

  async deleteHistoryOrder(orderId: string): Promise<void> {
    // 1. Local
    const allOrders = localDb.getOrders();
    localDb.saveOrders(allOrders.filter((o: any) => o.id !== orderId));

    // 2. Firebase
    if (useFirebase && db) {
      try {
        await deleteDoc(doc(db, "orders", orderId));
      } catch (e) {
        console.error("Erro ao deletar do histórico no Firebase:", e);
        throw e;
      }
    }
  },

  async updateTableStatus(tableId: number, status: TableStatus): Promise<void> {
    const tables = localDb.getTables();
    const idx = tables.findIndex((t: any) => t.id === tableId);
    if (idx >= 0) {
      tables[idx].status = status;
      localDb.saveTables(tables);
    }

    if (useFirebase && db) {
      await setDoc(doc(db, "tables", tableId.toString()), { id: tableId, status }, { merge: true });
    }
  },

  async init(tableCount: number): Promise<void> {
    if (localDb.getTables().length === 0) {
      const initialTables = Array.from({ length: tableCount }, (_, i) => ({ id: i + 1, status: 'AVAILABLE' as TableStatus }));
      localDb.saveTables(initialTables);
    }
    
    if (useFirebase && db) {
      const snapshot = await getDocs(collection(db, "tables"));
      if (snapshot.empty) {
        for (let i = 1; i <= tableCount; i++) {
          await setDoc(doc(db, "tables", i.toString()), { id: i, status: 'AVAILABLE' });
        }
      }
    }
  }
};
