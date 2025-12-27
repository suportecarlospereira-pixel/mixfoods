
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { 
  Table, 
  Product, 
  Order, 
  OrderItem, 
  TableStatus,
} from './types';
import { INITIAL_TABLE_COUNT, PRODUCTS, CATEGORIES } from './constants';
import ThermalReceipt from './components/ThermalReceipt';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { dbService } from './services/dbService';

const MixFoodsLogo = ({ size = "w-24 h-24", animated = true }: { size?: string, animated?: boolean }) => (
  <div className={`${size} relative flex items-center justify-center`}>
    <div className={`absolute inset-0 bg-red-600 rounded-3xl rotate-12 opacity-10 ${animated ? 'animate-pulse' : ''}`}></div>
    <div className="relative w-full h-full bg-gradient-to-br from-rose-600 to-red-700 rounded-2xl shadow-xl flex flex-col items-center justify-center border-2 border-white/20">
      <div className="flex items-center gap-1 mb-0.5">
        <i className="fas fa-burger text-white text-xs"></i>
        <i className="fas fa-utensils text-amber-400 text-[10px]"></i>
      </div>
      <span className="text-[9px] font-black text-amber-300 tracking-[0.2em] uppercase leading-none">Mix</span>
      <span className="text-sm font-black text-white uppercase tracking-tighter leading-none -mt-0.5 drop-shadow-md">Foods</span>
      <div className="absolute -bottom-1 -right-1 bg-amber-400 w-5 h-5 rounded-lg flex items-center justify-center shadow-md rotate-12">
        <i className="fas fa-star text-white text-[8px]"></i>
      </div>
    </div>
  </div>
);

