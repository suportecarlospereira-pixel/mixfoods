
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

const MixFoodsLogo = ({ size = "w-16 h-16", animated = true }: { size?: string, animated?: boolean }) => (
  <div className={`${size} relative flex items-center justify-center`}>
    <div className={`absolute inset-0 bg-red-600 rounded-2xl rotate-12 opacity-10 ${animated ? 'animate-pulse' : ''}`}></div>
    <div className="relative w-full h-full bg-gradient-to-br from-rose-600 to-red-700 rounded-xl shadow-lg flex flex-col items-center justify-center border-2 border-white/20">
      <span className="text-[7px] font-black text-amber-300 tracking-widest uppercase leading-none">Mix</span>
      <span className="text-[10px] font-black text-white uppercase tracking-tighter leading-none mt-0.5">Foods</span>
    </div>
  </div>
);

const ConnectionStatus = () => {
  const isCloud = dbService.isCloudActive();
  return (
    <div className="fixed top-3 right-3 z-[100] flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
      <div className={`w-1.5 h-1.5 rounded-full ${isCloud ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`}></div>
      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
        {isCloud ? 'Online' : 'Offline'}
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

  const deleteHistoryOrder = async (orderId: string) => {
    await dbService.deleteHistoryOrder(orderId);
  };

  return { tables, orders, addOrUpdateOrder, closeOrder, cancelOrderAction, deleteHistoryOrder, loading };
};

const Sidebar = () => (
  <nav className="fixed bottom-0 left-0 right-0 md:relative md:w-64 bg-slate-950 text-white p-2 md:p-5 flex md:flex-col justify-around md:justify-start gap-1 z-[60] border-t md:border-t-0 md:border-r border-white/5">
    <div className="hidden md:flex flex-col items-center mb-8 px-2 text-center mt-4">
      <MixFoodsLogo size="w-20 h-20" />
      <h1 className="text-xl font-black tracking-tighter text-white mt-3 italic">MIX FOODS</h1>
    </div>
    
    <div className="flex md:flex-col flex-1 justify-around md:justify-start md:gap-2">
      <Link to="/" className="flex flex-col md:flex-row items-center gap-2 p-3 md:p-4 rounded-xl hover:bg-white/5 transition-all group">
        <i className="fas fa-table-cells text-blue-500"></i>
        <span className="text-[9px] md:text-sm font-bold uppercase tracking-widest md:tracking-normal">Mesas</span>
      </Link>
      <Link to="/admin" className="flex flex-col md:flex-row items-center gap-2 p-3 md:p-4 rounded-xl hover:bg-white/5 transition-all group">
        <i className="fas fa-fire-burner text-rose-500"></i>
        <span className="text-[9px] md:text-sm font-bold uppercase tracking-widest md:tracking-normal">Cozinha</span>
      </Link>
      <Link to="/dashboard" className="flex flex-col md:flex-row items-center gap-2 p-3 md:p-4 rounded-xl hover:bg-white/5 transition-all group">
        <i className="fas fa-chart-pie text-amber-500"></i>
        <span className="text-[9px] md:text-sm font-bold uppercase tracking-widest md:tracking-normal">Painel</span>
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fadeIn pb-20">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 italic">Mesas</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Atendimento Digital</p>
        </div>
        <div className="md:hidden">
          <MixFoodsLogo size="w-10 h-10" animated={false} />
        </div>
      </header>

      <div className="flex bg-slate-200/50 p-1 rounded-xl mb-6 gap-1 overflow-hidden">
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
        {filteredTables.map((table: Table) => {
          const activeOrder = store.orders.find((o: Order) => o.tableId === table.id && o.status !== 'PAID' && o.status !== 'CANCELLED');
          const isOccupied = table.status === 'OCCUPIED';
          
          return (
            <button
              key={table.id}
              onClick={() => navigate(`/table/${table.id}`)}
              className={`relative overflow-hidden flex flex-col items-center p-4 rounded-2xl transition-all border-2 text-center active:scale-95 ${
                isOccupied ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-900'
              }`}
            >
              <span className="text-[10px] font-black uppercase opacity-60 mb-2">Mesa</span>
              <span className="text-3xl font-black italic leading-none mb-2">{table.id}</span>
              {isOccupied && (
                <div className="mt-1">
                  <p className="text-[11px] font-black leading-none">R$ {activeOrder?.total.toFixed(2)}</p>
                </div>
              )}
              {!isOccupied && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
            </button>
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
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
      if (existing) {
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
    if (window.confirm(`ATENÇÃO: EXCLUIR DEFINITIVAMENTE o pedido da Mesa ${tableId}?`)) {
      setIsSubmitting(true);
      try {
        await store.cancelOrderAction(activeOrder.id, tableId);
        navigate('/');
      } catch (err) {
        alert("Erro ao excluir.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden relative">
      {/* Header Fixo */}
      <header className="bg-white border-b border-slate-100 p-3 flex justify-between items-center z-30">
        <button onClick={() => navigate('/')} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <i className="fas fa-chevron-left text-slate-600"></i>
        </button>
        <div className="text-center">
          <h2 className="text-lg font-black italic uppercase">Mesa {tableId}</h2>
          <p className="text-[8px] font-bold text-rose-600 uppercase tracking-widest">Lançamento de Pedido</p>
        </div>
        <div className="w-10"></div>
      </header>

      {/* Categorias Fixas no Topo */}
      <nav className="bg-white border-b border-slate-100 flex gap-2 overflow-x-auto p-2 no-scrollbar sticky top-0 z-20">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${
              selectedCategory === cat.id ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </nav>

      {/* Grid de Produtos */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-3 pb-32">
        {PRODUCTS.filter(p => p.category === selectedCategory).map(product => {
          const isUnavailable = product.price === 0;
          return (
            <div key={product.id} className="bg-white rounded-2xl p-3 shadow-sm flex flex-col border border-white">
              <div className="relative mb-3 aspect-square rounded-xl overflow-hidden bg-slate-100">
                <img src={product.image} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute top-1 right-1 bg-white/90 px-2 py-0.5 rounded-lg">
                  <span className="text-rose-600 font-black text-[10px]">R$ {product.price.toFixed(2)}</span>
                </div>
              </div>
              <h3 className="font-bold text-slate-800 text-[10px] mb-3 flex-1 uppercase leading-tight">{product.name}</h3>
              <button 
                disabled={isUnavailable || isSubmitting}
                onClick={() => addToCart(product)}
                className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 active:bg-rose-600"
              >
                <i className="fas fa-plus"></i> Adicionar
              </button>
            </div>
          );
        })}
      </div>

      {/* Botão Flutuante de Resumo (Mobile) */}
      <div className="fixed bottom-20 left-4 right-4 z-40 md:bottom-6 md:left-auto md:right-6">
        <button
          onClick={() => setShowSummary(true)}
          className="w-full bg-slate-950 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between border border-white/10 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center font-black">
              {cartCount}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Ver Pedido</p>
              <p className="text-lg font-black italic leading-none">R$ {cartTotal.toFixed(2)}</p>
            </div>
          </div>
          <i className="fas fa-chevron-up text-slate-500"></i>
        </button>
      </div>

      {/* Gaveta de Resumo (Drawer) */}
      {showSummary && (
        <div className="fixed inset-0 z-[100] animate-fadeIn">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowSummary(false)}></div>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[85vh]">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-4"></div>
            
            <div className="px-6 py-4 flex justify-between items-center border-b border-slate-50">
              <h3 className="text-xl font-black italic">CONFERÊNCIA</h3>
              <button onClick={() => setShowSummary(false)} className="text-slate-400 p-2"><i className="fas fa-times"></i></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <div>
                    <h4 className="font-bold text-xs uppercase">{item.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold">R$ {item.price.toFixed(2)} cada</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-black">-</button>
                    <span className="font-black text-sm">{item.quantity}</span>
                    <button onClick={() => addToCart(PRODUCTS.find(p => p.id === item.productId)!)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-black">+</button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="text-center py-10">
                  <i className="fas fa-shopping-basket text-slate-200 text-4xl mb-3"></i>
                  <p className="text-slate-400 text-xs font-bold uppercase">Nenhum item lançado</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-950 text-white space-y-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Total do Pedido</span>
                <span className="text-2xl font-black italic">R$ {cartTotal.toFixed(2)}</span>
              </div>
              <button onClick={handleSave} disabled={isSubmitting || cart.length === 0} className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black text-sm uppercase shadow-lg shadow-rose-900/20 active:bg-rose-700">
                Confirmar e Enviar
              </button>
              <button onClick={handleCancelOrder} disabled={isSubmitting} className="w-full text-slate-500 py-3 text-[10px] font-black uppercase tracking-widest">
                Excluir Comanda
              </button>
            </div>
          </div>
        </div>
      )}
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 italic uppercase">Cozinha</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Controle de Produção</p>
        </div>
        <div className="bg-rose-600 text-white px-4 py-1.5 rounded-full font-black text-[9px] uppercase">{activeOrders.length} Pendentes</div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeOrders.map((order: Order) => (
          <div key={order.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-2xl font-black text-slate-900 italic">Mesa {order.tableId}</h3>
              <span className="text-[10px] font-black text-slate-400">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            
            <div className="flex-1 space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <span className="min-w-[24px] h-6 bg-slate-950 text-white rounded-lg flex items-center justify-center font-black text-[10px] mt-0.5">{item.quantity}</span>
                  <div>
                    <span className="font-bold text-xs text-slate-800 uppercase italic leading-tight">{item.name}</span>
                    {item.notes && <p className="text-[9px] text-rose-500 font-black uppercase mt-0.5">Obs: {item.notes}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handlePrint(order)} className="bg-slate-100 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest">Imprimir</button>
              <button onClick={() => store.closeOrder(order.id)} className="bg-emerald-500 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-emerald-100">Pago</button>
            </div>
          </div>
        ))}
        {activeOrders.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-300">
            <i className="fas fa-check-circle text-4xl mb-3 opacity-20"></i>
            <p className="text-xs font-black uppercase">Tudo em dia!</p>
          </div>
        )}
      </div>
      <ThermalReceipt order={printingOrder} />
    </div>
  );
};

const DashboardView = ({ store }: { store: any }) => {
  const [filter, setFilter] = useState<'HOJE' | 'ONTEM' | 'DATA'>('HOJE');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

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

  const handleDeleteHistory = async (orderId: string) => {
    if (window.confirm("CONFIRMAR EXCLUSÃO: Esta venda será removida permanentemente do banco.")) {
      setIsDeleting(orderId);
      try {
        await store.deleteHistoryOrder(orderId);
      } catch (err) {
        alert("Erro ao excluir.");
      } finally {
        setIsDeleting(null);
      }
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-950 italic uppercase leading-none mb-2">Financeiro</h2>
          <div className="flex gap-2 mt-4">
            {['HOJE', 'ONTEM', 'DATA'].map(f => (
              <button key={f} onClick={() => setFilter(f as any)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${filter === f ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-slate-950 p-6 rounded-[2rem] text-white w-full md:w-64 shadow-xl flex justify-between md:block">
          <div>
            <p className="text-slate-500 text-[10px] font-black uppercase mb-1">Caixa {filter}</p>
            <p className="text-3xl font-black italic leading-none">R$ {total.toFixed(2)}</p>
          </div>
          <div className="text-right md:text-left md:mt-4">
            <p className="text-[9px] text-emerald-400 font-black uppercase">{filteredOrders.length} Vendas</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 mb-6 italic uppercase">Mais Vendidos</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" fontSize={8} tick={{fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#E11D48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 mb-6 italic uppercase">Vendas Recentes</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {filteredOrders.map(o => (
              <div key={o.id} className={`flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-l-4 border-emerald-500 group transition-all ${isDeleting === o.id ? 'opacity-30' : ''}`}>
                <div>
                  <p className="text-xs font-black italic uppercase">Mesa {o.tableId}</p>
                  <p className="text-[9px] font-bold text-slate-400">{new Date(o.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-black italic">R$ {o.total.toFixed(2)}</p>
                  <button 
                    disabled={isDeleting !== null}
                    onClick={() => handleDeleteHistory(o.id)}
                    className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                  >
                    <i className="fas fa-trash-can text-xs"></i>
                  </button>
                </div>
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
      <MixFoodsLogo size="w-24 h-24" />
      <div className="mt-8 w-40 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-rose-600 animate-progress"></div>
      </div>
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
