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
  limit,
  deleteDoc,
  Firestore
  Firestore,
  writeBatch
} from 'firebase/firestore';
import { Order, Table, TableStatus } from '../types';

@@ -59,7 +60,6 @@

  subscribeOrders(callback: (orders: Order[]) => void) {
    if (useFirebase && db) {
      // OTIMIZAÇÃO: Traz apenas os últimos 100 pedidos para não travar o app
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(100));
      return onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
@@ -101,43 +101,18 @@
    localDb.saveOrders(orders);

    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "orders", order.id), order, { merge: true });
      } catch (e) {
        console.error("Erro Save Cloud:", e);
        throw e;
      }
      await setDoc(doc(db, "orders", order.id), order, { merge: true });
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
        console.error("Erro Delete Cloud:", e);
        throw e;
      }
    }
  },

  async deleteHistoryOrder(orderId: string): Promise<void> {
    const allOrders = localDb.getOrders();
    localDb.saveOrders(allOrders.filter((o) => o.id !== orderId));
    await this.updateTableStatus(tableId, 'AVAILABLE');

    if (useFirebase && db) {
      await deleteDoc(doc(db, "orders", orderId)).catch(console.error);
      await deleteDoc(doc(db, "orders", orderId));
    }
  },

@@ -150,27 +125,38 @@
    }

    if (useFirebase && db) {
      await setDoc(doc(db, "tables", tableId.toString()), { id: tableId, status }, { merge: true }).catch(console.error);
      await setDoc(doc(db, "tables", tableId.toString()), { id: tableId, status }, { merge: true });
    }
  },

  async init(tableCount: number): Promise<void> {
    // Inicialização Local
    if (localDb.getTables().length === 0) {
      const initialTables = Array.from({ length: tableCount }, (_, i) => ({ id: i + 1, status: 'AVAILABLE' as TableStatus }));
      localDb.saveTables(initialTables);
    }

    // Inicialização Cloud otimizada com Batch
    if (useFirebase && db) {
      try {
        const snapshot = await getDocs(collection(db, "tables"));
        if (snapshot.empty) {
          const batch = writeBatch(db);
          for (let i = 1; i <= tableCount; i++) {
            await setDoc(doc(db, "tables", i.toString()), { id: i, status: 'AVAILABLE' });
            const tRef = doc(db, "tables", i.toString());
            batch.set(tRef, { id: i, status: 'AVAILABLE' });
          }
          await batch.commit();
        }
      } catch (e) {
        console.error("Erro Init Cloud:", e);
      }
    }
  },

  async deleteHistoryOrder(orderId: string): Promise<void> {
    const allOrders = localDb.getOrders();
    localDb.saveOrders(allOrders.filter((o) => o.id !== orderId));
    if (useFirebase && db) await deleteDoc(doc(db, "orders", orderId));
  }
};
