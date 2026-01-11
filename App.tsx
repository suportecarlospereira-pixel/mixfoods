import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { 
  Table as TableType, 
  Product, 
  Order, 
  OrderItem, 
} from './types';
import { INITIAL_TABLE_COUNT, PRODUCTS as INITIAL_PRODUCTS, CATEGORIES } from './constants';
import ThermalReceipt from './components/ThermalReceipt';
import { dbService } from './services/dbService';
import { getBusinessInsights } from './services/geminiService';

// --- Interfaces & Helpers ---

interface ToastMsg {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface Store {
  tables: TableType[];
  orders: Order[];
  products: Product[];
  loading: boolean;
  toasts: ToastMsg[];
  addOrUpdateOrder: (order: Order) => Promise<boolean>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<boolean>;
  closeOrder: (orderId: string) => Promise<boolean>;
  cancelOrderAction: (orderId: string, tableId: number) => Promise<boolean>;
  deleteHistoryOrder: (orderId: string) => Promise<boolean>;
  saveProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

const formatDateLocal = (timestamp: number | Date) => {
  const d = new Date(timestamp);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

const COLORS = ['#e11d48', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

// --- Componentes Auxiliares ---

const ToastContainer = ({ toasts }: { toasts: ToastMsg[] }) => (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
    {toasts.map(t => (
      <div key={t.id} className={`p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-fadeIn pointer-events-auto backdrop-blur-md ${
        t.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400' :
        t.type === 'error' ? 'bg-rose-600/90 text-white border-rose-500' :
        'bg-slate-800/90 text-white border-slate-700'
      }`}>
        <i className={`fas ${
          t.type === 'success' ? 'fa-check-circle' :
          t.type === 'error' ? 'fa-triangle-exclamation' : 'fa-info-circle'
        }`}></i>
        <span className="font-bold text-xs uppercase tracking-wide">{t.message}</span>
      </div>
    ))}
  </div>
);

const PinModal = ({ onSuccess, onClose }: { onSuccess: () => void, onClose: () => void }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === 'foodmix') {
      onSuccess();
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-xs shadow-2xl animate-fadeIn">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-lock text-xl"></i>
          </div>
          <h3 className="text-lg font-black uppercase text-slate-800">Acesso Restrito</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase">Digite a senha do gerente</p>
        </div>
        <form onSubmit={handleSubmit}>
          <input 
            type="password" 
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className={`w-full text-center text-2xl font-black tracking-widest p-4 rounded-xl bg-slate-50 border-2 outline-none transition-colors ${
              error ? 'border-rose-500 text-rose-500 bg-rose-50' : 'border-slate-200 focus:border-slate-800'
            }`}
            placeholder="****"
          />
          {error && <p className="text-center text-[10px] text-rose-600 font-bold mt-2 uppercase animate-pulse">Senha Incorreta</p>}
          <div className="grid grid-cols-2 gap-2 mt-6">
            <button type="button" onClick={onClose} className="py-3 rounded-xl font-black text-[10px] uppercase bg-slate-100 text-slate-500 hover:bg-slate-200">Cancelar</button>
            <button type="submit" className="py-3 rounded-xl font-black text-[10px] uppercase bg-slate-900 text-white hover:bg-slate-800">Entrar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Modal de Visualização do Cupom ---
const CouponPreviewModal = ({ order, onClose }: { order: Order, onClose: () => void }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div className="flex flex-col h-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header do Modal */}
        <div className="flex justify-between items-center mb-4 text-white">
          <h3 className="text-lg font-black uppercase italic tracking-wider">Visualizar Cupom</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Área do Cupom (Scrollável) */}
        <div className="bg-zinc-800 p-4 sm:p-8 rounded-3xl overflow-y-auto custom-scrollbar shadow-2xl border border-white/10 flex justify-center mb-4 flex-1">
           {/* Wrapper branco para simular o papel */}
           <div className="bg-white shadow-lg text-black w-fit h-fit min-h-[300px] pointer-events-none select-none origin-top scale-90 sm:scale-100 transition-transform">
              <ThermalReceipt order={order} />
           </div>
        </div>

        {/* Ações */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose} className="py-4 rounded-xl bg-slate-800 text-slate-300 font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-colors">
            Fechar
          </button>
          <button onClick={handlePrint} className="py-4 rounded-xl bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 shadow-lg shadow-rose-900/20 flex items-center justify-center gap-2 transition-colors">
            <i className="fas fa-print text-lg"></i> Imprimir Agora
          </button>
        </div>

      </div>
    </div>
  );
};

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
    const check = setInterval(() => setIsCloud(dbService.isCloudActive()), 3000);
    return () => clearInterval(check);
  }, []);

