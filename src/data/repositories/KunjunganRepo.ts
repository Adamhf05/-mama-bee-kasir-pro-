import { db } from '../database';
import type { KunjunganRecord } from '../database';

export const KunjunganRepo = {
  getByToko: async (idToko: string): Promise<KunjunganRecord[]> => {
    return db.kunjungan.where('idToko').equals(idToko).toArray();
  },

  add: async (kunjungan: Omit<KunjunganRecord, 'id' | 'createdAt'>): Promise<number> => {
    return db.kunjungan.add({
      ...kunjungan,
      createdAt: new Date()
    });
  },

  delete: async (id: number): Promise<void> => {
    await db.kunjungan.delete(id);
  },

  getStatsByToko: async (idToko: string) => {
    const all = await db.kunjungan.where('idToko').equals(idToko).toArray();
    const totalCash = all.filter(k => k.tipe === 'Cash').reduce((sum, k) => sum + k.total, 0);
    const totalCredit = all.filter(k => k.tipe === 'Credit').reduce((sum, k) => sum + k.total, 0);
    return { totalCash, totalCredit, totalKunjungan: all.length };
  },

  getAll: async (): Promise<KunjunganRecord[]> => {
    return db.kunjungan.toArray();
  }
};
