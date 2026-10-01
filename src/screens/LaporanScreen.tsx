import { useState, useEffect } from 'react';
import { KunjunganRepo } from '../data/repositories/KunjunganRepo';
import { TokoRepo } from '../data/repositories/TokoRepo';
import { ProductRepo } from '../data/repositories/ProductRepo';
import type { KunjunganRecord, SalesToko, Product } from '../data/database';

type Periode = 'hari' | 'minggu' | 'bulan' | 'semua';

interface TokoStat {
  idToko: string;
  nama: string;
  totalTransaksi: number;
  totalOmzet: number;
}

interface ProdukStat {
  produkId: number;
  namaProduk: string;
  totalQty: number;
  totalOmzet: number;
  stokSekarang: number;
  lastSold?: string;
}

interface ThresholdConfig {
  slMin: number;      // Minimum penjualan untuk Stock Laku
  skMax: number;      // Maksimum stok untuk Stock Kurang
  sdDays: number;     // Hari tanpa penjualan untuk Stock Diam
  bpjDays: number;    // Hari tanpa penjualan untuk Barang Pernah Jual
}

export default function LaporanScreen() {
  const [periode, setPeriode] = useState<Periode>('semua');
  const [loading, setLoading] = useState(true);
  const [kunjunganList, setKunjunganList] = useState<KunjunganRecord[]>([]);
  const [tokoList, setTokoList] = useState<SalesToko[]>([]);
  const [produkList, setProdukList] = useState<Product[]>([]);
  
  // Threshold configuration (user bisa ubah)
  const [threshold, setThreshold] = useState<ThresholdConfig>({
    slMin: 10,      // Default: ≥ 10x penjualan dalam 30 hari
    skMax: 5,       // Default: Stok < 5 pcs
    sdDays: 30,     // Default: 30 hari tanpa penjualan
    bpjDays: 60     // Default: 60 hari tanpa penjualan
  });
  
  const [showThresholdForm, setShowThresholdForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [kunjungan, toko, produk] = await Promise.all([
        KunjunganRepo.getAll(),
        TokoRepo.getAll(),
        ProductRepo.getAll()
      ]);
      setKunjunganList(kunjungan);
      setTokoList(toko);
      setProdukList(produk);
    } catch (error) {
      console.error('Error loading laporan:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredKunjungan = kunjunganList.filter(k => {
    if (periode === 'semua') return true;
    const tanggalKunjungan = new Date(k.createdAt || k.tanggal);
    const now = new Date();
    if (periode === 'hari') return tanggalKunjungan.toDateString() === now.toDateString();
    if (periode === 'minggu') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return tanggalKunjungan >= oneWeekAgo;
    }
    if (periode === 'bulan') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return tanggalKunjungan >= oneMonthAgo;
    }
    return true;
  });

  const totalTransaksi = filteredKunjungan.length;
  const totalOmzet = filteredKunjungan.reduce((sum, k) => sum + k.total, 0);
  const totalCash = filteredKunjungan.filter(k => k.tipe === 'Cash').reduce((sum, k) => sum + k.total, 0);
  const totalCredit = filteredKunjungan.filter(k => k.tipe === 'Credit').reduce((sum, k) => sum + k.total, 0);
  const rataRata = totalTransaksi > 0 ? totalOmzet / totalTransaksi : 0;
  const tokoUnik = new Set(filteredKunjungan.map(k => k.idToko)).size;

  const tokoStats: Record<string, TokoStat> = {};
  filteredKunjungan.forEach(k => {
    if (!tokoStats[k.idToko]) {
      const toko = tokoList.find(t => t.idToko === k.idToko);
      tokoStats[k.idToko] = {
        idToko: k.idToko,
        nama: toko?.nama || k.idToko,
        totalTransaksi: 0,
        totalOmzet: 0
      };
    }
    tokoStats[k.idToko].totalTransaksi += 1;
    tokoStats[k.idToko].totalOmzet += k.total;
  });
  const topToko = Object.values(tokoStats).sort((a, b) => b.totalOmzet - a.totalOmzet).slice(0, 5);

  // Analisis Performa Produk
  const produkStats: Record<number, ProdukStat> = {};
  const now = new Date();
  
  // Inisialisasi semua produk
  produkList.forEach(p => {
    produkStats[p.id!] = {
      produkId: p.id!,
      namaProduk: p.name,
      totalQty: 0,
      totalOmzet: 0,
      stokSekarang: p.stock,
      lastSold: undefined
    };
  });
  
  // Hitung dari riwayat transaksi
  kunjunganList.forEach(k => {
    k.items.forEach(item => {
      if (produkStats[item.produkId]) {
        produkStats[item.produkId].totalQty += item.jumlah;
        produkStats[item.produkId].totalOmzet += item.subtotal;
        
        const tanggalTransaksi = new Date(k.createdAt || k.tanggal);
        if (!produkStats[item.produkId].lastSold || tanggalTransaksi > new Date(produkStats[item.produkId].lastSold!)) {
          produkStats[item.produkId].lastSold = k.tanggal;
        }
      }
    });
  });
  
  // Kategorisasi produk
  const kategoriProduk = {
    SL: [] as ProdukStat[],  // Stock Laku
    SD: [] as ProdukStat[],  // Stock Diam
    SK: [] as ProdukStat[],  // Stock Kurang
    BPJ: [] as ProdukStat[], // Barang Pernah Jual
    TL: [] as ProdukStat[]   // Tidak Laku
  };
  
  Object.values(produkStats).forEach(p => {
    const daysSinceLastSold = p.lastSold 
      ? Math.floor((now.getTime() - new Date(p.lastSold).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    
    if (p.totalQty >= threshold.slMin) {
      kategoriProduk.SL.push(p);
    } else if (p.stokSekarang < threshold.skMax && p.totalQty > 0) {
      kategoriProduk.SK.push(p);
    } else if (p.totalQty === 0 && p.stokSekarang > 0 && daysSinceLastSold >= threshold.sdDays) {
      kategoriProduk.SD.push(p);
    } else if (p.totalQty > 0 && daysSinceLastSold >= threshold.bpjDays) {
      kategoriProduk.BPJ.push(p);
    } else if (p.totalQty === 0 && p.stokSekarang > 0) {
      kategoriProduk.TL.push(p);
    }
  });
  
  // Sort masing-masing kategori
  kategoriProduk.SL.sort((a, b) => b.totalQty - a.totalQty);
  kategoriProduk.SK.sort((a, b) => a.stokSekarang - b.stokSekarang);
  kategoriProduk.SD.sort((a, b) => b.stokSekarang - a.stokSekarang);
  kategoriProduk.BPJ.sort((a, b) => new Date(b.lastSold!).getTime() - new Date(a.lastSold!).getTime());
  kategoriProduk.TL.sort((a, b) => b.stokSekarang - a.stokSekarang);

  const omzetPerHari: { tanggal: string; omzet: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toDateString();
    const omzet = filteredKunjungan
      .filter(k => new Date(k.createdAt || k.tanggal).toDateString() === dateStr)
      .reduce((sum, k) => sum + k.total, 0);
    omzetPerHari.push({
      tanggal: date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
      omzet
    });
  }
  const maxOmzetHari = Math.max(...omzetPerHari.map(d => d.omzet), 1);

  const formatRupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID');
  const formatAngka = (n: number) => n.toLocaleString('id-ID');

  const handleExportCSV = () => {
    const headers = ['Tanggal', 'Toko', 'Tipe', 'Total', 'Items'];
    const rows = filteredKunjungan.map(k => {
      const toko = tokoList.find(t => t.idToko === k.idToko);
      const items = k.items.map(i => `${i.namaProduk}(${i.jumlah})`).join('; ');
      return [k.tanggal, toko?.nama || k.idToko, k.tipe, k.total, items];
    });
    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-mama-bee-${periode}-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert('✅ Laporan berhasil diexport!');
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}><p>Loading laporan...</p></div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
      <h2 style={{ marginBottom: '20px', color: '#1976D2', textAlign: 'center' }}>📊 Laporan Penjualan</h2>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' }}>
        {([
          { key: 'hari', label: 'Hari Ini' },
          { key: 'minggu', label: '7 Hari' },
          { key: 'bulan', label: '30 Hari' },
          { key: 'semua', label: 'Semua' }
        ] as { key: Periode; label: string }[]).map(p => (
          <button
            key={p.key}
            onClick={() => setPeriode(p.key)}
            style={{
              padding: '10px 16px',
              background: periode === p.key ? '#1976D2' : 'white',
              color: periode === p.key ? 'white' : '#333',
              border: '1px solid #ddd',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: periode === p.key ? 'bold' : 'normal',
              whiteSpace: 'nowrap',
              fontSize: '13px'
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
        <div style={{ background: 'linear-gradient(135deg, #1976D2, #42A5F5)', padding: '15px', borderRadius: '12px', color: 'white' }}>
          <div style={{ fontSize: '11px', opacity: 0.9 }}> Total Omzet</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '5px' }}>{formatRupiah(totalOmzet)}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #4CAF50, #81C784)', padding: '15px', borderRadius: '12px', color: 'white' }}>
          <div style={{ fontSize: '11px', opacity: 0.9 }}> Total Transaksi</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '5px' }}>{formatAngka(totalTransaksi)}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #FF9800, #FFB74D)', padding: '15px', borderRadius: '12px', color: 'white' }}>
          <div style={{ fontSize: '11px', opacity: 0.9 }}>📈 Rata-rata/Transaksi</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '5px' }}>{formatRupiah(rataRata)}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #9C27B0, #BA68C8)', padding: '15px', borderRadius: '12px', color: 'white' }}>
          <div style={{ fontSize: '11px', opacity: 0.9 }}>🏪 Toko Dikunjungi</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '5px' }}>{formatAngka(tokoUnik)}</div>
        </div>
      </div>

      <div style={{ background: 'white', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #ddd' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>💳 Breakdown Pembayaran</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1, background: '#E8F5E9', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#2E7D32' }}>💵 Cash</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2E7D32' }}>{formatRupiah(totalCash)}</div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>
              {totalOmzet > 0 ? Math.round((totalCash / totalOmzet) * 100) : 0}% dari total
            </div>
          </div>
          <div style={{ flex: 1, background: '#FFF3E0', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#E65100' }}>💳 Credit</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#E65100' }}>{formatRupiah(totalCredit)}</div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>
              {totalOmzet > 0 ? Math.round((totalCredit / totalOmzet) * 100) : 0}% dari total
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: 'white', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #ddd' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#333' }}>📊 Grafik Omzet (7 Hari Terakhir)</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '150px', paddingBottom: '20px', borderBottom: '1px solid #ddd' }}>
          {omzetPerHari.map((d, idx) => {
            const height = (d.omzet / maxOmzetHari) * 100;
            return (
              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ fontSize: '9px', color: '#666', marginBottom: '5px' }}>
                  {d.omzet > 0 ? (d.omzet >= 1000000 ? `${(d.omzet / 1000000).toFixed(1)}jt` : `${Math.round(d.omzet / 1000)}rb`) : '0'}
                </div>
                <div style={{ 
                  width: '100%', 
                  maxWidth: '40px',
                  height: `${Math.max(height, 2)}%`,
                  background: 'linear-gradient(180deg, #1976D2, #42A5F5)',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.3s'
                }}></div>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '5px', textAlign: 'center' }}>{d.tanggal}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: 'white', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #ddd' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>🏆 Top 5 Toko (Omzet Tertinggi)</h3>
        {topToko.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Belum ada data</p>
        ) : (
          <div>
            {topToko.map((t, idx) => {
              const maxOmzetToko = topToko[0]?.totalOmzet || 1;
              const width = (t.totalOmzet / maxOmzetToko) * 100;
              return (
                <div key={t.idToko} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 'bold' }}>
                      {idx === 0 ? '🥇' : idx === 1 ? '' : idx === 2 ? '' : `${idx + 1}.`} {t.nama}
                    </span>
                    <span style={{ color: '#1976D2', fontWeight: 'bold' }}>{formatRupiah(t.totalOmzet)}</span>
                  </div>
                  <div style={{ background: '#f0f0f0', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${width}%`, 
                      height: '100%', 
                      background: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#1976D2',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{t.totalTransaksi} transaksi</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Analisis Performa Produk */}
      <div style={{ background: 'white', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #ddd' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: '#333' }}>📦 Analisis Performa Produk</h3>
          <button
            onClick={() => setShowThresholdForm(!showThresholdForm)}
            style={{
              padding: '6px 12px',
              background: '#1976D2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            {showThresholdForm ? 'Tutup' : '⚙️ Atur Threshold'}
          </button>
        </div>

        {showThresholdForm && (
          <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
            <p style={{ fontSize: '11px', color: '#666', margin: '0 0 10px 0' }}>
               Atur threshold sesuai kebutuhan bisnis Anda. Contoh default diberikan sebagai panduan.
            </p>
            
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                 SL (Stock Laku) - Min. Penjualan
              </label>
              <input
                type="number"
                value={threshold.slMin}
                onChange={(e) => setThreshold({...threshold, slMin: parseInt(e.target.value) || 0})}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
              <small style={{ fontSize: '10px', color: '#666' }}>Contoh: ≥ 10x penjualan dalam 30 hari</small>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                🔴 SK (Stock Kurang) - Maks. Stok
              </label>
              <input
                type="number"
                value={threshold.skMax}
                onChange={(e) => setThreshold({...threshold, skMax: parseInt(e.target.value) || 0})}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
              <small style={{ fontSize: '10px', color: '#666' }}>Contoh: Stok &lt; 5 pcs dan masih ada penjualan</small>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                 SD (Stock Diam) - Hari Tanpa Penjualan
              </label>
              <input
                type="number"
                value={threshold.sdDays}
                onChange={(e) => setThreshold({...threshold, sdDays: parseInt(e.target.value) || 0})}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
              <small style={{ fontSize: '10px', color: '#666' }}>Contoh: 30 hari tanpa penjualan, stok masih ada</small>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                🟠 BPJ (Barang Pernah Jual) - Hari Tanpa Penjualan
              </label>
              <input
                type="number"
                value={threshold.bpjDays}
                onChange={(e) => setThreshold({...threshold, bpjDays: parseInt(e.target.value) || 0})}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
              <small style={{ fontSize: '10px', color: '#666' }}>Contoh: 60 hari tanpa penjualan, pernah terjual sebelumnya</small>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '15px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#4CAF50' }}>
            🟢 SL (Stock Laku): {kategoriProduk.SL.length} produk
          </h4>
          {kategoriProduk.SL.length === 0 ? (
            <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>Tidak ada produk</p>
          ) : (
            kategoriProduk.SL.slice(0, 3).map(p => (
              <div key={p.produkId} style={{ fontSize: '11px', padding: '5px 0', borderBottom: '1px solid #f0f0f0' }}>
                <strong>{p.namaProduk}</strong> - {p.totalQty} pcs terjual
              </div>
            ))
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#f44336' }}>
            🔴 SK (Stock Kurang): {kategoriProduk.SK.length} produk
          </h4>
          {kategoriProduk.SK.length === 0 ? (
            <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>Tidak ada produk</p>
          ) : (
            kategoriProduk.SK.slice(0, 3).map(p => (
              <div key={p.produkId} style={{ fontSize: '11px', padding: '5px 0', borderBottom: '1px solid #f0f0f0' }}>
                <strong>{p.namaProduk}</strong> - Stok: {p.stokSekarang} pcs
              </div>
            ))
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#FF9800' }}>
            🟡 SD (Stock Diam): {kategoriProduk.SD.length} produk
          </h4>
          {kategoriProduk.SD.length === 0 ? (
            <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>Tidak ada produk</p>
          ) : (
            kategoriProduk.SD.slice(0, 3).map(p => (
              <div key={p.produkId} style={{ fontSize: '11px', padding: '5px 0', borderBottom: '1px solid #f0f0f0' }}>
                <strong>{p.namaProduk}</strong> - Stok: {p.stokSekarang} pcs
              </div>
            ))
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#FF5722' }}>
            🟠 BPJ (Barang Pernah Jual): {kategoriProduk.BPJ.length} produk
          </h4>
          {kategoriProduk.BPJ.length === 0 ? (
            <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>Tidak ada produk</p>
          ) : (
            kategoriProduk.BPJ.slice(0, 3).map(p => (
              <div key={p.produkId} style={{ fontSize: '11px', padding: '5px 0', borderBottom: '1px solid #f0f0f0' }}>
                <strong>{p.namaProduk}</strong> - Last sold: {p.lastSold}
              </div>
            ))
          )}
        </div>

        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#9E9E9E' }}>
            ⚫ TL (Tidak Laku): {kategoriProduk.TL.length} produk
          </h4>
          {kategoriProduk.TL.length === 0 ? (
            <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>Tidak ada produk</p>
          ) : (
            kategoriProduk.TL.slice(0, 3).map(p => (
              <div key={p.produkId} style={{ fontSize: '11px', padding: '5px 0', borderBottom: '1px solid #f0f0f0' }}>
                <strong>{p.namaProduk}</strong> - Stok: {p.stokSekarang} pcs
              </div>
            ))
          )}
        </div>
      </div>

      <button
        onClick={handleExportCSV}
        disabled={filteredKunjungan.length === 0}
        style={{
          width: '100%',
          padding: '15px',
          background: filteredKunjungan.length === 0 ? '#ccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: filteredKunjungan.length === 0 ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        📥 Export Laporan (CSV)
      </button>

      <div style={{ padding: '15px', background: '#E3F2FD', borderRadius: '8px', fontSize: '12px', color: '#1565C0' }}>
        <strong>💡 Tips:</strong>
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          <li>Pilih periode untuk melihat laporan spesifik</li>
          <li>Atur threshold analisis produk sesuai kebutuhan bisnis</li>
          <li>Export CSV untuk dibuka di Excel/Google Sheets</li>
        </ul>
      </div>
    </div>
  );
}