  return (
    <div className="fixed top-3 right-3 z-[100] flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
      <div className={`w-1.5 h-1.5 rounded-full ${isCloud ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
        {isCloud ? 'Online' : 'Offline'}
      </span>
    </div>
  );
};

const useStore = (): Store => {
  const [tables, setTables] = useState<TableType[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('mix_products');
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  useEffect(() => {
    let unsubOrders: (() => void) | undefined;
    let unsubTables: (() => void) | undefined;

    const start = async () => {
      try {
        await dbService.init(INITIAL_TABLE_COUNT);
        unsubOrders = dbService.subscribeOrders((data) => {
          setOrders(data);
          setLoading(false);
        });
        unsubTables = dbService.subscribeTables(setTables);
      } catch (err) {
        console.error("Erro Store Init:", err);
        showToast("Erro ao conectar ao banco.", 'error');
        setLoading(false);
      }
    };
    start();
    return () => { unsubOrders?.(); unsubTables?.(); };
  }, []);

  const saveProduct = (product: Product) => {
    setProducts(prev => {
      const idx = prev.findIndex(p => p.id === product.id);
      const newProducts = idx >= 0
        ? prev.map(p => p.id === product.id ? product : p)
        : [...prev, product];
      localStorage.setItem('mix_products', JSON.stringify(newProducts));
      return newProducts;
    });
    showToast("Cardápio atualizado!", 'success');
  };

  const deleteProduct = (productId: string) => {
    setProducts(prev => {
      const newProducts = prev.filter(p => p.id !== productId);
      localStorage.setItem('mix_products', JSON.stringify(newProducts));
      return newProducts;
    });
    showToast("Produto removido.", 'info');
  };

  const addOrUpdateOrder = async (order: Order) => {
    const prevOrders = [...orders]; 
    try {
      setOrders(prev => {
        const idx = prev.findIndex(o => o.id === order.id);
        if (idx >= 0) { const n = [...prev]; n[idx] = order; return n; }
        return [order, ...prev];
      });
      await dbService.saveOrder(order);
      await dbService.updateTableStatus(order.tableId, 'OCCUPIED');
      showToast("Pedido salvo!", 'success');
      return true;
    } catch (e) {
      setOrders(prevOrders);
      showToast("Erro ao salvar. Tente novamente.", 'error');
      return false;
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    const prevOrders = [...orders];
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return false;
      const updated = { ...order, status };
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      await dbService.saveOrder(updated);
      return true;
    } catch (e) {
      setOrders(prevOrders);
      showToast("Erro ao atualizar status.", 'error');
      return false;
    }
  };

  const closeOrder = async (orderId: string) => {
    const prevOrders = [...orders];
    const prevTables = [...tables];
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return false;
      const updated: Order = { ...order, status: 'PAID' };
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      setTables(prev => prev.map(t => t.id === order.tableId ? { ...t, status: 'AVAILABLE' } : t));
      
      await dbService.saveOrder(updated);
      await dbService.updateTableStatus(order.tableId, 'AVAILABLE');
      showToast("Conta fechada!", 'success');
      return true;
    } catch (e) {
      setOrders(prevOrders);
      setTables(prevTables);
      showToast("Erro ao fechar conta.", 'error');
      return false;
    }
  };

  const cancelOrderAction = async (orderId: string, tableId: number) => {
    const prevOrders = [...orders];
    const prevTables = [...tables];
    try {
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: 'AVAILABLE' } : t));
      await dbService.deleteOrder(orderId, tableId);
      showToast("Pedido cancelado.", 'info');
      return true;
    } catch (e) {
      setOrders(prevOrders);
      setTables(prevTables);
      showToast("Erro ao cancelar.", 'error');
      return false;
    }
  };

  const deleteHistoryOrder = async (orderId: string) => {
    try {
      setOrders(prev => prev.filter(o => o.id !== orderId));
      await dbService.deleteHistoryOrder(orderId);
      showToast("Registro excluído.", 'info');
      return true;
    } catch (e) { return false; }
  };

  return { tables, orders, products, toasts, addOrUpdateOrder, updateOrderStatus, closeOrder, cancelOrderAction, deleteHistoryOrder, saveProduct, deleteProduct, loading, showToast };
};

const Sidebar = ({ onNavigate }: { onNavigate: (path: string) => void }) => (
  <nav className="fixed bottom-0 left-0 right-0 md:relative md:w-64 bg-slate-950 text-white p-2 md:p-5 flex md:flex-col justify-around md:justify-start gap-1 z-[60] border-t md:border-t-0 md:border-r border-white/5">
    <div className="hidden md:flex flex-col items-center mb-8 px-2 text-center mt-4">
      <MixFoodsLogo size="w-20 h-20" />
      <h1 className="text-xl font-black tracking-tighter text-white mt-3 italic uppercase">MIX FOODS</h1>
    </div>
    <div className="flex md:flex-col flex-1 justify-around md:justify-start md:gap-2">
      <button onClick={() => onNavigate('/')} className="flex flex-col md:flex-row items-center gap-2 p-3 md:p-4 rounded-xl hover:bg-white/5 group w-full text-left">
        <i className="fas fa-table-cells text-blue-500"></i>
        <span className="text-[9px] md:text-sm font-bold uppercase">Mesas</span>
      </button>
      <button onClick={() => onNavigate('/admin')} className="flex flex-col md:flex-row items-center gap-2 p-3 md:p-4 rounded-xl hover:bg-white/5 group w-full text-left">
        <i className="fas fa-fire-burner text-rose-500"></i>
        <span className="text-[9px] md:text-sm font-bold uppercase">Admin</span>
      </button>
      <button onClick={() => onNavigate('/dashboard')} className="flex flex-col md:flex-row items-center gap-2 p-3 md:p-4 rounded-xl hover:bg-white/5 group w-full text-left">
        <i className="fas fa-chart-pie text-amber-500"></i>
        <span className="text-[9px] md:text-sm font-bold uppercase">Painel</span>
      </button>
    </div>
  </nav>
);

const WaiterView = ({ store }: { store: Store }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED'>('ALL');

  const filteredTables = useMemo(() => store.tables.filter((t) => {
    if (filter === 'AVAILABLE') return t.status === 'AVAILABLE';
    if (filter === 'OCCUPIED') return t.status === 'OCCUPIED';
    return true;
  }), [store.tables, filter]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fadeIn pb-24">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 italic uppercase">Mesas</h2>
        </div>
        <div className="md:hidden">
          <MixFoodsLogo size="w-10 h-10" />
        </div>
      </header>
      <div className="flex bg-slate-200/50 p-1 rounded-xl mb-6 gap-1">
        {(['ALL', 'AVAILABLE', 'OCCUPIED'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
              filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}>
            {f === 'ALL' ? 'Tudo' : f === 'AVAILABLE' ? 'Livres' : 'Ocupadas'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {filteredTables.map((table) => {
          const activeOrder = store.orders.find((o) => o.tableId === table.id && o.status !== 'PAID' && o.status !== 'CANCELLED');
          const isOccupied = table.status === 'OCCUPIED';
          return (
            <button key={table.id} onClick={() => navigate(`/table/${table.id}`)}
              className={`relative overflow-hidden flex flex-col items-center p-4 rounded-2xl transition-all border-2 active:scale-95 ${
                isOccupied ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-900'
              }`}>
              <span className="text-[10px] font-black uppercase opacity-60 mb-2">Mesa</span>
              <span className="text-3xl font-black italic leading-none mb-2">{table.id}</span>
              {isOccupied && <p className="text-[11px] font-black">R$ {activeOrder?.total.toFixed(2)}</p>}
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
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].id);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  const activeOrder = useMemo(() => 
    store.orders.find((o) => o.tableId === tableId && o.status !== 'PAID' && o.status !== 'CANCELLED'),
    [store.orders, tableId]
  );

  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      if (activeOrder) setCart(activeOrder.items); else setCart([]);
      initialized.current = true;
    } else {
      if (cart.length === 0 && activeOrder && activeOrder.items.length > 0) {
        setCart(activeOrder.items);
      }
    }
  }, [activeOrder]);

  const addToCart = (product: Product) => {
    if (product.price === 0) return;
    setCart(prev => [...prev, {
      id: generateId(),
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      notes: '',
      timestamp: Date.now()
    }]);
    store.showToast(`${product.name} adicionado!`, 'success');
    if (search) setSearch('');
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setCart(prev => prev.map(item => item.id === itemId ? { ...item, notes } : item));
  };

  const removeItem = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSave = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    const orderData: Order = {
      id: activeOrder?.id || generateId(),
      tableId,
      items: cart,
      status: activeOrder?.status || 'OPEN',
      createdAt: activeOrder?.createdAt || Date.now(),
      total: cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    };
    const success = await store.addOrUpdateOrder(orderData);
    setIsSubmitting(false);
    if (success) navigate('/');
  };

  const filteredProducts = useMemo(() => {
    let list = store.products;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(s));
    } else {
      list = list.filter(p => p.category === selectedCategory);
    }
    return list;
  }, [selectedCategory, search, store.products]);

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden relative">
      <header className="bg-white border-b border-slate-100 p-3 flex justify-between items-center z-30">
        <button onClick={() => navigate('/')} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <i className="fas fa-chevron-left text-slate-600"></i>
        </button>
        <div className="text-center">
          <h2 className="text-lg font-black italic uppercase">Mesa {tableId}</h2>
          <p className="text-[8px] font-bold text-rose-600 uppercase tracking-widest">Mix Foods Mobile</p>
        </div>
        <div className="w-10"></div>
      </header>

      <div className="px-3 pt-3 pb-1 bg-white">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input 
              type="text" 
              placeholder="Buscar produto..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-100 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
          {search && (
            <button onClick={() => setSearch('')} className="bg-slate-200 text-slate-500 w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform">
                <i className="fas fa-times text-xs"></i>
            </button>
          )}
        </div>
      </div>

      {!search && (
        <nav className="bg-white border-b border-slate-100 flex gap-2 overflow-x-auto p-2 no-scrollbar sticky top-0 z-20">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${
                selectedCategory === cat.id ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'
              }`}>
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </nav>
      )}

      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-3 pb-36">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white rounded-2xl p-2 shadow-sm flex flex-col border border-white">
            <div className="relative mb-2 aspect-square rounded-xl overflow-hidden bg-slate-100">
              <img src={product.image || 'https://via.placeholder.com/400'} className="w-full h-full object-cover" alt={product.name} />
              <div className="absolute top-1 right-1 bg-white/90 px-2 py-0.5 rounded-lg shadow-sm">
                <span className="text-rose-600 font-black text-[9px]">R$ {product.price.toFixed(2)}</span>
              </div>
            </div>
            <h3 className="font-bold text-slate-800 text-[9px] mb-2 px-1 flex-1 uppercase line-clamp-2 leading-tight">{product.name}</h3>
            <button 
              disabled={product.price === 0 || isSubmitting}
              onClick={() => addToCart(product)}
              className="w-full bg-slate-950 text-white py-2.5 rounded-xl text-[9px] font-black uppercase active:bg-rose-600 transition-colors"
            >
              Lançar
            </button>
          </div>
        ))}
      </div>

      <div className="fixed bottom-20 left-4 right-4 z-40">
        <button onClick={() => setShowSummary(true)}
          className="w-full bg-slate-950 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center justify-between border border-white/10 active:scale-95 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center font-black text-sm">{cartCount}</div>
            <div className="text-left">
              <p className="text-[9px] text-slate-500 font-bold uppercase leading-none mb-1">Total Lançado</p>
              <p className="text-lg font-black italic leading-none">R$ {cartTotal.toFixed(2)}</p>
            </div>
          </div>
          <i className="fas fa-chevron-up text-slate-600"></i>
        </button>
      </div>

      {showSummary && (
        <div className="fixed inset-0 z-[100] animate-fadeIn">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowSummary(false)}></div>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[85vh]">
            <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto my-3"></div>
            <div className="px-6 py-2 flex justify-between items-center border-b border-slate-50">
              <h3 className="text-lg font-black italic uppercase">Resumo Mesa {tableId}</h3>
              <button onClick={() => setShowSummary(false)} className="text-slate-400 p-2"><i className="fas fa-times"></i></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {cart.map(item => (
                <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-[11px] uppercase text-slate-800 flex-1 pr-4">{item.name}</h4>
                    <button onClick={() => removeItem(item.id)} className="text-rose-500 p-1"><i className="fas fa-trash-can text-xs"></i></button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Observações</label>
                    <div className="flex items-center gap-2">
                      <input type="text" placeholder="Ex: Sem cebola..." value={item.notes || ''}
                        onChange={(e) => updateItemNotes(item.id, e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-bold text-slate-600 focus:border-rose-500 focus:outline-none" />
                      <span className="text-[11px] font-black text-slate-900 whitespace-nowrap">R$ {item.price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {cart.length === 0 && <div className="text-center py-10 opacity-30"><i className="fas fa-cart-shopping text-4xl mb-3"></i><p className="text-[10px] font-black uppercase">Mesa Vazia</p></div>}
            </div>
            <div className="p-5 bg-slate-950 text-white space-y-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Total Acumulado</span>
                <span className="text-2xl font-black italic">R$ {cartTotal.toFixed(2)}</span>
              </div>
              <button onClick={handleSave} disabled={isSubmitting || cart.length === 0} className="w-full bg-rose-600 text-white py-4.5 rounded-2xl font-black text-xs uppercase shadow-lg active:bg-rose-700 h-[56px] flex items-center justify-center">
                {isSubmitting ? 'Salvando...' : 'Finalizar e Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MenuEditor = ({ store }: { store: Store }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    category: CATEGORIES[0].id,
    name: '',
    price: 0,
    image: ''
  });

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData(product);
  };

  const handleAddNew = () => {
    setEditingId('NEW');
    setFormData({ category: CATEGORIES[0].id, name: '', price: 0, image: '' });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.price === undefined) return;
    
    const product: Product = {
      id: editingId === 'NEW' ? generateId() : editingId!,
      name: formData.name,
      price: Number(formData.price),
      category: formData.category || CATEGORIES[0].id,
      image: formData.image || 'https://via.placeholder.com/400'
    };
    
    store.saveProduct(product);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Remover este produto?")) {
      store.deleteProduct(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-black uppercase italic">Gerenciar Cardápio</h3>
        <button onClick={handleAddNew} className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-emerald-600 transition-colors">
          <i className="fas fa-plus mr-1"></i> Novo Produto
        </button>
      </div>

      {editingId && (
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 animate-fadeIn">
          <h4 className="font-black text-sm uppercase mb-4">{editingId === 'NEW' ? 'Adicionar Produto' : 'Editar Produto'}</h4>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Nome</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none focus:border-slate-800" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Preço (R$)</label>
                 <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none focus:border-slate-800" required />
               </div>
               <div>
                 <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Categoria</label>
                 <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none focus:border-slate-800">
                   {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
               </div>
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">URL da Imagem (Opcional)</label>
              <input type="text" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none focus:border-slate-800" placeholder="https://..." />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg font-black text-[10px] uppercase">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg font-black text-[10px] uppercase">Salvar</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {store.products.map(p => (
           <div key={p.id} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex gap-3 items-center">
             <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden shrink-0">
               <img src={p.image} className="w-full h-full object-cover" alt="" />
             </div>
             <div className="flex-1 min-w-0">
               <p className="font-bold text-xs truncate">{p.name}</p>
               <p className="text-[10px] text-slate-500 font-bold">R$ {p.price.toFixed(2)}</p>
             </div>
             <div className="flex flex-col gap-1">
               <button onClick={() => handleEdit(p)} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100"><i className="fas fa-pencil text-[10px]"></i></button>
               <button onClick={() => handleDelete(p.id)} className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center hover:bg-rose-100"><i className="fas fa-trash text-[10px]"></i></button>
             </div>
           </div>
        ))}
      </div>
    </div>
  );
};

const AdminView = ({ store }: { store: Store }) => {
  const [tab, setTab] = useState<'KITCHEN' | 'MENU'>('KITCHEN');
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  
  const activeOrders = useMemo(() => 
    store.orders.filter((o) => o.status !== 'PAID' && o.status !== 'CANCELLED').sort((a,b) => a.createdAt - b.createdAt), 
    [store.orders]
  );

  const handlePrint = (order: Order) => {
    setPrintingOrder(order);
    setTimeout(() => window.print(), 200);
  };

  const handleDelete = (order: Order) => {
    if (window.confirm(`Tem certeza que deseja CANCELAR a Mesa ${order.tableId}?`)) {
      store.cancelOrderAction(order.id, order.tableId);
    }
  };

  const advanceStatus = (order: Order) => {
    if (order.status === 'OPEN') store.updateOrderStatus(order.id, 'PREPARING');
    else if (order.status === 'PREPARING') store.updateOrderStatus(order.id, 'READY');
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 italic uppercase">Administração</h2>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setTab('KITCHEN')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'KITCHEN' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border'}`}>Cozinha</button>
            <button onClick={() => setTab('MENU')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'MENU' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border'}`}>Cardápio</button>
          </div>
        </div>
        {tab === 'KITCHEN' && <div className="bg-rose-600 text-white px-4 py-1.5 rounded-full font-black text-[9px] uppercase shadow-lg shadow-rose-100">{activeOrders.length} Pendentes</div>}
      </header>

      {tab === 'MENU' ? <MenuEditor store={store} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeOrders.map((order) => {
            const isPrep = order.status === 'PREPARING';
            const isReady = order.status === 'READY';
            return (
              <div key={order.id} className={`bg-white rounded-[2rem] p-6 shadow-sm border flex flex-col relative overflow-hidden group transition-all ${
                isPrep ? 'border-amber-200 bg-amber-50' : isReady ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100'
              }`}>
                <div className={`absolute top-0 left-0 w-1 h-full ${
                  isPrep ? 'bg-amber-500' : isReady ? 'bg-emerald-500' : 'bg-rose-500'
                }`}></div>
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-3xl font-black text-slate-900 italic">Mesa {order.tableId}</h3>
                  <div className="flex flex-col items-end">
                     <span className="text-[10px] font-black text-slate-400 bg-white/50 px-2 py-1 rounded-lg mb-1">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                     <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                       isPrep ? 'bg-amber-200 text-amber-800' : isReady ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'
                     }`}>
                       {isPrep ? 'Preparando' : isReady ? 'Pronto' : 'Aguardando'}
                     </span>
                  </div>
                </div>
                <div className="flex-1 space-y-3 mb-6">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-white/60 rounded-xl border border-black/5">
                      <div className="flex gap-2 items-center">
                        <span className="min-w-[24px] h-6 bg-slate-950 text-white rounded flex items-center justify-center font-black text-[10px]">{item.quantity}</span>
                        <span className="font-bold text-xs text-slate-800 uppercase italic flex-1">{item.name}</span>
                      </div>
                      {item.notes && (
                        <div className="mt-2 bg-rose-600 text-white p-2 rounded-lg text-[10px] font-black uppercase italic animate-pulse">
                          *** {item.notes} ***
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <button onClick={() => handlePrint(order)} className="bg-white border border-slate-200 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-colors">Imprimir</button>
                  
                  {!isReady ? (
                    <button onClick={() => advanceStatus(order)} className={`py-3 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg text-white transition-colors ${
                      isPrep ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-100'
                    }`}>
                      {isPrep ? 'Marcar Pronto' : 'Preparar'}
                    </button>
                  ) : (
                    <button onClick={() => store.closeOrder(order.id)} className="bg-slate-800 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-slate-900 transition-colors">
                      <i className="fas fa-check mr-1"></i> Receber
                    </button>
                  )}

                  <button onClick={() => handleDelete(order)} className="col-span-2 text-red-400 py-2 font-black text-[8px] uppercase tracking-widest hover:text-red-600 transition-colors flex items-center justify-center gap-1 opacity-60 hover:opacity-100">
                    <i className="fas fa-trash-can"></i> Cancelar Pedido
                  </button>
                </div>
              </div>
            );
          })}
          {activeOrders.length === 0 && (
            <div className="col-span-full py-24 text-center">
               <i className="fas fa-check-circle text-emerald-100 text-6xl mb-4"></i>
               <p className="text-xs font-black uppercase text-slate-300">Tudo pronto por aqui!</p>
            </div>
          )}
        </div>
      )}
      <div className="hidden"><ThermalReceipt order={printingOrder} /></div>
    </div>
  );
};

const DashboardView = ({ store }: { store: Store }) => {
  const [filterType, setFilterType] = useState<'HOJE' | 'ONTEM' | 'CUSTOM'>('HOJE');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [aiAdvice, setAiAdvice] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  const filteredOrders = useMemo(() => {
    const paid = store.orders.filter((o) => o.status === 'PAID');
    const todayStr = formatDateLocal(new Date());

    return paid.filter((o) => {
      const orderDateStr = formatDateLocal(o.createdAt);
      
      if (filterType === 'HOJE') {
        return orderDateStr === todayStr;
      }
      if (filterType === 'ONTEM') {
        const d = new Date(); d.setDate(d.getDate() - 1);
        const yesterdayStr = formatDateLocal(d);
        return orderDateStr === yesterdayStr;
      }
      if (filterType === 'CUSTOM') {
        if (!dateStart && !dateEnd) return true;
        if (dateStart && orderDateStr < dateStart) return false;
        if (dateEnd && orderDateStr > dateEnd) return false;
        return true;
      }
      return true;
    });
  }, [store.orders, filterType, dateStart, dateEnd]);

  const total = useMemo(() => filteredOrders.reduce((acc, o) => acc + o.total, 0), [filteredOrders]);

  const topProducts = useMemo(() => {
    const productCounts: Record<string, number> = {};
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const qty = item.quantity;
        productCounts[item.name] = (productCounts[item.name] || 0) + qty;
      });
    });
    return Object.entries(productCounts)
      .sort(([, qtyA], [, qtyB]) => qtyB - qtyA)
      .slice(0, 5);
  }, [filteredOrders]);

  const chartData = useMemo(() => {
    const byCategory: Record<string, number> = {};
    const byDay: Record<string, number> = {};

    filteredOrders.forEach(o => {
       const day = new Date(o.createdAt).toLocaleDateString('pt-BR', { weekday: 'short' });
       byDay[day] = (byDay[day] || 0) + o.total;

       o.items.forEach(i => {
         const prod = store.products.find(p => p.id === i.productId);
         const catName = prod ? CATEGORIES.find(c => c.id === prod.category)?.name : 'Outros';
         const name = catName || 'Outros';
         byCategory[name] = (byCategory[name] || 0) + (i.price * i.quantity);
       });
    });

    return {
      bar: Object.entries(byDay).map(([name, value]) => ({ name, value })),
      pie: Object.entries(byCategory).map(([name, value]) => ({ name, value }))
    };
  }, [filteredOrders, store.products]);

  const handleAskAi = async () => {
    setAiLoading(true);
    const dataSummary = {
      totalSales: total,
      count: filteredOrders.length,
      topProducts: topProducts.map(p => ({ name: p[0], qty: p[1] })),
      salesByDay: chartData.bar
    };
    const advice = await getBusinessInsights(dataSummary);
    setAiAdvice(advice);
    setAiLoading(false);
  };

  const handleQuickPrint = (order: Order) => {
    setPrintingOrder(order);
    setTimeout(() => window.print(), 200);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
        <div className="flex-1">
          <h2 className="text-2xl font-black text-slate-950 italic uppercase mb-2">Financeiro</h2>
          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={() => setFilterType('HOJE')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${filterType === 'HOJE' ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>HOJE</button>
            <button onClick={() => setFilterType('ONTEM')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${filterType === 'ONTEM' ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>ONTEM</button>
            <button onClick={() => setFilterType('CUSTOM')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${filterType === 'CUSTOM' ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>PERÍODO</button>
          </div>
          {filterType === 'CUSTOM' && (
             <div className="flex gap-2 mt-3 animate-fadeIn">
               <input 
                 type="date" 
                 value={dateStart} 
                 onChange={(e) => setDateStart(e.target.value)}
                 className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-600 uppercase"
               />
               <span className="text-slate-300 self-center">-</span>
               <input 
                 type="date" 
                 value={dateEnd} 
                 onChange={(e) => setDateEnd(e.target.value)}
                 className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-600 uppercase"
               />
             </div>
          )}
        </div>
        
        <div className="bg-slate-950 p-6 rounded-[2rem] text-white w-full md:w-64 shadow-2xl border border-white/5 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-rose-600/10 rounded-full"></div>
          <p className="text-slate-500 text-[10px] font-black uppercase mb-1 tracking-widest">Total Líquido</p>
          <p className="text-3xl font-black italic">R$ {total.toFixed(2)}</p>
        </div>
      </header>

      <div className="mb-6">
         {!aiAdvice ? (
           <button onClick={handleAskAi} disabled={aiLoading} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all">
             {aiLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-robot"></i>}
             <span className="font-black text-xs uppercase tracking-widest">
               {aiLoading ? 'Analisando dados...' : 'Consultar Inteligência Artificial'}
             </span>
           </button>
         ) : (
           <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl relative animate-fadeIn">
             <button onClick={() => setAiAdvice('')} className="absolute top-4 right-4 text-indigo-300 hover:text-indigo-600"><i className="fas fa-times"></i></button>
             <div className="flex items-start gap-4">
               <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0"><i className="fas fa-lightbulb"></i></div>
               <div>
                 <h4 className="font-black text-indigo-900 uppercase text-sm mb-2">Insights da IA</h4>
                 <div className="prose prose-sm prose-indigo text-indigo-800 text-xs leading-relaxed whitespace-pre-wrap">{aiAdvice}</div>
               </div>
             </div>
           </div>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm h-80">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Vendas por Dia</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={chartData.bar}>
              <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
              <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Bar dataKey="value" fill="#e11d48" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm h-80">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Por Categoria</h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie data={chartData.pie} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {chartData.pie.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none'}} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px'}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm h-fit">
          <h3 className="text-sm font-black text-slate-900 italic uppercase tracking-widest mb-4 flex items-center gap-2">
            <i className="fas fa-ranking-star text-amber-500"></i> Mais Vendidos
          </h3>
          <div className="space-y-3">
            {topProducts.map(([name, count], index) => (
              <div key={name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black ${index === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
                    {index + 1}º
                  </span>
                  <span className="text-[10px] font-bold text-slate-700 uppercase truncate leading-tight">{name}</span>
                </div>
                <span className="text-xs font-black text-rose-600 whitespace-nowrap ml-2">{count} un</span>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-center text-[10px] text-slate-300 uppercase py-4">Sem dados</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-slate-900 italic uppercase tracking-widest">Histórico de Vendas</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full">{filteredOrders.length} registros</span>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
            {filteredOrders.map(o => (
              <div 
                key={o.id} 
                onClick={() => setViewingOrder(o)}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border-l-4 border-emerald-500 transition-all hover:bg-white hover:shadow-md cursor-pointer gap-3 group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black uppercase italic text-slate-800">Mesa {o.tableId}</p>
                    
                    {/* Botão explícito para ver o cupom */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); setViewingOrder(o); }}
                      className="bg-blue-50 border border-blue-200 text-blue-600 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-blue-100 transition-colors"
                      title="Ver Visualização do Cupom"
                    >
                      <i className="fas fa-eye text-[10px]"></i>
                      <span className="text-[9px] font-bold uppercase">Ver Cupom</span>
                    </button>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 mt-1">{new Date(o.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                  <p className="text-sm font-black italic text-slate-900">R$ {o.total.toFixed(2)}</p>
                  
                  {/* Botão de Impressão Rápida (Mantido para conveniência) */}
                  <button 
                      onClick={(e) => { e.stopPropagation(); handleQuickPrint(o); }}
                      className="bg-white border border-slate-200 text-slate-400 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
                      title="Impressão Rápida"
                    >
                      <i className="fas fa-print text-xs"></i>
                  </button>

                  <button onClick={(e) => { e.stopPropagation(); store.deleteHistoryOrder(o.id); }} className="text-slate-300 hover:text-rose-600 p-2 transition-colors"><i className="fas fa-trash-can text-xs"></i></button>
                </div>
              </div>
            ))}
            {filteredOrders.length === 0 && <div className="text-center py-20 text-slate-300 italic font-black text-[10px] uppercase">Nenhuma venda encontrada neste período</div>}
          </div>
        </div>
      </div>
      
      {/* Modais */}
      {viewingOrder && <CouponPreviewModal order={viewingOrder} onClose={() => setViewingOrder(null)} />}
      <div className="hidden"><ThermalReceipt order={printingOrder} /></div>
    </div>
  );
};

const App: React.FC = () => {
  const store = useStore();
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    if (path === '/' || path.startsWith('/table/')) {
      navigate(path);
    } else {
      if (isAdminUnlocked) {
        navigate(path);
      } else {
        setShowPinModal(true);
        (window as any).pendingPath = path; 
      }
    }
  };

  const handlePinSuccess = () => {
    setIsAdminUnlocked(true);
    setShowPinModal(false);
    const path = (window as any).pendingPath;
    if (path) navigate(path);
  };

  useEffect(() => {
    if ((location.pathname === '/admin' || location.pathname === '/dashboard') && !isAdminUnlocked) {
      navigate('/');
      setTimeout(() => alert("Acesso Restrito: Use o menu para entrar com senha."), 100);
    }
  }, [location, isAdminUnlocked, navigate]);
  
  if (store.loading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950">
      <MixFoodsLogo size="w-24 h-24" />
      <div className="mt-8 w-40 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-rose-600 animate-progress"></div>
      </div>
      <p className="text-white font-black text-[10px] uppercase tracking-[0.5em] mt-6 animate-pulse">Sincronizando Banco</p>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      <Sidebar onNavigate={handleNavigation} />
      <ConnectionStatus />
      <ToastContainer toasts={store.toasts} />
      {showPinModal && <PinModal onSuccess={handlePinSuccess} onClose={() => setShowPinModal(false)} />}
      <main className="flex-1 overflow-x-hidden">
        <Routes>
          <Route path="/" element={<WaiterView store={store} />} />
          <Route path="/table/:id" element={<OrderEditor store={store} />} />
          <Route path="/admin" element={isAdminUnlocked ? <AdminView store={store} /> : <div/>} />
          <Route path="/dashboard" element={isAdminUnlocked ? <DashboardView store={store} /> : <div/>} />
        </Routes>
      </main>
    </div>
  );
};

export default function Root() {
  return (
    <HashRouter>
      <App />
    </HashRouter>
  );
}
