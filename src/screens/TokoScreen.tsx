import { useState, useEffect, useRef } from 'react';
import { Browser } from '@capacitor/browser';
import { ProductRepo } from '../data/repositories/ProductRepo';
import { TokoRepo } from '../data/repositories/TokoRepo';
import { KunjunganRepo } from '../data/repositories/KunjunganRepo';
import type { Product, SalesToko } from '../data/database';
import { ReceiptGenerator } from '../components/ReceiptGenerator';
import { generateReceiptImage, shareReceiptViaWhatsApp, downloadReceiptImage } from '../utils/receiptUtils';

interface ItemKeranjang {
  produk: Product;
  jumlah: number;
  subtotal: number;
}

interface ItemRiwayat {
  produkId: number;
  namaProduk: string;
  hargaSatuan: number;
  jumlah: number;
  subtotal: number;
}

interface TransaksiTerakhir {
  tokoNama: string;
  tokoId: string;
  tokoAlamat: string;
  tanggal: string;
  tipe: 'Cash' | 'Credit';
  uangDiterima?: number;
  kembalian?: number;
  items: ItemRiwayat[];
  total: number;
}

const HARI_LIST = ['Semua', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const SOFT_LIMIT = 40;

export default function TokoScreen() {
  const [tokoList, setTokoList] = useState<SalesToko[]>([]);
  const [selectedToko, setSelectedToko] = useState<SalesToko | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showKasir, setShowKasir] = useState(false);
  const [produkList, setProdukList] = useState<Product[]>([]);
  const [cart, setCart] = useState<ItemKeranjang[]>([]);
  const [pembayaran, setPembayaran] = useState<'Cash' | 'Credit'>('Cash');
  const [uangMasuk, setUangMasuk] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [filterHari, setFilterHari] = useState<string>('Semua');
  const [kunjunganStats, setKunjunganStats] = useState<Record<string, {totalCash: number; totalCredit: number; totalKunjungan: number}>>({});
  
  // State untuk struk
  const [showReceipt, setShowReceipt] = useState(false);
  const [transaksiTerakhir, setTransaksiTerakhir] = useState<TransaksiTerakhir | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await TokoRepo.migrateFromLocalStorage();
      
      const toko = await TokoRepo.getAll();
      setTokoList(toko);
      
      const stats: Record<string, {totalCash: number; totalCredit: number; totalKunjungan: number}> = {};
      for (const t of toko) {
        const s = await KunjunganRepo.getStatsByToko(t.idToko);
        stats[t.idToko] = s;
      }
      setKunjunganStats(stats);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProduk = async () => {
    try {
      const produk = await ProductRepo.getAll();
      setProdukList(produk);
    } catch (error) {
      console.error('Error loading produk:', error);
    }
  };

  const handleNavigate = (lokasi: string) => {
    if (!lokasi) {
      alert('⚠️ Toko ini belum punya koordinat lokasi!');
      return;
    }
    Browser.open({ url: `https://www.google.com/maps/dir/?api=1&destination=${lokasi}` });
  };

  const handleStartTransaction = async () => {
    await loadProduk();
    setCart([]);
    setPembayaran('Cash');
    setShowKasir(true);
  };

  const addToCart = (produk: Product) => {
    const existingInCart = cart.find(item => item.produk.id === produk.id);
    const totalInCart = existingInCart ? existingInCart.jumlah : 0;
    
    if (totalInCart >= produk.stock) {
      alert(`⚠️ Stock tidak cukup!\nStok tersedia: ${produk.stock}`);
      return;
    }

    const existing = cart.find(item => item.produk.id === produk.id);
    if (existing) {
      setCart(cart.map(item => 
        item.produk.id === produk.id 
          ? { ...item, jumlah: item.jumlah + 1, subtotal: (item.jumlah + 1) * item.produk.price }
          : item
      ));
    } else {
      setCart([...cart, { produk, jumlah: 1, subtotal: produk.price }]);
    }
  };

  const removeFromCart = (produkId: number) => {
    setCart(cart.filter(item => item.produk.id !== produkId));
  };

  const updateQuantity = (produkId: number, jumlah: number) => {
    if (jumlah <= 0) {
      removeFromCart(produkId);
      return;
    }

    const produk = produkList.find(p => p.id === produkId);
    if (!produk) return;

    if (jumlah > produk.stock) {
      alert(`⚠️ Stock tidak cukup!\nStok tersedia: ${produk.stock}`);
      return;
    }

    setCart(cart.map(item => 
      item.produk.id === produkId 
        ? { ...item, jumlah, subtotal: jumlah * item.produk.price }
        : item
    ));
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleCheckout = async () => {
    // Validasi uang diterima (khusus Cash)
    if (cart.length > 0 && pembayaran === 'Cash' && (!uangMasuk || !(Number(uangMasuk) >= getTotal()))) {
      alert('⚠️ Uang Kurang!');
      return;
    }
    const uangDiterimaFinal = pembayaran === 'Cash' ? Number(uangMasuk) : undefined;
    const kembalianFinal = pembayaran === 'Cash' ? Number(uangMasuk) - getTotal() : undefined;
    if (cart.length === 0) {
      alert('⚠️ Keranjang kosong!');
      return;
    }

    for (const item of cart) {
      if (item.jumlah > item.produk.stock) {
        alert(`⚠️ Stock ${item.produk.name} tidak cukup!`);
        return;
      }
    }

    try {
      setLoading(true);

      for (const item of cart) {
        const newStock = item.produk.stock - item.jumlah;
        await ProductRepo.updateStock(item.produk.id!, newStock);
      }

      const itemsForHistory: ItemRiwayat[] = cart.map(item => ({
        produkId: item.produk.id!,
        namaProduk: item.produk.name,
        hargaSatuan: item.produk.price,
        jumlah: item.jumlah,
        subtotal: item.subtotal
      }));

      const kunjungan = {
        idToko: selectedToko!.idToko,
        tanggal: new Date().toLocaleString('id-ID'),
        uangDiterima: uangDiterimaFinal,
        kembalian: kembalianFinal,
        tipe: pembayaran,
        total: getTotal(),
        items: itemsForHistory
      };

      await KunjunganRepo.add(kunjungan);
      
      const s = await KunjunganRepo.getStatsByToko(selectedToko!.idToko);
      setKunjunganStats(prev => ({ ...prev, [selectedToko!.idToko]: s }));
      
      // Simpan data transaksi terakhir untuk struk
      setTransaksiTerakhir({
        tokoNama: selectedToko!.nama,
        tokoId: selectedToko!.idToko,
        tokoAlamat: selectedToko!.alamat,
        uangDiterima: uangDiterimaFinal,
        kembalian: kembalianFinal,
        tanggal: kunjungan.tanggal,
        tipe: pembayaran,
        items: itemsForHistory,
        total: getTotal()
      });
      
      setShowKasir(false);
      setCart([]);
      setUangMasuk('');
      setShowReceipt(true); // Tampilkan struk
      
      await loadProduk();
    } catch (error) {
      console.error('Error checkout:', error);
      alert('❌ Gagal memproses transaksi: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!receiptRef.current || !transaksiTerakhir) return;
    
    try {
      setLoading(true);
      const imageData = await generateReceiptImage(receiptRef.current);
      await shareReceiptViaWhatsApp(imageData, transaksiTerakhir.tokoNama);
    } catch (error) {
      console.error('Share error:', error);
      alert('❌ Gagal membagikan struk: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadStruk = async () => {
    if (!receiptRef.current || !transaksiTerakhir) return;
    
    try {
      setLoading(true);
      const imageData = await generateReceiptImage(receiptRef.current);
      await downloadReceiptImage(imageData, transaksiTerakhir.tokoNama);
      alert('✅ Struk berhasil didownload!');
    } catch (error) {
      console.error('Download error:', error);
      alert('❌ Gagal mendownload struk');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintThermal = () => {
    if (!receiptRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('⚠️ Popup diblokir! Izinkan popup untuk print.');
      return;
    }
    
    const content = receiptRef.current.innerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Struk</title>
          <style>
            @page {
              size: 58mm auto;
              margin: 0;
            }
            body {
              width: 58mm;
              margin: 0;
              padding: 5mm;
              font-family: monospace;
              font-size: 10px;
            }
            * { box-sizing: border-box; }
            img { max-width: 100%; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const filteredToko = tokoList.filter(t => {
    const matchSearch = t.idToko.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       t.nama.toLowerCase().includes(searchTerm.toLowerCase());
    const matchHari = filterHari === 'Semua' || t.hariKunjungan.includes(filterHari);
    return matchSearch && matchHari;
  });

  const tokoPerHari: Record<string, number> = {};
  for (const hari of HARI_LIST) {
    if (hari === 'Semua') continue;
    tokoPerHari[hari] = tokoList.filter(t => t.hariKunjungan.includes(hari)).length;
  }

  // Modal Struk
  if (showReceipt && transaksiTerakhir) {
    return (
      <div style={{ padding: '20px', minHeight: '100vh', background: '#f5f5f5' }}>
        
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <ReceiptGenerator ref={receiptRef} data={transaksiTerakhir} />
        </div>

        <div style={{ display: 'grid', gap: '10px', maxWidth: '400px', margin: '0 auto' }}>
          <button
            onClick={handleShareWhatsApp}
            disabled={loading}
            style={{
              padding: '15px',
              background: '#25D366',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '⏳ Memproses...' : '📱 Kirim via WhatsApp'}
          </button>

          <button
            onClick={handleDownloadStruk}
            disabled={loading}
            style={{
              padding: '15px',
              background: '#1976D2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            💾 Download sebagai Gambar
          </button>

          <button
            onClick={handlePrintThermal}
            style={{
              padding: '15px',
              background: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🖨️ Print Thermal (58mm)
          </button>

          <button
            onClick={() => {
              setShowReceipt(false);
              setTransaksiTerakhir(null);
            }}
            style={{
              padding: '15px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ✕ Tutup
          </button>
        </div>

        <div style={{ marginTop: '20px', padding: '15px', background: '#E3F2FD', borderRadius: '8px', fontSize: '12px', color: '#1565C0' }}>
          <strong>💡 Tips:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
            <li>Klik "Kirim via WhatsApp" untuk share struk sebagai gambar</li>
            <li>Klik "Download" untuk simpan struk di galeri HP</li>
            <li>Klik "Print Thermal" untuk print ke printer 58mm</li>
          </ul>
        </div>
      </div>
    );
  }

  // Halaman Kasir
  if (showKasir && selectedToko) {
    return (
      <div style={{ padding: '20px', paddingBottom: '100px', minHeight: '100vh', background: '#f5f5f5' }}>
        <button 
          onClick={() => setShowKasir(false)}
          style={{ marginBottom: '15px', background: 'none', border: 'none', color: '#1976D2', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ⬅️ Kembali ke Detail Toko
        </button>

        <h2 style={{ color: '#1976D2', textAlign: 'center' }}>🛒 Kasir - {selectedToko.nama}</h2>

        <div style={{ background: '#E3F2FD', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px' }}>
          <strong>ID:</strong> {selectedToko.idToko} | <strong>Alamat:</strong> {selectedToko.alamat}
        </div>

        <div style={{ background: '#E8F5E9', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '12px', color: '#2E7D32' }}>
          ✅ Ditemukan <strong>{produkList.length}</strong> produk dari database
        </div>

        <h3 style={{ color: '#333', borderBottom: '2px solid #1976D2', paddingBottom: '5px' }}> Pilih Produk ({produkList.length} tersedia)</h3>
        
        {produkList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', background: 'white', borderRadius: '8px', color: '#999' }}>
            <p style={{ fontSize: '48px', margin: 0 }}>📦</p>
            <p>Belum ada produk.</p>
            <button onClick={loadProduk} style={{ marginTop: '10px', padding: '8px 16px', background: '#1976D2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>🔄 Reload</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
            {produkList.map(produk => {
              const inCart = cart.find(item => item.produk.id === produk.id);
              const stockTersedia = produk.stock - (inCart?.jumlah || 0);
              const habis = stockTersedia <= 0;
              
              return (
                <div key={produk.id} style={{ background: 'white', padding: '12px', borderRadius: '8px', border: inCart ? '2px solid #4CAF50' : '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: habis ? 0.6 : 1 }}>
                  <div style={{ flex: 1 }}>
                    <strong>{produk.name}</strong>
                    <div style={{ fontSize: '12px', color: '#666' }}>{produk.category} • Stok: {produk.stock} Pcs {inCart && <span style={{ color: '#FF9800' }}>(Cart: {inCart.jumlah})</span>}</div>
                    <div style={{ fontSize: '14px', color: '#1976D2', fontWeight: 'bold' }}>Rp {produk.price.toLocaleString('id-ID')}</div>
                  </div>
                  {!habis && <button onClick={() => addToCart(produk)} style={{ padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>+ Tambah</button>}
                </div>
              );
            })}
          </div>
        )}

        <h3 style={{ color: '#333', borderBottom: '2px solid #1976D2', paddingBottom: '5px' }}>🛍️ Keranjang ({cart.length} item)</h3>
        
        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', background: 'white', borderRadius: '8px', color: '#999' }}>Keranjang kosong.</div>
        ) : (
          <div style={{ marginBottom: '20px' }}>
            {cart.map(item => (
              <div key={item.produk.id} style={{ background: 'white', padding: '12px', borderRadius: '8px', marginBottom: '8px', border: '1px solid #ddd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}><strong>{item.produk.name}</strong><div style={{ fontSize: '12px', color: '#666' }}>Rp {item.produk.price.toLocaleString('id-ID')} × {item.jumlah}</div></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => updateQuantity(item.produk.id!, item.jumlah - 1)} style={{ width: '30px', height: '30px', background: '#f44336', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                    <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{item.jumlah}</span>
                    <button onClick={() => updateQuantity(item.produk.id!, item.jumlah + 1)} style={{ width: '30px', height: '30px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                    <button onClick={() => removeFromCart(item.produk.id!)} style={{ padding: '5px 10px', background: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#1976D2', marginTop: '5px' }}>Rp {item.subtotal.toLocaleString('id-ID')}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: '#E8F5E9', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold' }}><span>Total:</span><span style={{ color: '#2E7D32' }}>Rp {getTotal().toLocaleString('id-ID')}</span></div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>💳 Metode Pembayaran:</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setPembayaran('Cash')} style={{ flex: 1, padding: '12px', background: pembayaran === 'Cash' ? '#4CAF50' : '#f5f5f5', color: pembayaran === 'Cash' ? 'white' : '#333', border: pembayaran === 'Cash' ? '2px solid #2E7D32' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>💵 Cash</button>
            <button onClick={() => setPembayaran('Credit')} style={{ flex: 1, padding: '12px', background: pembayaran === 'Credit' ? '#FF9800' : '#f5f5f5', color: pembayaran === 'Credit' ? 'white' : '#333', border: pembayaran === 'Credit' ? '2px solid #E65100' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>💳 Credit</button>
          </div>
        </div>

        {pembayaran === 'Cash' && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>💵 Uang Diterima (Rp):</label>
            <input
              type="number"
              inputMode="numeric"
              value={uangMasuk}
              onChange={(e) => setUangMasuk(e.target.value)}
              placeholder="Contoh: 50000"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', padding: '12px', borderRadius: '8px', background: '#f5f5f5', fontWeight: 'bold' }}>
              <span>Kembalian:</span>
              <span style={{ color: uangMasuk !== '' && Number(uangMasuk) < getTotal() ? '#f44336' : '#2E7D32' }}>
                {uangMasuk === '' ? 'Rp 0' : Number(uangMasuk) < getTotal() ? 'Kurang Rp ' + (getTotal() - Number(uangMasuk)).toLocaleString('id-ID') : 'Rp ' + (Number(uangMasuk) - getTotal()).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        )}

        <button onClick={handleCheckout} disabled={cart.length === 0 || loading} style={{ width: '100%', padding: '15px', background: (cart.length === 0 || loading) ? '#ccc' : '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: (cart.length === 0 || loading) ? 'not-allowed' : 'pointer' }}>
          {loading ? '⏳ Memproses...' : '✅ Selesaikan Transaksi'}
        </button>
      </div>
    );
  }

  // Tampilan Detail Toko
  if (selectedToko) {
    const stats = kunjunganStats[selectedToko.idToko] || { totalCash: 0, totalCredit: 0, totalKunjungan: 0 };

    return (
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <button onClick={() => setSelectedToko(null)} style={{ marginBottom: '15px', background: 'none', border: 'none', color: '#1976D2', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>⬅️ Kembali ke Daftar Toko</button>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#1976D2', textAlign: 'center' }}>{selectedToko.nama}</h2>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}><strong>ID:</strong> {selectedToko.idToko}</p>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>📍 {selectedToko.alamat}</p>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>📞 {selectedToko.telepon}</p>
          {selectedToko.lokasi && <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>️ Koordinat: {selectedToko.lokasi}</p>}
          <div style={{ marginTop: '10px', padding: '6px 12px', background: selectedToko.warnaPin, color: 'white', borderRadius: '6px', fontSize: '12px', display: 'inline-block' }}>Area: {selectedToko.folder || 'Default'}</div>
          {selectedToko.hariKunjungan.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {selectedToko.hariKunjungan.map(h => (
                <span key={h} style={{ padding: '3px 8px', background: '#1976D2', color: 'white', borderRadius: '12px', fontSize: '11px' }}>{h}</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {selectedToko.lokasi && <button onClick={() => handleNavigate(selectedToko.lokasi)} style={{ flex: 1, padding: '12px', background: '#4285F4', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>🧭 Navigasi</button>}
          <button onClick={handleStartTransaction} style={{ flex: 1, padding: '12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>🛒 Transaksi</button>
        </div>

        <h3 style={{ color: '#333', borderBottom: '2px solid #1976D2', paddingBottom: '5px' }}>📊 Riwayat Kunjungan</h3>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <div style={{ flex: 1, background: '#E8F5E9', padding: '10px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '12px', color: '#2E7D32' }}>Total Cash</div><div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2E7D32' }}>Rp {stats.totalCash.toLocaleString('id-ID')}</div></div>
          <div style={{ flex: 1, background: '#FFF3E0', padding: '10px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '12px', color: '#E65100' }}>Total Credit</div><div style={{ fontSize: '18px', fontWeight: 'bold', color: '#E65100' }}>Rp {stats.totalCredit.toLocaleString('id-ID')}</div></div>
        </div>

        {stats.totalKunjungan === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Belum ada riwayat kunjungan.</p>
        ) : (
          <p style={{ textAlign: 'center', color: '#666', padding: '10px' }}>Total {stats.totalKunjungan} kunjungan tercatat</p>
        )}
      </div>
    );
  }

  // Tampilan Daftar Toko dengan Tab Planner
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', paddingBottom: '100px' }}>
      <h2 style={{ marginBottom: '20px', color: '#1976D2', textAlign: 'center' }}>🏪 Daftar Kunjungan Toko</h2>
      
      <div style={{ marginBottom: '15px' }}>
        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Cari ID atau Nama Toko..." style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '5px' }}>
          {HARI_LIST.map(hari => {
            const count = hari === 'Semua' ? tokoList.length : tokoPerHari[hari];
            const isOverLimit = hari !== 'Semua' && count > SOFT_LIMIT;
            return (
              <button
                key={hari}
                onClick={() => setFilterHari(hari)}
                style={{
                  padding: '8px 12px',
                  background: filterHari === hari ? '#1976D2' : '#f5f5f5',
                  color: filterHari === hari ? 'white' : '#333',
                  border: isOverLimit ? '2px solid #f44336' : '1px solid #ddd',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontSize: '12px',
                  fontWeight: filterHari === hari ? 'bold' : 'normal'
                }}
              >
                {hari === 'Semua' ? 'Semua' : hari.substring(0, 3)} ({count})
              </button>
            );
          })}
        </div>
        {filterHari !== 'Semua' && tokoPerHari[filterHari] > SOFT_LIMIT && (
          <div style={{ marginTop: '8px', padding: '8px', background: '#ffebee', color: '#c62828', borderRadius: '6px', fontSize: '12px' }}>
            ⚠️ Hari {filterHari} memiliki {tokoPerHari[filterHari]} toko (melebihi batas ideal {SOFT_LIMIT} toko/hari). Pertimbangkan untuk memindahkan beberapa toko ke hari lain.
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
      ) : filteredToko.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <p style={{ fontSize: '48px', margin: 0 }}>🏪</p>
          <p>Tidak ada toko {filterHari !== 'Semua' ? `untuk hari ${filterHari}` : ''}.</p>
          <p style={{ fontSize: '14px' }}>Buka menu "Map Market" untuk menambah toko.</p>
        </div>
      ) : (
        <div>
          {filteredToko.map(toko => {
            const stats = kunjunganStats[toko.idToko] || { totalCash: 0, totalCredit: 0, totalKunjungan: 0 };
            return (
              <div key={toko.idToko} onClick={() => setSelectedToko(toko)} style={{ background: 'white', padding: '15px', borderRadius: '10px', marginBottom: '10px', border: '1px solid #ddd', borderLeft: `6px solid ${toko.warnaPin}`, cursor: 'pointer' }}>
                <h3 style={{ margin: '0 0 5px 0', color: '#1976D2' }}>{toko.nama}</h3>
                <p style={{ margin: '3px 0', fontSize: '12px', color: '#666' }}> {toko.idToko} |  {toko.alamat}</p>
                <p style={{ margin: '3px 0', fontSize: '12px', color: '#666' }}>📞 {toko.telepon}</p>
                {toko.hariKunjungan.length > 0 && (
                  <div style={{ marginTop: '5px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {toko.hariKunjungan.map(h => (
                      <span key={h} style={{ padding: '2px 8px', background: '#1976D2', color: 'white', borderRadius: '10px', fontSize: '10px' }}>{h}</span>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: '#4CAF50' }}>💵 Rp {stats.totalCash.toLocaleString('id-ID')}</span>
                  <span style={{ color: '#FF9800' }}>💳 Rp {stats.totalCredit.toLocaleString('id-ID')}</span>
                </div>
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#1976D2', fontWeight: 'bold' }}>
                  Klik untuk detail & transaksi ➡️
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
