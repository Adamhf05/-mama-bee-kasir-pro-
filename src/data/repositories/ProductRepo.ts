import { db } from '../database';
import type { Product } from '../database';

export const ProductRepo = {
  getAll: async (): Promise<Product[]> => {
    return db.products.toArray();
  },

  getById: async (id: number): Promise<Product | undefined> => {
    return db.products.get(id);
  },

  getByCategory: async (category: string): Promise<Product[]> => {
    return db.products.where('category').equals(category).toArray();
  },

  search: async (query: string): Promise<Product[]> => {
    const lower = query.toLowerCase();
    const all = await db.products.toArray();
    return all.filter(p => p.name.toLowerCase().includes(lower));
  },

  add: async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> => {
    return db.products.add({
      ...product,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  },

  update: async (id: number, updates: Partial<Product>): Promise<void> => {
    await db.products.update(id, {
      ...updates,
      updatedAt: new Date()
    });
  },

  delete: async (id: number): Promise<void> => {
    await db.products.delete(id);
  },

  updateStock: async (id: number, qty: number): Promise<void> => {
    const product = await db.products.get(id);
    if (product) {
      await db.products.update(id, {
        stock: product.stock + qty,
        updatedAt: new Date()
      });
    }
  }
};
