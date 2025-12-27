
import React from 'react';
import { Order } from '../types';

interface ThermalReceiptProps {
  order: Order | null;
}

const ThermalReceipt: React.FC<ThermalReceiptProps> = ({ order }) => {
  if (!order) return null;

  return (
    <div id="thermal-receipt" className="p-4 bg-white text-black font-mono text-sm leading-tight border border-gray-200" style={{ width: '80mm' }}>
      <div className="text-center mb-2">
        <h2 className="text-xl font-black tracking-tighter">MIX FOODS</h2>
        <p className="text-xs">UNIDADE GASTRONÔMICA PROFISSIONAL</p>
        <p>SISTEMA DE GESTÃO EM TEMPO REAL</p>
        <p>--------------------------------</p>
        <h3 className="font-bold">ORDEM DE SERVIÇO - MESA {order.tableId}</h3>
        <p>{new Date(order.createdAt).toLocaleString('pt-BR')}</p>
        <p>--------------------------------</p>
      </div>
      
      <table className="w-full mb-2 border-collapse">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left py-1">PRODUTO</th>
            <th className="text-center py-1">QTD</th>
            <th className="text-right py-1">VALOR</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <React.Fragment key={item.id}>
              <tr className="border-b border-gray-100">
                <td className="text-left py-2 uppercase font-bold text-[11px]">{item.name}</td>
                <td className="text-center py-2">{item.quantity}</td>
                <td className="text-right py-2">R${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
              {item.notes && (
                <tr className="bg-gray-50">
                  <td colSpan={3} className="text-[10px] py-1 pl-2 font-bold italic">
                    >> OBS: {item.notes.toUpperCase()}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <div className="border-t-2 border-black pt-3 mt-2">
        <div className="flex justify-between font-black text-lg">
          <span>VALOR TOTAL:</span>
          <span>R$ {order.total.toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-6 text-center text-[10px] uppercase font-bold tracking-widest">
        <p>Bom Apetite!</p>
        <p>Mix Foods System v2.1 (PRO)</p>
        <p>--------------------------------</p>
      </div>
    </div>
  );
};

export default ThermalReceipt;