const ConnectionStatus = () => {
  const isCloud = dbService.isCloudActive();
  return (
    <div className="fixed top-4 right-4 z-[60] flex items-center gap-3 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-slate-100 transition-all scale-90 md:scale-100">
      <div className={`w-2 h-2 rounded-full ${isCloud ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
      <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">
        {isCloud ? 'Cloud' : 'Local'}
      </span>
    </div>
  );
};

const useStore = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dbService.init(INITIAL_TABLE_COUNT).then(() => {
      const unsubscribeOrders = dbService.subscribeOrders((newOrders) => {
        setOrders(newOrders);
        setLoading(false);
      });
      const unsubscribeTables = dbService.subscribeTables((newTables) => {
        setTables(newTables);
      });
      return () => {
        unsubscribeOrders();
        unsubscribeTables();
      };
    });
  }, []);

  const addOrUpdateOrder = async (order: Order) => {
    await dbService.saveOrder(order);
    await dbService.updateTableStatus(order.tableId, 'OCCUPIED');
  };

  const closeOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      const updatedOrder = { ...order, status: 'PAID' } as Order;
      await dbService.saveOrder(updatedOrder);
      await dbService.updateTableStatus(order.tableId, 'AVAILABLE');
    }
  };

  const cancelOrderAction = async (orderId: string, tableId: number) => {
    await dbService.deleteOrder(orderId, tableId);
  };

  return { tables, orders, addOrUpdateOrder, closeOrder, cancelOrderAction, loading };
};

const Sidebar = () => (
  <nav className="fixed bottom-0 left-0 right-0 md:relative md:w-72 bg-slate-950 text-white p-3 md:p-5 flex md:flex-col justify-around md:justify-start gap-2 z-50 border-t md:border-t-0 md:border-r border-white/5 shadow-2xl">
    <div className="hidden md:flex flex-col items-center mb-10 px-2 text-center mt-6">
      <MixFoodsLogo />
      <h1 className="text-2xl font-black tracking-tighter text-white mt-4 italic">MIX FOODS</h1>
      <p className="text-[8px] text-slate-500 uppercase tracking-[0.5em] font-black mt-2">Professional Edition</p>
    </div>
    
    <div className="flex md:flex-col flex-1 justify-around md:justify-start md:gap-3">
      <Link to="/" className="flex flex-col md:flex-row items-center gap-3 p-3 md:p-4 rounded-2xl hover:bg-white/5 transition-all group">
        <i className="fas fa-table-cells text-blue-500 text-lg md:text-base"></i>
        <span className="text-[9px] md:text-sm font-black uppercase tracking-widest md:tracking-normal">Mesas</span>
      </Link>
      <Link to="/admin" className="flex flex-col md:flex-row items-center gap-3 p-3 md:p-4 rounded-2xl hover:bg-white/5 transition-all group">
        <i className="fas fa-fire-burner text-rose-500 text-lg md:text-base"></i>
        <span className="text-[9px] md:text-sm font-black uppercase tracking-widest md:tracking-normal">Cozinha</span>
      </Link>
      <Link to="/dashboard" className="flex flex-col md:flex-row items-center gap-3 p-3 md:p-4 rounded-2xl hover:bg-white/5 transition-all group">
        <i className="fas fa-chart-pie text-amber-500 text-lg md:text-base"></i>
        <span className="text-[9px] md:text-sm font-black uppercase tracking-widest md:tracking-normal">Painel</span>
      </Link>
    </div>
  </nav>
);

const WaiterView = ({ store }: { store: any }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED'>('ALL');

  const filteredTables = store.tables.filter((t: Table) => {
    if (filter === 'AVAILABLE') return t.status === 'AVAILABLE';
    if (filter === 'OCCUPIED') return t.status === 'OCCUPIED';
    return true;
  });

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto animate-fadeIn pb-24">
      <header className="mb-8 md:mb-12 flex justify-between items-start">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter italic">Comandas</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-6 h-1 bg-red-600 rounded-full"></span>
            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Atendimento Ativo</p>
          </div>
        </div>
        <div className="md:hidden">
          <MixFoodsLogo size="w-12 h-12" animated={false} />
        </div>
      </header>

      <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 gap-1 shadow-inner sticky top-2 z-50">
        {(['ALL', 'AVAILABLE', 'OCCUPIED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === f 
                ? 'bg-white text-slate-900 shadow-md scale-[1.02]' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {f === 'ALL' ? 'Todas' : f === 'AVAILABLE' ? 'Livres' : 'Ocupadas'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {filteredTables.map((table: Table) => {
          const activeOrder = store.orders.find((o: Order) => o.tableId === table.id && o.status !== 'PAID' && o.status !== 'CANCELLED');
          const isOccupied = table.status === 'OCCUPIED';
          
          return (
            <div
              key={table.id}
              className={`relative overflow-hidden flex flex-col rounded-[2rem] shadow-sm transition-all border-2 bg-white ${
                !isOccupied ? 'border-slate-100' : 'border-rose-500 shadow-xl shadow-rose-50'
              }`}
            >
              <div className="p-6 flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-4">
                   <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                     isOccupied ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                   }`}>
                    {isOccupied ? 'Ocupada' : 'Livre'}
                  </span>
                  <span className="text-slate-300 font-black text-sm">#{table.id}</span>
                </div>
                
                <div className="flex flex-col items-center mb-6">
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-3 transition-colors ${
                    isOccupied ? 'bg-rose-600 text-white' : 'bg-slate-50 text-slate-300'
                  }`}>
                    <span className="text-4xl font-black">{table.id}</span>
                  </div>
                  
                  {isOccupied ? (
                    <div className="text-center">
                      <p className="text-2xl font-black text-slate-900 italic">R$ {activeOrder?.total.toFixed(2) || '0.00'}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                        Desde às {activeOrder ? new Date(activeOrder.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Pronta para Uso</p>
                  )}
                </div>

                <div className="w-full grid grid-cols-1 gap-2">
                  <button
                    onClick={() => navigate(`/table/${table.id}`)}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                      isOccupied 
                        ? 'bg-rose-600 text-white shadow-rose-100' 
                        : 'bg-emerald-500 text-white shadow-emerald-100'
                    }`}
                  >
                    <i className={`fas ${isOccupied ? 'fa-pen-to-square' : 'fa-plus'}`}></i>
                    {isOccupied ? 'Gerenciar Pedido' : 'Abrir Comanda'}
                  </button>
                  
                  {isOccupied && (
                    <button
                      onClick={() => navigate(`/table/${table.id}`)}
                      className="w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Ver Detalhes
                    </button>
                  )}
                </div>
              </div>
              
              {isOccupied && (
                <div className="absolute top-2 right-2 flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const OrderEditor = ({ store }: { store: any }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const tableId = parseInt(id || '0');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].id);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const activeOrder = useMemo(() => 
    store.orders.find((o: Order) => o.tableId === tableId && o.status !== 'PAID' && o.status !== 'CANCELLED'),
    [store.orders, tableId]
  );

  useEffect(() => {
    if (activeOrder) setCart(activeOrder.items); else setCart([]);
  }, [activeOrder, tableId]);

  const addToCart = (product: Product) => {
    if (product.price === 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && !item.notes);
      if (existing && !editingNoteId) {
        return prev.map(item => item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        notes: '',
        timestamp: Date.now()
      }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.id !== itemId);
    });
  };

  const handleSave = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const orderData: Order = activeOrder ? {
        ...activeOrder,
        items: cart,
        total: cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
      } : {
        id: Math.random().toString(36).substr(2, 9),
        tableId,
        items: cart,
        status: 'OPEN',
        createdAt: Date.now(),
        total: cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
      };
      await store.addOrUpdateOrder(orderData);
      navigate('/');
    } catch (err) { navigate('/'); } finally { setIsSubmitting(false); }
  };

  const handleCancelOrder = async () => {
    if (!activeOrder) { navigate('/'); return; }
    if (window.confirm(`DESEJA EXCLUIR? A Mesa ${tableId} será liberada.`)) {
      setIsSubmitting(true);
      await store.cancelOrderAction(activeOrder.id, tableId);
      navigate('/');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9] md:flex-row overflow-hidden animate-fadeIn">
      <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar pb-32 md:pb-10">
        <header className="flex justify-between items-center mb-6">
          <Link to="/" className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-900 border border-slate-100">
            <i className="fas fa-arrow-left"></i>
          </Link>
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase">Mesa {tableId}</h2>
            <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Mix Foods Digital</p>
          </div>
          <div className="w-12"></div>
        </header>

        <nav className="flex gap-3 overflow-x-auto pb-4 mb-6 no-scrollbar touch-pan-x">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex flex-col items-center gap-2 min-w-[100px] p-4 rounded-[2rem] transition-all border-2 ${
                selectedCategory === cat.id ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-white border-transparent text-slate-400'
              }`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="font-black text-[9px] uppercase tracking-tighter whitespace-nowrap">{cat.name}</span>
            </button>
          ))}
        </nav>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {PRODUCTS.filter(p => p.category === selectedCategory).map(product => {
            const isUnavailable = product.price === 0;
            return (
              <div key={product.id} className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 flex flex-col group">
                <div className="relative mb-4 overflow-hidden rounded-2xl">
                  <img src={product.image} className="w-full aspect-square object-cover" />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                    <span className="text-rose-600 font-black text-[10px] italic">R$ {product.price.toFixed(2)}</span>
                  </div>
                </div>
                <h3 className="font-black text-slate-800 text-[11px] mb-4 flex-1 uppercase italic">{product.name}</h3>
                <button 
                  disabled={isUnavailable || isSubmitting}
                  onClick={() => addToCart(product)}
                  className="w-full bg-slate-950 text-white py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
                >
                  <i className="fas fa-plus"></i> Lançar
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="md:w-[420px] bg-white border-l border-slate-200 flex flex-col h-[65%] md:h-full shadow-[0_-20px_50px_rgba(0,0,0,0.1)] fixed md:static bottom-0 left-0 right-0 z-40 rounded-t-[3rem] md:rounded-none overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <h3 className="text-xl font-black text-slate-900 tracking-tighter italic">Resumo</h3>
          <div className="bg-rose-600 text-white h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm">
            {cart.reduce((acc, i) => acc + i.quantity, 0)}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          {cart.map(item => (
            <div key={item.id} className="border-b border-slate-50 pb-5 mb-5 flex justify-between items-center">
              <div>
                <h4 className="font-black text-slate-800 text-[12px] uppercase italic">{item.name}</h4>
                {item.notes && <p className="text-[10px] text-amber-600 font-bold uppercase">{item.notes}</p>}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 rounded-lg bg-slate-100 font-black">-</button>
                <span className="font-black text-xs">{item.quantity}</span>
                <button onClick={() => addToCart(PRODUCTS.find(p => p.id === item.productId)!)} className="w-8 h-8 rounded-lg bg-slate-100 font-black">+</button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-8 bg-slate-950 text-white">
          <div className="flex justify-between items-center mb-6">
            <span className="text-slate-500 font-black uppercase text-[10px]">Total</span>
            <span className="text-2xl font-black italic">R$ {cart.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2)}</span>
          </div>
          <button onClick={handleSave} className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black text-sm uppercase mb-3">Enviar Pedido</button>
          <button onClick={handleCancelOrder} className="w-full bg-white/5 text-slate-400 py-3 rounded-xl font-black text-[10px] uppercase">Excluir Pedido</button>
        </div>
      </div>
    </div>
  );
};

const AdminView = ({ store }: { store: any }) => {
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const activeOrders = store.orders.filter((o: Order) => o.status !== 'PAID' && o.status !== 'CANCELLED');

  const handlePrint = (order: Order) => {
    setPrintingOrder(order);
    setTimeout(() => window.print(), 100);
  };

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto pb-40">
      <header className="flex justify-between items-end mb-10">
        <h2 className="text-4xl font-black text-slate-950 tracking-tighter italic uppercase">Monitor Mix</h2>
        <div className="bg-rose-600 text-white px-6 py-2 rounded-full font-black text-[10px]">{activeOrders.length} EM PREPARO</div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {activeOrders.map((order: Order) => (
          <div key={order.id} className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">Mesa {order.tableId}</h3>
              <span className="text-[10px] font-black text-slate-400">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div className="space-y-4 mb-8 bg-slate-50 p-6 rounded-[2rem]">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-center">
                  <span className="w-7 h-7 bg-rose-600 text-white rounded-lg flex items-center justify-center font-black text-xs">{item.quantity}</span>
                  <span className="font-black text-sm text-slate-800 uppercase italic">{item.name}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button onClick={() => handlePrint(order)} className="bg-slate-100 py-4 rounded-xl font-black text-[10px] uppercase">Imprimir</button>
              <button onClick={() => store.closeOrder(order.id)} className="bg-emerald-500 text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-emerald-100">Finalizar</button>
            </div>
            <button onClick={() => store.cancelOrderAction(order.id, order.tableId)} className="w-full text-rose-500 font-black text-[10px] uppercase border border-rose-50 py-3 rounded-xl hover:bg-rose-50">Excluir Pedido</button>
          </div>
        ))}
      </div>
      <ThermalReceipt order={printingOrder} />
    </div>
  );
};

const DashboardView = ({ store }: { store: any }) => {
  const [filter, setFilter] = useState<'HOJE' | 'ONTEM' | 'DATA'>('HOJE');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

  const filteredOrders = useMemo(() => {
    const paid = store.orders.filter((o: Order) => o.status === 'PAID');
    const now = new Date();
    
    return paid.filter((o: Order) => {
      const d = new Date(o.createdAt);
      if (filter === 'HOJE') return d.toDateString() === now.toDateString();
      if (filter === 'ONTEM') {
        const yest = new Date();
        yest.setDate(now.getDate() - 1);
        return d.toDateString() === yest.toDateString();
      }
      const sel = new Date(customDate);
      return d.getUTCFullYear() === sel.getUTCFullYear() && d.getUTCMonth() === sel.getUTCMonth() && d.getUTCDate() === sel.getUTCDate();
    });
  }, [store.orders, filter, customDate]);

  const total = filteredOrders.reduce((acc: number, o: Order) => acc + o.total, 0);
  const productStats = filteredOrders.reduce((acc: any, o: Order) => {
    o.items.forEach(i => acc[i.name] = (acc[i.name] || 0) + i.quantity);
    return acc;
  }, {});
  const chartData = Object.entries(productStats).map(([name, value]) => ({ name, value })).sort((a:any, b:any) => b.value - a.value).slice(0, 5);

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto pb-48 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-black text-slate-950 tracking-tighter italic uppercase">Financeiro</h2>
          <div className="flex gap-2 mt-4">
            {['HOJE', 'ONTEM', 'DATA'].map(f => (
              <button key={f} onClick={() => setFilter(f as any)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase ${filter === f ? 'bg-rose-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>
                {f}
              </button>
            ))}
          </div>
          {filter === 'DATA' && <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="mt-3 bg-white border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black" />}
        </div>
        <div className="bg-slate-950 p-6 rounded-[2.5rem] text-white md:w-64 shadow-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase mb-1">Caixa ({filter})</p>
          <p className="text-3xl font-black italic">R$ {total.toFixed(2)}</p>
          <p className="text-[9px] text-emerald-400 font-bold mt-1 uppercase">{filteredOrders.length} PEDIDOS</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm min-h-[400px]">
          <h3 className="text-xl font-black text-slate-900 mb-8 italic uppercase">Top 5 Mais Pedidos</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" fontSize={8} tick={{fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#E11D48" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm min-h-[400px]">
          <h3 className="text-xl font-black text-slate-900 mb-8 italic uppercase">Histórico de Vendas</h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {filteredOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-l-4 border-emerald-500">
                <div>
                  <p className="text-sm font-black italic uppercase">Mesa {o.tableId}</p>
                  <p className="text-[9px] font-bold text-slate-400">{new Date(o.createdAt).toLocaleTimeString()}</p>
                </div>
                <p className="text-lg font-black italic">R$ {o.total.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const store = useStore();
  if (store.loading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950">
      <MixFoodsLogo size="w-32 h-32" />
      <div className="mt-10 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-rose-600 animate-progress"></div>
      </div>
    </div>
  );

  return (
    <HashRouter>
      <div className="flex flex-col md:flex-row min-h-screen">
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
