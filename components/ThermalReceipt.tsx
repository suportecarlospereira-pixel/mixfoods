
import React from 'react';
import { Order } from '../types';

interface ThermalReceiptProps {
  order: Order | null;
}

const ThermalReceipt: React.FC<ThermalReceiptProps> = ({ order }) => {
  if (!order) return null;

  return (
    <div id="thermal-receipt" className="p-2 bg-white text-black font-mono text-[12px] leading-tight" style={{ width: '80mm', margin: '0 auto' }}>
      <div className="text-center mb-1">
        <h2 className="text-lg font-bold">*** MIX FOODS ***</h2>
        <p className="text-[10px] uppercase font-bold">Unidade de Atendimento</p>
        <p>------------------------------------------</p>
        <h3 className="font-bold text-base">ORDEM: MESA {order.tableId}</h3>
        <p className="text-[10px]">{new Date(order.createdAt).toLocaleString('pt-BR')}</p>
        <p>------------------------------------------</p>
      </div>
      
      <table className="w-full mb-2 border-collapse">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left py-1">ITEM</th>
            <th className="text-center py-1">QTD</th>
            <th className="text-right py-1">VALOR</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <React.Fragment key={item.id}>
              <tr className="font-bold">
                <td className="text-left py-1 uppercase">{item.name}</td>
                <td className="text-center py-1">{item.quantity}</td>
                <td className="text-right py-1">{(item.price * item.quantity).toFixed(2)}</td>
              </tr>
              {item.notes && (
                <tr>
                  <td colSpan={3} className="text-[10px] pb-1 pl-2 italic">
                    >> OBS: {item.notes.toUpperCase()}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <div className="border-t border-dashed border-black pt-2">
        <div className="flex justify-between font-bold text-sm">
          <span>TOTAL GERAL:</span>
          <span>R$ {order.total.toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-4 text-center text-[10px] uppercase">
        <p>------------------------------------------</p>
        <p>OBRIGADO PELA PREFERENCIA!</p>
        <p>Mix Foods System v4.0</p>
        <p className="mt-2">. . . . . . . . . . . . . . . . .</p>
      </div>
    </div>
  );
};

export default ThermalReceipt;
