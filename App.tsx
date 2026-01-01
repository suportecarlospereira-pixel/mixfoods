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

interface Store {
  tables: TableType[];
  orders: Order[];
  loading: boolean;
  addOrUpdateOrder: (order: Order) => Promise<void>;
  closeOrder: (orderId: string) => Promise<void>;
  cancelOrderAction: (orderId: string, tableId: number) => Promise<void>;
  deleteHistoryOrder: (orderId: string) => Promise<void>;
}

// Gerador de ID simples e único
const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

// --- Componentes ---

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
  const [loading, setLoading] = useState(true);

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
        console.error("Erro ao iniciar store:", err);
        setLoading(false);
      }
    };
    start();

    return () => {
      if (unsubOrders) unsubOrders();
      if (unsubTables) unsubTables();
    };
  }, []);

  const addOrUpdateOrder = async (order: Order) => {
    // Atualização otimista
    setOrders(prev => {
      const idx = prev.findIndex(o => o.id === order.id);
      if (idx >= 0) {
        const newOrders = [...prev];
        newOrders[idx] = order;
        return newOrders;
      }
      return [order, ...prev];
    });
    
    await dbService.saveOrder(order);
    await dbService.updateTableStatus(order.tableId, 'OCCUPIED');
  };

  const closeOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      const updated = { ...order, status: 'PAID' } as Order;
      // Atualização otimista para fechar rápido
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      setTables(prev => prev.map(t => t.id === order.tableId ? { ...t, status: 'AVAILABLE' } : t));

      await dbService.saveOrder(updated);
      await dbService.updateTableStatus(order.tableId, 'AVAILABLE');
    }
  };

  const cancelOrderAction = async (orderId: string, tableId: number) => {
    // Atualização otimista UI: Remove o pedido e libera a mesa imediatamente na tela
    setOrders(prev => prev.filter(o => o.id !== orderId));
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: 'AVAILABLE' } : t));

    await dbService.deleteOrder(orderId, tableId);
  };

  const deleteHistoryOrder = async (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    await dbService.deleteHistoryOrder(orderId);
  };

  return { tables, orders, addOrUpdateOrder, closeOrder, cancelOrderAction, deleteHistoryOrder, loading };
};

