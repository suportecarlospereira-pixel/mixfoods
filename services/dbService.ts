
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
  deleteDoc,
  writeBatch
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
    // 1. Limpeza Local Imediata
    const allOrders = localDb.getOrders();
    const orderToArchive = allOrders.find((o: any) => o.id === orderId);
    localDb.saveOrders(allOrders.filter((o: any) => o.id !== orderId));
    
    const tables = localDb.getTables();
    const tIdx = tables.findIndex((t: any) => t.id === tableId);
    if (tIdx >= 0) {
      tables[tIdx].status = 'AVAILABLE';
      localDb.saveTables(tables);
    }

    // 2. Firebase: Mover para deleted_orders e liberar mesa
    if (useFirebase && db) {
      try {
        const batch = writeBatch(db);
        
        // Salva na coleção de excluídos para auditoria
        if (orderToArchive) {
          const archiveRef = doc(db, "deleted_orders", orderId);
          batch.set(archiveRef, { ...orderToArchive, deletedAt: Date.now() });
        }

        // Deleta da lista ativa
        batch.delete(doc(db, "orders", orderId));

        // Força a mesa a ficar livre
        batch.set(doc(db, "tables", tableId.toString()), { id: tableId, status: 'AVAILABLE' }, { merge: true });

        await batch.commit();
      } catch (e) {
        console.error("Erro ao deletar no Firebase:", e);
        // Fallback individual se o batch falhar
        await deleteDoc(doc(db, "orders", orderId)).catch(() => {});
        await setDoc(doc(db, "tables", tableId.toString()), { id: tableId, status: 'AVAILABLE' }, { merge: true }).catch(() => {});
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
