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

const WARNA_PIN = [
  { value: '#2196F3', label: 'Biru' },
  { value: '#4CAF50', label: 'Hijau' },
  { value: '#F44336', label: 'Merah' },
  { value: '#FF9800', label: 'Orange' },
  { value: '#9C27B0', label: 'Ungu' },
  { value: '#00BCD4', label: 'Cyan' },
  { value: '#E91E63', label: 'Pink' },
];

export default function MapMarketScreen() {
  const [tokoList, setTokoList] = useState<TokoData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [currentToko, setCurrentToko] = useState<TokoData>({
    idToko: '',
    nama: '',
    alamat: '',
    telepon: '',
    lokasi: '',
    warnaPin: '#2196F3'
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tokoMasterData');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTokoList(parsed);
        } else {
          localStorage.removeItem('tokoMasterData');
        }
      }
    } catch (e) {
      console.error('Error loading data:', e);
      localStorage.removeItem('tokoMasterData');
    }
  }, []);

  const handleSave = () => {
    try {
      if (!currentToko.idToko || !currentToko.nama || !currentToko.lokasi) {
        alert('⚠️ ID Toko, Nama, dan Lokasi wajib diisi!');
        return;
      }

      let updatedList;
      if (editId) {
        updatedList = tokoList.map(t => 
          t.idToko === editId ? currentToko : t
        );
        alert('✅ Data toko berhasil diupdate!');
      } else {
        if (tokoList.find(t => t.idToko === currentToko.idToko)) {
          alert('⚠️ ID Toko sudah ada! Gunakan ID yang berbeda.');
          return;
        }
        updatedList = [...tokoList, currentToko];
        alert('✅ Toko baru berhasil ditambahkan!');
      }

      setTokoList(updatedList);
      localStorage.setItem('tokoMasterData', JSON.stringify(updatedList));
      setShowForm(false);
      setEditId(null);
      setCurrentToko({
        idToko: '',
        nama: '',
        alamat: '',
        telepon: '',
        lokasi: '',
        warnaPin: '#2196F3'
      });
    } catch (e) {
      alert('❌ Gagal menyimpan: ' + (e as Error).message);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Yakin hapus toko ini?')) {
      const updated = tokoList.filter(t => t.idToko !== id);
      setTokoList(updated);
      localStorage.setItem('tokoMasterData', JSON.stringify(updated));
    }
  };

  const handleClearAll = () => {
    if (confirm('Hapus SEMUA data toko?')) {
      localStorage.removeItem('tokoMasterData');
      setTokoList([]);
    }
  };

  const handleOpenGoogleMaps = () => {
    Browser.open({ url: 'https://www.google.com/maps' });
    alert('📍 Cara dapat koordinat:\n1. Buka Google Maps\n2. Tekan lama di lokasi toko\n3. Copy koordinat yang muncul\n4. Paste di field "Koordinat" di form ini');
  };

  const handleNavigate = (lokasi: string) => {
    Browser.open({ url: `https://www.google.com/maps/dir/?api=1&destination=${lokasi}` });
  };

  if (showForm) {
    return (
      <div style={{ padding: '20px', paddingBottom: '100px' }}>
        <h2 style={{ color: '#1976D2', textAlign: 'center' }}>
          {editId ? '✏️ Edit Data Toko' : '➕ Tambah Toko Baru'}
        </h2>

        <div style={{ background: '#E3F2FD', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px', color: '#1565C0' }}>
          💡 <strong>Cara Input Lokasi:</strong><br/>
          1. Klik tombol "📍 Buka Google Maps" di bawah<br/>
          2. Cari/tekan lama lokasi toko di Google Maps<br/>
          3. Copy koordinat yang muncul<br/>
          4. Paste di field "Koordinat" di form ini
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>ID Toko (Unik)</label>
          <input 
            type="text" 
            value={currentToko.idToko}
            onChange={(e) => setCurrentToko({...currentToko, idToko: e.target.value})}
            placeholder="Contoh: TOKO-001, BDG-01, KAL-123"
            style={{ width: '100%', padding: '10px', border: '2px solid #1976D2', borderRadius: '8px', boxSizing: 'border-box', background: '#E3F2FD', fontWeight: 'bold' }}
          />
          <small style={{color:'#666'}}>ID unik untuk identifikasi toko (bebas)</small>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Nama Toko</label>
          <input 
            type="text" 
            value={currentToko.nama}
            onChange={(e) => setCurrentToko({...currentToko, nama: e.target.value})}
            placeholder="Masukkan nama toko"
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Alamat</label>
          <textarea 
            value={currentToko.alamat}
            onChange={(e) => setCurrentToko({...currentToko, alamat: e.target.value})}
            placeholder="Alamat lengkap toko"
            rows={2}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>No. Telepon</label>
          <input 
            type="tel" 
            value={currentToko.telepon}
            onChange={(e) => setCurrentToko({...currentToko, telepon: e.target.value})}
            placeholder="08xxxxxxxxxx"
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Koordinat Lokasi (Lat,Lng)</label>
          <input 
            type="text" 
            value={currentToko.lokasi}
            onChange={(e) => setCurrentToko({...currentToko, lokasi: e.target.value})}
            placeholder="-3.3198, 114.5908"
            style={{ width: '100%', padding: '10px', border: '2px solid #FF9800', borderRadius: '8px', boxSizing: 'border-box' }}
          />
          <button
            onClick={handleOpenGoogleMaps}
            style={{ width: '100%', padding: '10px', background: '#4285F4', color: 'white', border: 'none', borderRadius: '8px', marginTop: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
             Buka Google Maps untuk Ambil Koordinat
          </button>
          <small style={{color:'#666', display: 'block', marginTop: '5px'}}>Wajib diisi! Copy dari Google Maps</small>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Warna Pin (7 Pilihan)</label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {WARNA_PIN.map(w => (
              <div key={w.value} style={{ textAlign: 'center' }}>
                <button
                  onClick={() => setCurrentToko({...currentToko, warnaPin: w.value})}
                  style={{
                    width: '50px',
                    height: '50px',
                    background: w.value,
                    border: currentToko.warnaPin === w.value ? '4px solid #000' : '2px solid #ddd',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    transform: currentToko.warnaPin === w.value ? 'scale(1.1)' : 'scale(1)'
                  }}
                  title={w.label}
                />
                <div style={{ fontSize: '10px', marginTop: '3px', color: '#666' }}>{w.label}</div>
              </div>
            ))}
          </div>
          <small style={{color:'#666'}}>Pilih warna pin untuk identifikasi di peta</small>
        </div>

        <div style={{ display: 'flex', gap: '10px', position: 'fixed', bottom: '0', left: '0', right: '0', padding: '10px', background: 'white', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)' }}>
          <button 
            onClick={handleSave}
            style={{ flex: 1, padding: '12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold' }}
          >
            💾 Simpan
          </button>
          <button 
            onClick={() => setShowForm(false)}
            style={{ flex: 1, padding: '12px', background: '#f44336', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold' }}
          >
            Batal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', paddingBottom: '100px' }}>
      <h2 style={{ color: '#1976D2', textAlign: 'center' }}>🗺️ Map Market</h2>
      
      <div style={{ background: '#E3F2FD', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px', color: '#1565C0' }}>
        💡 <strong>Fungsi Map Market:</strong><br/>
        • Tambah toko baru dengan lokasi dari Google Maps<br/>
        • Edit/hapus data toko<br/>
        • Navigasi langsung ke lokasi toko via Google Maps<br/>
        • Data otomatis tersimpan di Menu Toko
      </div>

      <button 
        onClick={() => {
          setCurrentToko({
            idToko: '',
            nama: '',
            alamat: '',
            telepon: '',
            lokasi: '',
            warnaPin: '#2196F3'
          });
          setEditId(null);
          setShowForm(true);
        }}
        style={{ width: '100%', padding: '12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', marginBottom: '15px', fontSize: '16px', fontWeight: 'bold' }}
      >
         Tambah Toko Baru
      </button>

      {tokoList.length > 0 && (
        <div style={{ marginBottom: '15px', padding: '10px', background: '#FFF3E0', borderRadius: '8px', fontSize: '13px' }}>
          📊 Total: <strong>{tokoList.length}</strong> toko tersimpan
        </div>
      )}

      {tokoList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <p style={{ fontSize: '48px', margin: 0 }}>🗺️</p>
          <p>Belum ada toko</p>
          <p style={{ fontSize: '14px' }}>Klik "Tambah Toko Baru" untuk mulai</p>
        </div>
      ) : (
        <div>
          {tokoList.map(toko => (
            <div key={toko.idToko} style={{ background: 'white', padding: '15px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #ddd', borderLeft: `6px solid ${toko.warnaPin}` }}>
              <h3 style={{ margin: '0 0 5px 0', color: '#1976D2' }}>{toko.nama}</h3>
              <p style={{ margin: '3px 0', fontSize: '12px', color: '#666' }}><strong>ID:</strong> {toko.idToko}</p>
              <p style={{ margin: '3px 0', fontSize: '12px', color: '#666' }}>📍 {toko.alamat}</p>
              <p style={{ margin: '3px 0', fontSize: '12px', color: '#666' }}>📞 {toko.telepon}</p>
              <p style={{ margin: '3px 0', fontSize: '12px', color: '#666' }}>🗺️ Koordinat: {toko.lokasi}</p>
              
              <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                <button 
                  onClick={() => handleNavigate(toko.lokasi)}
                  style={{ flex: 2, padding: '8px', background: '#4285F4', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                >
                  🧭 Navigasi Google Maps
                </button>
                <button 
                  onClick={() => { setCurrentToko(toko); setEditId(toko.idToko); setShowForm(true); }}
                  style={{ flex: 1, padding: '8px', background: '#FFC107', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                >
                  ✏️ Edit
                </button>
                <button 
                  onClick={() => handleDelete(toko.idToko)}
                  style={{ flex: 1, padding: '8px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tokoList.length > 0 && (
        <button 
          onClick={handleClearAll}
          style={{ width: '100%', padding: '10px', background: '#ff9800', color: 'white', border: 'none', borderRadius: '8px', marginTop: '20px', fontSize: '12px' }}
        >
          🗑️ Hapus Semua Data
        </button>
      )}
    </div>
  );
}
