import { useState, useEffect } from 'react';
import { Browser } from '@capacitor/browser';

interface TokoData {
  idToko: string;
  nama: string;
  alamat: string;
  telepon: string;
  lokasi: string;
  warnaPin: string;
}

export default function TokoScreen() {
  const [tokoList, setTokoList] = useState<TokoData[]>([]);
  const [selectedToko, setSelectedToko] = useState<TokoData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    try {
      const savedList = localStorage.getItem('tokoMasterData');
      if (savedList) {
        setTokoList(JSON.parse(savedList));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  const handleStartTransaction = () => {
    alert('🚀 Fitur Transaksi (Kasir & Produk) akan segera terhubung!\n\nNanti sales bisa pilih barang, hitung total, dan pilih Cash/Credit.');
  };

  const handleNavigate = (lokasi: string) => {
    Browser.open({ url: `https://www.google.com/maps/dir/?api=1&destination=${lokasi}` });
  };

  const filteredToko = tokoList.filter(t =>
    t.idToko.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedToko) {
    return (
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <button 
          onClick={() => setSelectedToko(null)}
          style={{ marginBottom: '15px', background: 'none', border: 'none', color: '#1976D2', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ⬅️ Kembali ke Daftar Toko
        </button>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#1976D2' }}>{selectedToko.nama}</h2>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}><strong>ID:</strong> {selectedToko.idToko}</p>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>📍 {selectedToko.alamat}</p>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>📞 {selectedToko.telepon}</p>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>🗺️ Koordinat: {selectedToko.lokasi}</p>
          <div style={{ marginTop: '10px', padding: '6px 12px', background: selectedToko.warnaPin, color: 'white', borderRadius: '6px', fontSize: '12px', display: 'inline-block' }}>
            Warna Pin: {selectedToko.warnaPin}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={() => handleNavigate(selectedToko.lokasi)}
            style={{ flex: 1, padding: '12px', background: '#4285F4', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            🧭 Navigasi
          </button>
          <button 
            onClick={handleStartTransaction}
            style={{ flex: 1, padding: '12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            🛒 Transaksi
          </button>
        </div>

        <h3 style={{ color: '#333', borderBottom: '2px solid #1976D2', paddingBottom: '5px' }}>📊 Riwayat Kunjungan</h3>
        <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Belum ada riwayat kunjungan.</p>
      </div>
    );
  }

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
          <p style={{ fontSize: '48px', margin: 0 }}></p>
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
              <p style={{ margin: '3px 0', fontSize: '12px', color: '#666' }}> {toko.idToko} |  {toko.alamat}</p>
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
