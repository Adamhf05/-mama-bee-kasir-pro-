import { useState, useEffect } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ProductRepo } from '../data/repositories/ProductRepo';
import type { Product } from '../data/database';
import { validateProduct, stockStatus, UNIT_OPTIONS, CATEGORY_SUGGESTIONS } from '../utils/productRules';
import type { ProductErrors } from '../utils/productRules';

interface FormState {
  name: string;
  category: string;
  price: string;
  hpp: string;
  stock: string;
  unit: string;
  image: string;
}

const emptyForm: FormState = { name: '', category: '', price: '', hpp: '', stock: '', unit: 'Pcs', image: '' };

const toNum = (s: string) => (s.trim() === '' ? NaN : Number(s));
const rupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

// Kecilkan foto supaya hemat penyimpanan lokal
function resizeImage(file: File, maxSize = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca foto'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('File bukan gambar yang valid'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas tidak tersedia')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function Field({ label, error, color, children }: { label: string; error?: string; color: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color, fontSize: '14px' }}>
        {label}
      </label>
      {children}
      {error && <div style={{ color: '#f44336', fontSize: '13px', marginTop: '4px' }}>{error}</div>}
    </div>
  );
}

export function ProdukScreen() {
  const { card, text, textMuted, border, dark } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<ProductErrors>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const data = await ProductRepo.getAll();
    data.sort((a, b) => a.name.localeCompare(b.name));
    setProducts(data);
  };

  useEffect(() => {
    load();
  }, []);

  const categories = Array.from(new Set(products.map(p => p.category).filter(c => c)));
  const suggestions = Array.from(new Set([...CATEGORY_SUGGESTIONS, ...categories]));

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id ?? null);
    setForm({
      name: p.name,
      category: p.category,
      price: p.price > 0 ? String(p.price) : '',
      hpp: p.hpp > 0 ? String(p.hpp) : '',
      stock: String(p.stock),
      unit: p.unit || 'Pcs',
      image: p.image || ''
    });
    setErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setErrors({});
  };

  const handlePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await resizeImage(file);
      setForm(f => ({ ...f, image: data }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal memuat foto');
    }
    e.target.value = '';
  };

  const handleSave = async () => {
    const input = {
      name: form.name.trim(),
      category: form.category.trim(),
      price: toNum(form.price),
      hpp: toNum(form.hpp),
      stock: toNum(form.stock),
      unit: form.unit,
      image: form.image || undefined
    };
    const errs = validateProduct(input);
    const dup = products.find(
      p => p.name.trim().toLowerCase() === input.name.toLowerCase() && p.id !== editingId
    );
    if (dup && input.name) errs.name = 'Produk dengan nama ini sudah ada';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      if (editingId !== null) {
        await ProductRepo.update(editingId, input);
      } else {
        await ProductRepo.add(input);
      }
      await load();
      closeForm();
    } catch (err) {
      alert('Gagal menyimpan: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Hapus produk "${p.name}"?`)) return;
    try {
      await ProductRepo.delete(p.id as number);
      await load();
    } catch (err) {
      alert('Gagal menghapus: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const inputStyle = (hasError: boolean) => ({
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: `1px solid ${hasError ? '#f44336' : border}`,
    background: dark ? '#3a3a3a' : '#ffffff',
    color: text,
    fontSize: '16px',
    boxSizing: 'border-box' as const
  });

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '10px' }}>
        <h1 style={{ color: text, margin: 0, fontSize: '22px' }}>📦 Manajemen Produk</h1>
        <button
          onClick={openAdd}
          style={{ background: '#1976D2', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          + Tambah
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cari produk..."
        style={{ ...inputStyle(false), marginBottom: '12px' }}
      />

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px' }}>
        {['Semua', ...categories].map(c => (
          <button key={c} onClick={() => setSelectedCategory(c)} style={chip(selectedCategory === c)}>
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: textMuted, padding: '40px 0' }}>
          Belum ada produk. Tekan "+ Tambah" untuk mulai.
        </div>
      )}

      {filtered.map(p => {
        const st = stockStatus(p.stock);
        const profit = p.price - p.hpp;
        return (
          <div
            key={p.id}
            style={{ background: card, borderRadius: '12px', padding: '12px', marginBottom: '12px', display: 'flex', gap: '12px', alignItems: 'center', border: `1px solid ${border}` }}
          >
            <div style={{ width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', background: dark ? '#3a3a3a' : '#eee', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
              {p.image ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: text, fontWeight: 'bold', fontSize: '16px' }}>{p.name}</div>
              <div style={{ color: textMuted, fontSize: '12px' }}>
                {p.category} • {p.unit || 'Pcs'} • Stok: {p.stock}{' '}
                <span style={{ color: st.color, fontWeight: 'bold' }}>{st.icon} {st.label}</span>
              </div>
              <div style={{ color: '#1976D2', fontWeight: 'bold' }}>{rupiah(p.price)}</div>
              <div style={{ fontSize: '12px', color: profit > 0 ? '#4CAF50' : '#f44336' }}>
                HPP {p.hpp > 0 ? rupiah(p.hpp) : 'belum diisi'}
                {p.hpp > 0 && ` • Profit/unit ${rupiah(profit)}`}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => openEdit(p)} style={{ background: '#FFC107', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}>✏️</button>
              <button onClick={() => handleDelete(p)} style={{ background: '#f44336', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}>🗑️</button>
            </div>
          </div>
        );
      })}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1200, overflowY: 'auto', padding: '20px' }}>
          <div style={{ background: card, borderRadius: '12px', padding: '20px', maxWidth: '500px', margin: '0 auto', border: `1px solid ${border}` }}>
            <h2 style={{ color: text, marginTop: 0 }}>{editingId !== null ? '✏️ Edit Produk' : '➕ Tambah Produk'}</h2>

            <Field label="Nama Produk *" error={errors.name} color={text}>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Kopi" style={inputStyle(!!errors.name)} />
            </Field>

            <Field label="Kategori *" error={errors.category} color={text}>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                list="kategori-saran"
                placeholder="Contoh: Minuman"
                style={inputStyle(!!errors.category)}
              />
              <datalist id="kategori-saran">
                {suggestions.map(c => <option key={c} value={c} />)}
              </datalist>
            </Field>

            <Field label="Harga Jual (Rp) *" error={errors.price} color={text}>
              <input type="number" inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="8000" style={inputStyle(!!errors.price)} />
            </Field>

            <Field label="HPP / Modal (Rp) *" error={errors.hpp} color={text}>
              <input type="number" inputMode="numeric" value={form.hpp} onChange={(e) => setForm({ ...form, hpp: e.target.value })} placeholder="5000" style={inputStyle(!!errors.hpp)} />
            </Field>

            <Field label="Stok Awal *" error={errors.stock} color={text}>
              <input type="number" inputMode="numeric" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" style={inputStyle(!!errors.stock)} />
            </Field>

            <Field label="Satuan" error={errors.unit} color={text}>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} style={inputStyle(!!errors.unit)}>
                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>

            <Field label="Foto Produk" color={text}>
              <input type="file" accept="image/*" onChange={handlePhoto} style={{ color: text }} />
              {form.image && (
                <div style={{ marginTop: '10px' }}>
                  <img src={form.image} alt="Pratinjau" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px' }} />
                  <div>
                    <button onClick={() => setForm({ ...form, image: '' })} style={{ marginTop: '6px', background: 'none', border: 'none', color: '#f44336', cursor: 'pointer' }}>
                      Hapus foto
                    </button>
                  </div>
                </div>
              )}
            </Field>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#4CAF50', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
                {saving ? 'Menyimpan...' : '💾 Simpan'}
              </button>
        <button onClick={closeForm} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: `1px solid ${border}`, background: card, color: text, cursor: 'pointer', fontSize: '16px' }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
