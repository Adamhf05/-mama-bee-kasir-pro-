import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { AppLogo } from '../components/AppLogo';
import { APP_NAME, BRAND } from '../constants';
import { ProductRepo } from '../data/repositories/ProductRepo';
import { TransactionRepo } from '../data/repositories/TransactionRepo';
import { KunjunganRepo } from '../data/repositories/KunjunganRepo';
import type { Product } from '../data/database';

interface RecentItem {
  key: string;
  type: 'KASIR' | 'TOKO';
  label: string;
  total: number;
  date: Date;
}

interface Stats {
  omzet: number;
  profit: number;
  trxKasir: number;
  kunjungan: number;
  totalProduk: number;
  lowStock: Product[];
  top: Array<{ name: string; qty: number }>;
  recent: RecentItem[];
  empty: boolean;
}

const rupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

function toDate(v: unknown): Date | null {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

const sameDay = (d: Date | null, ref: Date) => !!d && d.toDateString() === ref.toDateString();

async function computeStats(): Promise<Stats> {
  const [products, trans, kunj] = await Promise.all([
    ProductRepo.getAll(),
    TransactionRepo.getAll(),
    KunjunganRepo.getAll()
  ]);
  const hpp = new Map<number, number>(
    products.map(p => [p.id as number, p.hpp || 0] as [number, number])
  );
  const now = new Date();
  let omzet = 0;
  let profit = 0;
  let trxKasir = 0;
  let kunjungan = 0;
  const qtyByName = new Map<string, number>();
  const recent: RecentItem[] = [];

  for (const t of trans) {
    const d = toDate(t.createdAt);
    for (const it of t.items) {
      qtyByName.set(it.name, (qtyByName.get(it.name) ?? 0) + it.qty);
    }
    if (d) recent.push({ key: 'K' + t.id, type: 'KASIR', label: t.invoice, total: t.total, date: d });
    if (sameDay(d, now)) {
      trxKasir++;
      omzet += t.total;
      for (const it of t.items) {
        profit += (it.price - (hpp.get(it.productId) ?? 0)) * it.qty;
      }
    }
  }

  for (const k of kunj) {
    const d = toDate(k.createdAt);
    for (const it of k.items) {
      qtyByName.set(it.namaProduk, (qtyByName.get(it.namaProduk) ?? 0) + it.jumlah);
    }
    if (d) recent.push({ key: 'T' + k.id, type: 'TOKO', label: k.idToko, total: k.total, date: d });
    if (sameDay(d, now)) {
      kunjungan++;
      omzet += k.total;
      for (const it of k.items) {
        profit += (it.hargaSatuan - (hpp.get(it.produkId) ?? 0)) * it.jumlah;
      }
    }
  }

  recent.sort((a, b) => b.date.getTime() - a.date.getTime());
  const top = Array.from(qtyByName.entries())
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 3);
  const lowStock = products.filter(p => p.stock < 5).sort((a, b) => a.stock - b.stock);

  return {
    omzet,
    profit,
    trxKasir,
    kunjungan,
    totalProduk: products.length,
    lowStock,
    top,
    recent: recent.slice(0, 5),
    empty: products.length === 0 && trans.length === 0 && kunj.length === 0
  };
}

