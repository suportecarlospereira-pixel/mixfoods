
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fadeIn pb-24">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 italic">Mesas</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Painel de Mesas</p>
        </div>
        <div className="md:hidden">
          <MixFoodsLogo size="w-10 h-10" animated={false} />
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
      // Para itens com observação, tratamos como itens únicos
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

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden relative">
      <header className="bg-white border-b border-slate-100 p-3 flex justify-between items-center z-30">
        <button onClick={() => navigate('/')} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <i className="fas fa-chevron-left text-slate-600"></i>
        </button>
        <div className="text-center">
          <h2 className="text-lg font-black italic uppercase leading-none">Mesa {tableId}</h2>
          <p className="text-[8px] font-bold text-rose-600 uppercase tracking-widest mt-1">Lançar Pedido</p>
        </div>
        <div className="w-10"></div>
      </header>

      <nav className="bg-white border-b border-slate-100 flex gap-2 overflow-x-auto p-2 no-scrollbar sticky top-0 z-20">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${
              selectedCategory === cat.id ? 'bg-rose-600 text-white shadow-md shadow-rose-100' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-3 pb-36">
        {PRODUCTS.filter(p => p.category === selectedCategory).map(product => {
          const isUnavailable = product.price === 0;
          return (
            <div key={product.id} className="bg-white rounded-2xl p-2 shadow-sm flex flex-col border border-white">
              <div className="relative mb-2 aspect-square rounded-xl overflow-hidden bg-slate-100">
                <img src={product.image} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute top-1 right-1 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-lg shadow-sm">
                  <span className="text-rose-600 font-black text-[9px]">R$ {product.price.toFixed(2)}</span>
                </div>
              </div>
              <h3 className="font-bold text-slate-800 text-[9px] mb-2 px-1 flex-1 uppercase leading-tight line-clamp-2">{product.name}</h3>
              <button 
                disabled={isUnavailable || isSubmitting}
                onClick={() => addToCart(product)}
                className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 active:bg-rose-600 transition-colors"
              >
                <i className="fas fa-plus text-[8px]"></i> Lançar
              </button>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-20 left-4 right-4 z-40">
        <button
          onClick={() => setShowSummary(true)}
          className="w-full bg-slate-950 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center justify-between border border-white/10 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center font-black text-sm">
              {cartCount}
            </div>
            <div className="text-left">
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">Ver Itens</p>
              <p className="text-lg font-black italic leading-none">R$ {cartTotal.toFixed(2)}</p>
            </div>
          </div>
          <i className="fas fa-chevron-up text-slate-600"></i>
        </button>
      </div>

      {showSummary && (
        <div className="fixed inset-0 z-[100] animate-fadeIn">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowSummary(false)}></div>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2rem] shadow-2xl flex flex-col max-h-[90vh]">
            <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto my-3"></div>
            
            <div className="px-6 py-2 flex justify-between items-center border-b border-slate-50">
              <h3 className="text-lg font-black italic uppercase">Resumo da Mesa {tableId}</h3>
              <button onClick={() => setShowSummary(false)} className="text-slate-400 p-2"><i className="fas fa-times"></i></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {cart.map(item => (
                <div key={item.id} className="p-4 bg-slate-50 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-[11px] uppercase text-slate-800">{item.name}</h4>
                      <p className="text-[10px] text-slate-500 font-bold">R$ {item.price.toFixed(2)}</p>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="w-8 h-8 rounded-lg bg-white border border-rose-100 text-rose-500 flex items-center justify-center">
                      <i className="fas fa-trash-can text-xs"></i>
                    </button>
                  </div>
                  
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Alguma observação? (ex: sem cebola)"
                      value={item.notes}
                      onChange={(e) => updateItemNotes(item.id, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[10px] font-bold text-slate-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                    />
                    <div className="absolute right-3 top-2.5 text-[8px] font-black text-rose-400 uppercase tracking-tighter pointer-events-none">OBS</div>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="text-center py-10 opacity-30">
                  <i className="fas fa-cart-shopping text-4xl mb-3"></i>
                  <p className="text-[10px] font-black uppercase">Mesa vazia</p>
                </div>
              )}
            </div>

            <div className="p-5 bg-slate-950 text-white space-y-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Total Acumulado</span>
                <span className="text-2xl font-black italic">R$ {cartTotal.toFixed(2)}</span>
              </div>
              <button 
                onClick={handleSave} 
                disabled={isSubmitting || cart.length === 0} 
                className="w-full bg-rose-600 text-white py-4.5 rounded-2xl font-black text-xs uppercase shadow-lg shadow-rose-900/20 active:bg-rose-700 disabled:opacity-50 transition-all h-[56px] flex items-center justify-center"
              >
                {isSubmitting ? 'Processando...' : 'Confirmar Pedido'}
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
        <div className="bg-rose-600 text-white px-4 py-1.5 rounded-full font-black text-[9px] uppercase shadow-lg shadow-rose-100">{activeOrders.length} Pendentes</div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeOrders.map((order: Order) => (
          <div key={order.id} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-2 h-full bg-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-3xl font-black text-slate-900 italic">Mesa {order.tableId}</h3>
              <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            
            <div className="flex-1 space-y-4 mb-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              {order.items.map((item, idx) => (
                <div key={idx} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                  <div className="flex gap-3 items-start">
                    <span className="min-w-[28px] h-7 bg-slate-950 text-white rounded-lg flex items-center justify-center font-black text-[11px] mt-0.5 shadow-sm">{item.quantity}</span>
                    <div className="flex-1">
                      <span className="font-bold text-sm text-slate-800 uppercase italic leading-tight block">{item.name}</span>
                      {item.notes && (
                        <div className="mt-2 bg-rose-50 border-l-4 border-rose-500 p-2 rounded-md">
                          <p className="text-[10px] text-rose-600 font-black uppercase tracking-tight italic">
                            <i className="fas fa-exclamation-triangle mr-1"></i>
                            OBS: {item.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handlePrint(order)} 
                className="bg-white border border-slate-200 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-colors"
              >
                <i className="fas fa-print mr-2"></i> Cupom
              </button>
              <button 
                onClick={() => store.closeOrder(order.id)} 
                className="bg-emerald-500 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-colors"
              >
                <i className="fas fa-check-double mr-2"></i> Pagar
              </button>
            </div>
          </div>
        ))}
        {activeOrders.length === 0 && (
          <div className="col-span-full py-24 text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <i className="fas fa-check text-emerald-500 text-2xl"></i>
            </div>
            <p className="text-xs font-black uppercase text-slate-400">Nenhum pedido pendente</p>
          </div>
        )}
      </div>
      <div className="hidden">
        <ThermalReceipt order={printingOrder} />
      </div>
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
    if (window.confirm("APAGAR VENDA: Esta ação é definitiva e removerá a venda do relatório.")) {
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
          <h2 className="text-2xl font-black text-slate-950 italic uppercase leading-none mb-2">Relatórios</h2>
          <div className="flex gap-2 mt-4">
            {['HOJE', 'ONTEM', 'DATA'].map(f => (
              <button key={f} onClick={() => setFilter(f as any)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${filter === f ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-slate-950 p-6 rounded-[2rem] text-white w-full md:w-64 shadow-xl flex justify-between md:block relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/5 rounded-full"></div>
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
          <h3 className="text-sm font-black text-slate-900 mb-6 italic uppercase">Ranking de Produtos</h3>
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
          <h3 className="text-sm font-black text-slate-900 mb-6 italic uppercase">Relatório Detalhado</h3>
          <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
            {filteredOrders.map(o => (
              <div key={o.id} className={`flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-l-4 border-emerald-500 transition-all ${isDeleting === o.id ? 'opacity-30' : ''}`}>
                <div>
                  <p className="text-xs font-black italic uppercase">Mesa {o.tableId}</p>
                  <p className="text-[9px] font-bold text-slate-400">{new Date(o.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-black italic">R$ {o.total.toFixed(2)}</p>
                  <button 
                    disabled={isDeleting !== null}
                    onClick={() => handleDeleteHistory(o.id)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-300 hover:text-rose-600 transition-colors flex items-center justify-center"
                  >
                    <i className="fas fa-trash text-[10px]"></i>
                  </button>
                </div>
              </div>
            ))}
            {filteredOrders.length === 0 && (
              <div className="text-center py-10 opacity-20 italic text-[10px] uppercase font-black">Caixa sem movimentação</div>
            )}
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
      <p className="text-[10px] font-black text-slate-600 uppercase mt-4 tracking-[0.3em]">Sincronizando</p>
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
