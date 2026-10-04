import { db } from '../database';
import type { Customer } from '../database';

export const CustomerRepo = {
  getAll: async (): Promise<Customer[]> => {
    const all = await db.customers.toArray();
    return all.sort((a, b) => a.nama.localeCompare(b.nama));
  },
  getById: async (id: number): Promise<Customer | undefined> => {
    return db.customers.get(id);
  },
  add: async (data: Omit<Customer, 'id' | 'createdAt'>): Promise<number> => {
    const nama = data.nama.trim();
    if (!nama) throw new Error('Nama pelanggan wajib diisi');
    return db.customers.add({ ...data, nama, createdAt: new Date() });
  },
  update: async (id: number, updates: Partial<Omit<Customer, 'id' | 'createdAt'>>): Promise<void> => {
    if (updates.nama !== undefined) {
      const nama = updates.nama.trim();
      if (!nama) throw new Error('Nama pelanggan wajib diisi');
      updates = { ...updates, nama };
    }
    await db.customers.update(id, updates);
  },
  delete: async (id: number): Promise<void> => {
    await db.customers.delete(id);
  }
};
