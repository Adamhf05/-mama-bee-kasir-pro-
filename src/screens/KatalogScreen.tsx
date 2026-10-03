import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ProductRepo } from '../data/repositories/ProductRepo';
import type { Product } from '../data/database';
import { stockStatus } from '../utils/productRules';

export function KatalogScreen() {
  const { card, text, textMuted, border, dark } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Semua');

  useEffect(() => {
    ProductRepo.getAll().then(setProducts);
  }, []);

  const categories = Array.from(new Set(products.map(p => p.category).filter(c => c)));
  const filtered = products
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter(p => category === 'Semua' || p.category === category)
    .sort((a, b) => a.name.localeCompare(b.name));

  const chip = (active: boolean) => ({
    padding: '8px 16px',
    borderRadius: '20px',
    border: `1px solid ${active ? '#1976D2' : border}`,
    background: active ? '#1976D2' : card,
    color: active ? 'white' : text,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    fontSize: '14px'
  });

  return (
    <div style={{ padding: '20px', paddingBottom: '100px', maxWidth: '700px', margin: '0 auto' }}>
      <h1 style={{ color: text, margin: '0 0 16px 0', fontSize: '22px' }}>🛍️ Katalog Produk</h1>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cari produk..."
        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${border}`, background: dark ? '#3a3a3a' : '#fff', color: text, fontSize: '16px', boxSizing: 'border-box', marginBottom: '12px' }}
      />

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px' }}>
        {['Semua', ...categories].map(c => (
          <button key={c} onClick={() => setCategory(c)} style={chip(category === c)}>{c}</button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: textMuted, padding: '40px 0' }}>Produk tidak ditemukan.</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {filtered.map(p => {
          const st = stockStatus(p.stock);
          return (
            <div key={p.id} style={{ background: card, borderRadius: '12px', overflow: 'hidden', border: `1px solid ${border}` }}>
              <div style={{ height: '110px', background: dark ? '#3a3a3a' : '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
                {p.image ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
              </div>
              <div style={{ padding: '10px' }}>
                <div style={{ color: text, fontWeight: 'bold', fontSize: '15px' }}>{p.name}</div>
                <div style={{ color: textMuted, fontSize: '12px' }}>{p.category}</div>
                <div style={{ color: '#1976D2', fontWeight: 'bold', margin: '4px 0' }}>Rp {p.price.toLocaleString('id-ID')}</div>
                <div style={{ fontSize: '12px', color: textMuted }}>Stok: {p.stock} {p.unit || 'Pcs'}</div>
                <div style={{ display: 'inline-block', marginTop: '6px', padding: '3px 10px', borderRadius: '12px', background: st.color, color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
                  {st.icon} {st.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
