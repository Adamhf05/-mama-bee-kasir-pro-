import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { CustomerRepo } from '../data/repositories/CustomerRepo';
import { TransactionRepo } from '../data/repositories/TransactionRepo';
import type { Customer, Transaction } from '../data/database';

interface FormState { nama: string; telepon: string; alamat: string; }
type FormErrors = Partial<Record<keyof FormState, string>>;
interface CustomerStat { count: number; total: number; recent: Transaction[]; }
const emptyForm: FormState = { nama: '', telepon: '', alamat: '' };
const rupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

export default function PelangganScreen() {
  const { card, text, textMuted, border, dark } = useTheme();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Record<string, CustomerStat>>({});
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = async () => {
    const [list, trans] = await Promise.all([CustomerRepo.getAll(), TransactionRepo.getAll()]);
    const map: Record<string, CustomerStat> = {};
    for (const t of trans) {
      if (!t.customerId) continue;
      if (!map[t.customerId]) map[t.customerId] = { count: 0, total: 0, recent: [] };
      const s = map[t.customerId];
      s.count++; s.total += t.total;
      if (s.recent.length < 10) s.recent.push(t);
    }
    setCustomers(list); setStats(map);
  };
  useEffect(() => { load(); }, []);

  const filtered = customers.filter(c => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.nama.toLowerCase().includes(q) || (c.telepon || '').includes(q);
  });

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setErrors({}); setShowForm(true); };
  const openEdit = (c: Customer) => { setEditingId(c.id ?? null); setForm({ nama: c.nama, telepon: c.telepon || '', alamat: c.alamat || '' }); setErrors({}); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingId(null); setErrors({}); };

  const handleSave = async () => {
    const errs: FormErrors = {};
    const nama = form.nama.trim();
    const telepon = form.telepon.trim();
    if (!nama) errs.nama = 'Nama pelanggan wajib diisi';
    if (telepon && !/^[0-9+\-\s]{6,20}$/.test(telepon)) errs.telepon = 'No HP tidak valid';
    const dup = customers.find(c => c.id !== editingId && c.nama.trim().toLowerCase() === nama.toLowerCase() && (c.telepon || '') === telepon);
    if (dup && nama) errs.nama = 'Pelanggan dengan nama dan No HP yang sama sudah ada';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      const data = { nama, telepon: telepon || undefined, alamat: form.alamat.trim() || undefined };
      if (editingId !== null) await CustomerRepo.update(editingId, data);
      else await CustomerRepo.add(data);
      await load(); closeForm();
    } catch (err) { alert('Gagal menyimpan: ' + (err instanceof Error ? err.message : String(err))); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c: Customer) => {
    if (!confirm(`Hapus pelanggan "${c.nama}"?\n\nRiwayat transaksinya tetap tersimpan.`)) return;
    try { await CustomerRepo.delete(c.id as number); await load(); }
    catch (err) { alert('Gagal menghapus: ' + (err instanceof Error ? err.message : String(err))); }
  };

  const inputStyle = (hasError: boolean) => ({ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${hasError ? '#f44336' : border}`, background: dark ? '#3a3a3a' : '#ffffff', color: text, fontSize: '16px', boxSizing: 'border-box' as const });
  const labelStyle = { display: 'block', fontWeight: 'bold', marginBottom: '6px', color: text, fontSize: '14px' } as const;
  const errStyle = { color: '#f44336', fontSize: '13px', marginTop: '4px' } as const;

  return (
    <div style={{ padding: '20px', paddingBottom: '100px', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '10px' }}>
        <h1 style={{ color: text, margin: 0, fontSize: '22px' }}>👥 Data Pelanggan</h1>
        <button onClick={openAdd} style={{ background: '#1976D2', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: 'bold', cursor: 'pointer' }}>+ Tambah</button>
      </div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama atau No HP..." style={{ ...inputStyle(false), marginBottom: '16px' }} />
      {filtered.length === 0 && <div style={{ textAlign: 'center', color: textMuted, padding: '40px 0' }}>{customers.length === 0 ? 'Belum ada pelanggan. Tekan "+ Tambah" untuk mulai.' : 'Pelanggan tidak ditemukan.'}</div>}
      {filtered.map(c => {
        const st = stats[String(c.id)] || { count: 0, total: 0, recent: [] };
        const open = openId === c.id;
        return (
          <div key={c.id} style={{ background: card, borderRadius: '12px', padding: '14px', marginBottom: '12px', border: `1px solid ${border}` }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: text, fontWeight: 'bold', fontSize: '16px' }}>{c.nama}</div>
                {c.telepon && <div style={{ color: textMuted, fontSize: '13px' }}>📞 {c.telepon}</div>}
                {c.alamat && <div style={{ color: textMuted, fontSize: '13px' }}>📍 {c.alamat}</div>}
                <div style={{ color: '#1976D2', fontSize: '13px', fontWeight: 'bold', marginTop: '6px' }}>🧾 {st.count} transaksi • 💰 {rupiah(st.total)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={() => openEdit(c)} style={{ background: '#FFC107', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}>✏️</button>
                <button onClick={() => handleDelete(c)} style={{ background: '#f44336', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}>🗑️</button>
              </div>
            </div>
            {st.count > 0 && (<>
              <button onClick={() => setOpenId(open ? null : (c.id as number))} style={{ marginTop: '8px', background: 'none', border: 'none', color: '#1976D2', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>{open ? '▲ Sembunyikan riwayat' : '▼ Lihat riwayat belanja'}</button>
              {open && <div style={{ marginTop: '8px' }}>{st.recent.map(t => (<div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '6px 0', borderTop: `1px solid ${border}`, fontSize: '13px' }}><div><div style={{ color: text }}>{t.invoice}</div><div style={{ color: textMuted, fontSize: '12px' }}>{new Date(t.createdAt).toLocaleString('id-ID')}</div></div><b style={{ color: '#4CAF50' }}>{rupiah(t.total)}</b></div>))}</div>}
            </>)}
          </div>
        );
      })}
      {showForm && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1200, overflowY: 'auto', padding: '20px' }}>
        <div style={{ background: card, borderRadius: '12px', padding: '20px', maxWidth: '500px', margin: '0 auto', border: `1px solid ${border}` }}>
          <h2 style={{ color: text, marginTop: 0 }}>{editingId !== null ? '✏️ Edit Pelanggan' : '➕ Tambah Pelanggan'}</h2>
          <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Nama *</label><input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Contoh: Budi" style={inputStyle(!!errors.nama)} />{errors.nama && <div style={errStyle}>{errors.nama}</div>}</div>
          <div style={{ marginBottom: '14px' }}><label style={labelStyle}>No HP (opsional)</label><input type="tel" inputMode="tel" value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} placeholder="0812xxxxxxx" style={inputStyle(!!errors.telepon)} />{errors.telepon && <div style={errStyle}>{errors.telepon}</div>}</div>
          <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Alamat (opsional)</label><input value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} placeholder="Contoh: Jl. Mawar No. 5" style={inputStyle(false)} /></div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button onClick={closeForm} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: `1px solid ${border}`, background: card, color: text, cursor: 'pointer', fontSize: '16px' }}>Batal</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#4CAF50', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>{saving ? 'Menyimpan...' : '💾 Simpan'}</button>
          </div>
        </div>
      </div>)}
    </div>
  );
}
