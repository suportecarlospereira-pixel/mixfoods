
import React from 'react';
import { Order } from '../types';

interface ThermalReceiptProps {
  order: Order | null;
}

const ThermalReceipt: React.FC<ThermalReceiptProps> = ({ order }) => {
  if (!order) return null;

  return (
    <div id="thermal-receipt" className="p-4 bg-white text-black font-mono text-sm leading-tight" style={{ width: '80mm' }}>
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold">MIX FOODS</h2>
        <p className="text-xs uppercase font-bold">Gestão Profissional</p>
        <p className="text-[10px]">--------------------------------</p>
        <h3 className="font-bold text-base">MESA {order.tableId}</h3>
        <p className="text-[10px]">{new Date(order.createdAt).toLocaleString('pt-BR')}</p>
        <p className="text-[10px]">--------------------------------</p>
      </div>
      
      <table className="w-full mb-2">
        <thead>
          <tr className="border-b border-black text-[10px]">
            <th className="text-left">ITEM</th>
            <th className="text-center">QTD</th>
            <th className="text-right">TOTAL</th>
          </tr>
        </thead>
        <tbody className="text-[11px]">
          {order.items.map((item) => (
            <React.Fragment key={item.id}>
              <tr>
                <td className="text-left py-1 uppercase">{item.name}</td>
                <td className="text-center py-1">{item.quantity}</td>
                <td className="text-right py-1">{(item.price * item.quantity).toFixed(2)}</td>
              </tr>
              {item.notes && (
                <tr>
                  <td colSpan={3} className="text-[9px] pb-1 italic font-bold">
                    OBS: {item.notes.toUpperCase()}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <div className="border-t border-black pt-2 mt-2">
        <div className="flex justify-between font-bold text-sm">
          <span>TOTAL GERAL:</span>
          <span>R$ {order.total.toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-4 text-center text-[9px] uppercase">
        <p>Obrigado pela preferência!</p>
        <p>Mix Foods System v3.0</p>
      </div>
    </div>
  );
};

export default ThermalReceipt;
