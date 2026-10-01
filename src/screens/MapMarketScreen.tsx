import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Browser } from '@capacitor/browser';
import { Geolocation } from '@capacitor/geolocation';
import { TokoRepo } from '../data/repositories/TokoRepo';
import type { SalesToko } from '../data/database';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const WARNA_PIN = [
  { value: '#2196F3', label: 'Biru' },
  { value: '#4CAF50', label: 'Hijau' },
  { value: '#F44336', label: 'Merah' },
  { value: '#FF9800', label: 'Orange' },
  { value: '#9C27B0', label: 'Ungu' },
  { value: '#00BCD4', label: 'Cyan' },
  { value: '#E91E63', label: 'Pink' },
];

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

function createCustomIcon(color: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
}

export default function MapMarketScreen() {
  const [tokoList, setTokoList] = useState<SalesToko[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [currentToko, setCurrentToko] = useState<Partial<SalesToko>>({
    idToko: '', nama: '', alamat: '', telepon: '', lokasi: '', warnaPin: '#2196F3',
    folder: 'Default', hariKunjungan: [], catatan: ''
  });
  const [mapCenter, setMapCenter] = useState<[number, number]>([-3.3198, 114.5908]);
  const [mapZoom, setMapZoom] = useState(13);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Migrasi dari localStorage jika ada
      const migrated = await TokoRepo.migrateFromLocalStorage();
      if (migrated > 0) {
        alert(`✅ Berhasil migrasi ${migrated} toko dari versi lama ke database baru!`);
      }
      
      const toko = await TokoRepo.getAll();
      setTokoList(toko);
      
      if (toko.length > 0 && toko[0].lokasi) {
        const [lat, lng] = toko[0].lokasi.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          setMapCenter([lat, lng]);
        }
      }
    } catch (e) {
      console.error('Error loading data:', e);
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      const status = await Geolocation.checkPermissions();
      if (status.location !== 'granted') {
        const result = await Geolocation.requestPermissions();
        if (result.location !== 'granted') {
          alert('⚠️ Izin lokasi ditolak. Buka Settings → Apps → Mama Bee Kasir Pro → Permissions → Location → Allow');
          return false;
        }
      }
      return true;
    } catch (e) {
      console.error('Permission error:', e);
      return false;
    }
  };

  const handleGetCurrentLocation = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return;

      alert('📍 Mengambil lokasi saat ini... Mohon tunggu.');
      
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
      
      const lat = coordinates.coords.latitude;
      const lng = coordinates.coords.longitude;
      const lokasiStr = `${lat}, ${lng}`;
      
      setCurrentToko({...currentToko, lokasi: lokasiStr});
      setMapCenter([lat, lng]);
      setMapZoom(16);
      alert(`✅ Lokasi berhasil didapat!\n${lokasiStr}`);
    } catch (error) {
      console.error('Geolocation error:', error);
      alert('❌ Gagal mendapatkan lokasi.\n\nPastikan:\n1. GPS aktif di HP\n2. Izin lokasi diberikan\n3. Ada sinyal GPS yang cukup');
    }
  };

  const toggleHari = (hari: string) => {
    const current = currentToko.hariKunjungan || [];
    if (current.includes(hari)) {
      setCurrentToko({...currentToko, hariKunjungan: current.filter(h => h !== hari)});
    } else {
      setCurrentToko({...currentToko, hariKunjungan: [...current, hari]});
    }
  };

  const handleSave = async () => {
    try {
      if (!currentToko.idToko || !currentToko.nama || !currentToko.lokasi) {
        alert('⚠️ ID Toko, Nama, dan Lokasi wajib diisi!');
        return;
      }

      if (editId) {
        await TokoRepo.update(editId, currentToko);
        alert('✅ Data toko berhasil diupdate!');
      } else {
        const existing = await TokoRepo.getById(currentToko.idToko!);
        if (existing) {
          alert('⚠️ ID Toko sudah ada! Gunakan ID yang berbeda.');
          return;
        }
        await TokoRepo.add({
          idToko: currentToko.idToko!,
          nama: currentToko.nama!,
          alamat: currentToko.alamat || '',
          telepon: currentToko.telepon || '',
          lokasi: currentToko.lokasi!,
          warnaPin: currentToko.warnaPin || '#2196F3',
          folder: currentToko.folder || 'Default',
          hariKunjungan: currentToko.hariKunjungan || [],
          catatan: currentToko.catatan || '',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        alert('✅ Toko baru berhasil ditambahkan!');
      }

      await loadData();
      setShowForm(false);
      setEditId(null);
      setCurrentToko({
        idToko: '', nama: '', alamat: '', telepon: '', lokasi: '', warnaPin: '#2196F3',
        folder: 'Default', hariKunjungan: [], catatan: ''
      });
    } catch (e) {
      alert('❌ Gagal menyimpan: ' + (e as Error).message);
    }
  };

  const handleDelete = async (idToko: string) => {
    if (confirm('Yakin hapus toko ini? Semua riwayat kunjungan juga akan dihapus.')) {
      await TokoRepo.delete(idToko);
      await loadData();
    }
  };

  const handleClearAll = async () => {
    if (confirm('Hapus SEMUA data toko? Tindakan ini tidak bisa dibatalkan!')) {
      for (const toko of tokoList) {
        await TokoRepo.delete(toko.idToko);
      }
      await loadData();
    }
  };

  const handleOpenGoogleMaps = () => {
    Browser.open({ url: 'https://www.google.com/maps' });
    alert('📍 Cara dapat koordinat:\n1. Buka Google Maps\n2. Tekan lama di lokasi toko\n3. Copy koordinat yang muncul\n4. Paste di field "Koordinat"');
  };

  const handleNavigate = (lokasi: string) => {
    Browser.open({ url: `https://www.google.com/maps/dir/?api=1&destination=${lokasi}` });
  };

  // Form Tambah/Edit Toko
  if (showForm) {
    return (
      <div style={{ padding: '20px', paddingBottom: '100px', minHeight: '100vh', background: '#f5f5f5' }}>
        <h2 style={{ color: '#1976D2', textAlign: 'center', marginTop: '10px' }}>
          {editId ? '✏️ Edit Data Toko' : '➕ Tambah Toko Baru'}
        </h2>

        <div style={{ background: '#E3F2FD', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px', color: '#1565C0' }}>
          💡 <strong>Cara Input Lokasi:</strong><br/>
          • Klik "📍 Ambil Lokasi Saat Ini" untuk GPS otomatis<br/>
          • Atau buka Google Maps → tekan lama lokasi → copy koordinat
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>ID Toko (Unik)</label>
          <input 
            type="text" 
            value={currentToko.idToko || ''}
            onChange={(e) => setCurrentToko({...currentToko, idToko: e.target.value})}
            placeholder="Contoh: TOKO-001, BDG-01"
            style={{ width: '100%', padding: '10px', border: '2px solid #1976D2', borderRadius: '8px', boxSizing: 'border-box', background: '#E3F2FD', fontWeight: 'bold' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Nama Toko</label>
          <input 
            type="text" 
            value={currentToko.nama || ''}
            onChange={(e) => setCurrentToko({...currentToko, nama: e.target.value})}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Alamat</label>
          <textarea 
            value={currentToko.alamat || ''}
            onChange={(e) => setCurrentToko({...currentToko, alamat: e.target.value})}
            rows={2}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>No. Telepon</label>
          <input 
            type="tel" 
            value={currentToko.telepon || ''}
            onChange={(e) => setCurrentToko({...currentToko, telepon: e.target.value})}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Koordinat Lokasi (Lat,Lng)</label>
          <input 
            type="text" 
            value={currentToko.lokasi || ''}
            onChange={(e) => setCurrentToko({...currentToko, lokasi: e.target.value})}
            placeholder="-3.3198, 114.5908"
            style={{ width: '100%', padding: '10px', border: '2px solid #FF9800', borderRadius: '8px', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button onClick={handleGetCurrentLocation} style={{ flex: 1, padding: '12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>📍 Ambil Lokasi (GPS)</button>
            <button onClick={handleOpenGoogleMaps} style={{ flex: 1, padding: '12px', background: '#4285F4', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>🗺️ Google Maps</button>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Warna Pin (7 Pilihan)</label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {WARNA_PIN.map(w => (
              <div key={w.value} style={{ textAlign: 'center' }}>
                <button onClick={() => setCurrentToko({...currentToko, warnaPin: w.value})} style={{ width: '50px', height: '50px', background: w.value, border: currentToko.warnaPin === w.value ? '4px solid #000' : '2px solid #ddd', borderRadius: '50%', cursor: 'pointer', transform: currentToko.warnaPin === w.value ? 'scale(1.1)' : 'scale(1)' }} />
                <div style={{ fontSize: '10px', marginTop: '3px', color: '#666' }}>{w.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>📅 Hari Kunjungan (Pilih minimal 1)</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {HARI_LIST.map(hari => {
              const selected = (currentToko.hariKunjungan || []).includes(hari);
              return (
                <button key={hari} onClick={() => toggleHari(hari)} style={{ padding: '10px', background: selected ? '#1976D2' : '#f5f5f5', color: selected ? 'white' : '#333', border: selected ? '2px solid #0D47A1' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontWeight: selected ? 'bold' : 'normal', fontSize: '12px' }}>
                  {hari.substring(0, 3)} {selected ? '✓' : ''}
                </button>
              );
            })}
          </div>
          <small style={{color:'#666', display: 'block', marginTop: '5px'}}>Pilih hari kapan sales akan kunjungi toko ini</small>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Area / Folder</label>
          <input 
            type="text" 
            value={currentToko.folder || ''}
            onChange={(e) => setCurrentToko({...currentToko, folder: e.target.value})}
            placeholder="Contoh: Area Utara, Zona A"
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', position: 'fixed', bottom: '0', left: '0', right: '0', padding: '10px', background: 'white', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)' }}>
          <button onClick={handleSave} style={{ flex: 1, padding: '12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold' }}>💾 Simpan</button>
          <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '12px', background: '#f44336', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold' }}>Batal</button>
        </div>
      </div>
    );
  }

  // Tampilan Utama: Peta + Daftar Toko
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      <div style={{ padding: '15px 10px 10px 10px', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 10 }}>
        <h2 style={{ color: '#1976D2', textAlign: 'center', margin: '0 0 10px 0', fontSize: '20px' }}>🗺️ Map Market</h2>
        <button 
          onClick={() => {
            setCurrentToko({ idToko: '', nama: '', alamat: '', telepon: '', lokasi: '', warnaPin: '#2196F3', folder: 'Default', hariKunjungan: [], catatan: '' });
            setEditId(null);
            setShowForm(true);
          }}
          style={{ width: '100%', padding: '12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold' }}
        >
          ➕ Tambah Toko Baru
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {tokoList.map((toko, idx) => {
            if (!toko.lokasi) return null;
            const [lat, lng] = toko.lokasi.split(',').map(Number);
            if (isNaN(lat) || isNaN(lng)) return null;
            return (
              <Marker key={idx} position={[lat, lng]} icon={createCustomIcon(toko.warnaPin)}>
                <Popup>
                  <div style={{ minWidth: '180px' }}>
                    <h3 style={{ margin: '0 0 5px 0', color: '#1976D2' }}>{toko.nama}</h3>
                    <p style={{ margin: '3px 0', fontSize: '12px' }}><strong>ID:</strong> {toko.idToko}</p>
                    <p style={{ margin: '3px 0', fontSize: '12px' }}>📍 {toko.alamat}</p>
                    <p style={{ margin: '3px 0', fontSize: '12px' }}>📞 {toko.telepon}</p>
                    {toko.hariKunjungan.length > 0 && (
                      <div style={{ marginTop: '5px', display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                        {toko.hariKunjungan.map(h => (
                          <span key={h} style={{ padding: '2px 6px', background: '#1976D2', color: 'white', borderRadius: '8px', fontSize: '10px' }}>{h.substring(0, 3)}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                      <button onClick={() => handleNavigate(toko.lokasi)} style={{ flex: 1, padding: '6px', background: '#4285F4', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>🧭 Navigasi</button>
                      <button onClick={() => { setCurrentToko(toko); setEditId(toko.idToko); setShowForm(true); }} style={{ flex: 1, padding: '6px', background: '#FFC107', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>✏️ Edit</button>
                      <button onClick={() => handleDelete(toko.idToko)} style={{ padding: '6px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>🗑️</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div style={{ padding: '10px', background: 'white', boxShadow: '0 -2px 4px rgba(0,0,0,0.1)', zIndex: 10 }}>
        <div style={{ textAlign: 'center', fontSize: '13px', color: '#666', marginBottom: '5px' }}>
          📊 Total: <strong>{tokoList.length}</strong> toko tersimpan
        </div>
        {tokoList.length > 0 && (
          <button onClick={handleClearAll} style={{ width: '100%', padding: '8px', background: '#ff9800', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px' }}>🗑️ Hapus Semua Data</button>
        )}
      </div>
    </div>
  );
}
