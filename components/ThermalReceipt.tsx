
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
        <h2 className="text-[18px] font-bold">*** MIX FOODS ***</h2>
        <p className="text-[10px] uppercase font-bold">Gestão de Pedidos</p>
        <p>------------------------------------------</p>
        <h3 className="font-bold text-[16px]">MESA: {order.tableId}</h3>
        <p className="text-[10px]">{new Date(order.createdAt).toLocaleString('pt-BR')}</p>
        <p>------------------------------------------</p>
      </div>
      
      <table className="w-full mb-2 border-collapse">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left py-1 text-[11px]">ITEM</th>
            <th className="text-center py-1 text-[11px]">QTD</th>
            <th className="text-right py-1 text-[11px]">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <React.Fragment key={item.id}>
              <tr className="font-bold">
                <td className="text-left py-1 uppercase text-[12px]">{item.name}</td>
                <td className="text-center py-1 text-[12px]">{item.quantity}</td>
                <td className="text-right py-1 text-[12px]">{(item.price * item.quantity).toFixed(2)}</td>
              </tr>
              {item.notes && (
                <tr>
                  <td colSpan={3} className="text-[11px] pb-2 pl-2 italic font-bold">
                    {" >> OBS: "}{item.notes.toUpperCase()}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <div className="border-t border-dashed border-black pt-2">
        <div className="flex justify-between font-bold text-[14px]">
          <span>TOTAL GERAL:</span>
          <span>R$ {order.total.toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-4 text-center text-[10px] uppercase">
        <p>------------------------------------------</p>
        <p>AGRADECEMOS A PREFERENCIA!</p>
        <p>Mix Foods System - Vercel Optimized</p>
        <div className="h-10"></div>
        <p>.</p>
      </div>
    </div>
  );
};

export default ThermalReceipt;