export default function DashboardScreen() {
  const { card, text, textMuted, border, dark } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      setStats(await computeStats());
    } catch (e) {
      setError('Gagal memuat dashboard: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const box = {
    background: card,
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    border: `1px solid ${border}`
  } as const;

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const cards = stats
    ? [
        { icon: '💰', label: 'Omzet Hari Ini', value: rupiah(stats.omzet), sub: 'Kasir + Toko', bg: 'linear-gradient(135deg,#1976D2,#42A5F5)' },
        { icon: '📈', label: 'Profit Hari Ini', value: rupiah(stats.profit), sub: '(Harga jual − HPP) × qty', bg: `linear-gradient(135deg,${BRAND.purple},#BA68C8)` },
        { icon: '🧾', label: 'Transaksi Kasir', value: String(stats.trxKasir), sub: 'hari ini', bg: 'linear-gradient(135deg,#FB8C00,#FFB74D)' },
        { icon: '🏪', label: 'Kunjungan Toko', value: String(stats.kunjungan), sub: 'hari ini', bg: 'linear-gradient(135deg,#43A047,#81C784)' }
      ]
    : [];

  const medal = ['#FFC107', '#B0BEC5', '#CD7F32'];

  return (
    <div style={{ padding: '16px', paddingBottom: '100px', maxWidth: '700px', margin: '0 auto' }}>
      <div
        style={{
          background: `linear-gradient(135deg, ${BRAND.purple}, ${BRAND.black})`,
          borderRadius: '16px',
          padding: '24px 16px',
          textAlign: 'center',
          color: 'white',
          marginBottom: '16px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)'
        }}
      >
        <AppLogo size={120} style={{ boxShadow: `0 0 0 4px ${BRAND.yellow}, 0 4px 12px rgba(0,0,0,0.4)` }} />
        <h1 style={{ margin: '14px 0 4px', fontSize: '22px' }}>{APP_NAME}</h1>
        <div style={{ opacity: 0.85, fontSize: '13px' }}>{today}</div>
      </div>

      {error && (
        <div style={{ ...box, color: '#f44336' }}>{error}</div>
      )}
      {!stats && !error && (
        <div style={{ textAlign: 'center', color: textMuted, padding: '30px 0' }}>Memuat data...</div>
      )}

      {stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {cards.map(c => (
              <div key={c.label} style={{ background: c.bg, borderRadius: '14px', padding: '16px 10px', color: 'white', textAlign: 'center', boxShadow: '0 3px 10px rgba(0,0,0,0.2)' }}>
                <div style={{ fontSize: '13px', opacity: 0.95 }}>{c.icon} {c.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', margin: '8px 0 4px' }}>{c.value}</div>
                <div style={{ fontSize: '11px', opacity: 0.85 }}>{c.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', color: textMuted, fontSize: '13px', marginBottom: '16px' }}>
            📦 {stats.totalProduk} produk terdaftar
          </div>

          {stats.empty && (
            <div style={{ ...box, textAlign: 'center' }}>
              <h2 style={{ color: text, marginTop: 0 }}>Selamat Datang!</h2>
              <p style={{ color: textMuted }}>Mulai dengan menambahkan produk di menu Produk, lalu lakukan transaksi pertama di menu Kasir.</p>
            </div>
          )}

          {stats.lowStock.length > 0 && (
            <div style={{ ...box, borderColor: '#f44336', background: dark ? '#3b2224' : '#FFEBEE' }}>
              <div style={{ color: '#f44336', fontWeight: 'bold', marginBottom: '8px' }}>
                ⚠️ {stats.lowStock.length} produk stok menipis (di bawah 5)
              </div>
              {stats.lowStock.slice(0, 5).map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', color: text, padding: '4px 0' }}>
                  <span>{p.name}</span>
                  <b>{p.stock} {p.unit || 'Pcs'}</b>
                </div>
              ))}
            </div>
          )}

          {stats.top.length > 0 && (
            <div style={box}>
              <div style={{ color: text, fontWeight: 'bold', marginBottom: '10px' }}>🏆 Top 3 Produk Terlaris</div>
              {stats.top.map((t, i) => (
                <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderTop: i ? `1px solid ${border}` : 'none' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: medal[i], color: '#222', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                  <div style={{ flex: 1, color: text, fontWeight: 'bold' }}>{t.name}</div>
                  <div style={{ color: '#1976D2', fontWeight: 'bold' }}>{t.qty} pcs</div>
                </div>
              ))}
            </div>
          )}

          {stats.recent.length > 0 && (
            <div style={box}>
              <div style={{ color: text, fontWeight: 'bold', marginBottom: '10px' }}>🕐 Transaksi Terbaru</div>
              {stats.recent.map((r, i) => (
                <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderTop: i ? `1px solid ${border}` : 'none' }}>
                  <span style={{ background: r.type === 'KASIR' ? '#1976D2' : '#43A047', color: 'white', fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '10px' }}>
                    {r.type}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: text, fontWeight: 'bold', fontSize: '14px' }}>{r.label}</div>
                    <div style={{ color: textMuted, fontSize: '12px' }}>{r.date.toLocaleString('id-ID')}</div>
                  </div>
                  <div style={{ color: '#4CAF50', fontWeight: 'bold' }}>{rupiah(r.total)}</div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={load}
            style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: '#1976D2', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}
          >
            🔄 Refresh Dashboard
          </button>
        </>
      )}
    </div>
  );
}
