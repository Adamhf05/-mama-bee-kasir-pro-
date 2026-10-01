import { useState, useEffect } from 'react';

interface Kunjungan {
  tanggal: string;
  tipe: 'Cash' | 'Credit';
  nominal: number;
  catatan: string;
}

interface TokoData {
  idToko: string;
  nama: string;
  alamat: string;
  telepon: string;
  lokasi: string;
  folder: string;
  warnaPin: string;
  kunjungan: Kunjungan[];
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
    alert('🚀 Fitur Transaksi (Kasir & Produk) akan segera terhubung di sini!\n\nNanti sales bisa pilih barang, hitung total, dan pilih Cash/Credit.');
    // Nanti di Milestone 4, ini akan redirect ke halaman Kasir dengan ID toko ini
  };

  const filteredToko = tokoList.filter(t =>
    t.idToko.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- TAMPILAN DETAIL TOKO ---
  if (selectedToko) {
    const totalCash = selectedToko.kunjungan.filter(k => k.tipe === 'Cash').reduce((sum, k) => sum + k.nominal, 0);
    const totalCredit = selectedToko.kunjungan.filter(k => k.tipe === 'Credit').reduce((sum, k) => sum + k.nominal, 0);

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
          <div style={{ marginTop: '10px', padding: '6px 12px', background: selectedToko.warnaPin, color: 'white', borderRadius: '6px', fontSize: '12px', display: 'inline-block' }}>
            Area: {selectedToko.folder}
          </div>
        </div>

        <button 
          onClick={handleStartTransaction}
          style={{ width: '100%', padding: '15px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
        >
          🛒 MULAI TRANSAKSI
        </button>

        <h3 style={{ color: '#333', borderBottom: '2px solid #1976D2', paddingBottom: '5px' }}>📊 Riwayat Kunjungan</h3>
        
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
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '5px' }}>Rp {k.nominal.toLocaleString('id-ID')}</div>
                {k.catatan && <div style={{ fontSize: '12px', color: '#666', marginTop: '5px', fontStyle: 'italic' }}>📝 {k.catatan}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- TAMPILAN DAFTAR TOKO ---
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px', color: '#1976D2' }}>🏪 Daftar Kunjungan Toko</h2>

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
        💡 <strong>Info:</strong> Klik nama toko untuk melihat detail, riwayat Cash/Credit, dan mulai transaksi. Untuk tambah/hapus toko, gunakan menu <strong>Map Market</strong>.
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
                transition: 'transform 0.1s',
              }}
            >
              <h3 style={{ margin: '0 0 5px 0', color: '#1976D2' }}>{toko.nama}</h3>
              <p style={{ margin: '3px 0', fontSize: '12px', color: '#666' }}>🆔 {toko.idToko} | 📍 {toko.alamat}</p>
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
