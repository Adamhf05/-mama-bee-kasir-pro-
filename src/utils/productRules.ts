export const UNIT_OPTIONS = ['Pcs', 'Pack', 'Dus', 'Kg', 'Liter', 'Box', 'Lusin', 'Rim', 'Lainnya'];
export const CATEGORY_SUGGESTIONS = ['Rokok', 'Minuman', 'Makanan', 'Sembako', 'Snack', 'Lainnya'];

export interface ProductInput {
  name: string;
  category: string;
  price: number;
  hpp: number;
  stock: number;
  unit?: string;
  image?: string;
}

export type ProductErrors = Partial<
  Record<'name' | 'category' | 'price' | 'hpp' | 'stock' | 'unit', string>
>;

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

export function validateProduct(p: ProductInput): ProductErrors {
  const errors: ProductErrors = {};
  if (typeof p.name !== 'string' || !p.name.trim()) errors.name = 'Nama produk wajib diisi';
  if (typeof p.category !== 'string' || !p.category.trim()) errors.category = 'Kategori wajib diisi';

  if (!isNum(p.price)) errors.price = 'Harga jual wajib diisi';
  else if (p.price <= 0) errors.price = 'Harga jual harus lebih dari 0';

  if (!isNum(p.hpp)) errors.hpp = 'HPP (modal) wajib diisi';
  else if (p.hpp <= 0) errors.hpp = 'HPP harus lebih dari 0';

  if (!errors.price && !errors.hpp && p.price < p.hpp) {
    errors.price = 'Harga jual tidak boleh lebih kecil dari HPP';
  }

  if (!isNum(p.stock)) errors.stock = 'Stok awal wajib diisi (boleh 0)';
  else if (p.stock < 0 || !Number.isInteger(p.stock)) errors.stock = 'Stok harus bilangan bulat 0 atau lebih';

  if (p.unit !== undefined && !UNIT_OPTIONS.includes(p.unit)) errors.unit = 'Satuan tidak dikenal';
  return errors;
}

export function assertValidProduct(p: ProductInput): void {
  const first = Object.values(validateProduct(p))[0];
  if (first) throw new Error(first);
}

// Badge stok: Tersedia > 10, Menipis 1-10, Habis 0
export function stockStatus(stock: number): { label: string; color: string; icon: string } {
  if (stock <= 0) return { label: 'Habis', color: '#f44336', icon: '🔴' };
  if (stock <= 10) return { label: 'Menipis', color: '#FF9800', icon: '🟡' };
  return { label: 'Tersedia', color: '#4CAF50', icon: '🟢' };
}
