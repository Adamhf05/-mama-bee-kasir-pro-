import { useState, useEffect } from 'react';
import { Browser } from '@capacitor/browser';

interface Produk {
  id: string;
  nama: string;
  kategori: string;
  harga: number;
  stok: number;
  satuan: string;
  gambar?: string;
}

interface ItemTransaksi {
  produk: Produk;
  jumlah: number;
  subtotal: number;
}

interface Kunjungan {
  tanggal: string;
  tipe: 'Cash' | 'Credit';
  total: number;
  items: ItemTransaksi[];
}

interface TokoData {
  idToko: string;
  nama: string;
  alamat: string;
  telepon: string;
  lokasi: string;
  warnaPin: string;
  folder: string;
  kunjungan: Kunjungan[];
}

export default function TokoScreen() {
  const [tokoList, setTokoList] = useState<TokoData[]>([]);
  const [selectedToko, setSelectedToko] = useState<TokoData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showKasir, setShowKasir] = useState(false);
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [cart, setCart] = useState<ItemTransaksi[]>([]);
  const [pembayaran, setPembayaran] = useState<'Cash' | 'Credit'>('Cash');

  useEffect(() => {
    try {
      const savedList = localStorage.getItem('tokoMasterData');
      if (savedList) {
        setTokoList(JSON.parse(savedList));
      }
      const savedProduk = localStorage.getItem('produkData');
      if (savedProduk) {
        setProdukList(JSON.parse(savedProduk));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  const handleNavigate = (lokasi: string) => {
    Browser.open({ url: `https://www.google.com/maps/dir/?api=1&destination=${lokasi}` });
  };

  const handleStartTransaction = () => {
    setCart([]);
    setPembayaran('Cash');
    setShowKasir(true);
  };

  const addToCart = (produk: Produk) => {
    const existing = cart.find(item => item.produk.id === produk.id);
    if (existing) {
      setCart(cart.map(item => 
        item.produk.id === produk.id 
          ? { ...item, jumlah: item.jumlah + 1, subtotal: (item.jumlah + 1) * item.produk.harga }
          : item
      ));
    } else {
      setCart([...cart, { produk, jumlah: 1, subtotal: produk.harga }]);
    }
  };

  const removeFromCart = (produkId: string) => {
    setCart(cart.filter(item => item.produk.id !== produkId));
  };

  const updateQuantity = (produkId: string, jumlah: number) => {
    if (jumlah <= 0) {
      removeFromCart(produkId);
      return;
    }
    setCart(cart.map(item => 
      item.produk.id === produkId 
        ? { ...item, jumlah, subtotal: jumlah * item.produk.harga }
        : item
    ));
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('⚠️ Keranjang kosong!');
      return;
    }

    const kunjungan: Kunjungan = {
      tanggal: new Date().toLocaleString('id-ID'),
      tipe: pembayaran,
      total: getTotal(),
      items: cart
    };

    const updatedTokoList = tokoList.map(t => 
      t.idToko === selectedToko?.idToko 
        ? { ...t, kunjungan: [...t.kunjungan, kunjungan] }
        : t
    );

    setTokoList(updatedTokoList);
    localStorage.setItem('tokoMasterData', JSON.stringify(updatedTokoList));
    setSelectedToko({ ...selectedToko!, kunjungan: [...selectedToko!.kunjungan, kunjungan] });
    setShowKasir(false);
    setCart([]);
    alert(`✅ Transaksi berhasil!\nTotal: Rp ${getTotal().toLocaleString('id-ID')}\nPembayaran: ${pembayaran}`);
  };

  const filteredToko = tokoList.filter(t =>
    t.idToko.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Halaman Kasir
  if (showKasir && selectedToko) {
    return (
      <div style={{ padding: '20px', paddingBottom: '100px' }}>
        <button 
          onClick={() => setShowKasir(false)}
          style={{ marginBottom: '15px', background: 'none', border: 'none', color: '#1976D2', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ⬅️ Kembali ke Detail Toko
        </button>

        <h2 style={{ color: '#1976D2', textAlign: 'center' }}>🛒 Kasir - {selectedToko.nama}</h2>

        <div style={{ background: '#E3F2FD', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
          <strong>ID:</strong> {selectedToko.idToko} | <strong>Alamat:</strong> {selectedToko.alamat}
        </div>

        <h3 style={{ color: '#333', borderBottom: '2px solid #1976D2', paddingBottom: '5px' }}>📦 Pilih Produk</h3>
        
        {produkList.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Belum ada produk. Tambahkan produk di menu Manajemen Produk.</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
            {produkList.map(produk => (
              <div key={produk.id} style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{produk.nama}</strong>
                  <div style={{ fontSize: '12px', color: '#666' }}>{produk.kategori} • Stok: {produk.stok} {produk.satuan}</div>
                  <div style={{ fontSize: '14px', color: '#1976D2', fontWeight: 'bold' }}>Rp {produk.harga.toLocaleString('id-ID')}</div>
                </div>
                <button 
                  onClick={() => addToCart(produk)}
                  style={{ padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  + Tambah
                </button>
              </div>
            ))}
          </div>
        )}

        <h3 style={{ color: '#333', borderBottom: '2px solid #1976D2', paddingBottom: '5px' }}>🛍️ Keranjang ({cart.length} item)</h3>
        
        {cart.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Keranjang kosong</p>
        ) : (
          <div style={{ marginBottom: '20px' }}>
            {cart.map(item => (
              <div key={item.produk.id} style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{item.produk.nama}</strong>
                    <div style={{ fontSize: '12px', color: '#666' }}>Rp {item.produk.harga.toLocaleString('id-ID')} × {item.jumlah}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={() => updateQuantity(item.produk.id, item.jumlah - 1)} style={{ width: '30px', height: '30px', background: '#f44336', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                    <span style={{ fontWeight: 'bold' }}>{item.jumlah}</span>
                    <button onClick={() => updateQuantity(item.produk.id, item.jumlah + 1)} style={{ width: '30px', height: '30px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                    <button onClick={() => removeFromCart(item.produk.id)} style={{ padding: '5px 10px', background: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#1976D2', marginTop: '5px' }}>Rp {item.subtotal.toLocaleString('id-ID')}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: '#E8F5E9', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold' }}>
            <span>Total:</span>
            <span style={{ color: '#2E7D32' }}>Rp {getTotal().toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>💳 Metode Pembayaran:</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setPembayaran('Cash')}
              style={{ flex: 1, padding: '12px', background: pembayaran === 'Cash' ? '#4CAF50' : '#f5f5f5', color: pembayaran === 'Cash' ? 'white' : '#333', border: pembayaran === 'Cash' ? '2px solid #2E7D32' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
               Cash
            </button>
            <button 
              onClick={() => setPembayaran('Credit')}
              style={{ flex: 1, padding: '12px', background: pembayaran === 'Credit' ? '#FF9800' : '#f5f5f5', color: pembayaran === 'Credit' ? 'white' : '#333', border: pembayaran === 'Credit' ? '2px solid #E65100' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
               Credit
            </button>
          </div>
        </div>

        <button 
          onClick={handleCheckout}
          disabled={cart.length === 0}
          style={{ width: '100%', padding: '15px', background: cart.length === 0 ? '#ccc' : '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: cart.length === 0 ? 'not-allowed' : 'pointer' }}
        >
          ✅ Selesaikan Transaksi
        </button>
      </div>
    );
  }

  // Tampilan Detail Toko
  if (selectedToko) {
    const totalCash = selectedToko.kunjungan.filter(k => k.tipe === 'Cash').reduce((sum, k) => sum + k.total, 0);
    const totalCredit = selectedToko.kunjungan.filter(k => k.tipe === 'Credit').reduce((sum, k) => sum + k.total, 0);

    return (
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <button 
          onClick={() => setSelectedToko(null)}
          style={{ marginBottom: '15px', background: 'none', border: 'none', color: '#1976D2', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ️ Kembali ke Daftar Toko
        </button>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#1976D2', textAlign: 'center' }}>{selectedToko.nama}</h2>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}><strong>ID:</strong> {selectedToko.idToko}</p>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>📍 {selectedToko.alamat}</p>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}> {selectedToko.telepon}</p>
          {selectedToko.lokasi && (
            <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>🗺️ Koordinat: {selectedToko.lokasi}</p>
          )}
          <div style={{ marginTop: '10px', padding: '6px 12px', background: selectedToko.warnaPin, color: 'white', borderRadius: '6px', fontSize: '12px', display: 'inline-block' }}>
            Area: {selectedToko.folder || 'Default'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {selectedToko.lokasi && (
            <button 
              onClick={() => handleNavigate(selectedToko.lokasi)}
              style={{ flex: 1, padding: '12px', background: '#4285F4', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              🧭 Navigasi
            </button>
          )}
          <button 
            onClick={handleStartTransaction}
            style={{ flex: 1, padding: '12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            🛒 Transaksi
          </button>
        </div>

        <h3 style={{ color: '#333', borderBottom: '2px solid #1976D2', paddingBottom: '5px' }}> Riwayat Kunjungan</h3>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <div style={{ flex: 1, background: '#E8F5E9', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#2E7D32' }}>Total Cash</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2E7D32' }}>Rp {totalCash.toLocaleString('id-ID')}</div>
          </div>
          <div style={{ flex: 1, background: '#FFF3E0', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#E65100' }}>Total Credit</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#E65100' }}>Rp {totalCredit.toLocaleString('id-ID')}</div>
          </div>
        </div>

        {selectedToko.kunjungan.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Belum ada riwayat kunjungan.</p>
        ) : (
          <div>
            {selectedToko.kunjungan.map((k, idx) => (
              <div key={idx} style={{ background: '#f9f9f9', padding: '12px', borderRadius: '8px', marginBottom: '8px', borderLeft: `4px solid ${k.tipe === 'Cash' ? '#4CAF50' : '#FF9800'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
                  <span>{k.tanggal}</span>
                  <span style={{ color: k.tipe === 'Cash' ? '#4CAF50' : '#FF9800' }}>{k.tipe}</span>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '5px' }}>Rp {k.total.toLocaleString('id-ID')}</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>{k.items.length} item</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Tampilan Daftar Toko
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px', color: '#1976D2', textAlign: 'center' }}>🏪 Daftar Kunjungan Toko</h2>

      <div style={{ marginBottom: '15px' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari ID atau Nama Toko..."
          style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: '15px', padding: '12px', background: '#E3F2FD', borderRadius: '8px', fontSize: '13px', color: '#1565C0' }}>
        💡 <strong>Info:</strong> Klik nama toko untuk melihat detail, navigasi ke lokasi, dan mulai transaksi. Untuk tambah/edit/hapus toko, gunakan menu <strong>Map Market</strong>.
      </div>

      {filteredToko.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <p style={{ fontSize: '48px', margin: 0 }}>🏪</p>
          <p>Belum ada toko.</p>
          <p style={{ fontSize: '14px' }}>Buka menu "Map Market" untuk menambah toko pertama.</p>
        </div>
      ) : (
        <div>
          {filteredToko.map(toko => (
            <div
              key={toko.idToko}
              onClick={() => setSelectedToko(toko)}
              style={{
                background: 'white',
                padding: '15px',
                borderRadius: '10px',
                marginBottom: '10px',
                border: '1px solid #ddd',
                borderLeft: `6px solid ${toko.warnaPin}`,
                cursor: 'pointer',
              }}
            >
              <h3 style={{ margin: '0 0 5px 0', color: '#1976D2' }}>{toko.nama}</h3>
              <p style={{ margin: '3px 0', fontSize: '12px', color: '#666' }}> {toko.idToko} | 📍 {toko.alamat}</p>
              <p style={{ margin: '3px 0', fontSize: '12px', color: '#666' }}>📞 {toko.telepon}</p>
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#1976D2', fontWeight: 'bold' }}>
                Klik untuk lihat detail & transaksi ➡️
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
