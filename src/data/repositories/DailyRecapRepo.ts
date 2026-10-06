import { db } from '../database';
import type { DailyRecap } from '../database';

export const DailyRecapRepo = {
  getAll: async (): Promise<DailyRecap[]> => {
    const all = await db.dailyRecaps.toArray();
    return all.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  },

  get: async (tanggal: string): Promise<DailyRecap | undefined> => {
    return db.dailyRecaps.get(tanggal);
  },

  put: async (recap: DailyRecap): Promise<void> => {
    await db.dailyRecaps.put(recap);
  }
};
