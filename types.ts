
export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'WAITING_PAYMENT';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  timestamp: number;
}

export interface Order {
  id: string;
  tableId: number;
  items: OrderItem[];
  status: 'OPEN' | 'PREPARING' | 'DONE' | 'PAID' | 'CANCELLED';
  createdAt: number;
  total: number;
}

export interface Table {
  id: number;
  status: TableStatus;
}
