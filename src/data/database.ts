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

//  BARU: Toko Customer (yang dikunjungi sales)
export interface SalesToko {
  idToko: string;        // Primary key (manual dari user)
  nama: string;
  alamat: string;
  telepon: string;
  lokasi: string;        // koordinat "lat,lng"
  warnaPin: string;
  folder: string;        // area/wilayah
  hariKunjungan: string[]; // ['Senin', 'Kamis']
  catatan?: string;
  foto?: string;       // foto toko (data URL)
  createdAt: Date;
  updatedAt: Date;
}

//  BARU: Riwayat Kunjungan
export interface KunjunganRecord {
  id?: number;           // Auto-increment
  idToko: string;        // Foreign key ke SalesToko
  tanggal: string;       // "1/10/2026, 19.59.17"
  tipe: 'Cash' | 'Credit';
  total: number;
  items: {
    produkId: number;
    namaProduk: string;
    hargaSatuan: number;
    jumlah: number;
    subtotal: number;
  }[];
  createdAt: Date;
}

export class MamaBeeDatabase extends Dexie {
  products!: Table<Product>;
  transactions!: Table<Transaction>;
  stores!: Table<Store>;
  salesToko!: Table<SalesToko>;
  kunjungan!: Table<KunjunganRecord>;

  constructor() {
    super('mamabee-kasir-pro');
    
    this.version(1).stores({
      products: '++id, name, category, price, stock',
      transactions: '++id, invoice, total, createdAt',
      stores: '++id, name'
    });
    
    //  Upgrade ke version 2: tambah tabel SalesToko & Kunjungan
    this.version(2).stores({
      products: '++id, name, category, price, stock',
      transactions: '++id, invoice, total, createdAt',
      stores: '++id, name',
      salesToko: 'idToko, nama, folder',
      kunjungan: '++id, idToko, tanggal, tipe'
    }).upgrade(() => {
      console.log(' Database upgraded to version 2');
    });
  }
}

export const db = new MamaBeeDatabase();
