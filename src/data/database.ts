import Dexie from 'dexie';
import type { Table } from 'dexie';

export interface Product {
  id?: number;
  name: string;
  category: string;
  price: number;
  hpp: number;
  stock: number;
  unit?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id?: number;
  invoice: string;
  items: Array<{
    productId: number;
    name: string;
    price: number;
    qty: number;
  }>;
  total: number;
  payment: number;
  change: number;
  createdAt: Date;
}

export interface Store {
  id?: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  footer: string;
  photo?: string;
  latitude?: number;
  longitude?: number;
  hours: {
    monday: { open: string; close: string; isOpen: boolean };
    tuesday: { open: string; close: string; isOpen: boolean };
    wednesday: { open: string; close: string; isOpen: boolean };
    thursday: { open: string; close: string; isOpen: boolean };
    friday: { open: string; close: string; isOpen: boolean };
    saturday: { open: string; close: string; isOpen: boolean };
    sunday: { open: string; close: string; isOpen: boolean };
  };
  logo?: string;
}

export class MamaBeeDatabase extends Dexie {
  products!: Table<Product>;
  transactions!: Table<Transaction>;
  stores!: Table<Store>;

  constructor() {
    super('mamabee-kasir-pro');
    this.version(1).stores({
      products: '++id, name, category, price, stock',
      transactions: '++id, invoice, total, createdAt',
      stores: '++id, name'
    });
  }
}

export const db = new MamaBeeDatabase();
