import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { 
  Table as TableType, 
  Product, 
  Order, 
  OrderItem, 
} from './types';
import { INITIAL_TABLE_COUNT, PRODUCTS, CATEGORIES } from './constants';
import ThermalReceipt from './components/ThermalReceipt';
import { dbService } from './services/dbService';

// --- Interfaces & Helpers ---
interface ToastMsg { id: number; message: string; type: 'success' | 'error' | 'info'; }
interface Store {
  tables: TableType[];
  orders: Order[];
  loading: boolean;
  toasts: ToastMsg[];
  addOrUpdateOrder: (order: Order) => Promise<boolean>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<boolean>;
  closeOrder: (orderId: string) => Promise<boolean>;
  cancelOrderAction: (orderId: string, tableId: number) => Promise<boolean>;
  deleteHistoryOrder: (orderId: string) => Promise<boolean>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
const formatDateLocal = (ts: number) => new Date(ts).toISOString().split('T')[0];

// --- Componentes de UI ---
const ToastContainer = ({ toasts }: { toasts: ToastMsg[] }) => (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
    {toasts.map(t => (
      <div key={t.id} className={`p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-fadeIn pointer-events-auto backdrop-blur-md ${
        t.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400' :
        t.type === 'error' ? 'bg-rose-600/90 text-white border-rose-500' : 'bg-slate-800/90 text-white border-slate-700'
      }`}>
        <i className={`fas ${t.type === 'success' ? 'fa-check-circle' : t.type === 'error' ? 'fa-triangle-exclamation' : 'fa-info-circle'}`}></i>
        <span className="font-bold text-xs uppercase tracking-wide">{t.message}</span>
      </div>
    ))}
  </div>
);

const MixFoodsLogo = ({ size = "w-16 h-16" }) => (
  <div className={`${size} relative flex items-center justify-center`}>
    <div className="absolute inset-0 bg-red-600 rounded-2xl rotate-12 opacity-10"></div>
    <div className="relative w-full h-full bg-gradient-to-br from-rose-600 to-red-700 rounded-xl shadow-lg flex flex-col items-center justify-center border-2 border-white/20">
      <span className="text-[7px] font-black text-amber-300 tracking-widest uppercase leading-none">Mix</span>
      <span className="text-[10px] font-black text-white uppercase tracking-tighter leading-none mt-0.5">Foods</span>
    </div>
  </div>
);

const ConnectionStatus = () => {
  const [isCloud, setIsCloud] = useState(dbService.isCloudActive());
  useEffect(() => {
    const interval = setInterval(() => setIsCloud(dbService.isCloudActive()), 5000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="fixed top-3 right-3 z-[100] flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
      <div className={`w-1.5 h-1.5 rounded-full ${isCloud ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{isCloud ? 'Online' : 'Offline'}</span>
    </div>
  );
};

// --- Hook de Gerenciamento de Estado ---
const useStore = (): Store => {
  const [tables, setTables] = useState<TableType[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  useEffect(() => {
    let unsubO: any, unsubT: any;
    const start = async () => {
      await dbService.init(INITIAL_TABLE_COUNT);
      unsubO = dbService.subscribeOrders(data => { setOrders(data); setLoading(false); });
      unsubT = dbService.subscribeTables(setTables);
    };
    start();
    return () => { unsubO?.(); unsubT?.(); };
  }, []);

  const addOrUpdateOrder = async (order: Order) => {
    try {
      await dbService.saveOrder(order);
      await dbService.updateTableStatus(order.tableId, 'OCCUPIED');
      showToast("Pedido sincronizado!", 'success');
      return true;
    } catch (e) {
      showToast("Erro ao salvar dados.", 'error');
      return false;
    }
  };

  const updateOrderStatus = async (id: string, status: Order['status']) => {
    const order = orders.find(o => o.id === id);
    if (!order) return false;
    await dbService.saveOrder({ ...order, status });
    return true;
  };

  const closeOrder = async (id: string) => {
    const order = orders.find(o => o.id === id);
    if (!order) return false;
    await dbService.saveOrder({ ...order, status: 'PAID' });
    await dbService.updateTableStatus(order.tableId, 'AVAILABLE');
    showToast("Mesa liberada!", 'success');
    return true;
  };

  const cancelOrderAction = async (id: string, tId: number) => {
    await dbService.deleteOrder(id, tId);
    showToast("Pedido removido.", 'info');
    return true;
  };

  const deleteHistoryOrder = async (id: string) => {
    await dbService.deleteHistoryOrder(id);
    showToast("Registro excluído.", 'info');
    return true;
  };

  return { tables, orders, loading, toasts, addOrUpdateOrder, updateOrderStatus, closeOrder, cancelOrderAction, deleteHistoryOrder, showToast };
};

// --- Views ---

const WaiterView = ({ store }: { store: Store }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED'>('ALL');

  const filtered = useMemo(() => store.tables.filter(t => 
    filter === 'ALL' ? true : filter === 'AVAILABLE' ? t.status === 'AVAILABLE' : t.status === 'OCCUPIED'
  ), [store.tables, filter]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fadeIn pb-24">
      <header className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-900 italic uppercase">Mesas</h2>
        <MixFoodsLogo size="w-10 h-10" />
      </header>
      <div className="flex bg-slate-200/50 p-1 rounded-xl mb-6 gap-1">
        {['ALL', 'AVAILABLE', 'OCCUPIED'].map((f: any) => (
          <button key={f} onClick={() => setFilter(f)} className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
            {f === 'ALL' ? 'Tudo' : f === 'AVAILABLE' ? 'Livres' : 'Ocupadas'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {filtered.map(table => {
          const active = store.orders.find(o => o.tableId === table.id && o.status !== 'PAID' && o.status !== 'CANCELLED');
          return (
            <button key={table.id} onClick={() => navigate(`/table/${table.id}`)} className={`flex flex-col items-center p-6 rounded-2xl border-2 transition-all active:scale-95 ${table.status === 'OCCUPIED' ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-white border-slate-100'}`}>
              <span className="text-[10px] font-black uppercase opacity-60">Mesa</span>
              <span className="text-4xl font-black italic my-1">{table.id}</span>
              {table.status === 'OCCUPIED' && <p className="text-[11px] font-black">R$ {active?.total.toFixed(2)}</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const OrderEditor = ({ store }: { store: Store }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const tableId = parseInt(id || '0');
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0].id);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeOrder = useMemo(() => store.orders.find(o => o.tableId === tableId && o.status !== 'PAID' && o.status !== 'CANCELLED'), [store.orders, tableId]);

  useEffect(() => {
    if (activeOrder) setCart(activeOrder.items);
  }, [activeOrder]);

  const addToCart = (p: Product) => {
    setCart(prev => {
      // Se já existe o produto SEM observação, incrementa. Se tem observação, cria novo item.
      const idx = prev.findIndex(item => item.productId === p.id && !item.notes);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { id: generateId(), productId: p.id, name: p.name, price: p.price, quantity: 1, notes: '', timestamp: Date.now() }];
    });
    store.showToast(`${p.name} adicionado`);
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => i.id === itemId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };

  const handleSave = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    const order: Order = {
      id: activeOrder?.id || generateId(),
      tableId,
      items: cart,
      status: activeOrder?.status || 'OPEN',
      createdAt: activeOrder?.createdAt || Date.now(),
      total: cart.reduce((acc, i) => acc + (i.price * i.quantity), 0)
    };
    if (await store.addOrUpdateOrder(order)) navigate('/');
    setSaving(false);
  };

  const filtered = PRODUCTS.filter(p => search ? p.name.toLowerCase().includes(search.toLowerCase()) : p.category === selectedCat);
  const total = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <header className="bg-white border-b p-4 flex justify-between items-center">
        <button onClick={() => navigate('/')} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><i className="fas fa-chevron-left"></i></button>
        <h2 className="font-black italic uppercase">Mesa {tableId}</h2>
        <div className="w-10"></div>
      </header>

      <div className="p-3 bg-white space-y-3">
        <input type="text" placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
        {!search && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setSelectedCat(c.id)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${selectedCat === c.id ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-3 pb-32">
        {filtered.map(p => (
          <div key={p.id} className="bg-white rounded-2xl p-2 shadow-sm border border-transparent hover:border-rose-200 transition-all">
            <img src={p.image} className="w-full aspect-square object-cover rounded-xl mb-2 bg-slate-100" alt="" />
            <h3 className="font-bold text-[10px] uppercase truncate px-1">{p.name}</h3>
            <p className="text-rose-600 font-black text-[11px] px-1 mb-2 font-mono">R$ {p.price.toFixed(2)}</p>
            <button onClick={() => addToCart(p)} className="w-full bg-slate-950 text-white py-2.5 rounded-xl text-[10px] font-black uppercase active:bg-rose-600">Lançar</button>
          </div>
        ))}
      </div>

      <div className="fixed bottom-20 left-4 right-4 z-40">
        <button onClick={() => setShowSummary(true)} className="w-full bg-slate-950 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center font-black">{cart.length}</div>
            <div className="text-left leading-none">
              <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Total da Mesa</p>
              <p className="text-lg font-black italic font-mono">R$ {total.toFixed(2)}</p>
            </div>
          </div>
          <i className="fas fa-chevron-up text-slate-500"></i>
        </button>
      </div>

      {showSummary && (
        <div className="fixed inset-0 z-[100] animate-fadeIn">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowSummary(false)}></div>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2rem] max-h-[80vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="font-black italic uppercase">Itens da Mesa {tableId}</h3>
              <button onClick={() => setShowSummary(false)} className="text-slate-400"><i className="fas fa-times"></i></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map(item => (
                <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xs uppercase text-slate-800">{item.name}</span>
                    <button onClick={() => setCart(c => c.filter(i => i.id !== item.id))} className="text-rose-500"><i className="fas fa-trash"></i></button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 bg-white rounded-lg p-1 border">
                      <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-slate-400"><i className="fas fa-minus text-[10px]"></i></button>
                      <span className="font-black text-xs w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-rose-500"><i className="fas fa-plus text-[10px]"></i></button>
                    </div>
                    <span className="font-black text-sm">R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  <input type="text" placeholder="Observação..." value={item.notes} onChange={e => setCart(prev => prev.map(i => i.id === item.id ? {...i, notes: e.target.value} : i))} className="bg-white border text-[10px] p-2 rounded-lg outline-none focus:border-rose-400" />
                </div>
              ))}
            </div>
            <div className="p-6 bg-slate-950">
              <button onClick={handleSave} disabled={saving} className="w-full bg-rose-600 text-white py-4 rounded-xl font-black uppercase text-xs shadow-lg">
                {saving ? 'Sincronizando...' : 'Confirmar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- View Admin (Cozinha) ---
const AdminView = ({ store }: { store: Store }) => {
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const active = useMemo(() => store.orders.filter(o => o.status !== 'PAID' && o.status !== 'CANCELLED').sort((a,b) => a.createdAt - b.createdAt), [store.orders]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24">
      <header className="flex justify-between items-end mb-8">
        <h2 className="text-2xl font-black text-slate-900 italic uppercase">Cozinha</h2>
        <div className="bg-rose-600 text-white px-4 py-1.5 rounded-full font-black text-[9px] uppercase">{active.length} Pendentes</div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {active.map(order => (
          <div key={order.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${order.status === 'PREPARING' ? 'bg-amber-500' : order.status === 'READY' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-3xl font-black italic">Mesa {order.tableId}</h3>
              <span className="text-[10px] font-black uppercase bg-slate-100 px-2 py-1 rounded">{new Date(order.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
            <div className="flex-1 space-y-2 mb-6">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex gap-2 font-bold text-xs uppercase">
                    <span className="text-rose-600">{item.quantity}x</span>
                    <span className="flex-1 italic">{item.name}</span>
                  </div>
                  {item.notes && <p className="mt-2 text-[9px] font-black text-rose-600 bg-rose-50 p-1.5 rounded uppercase">Obs: {item.notes}</p>}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2">
               {order.status === 'OPEN' && <button onClick={() => store.updateOrderStatus(order.id, 'PREPARING')} className="bg-amber-500 text-white py-3 rounded-xl font-black text-[10px] uppercase">Iniciar Preparo</button>}
               {order.status === 'PREPARING' && <button onClick={() => store.updateOrderStatus(order.id, 'READY')} className="bg-emerald-500 text-white py-3 rounded-xl font-black text-[10px] uppercase">Marcar Pronto</button>}
               {order.status === 'READY' && <button onClick={() => store.closeOrder(order.id)} className="bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase">Fechar Conta</button>}
               <button onClick={() => { setPrintOrder(order); setTimeout(() => window.print(), 200); }} className="text-[9px] font-black uppercase text-slate-400 py-2 hover:text-slate-600">Imprimir Comanda</button>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden"><ThermalReceipt order={printOrder} /></div>
    </div>
  );
};

// --- View Dashboard (Financeiro) ---
const DashboardView = ({ store }: { store: Store }) => {
  const paid = useMemo(() => store.orders.filter(o => o.status === 'PAID'), [store.orders]);
  const total = paid.reduce((acc, o) => acc + o.total, 0);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
       <h2 className="text-2xl font-black italic uppercase mb-8">Financeiro</h2>
       <div className="bg-slate-950 rounded-[2rem] p-8 text-white mb-8 shadow-2xl">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Faturamento Total</p>
          <p className="text-5xl font-black italic">R$ {total.toFixed(2)}</p>
       </div>
       <div className="bg-white rounded-3xl border shadow-sm p-6">
          <h3 className="font-black uppercase text-xs mb-6 text-slate-400">Últimos Pagamentos</h3>
          <div className="space-y-4">
            {paid.map(o => (
              <div key={o.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-black italic text-sm">Mesa {o.tableId}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(o.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-4">
                   <span className="font-black text-emerald-600 font-mono">R$ {o.total.toFixed(2)}</span>
                   <button onClick={() => store.deleteHistoryOrder(o.id)} className="text-slate-300 hover:text-rose-600"><i className="fas fa-trash text-xs"></i></button>
                </div>
              </div>
            ))}
          </div>
       </div>
    </div>
  );
}

// --- Main App ---
const App: React.FC = () => {
  const store = useStore();
  if (store.loading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950">
      <MixFoodsLogo size="w-24 h-24" />
      <div className="mt-8 w-40 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-rose-600 animate-progress"></div>
      </div>
      <p className="text-white font-black text-[10px] uppercase tracking-[0.5em] mt-6 animate-pulse">Mix Foods</p>
    </div>
  );

  return (
    <HashRouter>
      <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
        <nav className="fixed bottom-0 left-0 right-0 md:relative md:w-64 bg-slate-950 text-white p-2 md:p-6 flex md:flex-col justify-around md:justify-start gap-4 z-[60] md:border-r border-white/5">
           <div className="hidden md:flex flex-col items-center mb-8"><MixFoodsLogo size="w-20 h-20"/><h1 className="text-xl font-black italic uppercase mt-4">Mix Foods</h1></div>
           <Link to="/" className="flex flex-col md:flex-row items-center gap-3 p-4 rounded-2xl hover:bg-white/5"><i className="fas fa-table-cells text-blue-500"></i><span className="text-[9px] md:text-xs font-black uppercase">Mesas</span></Link>
           <Link to="/admin" className="flex flex-col md:flex-row items-center gap-3 p-4 rounded-2xl hover:bg-white/5"><i className="fas fa-fire-burner text-rose-500"></i><span className="text-[9px] md:text-xs font-black uppercase">Cozinha</span></Link>
           <Link to="/dashboard" className="flex flex-col md:flex-row items-center gap-3 p-4 rounded-2xl hover:bg-white/5"><i className="fas fa-chart-pie text-amber-500"></i><span className="text-[9px] md:text-xs font-black uppercase">Painel</span></Link>
        </nav>
        <ConnectionStatus />
        <ToastContainer toasts={store.toasts} />
        <main className="flex-1 overflow-x-hidden pb-20 md:pb-0">
          <Routes>
            <Route path="/" element={<WaiterView store={store} />} />
            <Route path="/table/:id" element={<OrderEditor store={store} />} />
            <Route path="/admin" element={<AdminView store={store} />} />
            <Route path="/dashboard" element={<DashboardView store={store} />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
