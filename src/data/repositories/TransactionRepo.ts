import { db } from '../database';
import type { Transaction } from '../database';

export const TransactionRepo = {
  getAll: async (): Promise<Transaction[]> => {
    return db.transactions.orderBy('createdAt').reverse().toArray();
  },

  getToday: async (): Promise<Transaction[]> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return db.transactions
      .where('createdAt')
      .aboveOrEqual(today)
      .reverse()
      .toArray();
  },

  getById: async (id: number): Promise<Transaction | undefined> => {
    return db.transactions.get(id);
  },

  add: async (transaction: Omit<Transaction, 'id'>): Promise<number> => {
    return db.transactions.add(transaction);
  },

  delete: async (id: number): Promise<void> => {
    await db.transactions.delete(id);
  },

  getStats: async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTransactions = await db.transactions
      .where('createdAt')
      .aboveOrEqual(today)
      .toArray();

    const totalSales = todayTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalProfit = todayTransactions.reduce((sum, t) => {
      const profit = t.items.reduce((itemSum, item) => {
        return itemSum + ((item.price - 0) * item.qty); // HPP akan ditambahkan nanti
      }, 0);
      return sum + profit;
    }, 0);

    return {
      totalSales,
      totalTransactions: todayTransactions.length,
      totalProfit
    };
  }
};
