import { db } from '../database';
import type { StockLogEntry } from '../database';

export const StockLogRepo = {
  getAll: async (): Promise<StockLogEntry[]> => {
    return db.stockLog.toArray();
  },

  // Catat perubahan stok di luar penjualan: qty positif = masuk, negatif = koreksi
  catat: async (productId: number, productName: string, qty: number): Promise<void> => {
    if (!Number.isFinite(qty) || qty === 0) return;
    await db.stockLog.add({
      productId,
      productName,
      qty,
      type: qty > 0 ? 'masuk' : 'koreksi',
      createdAt: new Date()
    });
  }
};
