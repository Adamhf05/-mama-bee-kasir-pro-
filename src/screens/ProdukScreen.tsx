import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ProductRepo } from '../data/repositories/ProductRepo';
import type { Product } from '../data/database';

export function ProdukScreen() {
  const { bg, card, text, textMuted, border, primary } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [form, setForm] = useState({
    name: '',
    category: '',
    price: 0,
    hpp: 0,
    stock: 0,
    unit: 'Pcs',
    image: ''
  });

  const unitOptions = ['Pcs', 'Pack', 'Dus', 'Kg', 'Liter', 'Box', 'Lusin', 'Rim', 'Lainnya'];

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await ProductRepo.getAll();
    setProducts(data);
  };

  const allCategories = Array.from(new Set(products.map(p => p.category).filter(c => c)));

  const handleSave = async () => {
    if (!form.name || form.price <= 0) {
      alert('Nama dan harga harus diisi!');
      return;
    }
    if (!form.category) {
      alert('Kategori harus diisi!');
      return;
    }

    if (editId) {
      await ProductRepo.update(editId, form);
    } else {
      await ProductRepo.add(form);
    }

    setShowForm(false);
    setEditId(null);
    setForm({ name: '', category: '', price: 0, hpp: 0, stock: 0, unit: 'Pcs', image: '' });
    loadProducts();
  };

  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      category: product.category,
      price: product.price,
      hpp: product.hpp,
      stock: product.stock,
      unit: (product as any).unit || 'Pcs',
      image: product.image || ''
    });
    setEditId(product.id!);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Hapus produk ini?')) {
      await ProductRepo.delete(id);
      loadProducts();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const formatRupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: text, margin: 0 }}>Manajemen Produk</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditId(null);
            setForm({ name: '', category: '', price: 0, hpp: 0, stock: 0, unit: 'Pcs', image: '' });
          }}
          style={{
            background: primary,
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          + Tambah
        </button>
      </div>

      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder=" Cari produk..."
        style={{
          width: '100%',
          padding: '12px',
          border: `1px solid ${border}`,
          borderRadius: '8px',
          marginBottom: '15px',
          boxSizing: 'border-box',
          fontSize: '14px'
        }}
      />

      {allCategories.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' }}>
          <button
            onClick={() => setSelectedCategory('Semua')}
            style={{
              padding: '8px 16px',
              background: selectedCategory === 'Semua' ? primary : card,
              color: selectedCategory === 'Semua' ? 'white' : text,
              border: `1px solid ${border}`,
              borderRadius: '20px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '12px'
            }}
          >
            Semua
          </button>
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '8px 16px',
                background: selectedCategory === cat ? primary : card,
                color: selectedCategory === cat ? 'white' : text,
                border: `1px solid ${border}`,
                borderRadius: '20px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: '12px'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{
          background: card,
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, color: text }}>{editId ? '️ Edit Produk' : '➕ Tambah Produk Baru'}</h3>

          <div style={{ marginBottom: '15px', textAlign: 'center' }}>
            {form.image ? (
              <img src={form.image} alt="Preview" style={{ maxWidth: '200px', borderRadius: '8px' }} />
            ) : (
              <div style={{
                width: '200px',
                height: '150px',
                background: bg,
                border: `2px dashed ${border}`,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto'
              }}>
                <span style={{ color: textMuted }}>📷 Belum ada foto</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'center' }}>
              <label style={{
                padding: '8px 16px',
                background: '#1976D2',
                color: 'white',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                📷 Kamera
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              </label>
              <label style={{
                padding: '8px 16px',
                background: '#4CAF50',
                color: 'white',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                🖼️ Galeri
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          <label style={{ fontSize: '12px', color: textMuted, fontWeight: 'bold' }}>NAMA PRODUK</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nama produk"
            style={{ width: '100%', padding: '10px', border: `1px solid ${border}`, borderRadius: '8px', marginBottom: '15px', boxSizing: 'border-box' }}
          />

          <label style={{ fontSize: '12px', color: textMuted, fontWeight: 'bold' }}>KATEGORI</label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="Contoh: Makanan, Minuman, Rokok, dll"
            list="category-suggestions"
            style={{ width: '100%', padding: '10px', border: `1px solid ${border}`, borderRadius: '8px', marginBottom: '15px', boxSizing: 'border-box' }}
          />
          <datalist id="category-suggestions">
            {allCategories.map(cat => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
          <p style={{ fontSize: '11px', color: textMuted, margin: '-10px 0 15px 0' }}>
            💡 Ketik kategori baru atau pilih dari saran
          </p>

          <label style={{ fontSize: '12px', color: textMuted, fontWeight: 'bold' }}>SATUAN (PICIS)</label>
          <select
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            style={{ width: '100%', padding: '10px', border: `1px solid ${border}`, borderRadius: '8px', marginBottom: '15px', boxSizing: 'border-box' }}
          >
            {unitOptions.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ fontSize: '12px', color: textMuted, fontWeight: 'bold' }}>HARGA JUAL</label>
              <input
                type="number"
                value={form.price || ''}
                onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                placeholder="0"
                style={{ width: '100%', padding: '10px', border: `1px solid ${border}`, borderRadius: '8px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: textMuted, fontWeight: 'bold' }}>HARGA MODAL (HPP)</label>
              <input
                type="number"
                value={form.hpp || ''}
                onChange={(e) => setForm({ ...form, hpp: parseInt(e.target.value) || 0 })}
                placeholder="0"
                style={{ width: '100%', padding: '10px', border: `1px solid ${border}`, borderRadius: '8px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <label style={{ fontSize: '12px', color: textMuted, fontWeight: 'bold' }}>STOK</label>
          <input
            type="number"
            value={form.stock || ''}
            onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
            placeholder="0"
            style={{ width: '100%', padding: '10px', border: `1px solid ${border}`, borderRadius: '8px', marginBottom: '15px', boxSizing: 'border-box' }}
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleSave}
              style={{ flex: 1, padding: '12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              💾 Simpan
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditId(null);
              }}
              style={{ flex: 1, padding: '12px', background: '#eee', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <div style={{ background: card, borderRadius: '12px', overflow: 'hidden' }}>
        {filteredProducts.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: textMuted }}>
            <p style={{ fontSize: '48px', marginBottom: '10px' }}>📦</p>
            <p>Belum ada produk</p>
            <p style={{ fontSize: '12px' }}>Klik "+ Tambah" untuk menambah produk pertama</p>
          </div>
        ) : (
          filteredProducts.map(p => (
            <div key={p.id} style={{
              padding: '15px',
              borderBottom: `1px solid ${border}`,
              display: 'flex',
              gap: '15px',
              alignItems: 'center'
            }}>
              {p.image ? (
                <img src={p.image} alt={p.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
              ) : (
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: bg,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px'
                }}>
                  📦
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', color: text, fontSize: '14px' }}>{p.name}</div>
                <div style={{ fontSize: '12px', color: textMuted }}>{p.category} • {(p as any).unit || 'Pcs'} • Stok: {p.stock}</div>
                <div style={{ fontSize: '13px', color: primary, fontWeight: 'bold' }}>{formatRupiah(p.price)}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleEdit(p)}
                  style={{ background: '#FFC107', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(p.id!)}
                  style={{ background: '#f44336', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                >
                  ️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