const Sidebar = () => (
  <nav className="fixed bottom-0 left-0 right-0 md:relative md:w-64 bg-slate-950 text-white p-2 md:p-5 flex md:flex-col justify-around md:justify-start gap-1 z-[60] border-t md:border-t-0 md:border-r border-white/5">
    <div className="hidden md:flex flex-col items-center mb-8 px-2 text-center mt-4">
      <MixFoodsLogo size="w-20 h-20" />
      <h1 className="text-xl font-black tracking-tighter text-white mt-3 italic uppercase">MIX FOODS</h1>
    </div>
    <div className="flex md:flex-col flex-1 justify-around md:justify-start md:gap-2">
      <Link to="/" className="flex flex-col md:flex-row items-center gap-2 p-3 md:p-4 rounded-xl hover:bg-white/5 group">
        <i className="fas fa-table-cells text-blue-500"></i>
        <span className="text-[9px] md:text-sm font-bold uppercase">Mesas</span>
      </Link>
      <Link to="/admin" className="flex flex-col md:flex-row items-center gap-2 p-3 md:p-4 rounded-xl hover:bg-white/5 group">
        <i className="fas fa-fire-burner text-rose-500"></i>
        <span className="text-[9px] md:text-sm font-bold uppercase">Cozinha</span>
      </Link>
      <Link to="/dashboard" className="flex flex-col md:flex-row items-center gap-2 p-3 md:p-4 rounded-xl hover:bg-white/5 group">
        <i className="fas fa-chart-pie text-amber-500"></i>
        <span className="text-[9px] md:text-sm font-bold uppercase">Painel</span>
      </Link>
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
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
              filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            {f === 'ALL' ? 'Tudo' : f === 'AVAILABLE' ? 'Livres' : 'Ocupadas'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {filteredTables.map((table) => {
          const activeOrder = store.orders.find((o) => o.tableId === table.id && o.status !== 'PAID' && o.status !== 'CANCELLED');
          const isOccupied = table.status === 'OCCUPIED';
          return (
            <button
              key={table.id}
              onClick={() => navigate(`/table/${table.id}`)}
              className={`relative overflow-hidden flex flex-col items-center p-4 rounded-2xl transition-all border-2 active:scale-95 ${
                isOccupied ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-900'
              }`}
            >
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
    try {
      const orderData: Order = {
        id: activeOrder?.id || generateId(),
        tableId,
        items: cart,
        status: activeOrder?.status || 'OPEN',
        createdAt: activeOrder?.createdAt || Date.now(),
        total: cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
      };
      await store.addOrUpdateOrder(orderData);
      navigate('/');
    } catch (err) { 
      console.error(err);
      navigate('/'); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

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

      <nav className="bg-white border-b border-slate-100 flex gap-2 overflow-x-auto p-2 no-scrollbar sticky top-0 z-20">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${
              selectedCategory === cat.id ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-3 pb-36">
        {PRODUCTS.filter(p => p.category === selectedCategory).map(product => (
          <div key={product.id} className="bg-white rounded-2xl p-2 shadow-sm flex flex-col border border-white">
            <div className="relative mb-2 aspect-square rounded-xl overflow-hidden bg-slate-100">
              <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
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
        <button
          onClick={() => setShowSummary(true)}
          className="w-full bg-slate-950 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center justify-between border border-white/10 active:scale-95 transition-all"
        >
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
                      <input 
                        type="text"
                        placeholder="Ex: Sem cebola, s/ maionese..."
                        value={item.notes || ''}
                        onChange={(e) => updateItemNotes(item.id, e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-bold text-slate-600 focus:border-rose-500 focus:outline-none"
                      />
                      <span className="text-[11px] font-black text-slate-900 whitespace-nowrap">R$ {item.price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="text-center py-10 opacity-30">
                  <i className="fas fa-cart-shopping text-4xl mb-3"></i>
                  <p className="text-[10px] font-black uppercase">Mesa Vazia</p>
                </div>
              )}
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

const AdminView = ({ store }: { store: Store }) => {
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  
  const activeOrders = useMemo(() => 
    store.orders.filter((o) => o.status !== 'PAID' && o.status !== 'CANCELLED'), 
    [store.orders]
  );

  const handlePrint = (order: Order) => {
    setPrintingOrder(order);
    setTimeout(() => window.print(), 100);
  };

  const handleDelete = (order: Order) => {
    if (window.confirm(`Tem certeza que deseja CANCELAR o pedido da Mesa ${order.tableId}? Isso irá excluir o pedido e liberar a mesa.`)) {
      store.cancelOrderAction(order.id, order.tableId);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 italic uppercase">Cozinha</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Painel de Produção</p>
        </div>
        <div className="bg-rose-600 text-white px-4 py-1.5 rounded-full font-black text-[9px] uppercase shadow-lg shadow-rose-100">{activeOrders.length} Pendentes</div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeOrders.map((order) => (
          <div key={order.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-3xl font-black text-slate-900 italic">Mesa {order.tableId}</h3>
              <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div className="flex-1 space-y-3 mb-6">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
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
              <button onClick={() => handlePrint(order)} className="bg-slate-100 py-4 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-colors">Imprimir</button>
              <button onClick={() => store.closeOrder(order.id)} className="bg-emerald-500 text-white py-4 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-colors">Pago</button>
              <button onClick={() => handleDelete(order)} className="col-span-2 bg-red-50 text-red-600 border border-red-100 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                <i className="fas fa-trash-can"></i> Cancelar Pedido
              </button>
            </div>
          </div>
        ))}
        {activeOrders.length === 0 && (
          <div className="col-span-full py-24 text-center">
             <i className="fas fa-check-circle text-emerald-100 text-6xl mb-4"></i>
             <p className="text-xs font-black uppercase text-slate-300">Tudo pronto por aqui!</p>
          </div>
        )}
      </div>
      <div className="hidden">
        <ThermalReceipt order={printingOrder} />
      </div>
    </div>
  );
};

const DashboardView = ({ store }: { store: Store }) => {
  const [filter, setFilter] = useState<'HOJE' | 'ONTEM'>('HOJE');
  
  const filteredOrders = useMemo(() => {
    const paid = store.orders.filter((o) => o.status === 'PAID');
    const now = new Date();
    return paid.filter((o) => {
      const d = new Date(o.createdAt);
      if (filter === 'HOJE') return d.toDateString() === now.toDateString();
      if (filter === 'ONTEM') {
        const yest = new Date(); yest.setDate(now.getDate() - 1);
        return d.toDateString() === yest.toDateString();
      }
      return true;
    });
  }, [store.orders, filter]);

  const total = useMemo(() => filteredOrders.reduce((acc, o) => acc + o.total, 0), [filteredOrders]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-950 italic uppercase mb-2">Financeiro</h2>
          <div className="flex gap-2 mt-4">
            {['HOJE', 'ONTEM'].map(f => (
              <button key={f} onClick={() => setFilter(f as any)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${filter === f ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-slate-950 p-6 rounded-[2rem] text-white w-full md:w-64 shadow-2xl border border-white/5 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-rose-600/10 rounded-full"></div>
          <p className="text-slate-500 text-[10px] font-black uppercase mb-1 tracking-widest">Total Líquido</p>
          <p className="text-3xl font-black italic">R$ {total.toFixed(2)}</p>
        </div>
      </header>

      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <h3 className="text-sm font-black text-slate-900 mb-6 italic uppercase tracking-widest">Vendas Concluídas</h3>
        <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
          {filteredOrders.map(o => (
            <div key={o.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-l-4 border-emerald-500 transition-all hover:bg-slate-100">
              <div>
                <p className="text-xs font-black uppercase italic">Mesa {o.tableId}</p>
                <p className="text-[9px] font-bold text-slate-400">{new Date(o.createdAt).toLocaleTimeString()}</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm font-black italic">R$ {o.total.toFixed(2)}</p>
                <button onClick={() => store.deleteHistoryOrder(o.id)} className="text-slate-300 hover:text-rose-600 p-2 transition-colors"><i className="fas fa-trash-can text-xs"></i></button>
              </div>
            </div>
          ))}
          {filteredOrders.length === 0 && (
            <div className="text-center py-20 text-slate-300 italic font-black text-[10px] uppercase">Sem movimentação no período</div>
          )}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const store = useStore();
  
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
    <HashRouter>
      <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
        <Sidebar />
        <ConnectionStatus />
        <main className="flex-1 overflow-x-hidden">
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
