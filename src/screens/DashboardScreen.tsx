import { AppLogo } from '../components/AppLogo';
import { useState, useEffect } from 'react';
import { ProductRepo } from '../data/repositories/ProductRepo';
import { KunjunganRepo } from '../data/repositories/KunjunganRepo';
import type { KunjunganRecord } from '../data/database';

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    penjualanHariIni: 0,
    totalProduk: 0,
    transaksiHariIni: 0,
    profitHariIni: 0,
    stokMenipis: 0,
    topProduk: [] as { nama: string; qty: number }[],
    transaksiTerbaru: [] as KunjunganRecord[]
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [produkList, kunjunganList] = await Promise.all([
        ProductRepo.getAll(),
        KunjunganRepo.getAll()
      ]);

      const today = new Date().toDateString();

      // Filter transaksi hari ini
      const transaksiHariIni = kunjunganList.filter(k => {
        const tanggal = new Date(k.createdAt || k.tanggal);
        return tanggal.toDateString() === today;
      });

      // Hitung penjualan hari ini
      const penjualanHariIni = transaksiHariIni.reduce((sum, k) => sum + k.total, 0);

      // Hitung stok menipis (stok < 10)
      const stokMenipis = produkList.filter(p => p.stock < 10).length;

      // 🟢 HITUNG PROFIT REAL (Harga Jual - Modal) x Qty
      let profitHariIni = 0;
      transaksiHariIni.forEach(k => {
        k.items.forEach(item => {
          // Cari produk berdasarkan ID untuk ambil data Modal
          const produk = produkList.find(p => p.id === item.produkId);
          const modal = produk?.hpp || 0; // Pastikan field di database bernama 'modal'
          
          // Rumus: (Harga Jual - Modal) x Jumlah
          const keuntungan = (item.hargaSatuan - modal) * item.jumlah;
          profitHariIni += keuntungan;
        });
      });

      // Top produk (dari semua transaksi)
      const produkMap: Record<number, { nama: string; qty: number }> = {};
      kunjunganList.forEach(k => {
        k.items.forEach(item => {
          if (!produkMap[item.produkId]) {
            produkMap[item.produkId] = { nama: item.namaProduk, qty: 0 };
          }
          produkMap[item.produkId].qty += item.jumlah;
        });
      });
      const topProduk = Object.values(produkMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 3);

      // 5 transaksi terbaru
      const transaksiTerbaru = [...kunjunganList]
        .sort((a, b) => new Date(b.createdAt || b.tanggal).getTime() - new Date(a.createdAt || a.tanggal).getTime())
        .slice(0, 5);

      setStats({
        penjualanHariIni,
        totalProduk: produkList.length,
        transaksiHariIni: transaksiHariIni.length,
        profitHariIni, // Sekarang Profit Real!
        stokMenipis,
        topProduk,
        transaksiTerbaru
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
      <h2 style={{ marginBottom: '20px', color: '#1976D2', textAlign: 'center' }}>
        🏠 Dashboard
      </h2>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '25px' }}>
        <div style={{ background: 'linear-gradient(135deg, #1976D2, #42A5F5)', padding: '20px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 12px rgba(25,118,210,0.3)' }}>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '8px' }}>💰 Penjualan Hari Ini</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{formatRupiah(stats.penjualanHariIni)}</div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #4CAF50, #81C784)', padding: '20px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 12px rgba(76,175,80,0.3)' }}>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '8px' }}>📦 Total Produk</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.totalProduk}</div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #FF9800, #FFB74D)', padding: '20px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 12px rgba(255,152,0,0.3)' }}>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '8px' }}>🧾 Transaksi Hari Ini</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.transaksiHariIni}</div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #9C27B0, #BA68C8)', padding: '20px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 12px rgba(156,39,176,0.3)' }}>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '8px' }}> Profit Hari Ini</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{formatRupiah(stats.profitHariIni)}</div>
          <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '5px' }}>Keuntungan Bersih Real</div>
        </div>
      </div>

      {/* Stok Menipis Warning */}
      {stats.stokMenipis > 0 && (
        <div style={{ 
          background: '#FFEBEE', 
          padding: '15px', 
          borderRadius: '12px', 
          marginBottom: '20px',
          border: '2px solid #f44336',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{ fontSize: '24px' }}>⚠️</div>
          <div>
            <div style={{ fontWeight: 'bold', color: '#c62828', fontSize: '14px' }}>
              {stats.stokMenipis} Produk Stok Menipis!
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '3px' }}>
              Segera restock untuk menghindari kehabisan
            </div>
          </div>
        </div>
      )}

      {/* Top Produk */}
      {stats.topProduk.length > 0 && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #ddd' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#333' }}>
            🏆 Top 3 Produk Terlaris
          </h3>
          {stats.topProduk.map((p, idx) => (
            <div key={idx} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '12px',
              marginBottom: '8px',
              background: idx === 0 ? '#FFF9C4' : idx === 1 ? '#F5F5F5' : '#FFF3E0',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  width: '30px', 
                  height: '30px', 
                  borderRadius: '50%', 
                  background: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  {idx + 1}
                </div>
                <strong style={{ fontSize: '14px' }}>{p.nama}</strong>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1976D2' }}>
                {p.qty} pcs
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transaksi Terbaru */}
      {stats.transaksiTerbaru.length > 0 && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #ddd' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#333' }}>
            🕐 Transaksi Terbaru
          </h3>
          {stats.transaksiTerbaru.map((k, idx) => (
            <div key={idx} style={{ 
              padding: '12px',
              marginBottom: '8px',
              background: '#f5f5f5',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#333' }}>
                  {k.idToko}
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>
                  {new Date(k.createdAt || k.tanggal).toLocaleString('id-ID')}
                </div>
              </div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: 'bold', 
                color: k.tipe === 'Cash' ? '#4CAF50' : '#FF9800'
              }}>
                {formatRupiah(k.total)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {stats.totalProduk === 0 && stats.transaksiHariIni === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #ddd'
        }}>
          <div style={{ marginBottom: '20px' }}><AppLogo size={96} /></div>
          <h3 style={{ color: '#333', marginBottom: '10px' }}>Selamat Datang di Mama Bee Kasir Pro!</h3>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
            Mulai dengan menambahkan produk dan melakukan transaksi pertama Anda
          </p>
          <div style={{ display: 'grid', gap: '10px', maxWidth: '300px', margin: '0 auto' }}>
            <div style={{ padding: '12px', background: '#E3F2FD', borderRadius: '8px', fontSize: '13px', color: '#1976D2' }}>
               Tambah produk di menu <strong>Produk</strong>
            </div>
            <div style={{ padding: '12px', background: '#E8F5E9', borderRadius: '8px', fontSize: '13px', color: '#2E7D32' }}>
              🏪 Tambah toko di menu <strong>Map Market</strong>
            </div>
            <div style={{ padding: '12px', background: '#FFF3E0', borderRadius: '8px', fontSize: '13px', color: '#E65100' }}>
              🛒 Mulai transaksi di menu <strong>Kasir</strong>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={loadDashboardData}
        style={{
          width: '100%',
          padding: '12px',
          background: '#1976D2',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        🔄 Refresh Dashboard
      </button>
    </div>
  );
}
