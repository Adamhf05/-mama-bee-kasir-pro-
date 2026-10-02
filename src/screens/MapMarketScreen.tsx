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
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>
  `;
  
  return L.divIcon({
    className: 'custom-pin-icon',
    html: svg,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36]
  });
}

const parseKoordinat = (lokasi: string): [number, number] | null => {
  if (!lokasi) return null;
  const parts = lokasi.split(',').map(s => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return [parts[0], parts[1]];
  }
  return null;
};

const generateIdToko = (existingIds: string[]): string => {
  const prefix = 'TOKO-';
  let counter = 1;
  let newId = `${prefix}${String(counter).padStart(3, '0')}`;
  
  while (existingIds.includes(newId)) {
    counter++;
    newId = `${prefix}${String(counter).padStart(3, '0')}`;
  }
  
  return newId;
};

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
      const migrated = await TokoRepo.migrateFromLocalStorage();
      if (migrated > 0) {
        alert(`✅ Berhasil migrasi ${migrated} toko dari versi lama!`);
      }

      const toko = await TokoRepo.getAll();
      setTokoList(toko);

      if (toko.length > 0 && toko[0].lokasi) {
        const koordinat = parseKoordinat(toko[0].lokasi);
        if (koordinat) {
          setMapCenter(koordinat);
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
          alert('️ Izin lokasi ditolak. Buka Settings → Apps → Mama Bee Kasir Pro → Permissions → Location → Allow');
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
      
      setCurrentToko(prev => ({
        ...prev,
        lokasi: `${lat}, ${lng}`
      }));
      setMapCenter([lat, lng]);
      setMapZoom(16);
      
      alert(`✅ Lokasi didapat: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch (e) {
      console.error('Geolocation error:', e);
      alert('❌ Gagal mengambil lokasi. Pastikan GPS aktif dan izin diberikan.');
    }
  };

  const handleOpenGoogleMaps = async (lokasi: string) => {
    try {
      await Browser.open({ url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lokasi)}` });
    } catch (e) {
      console.error('Browser open error:', e);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lokasi)}`, '_blank');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentToko.nama || !currentToko.lokasi || !currentToko.idToko) {
      alert('⚠️ ID Toko, Nama Toko, dan Lokasi wajib diisi!');
      return;
    }

    const koordinat = parseKoordinat(currentToko.lokasi);
    if (!koordinat) {
      alert('⚠️ Format koordinat salah! Contoh: -3.3198, 114.5908');
      return;
    }

    // Validasi ID Toko unik (kecuali saat edit toko yang sama)
    const idExists = tokoList.some(t => t.idToko === currentToko.idToko && t.idToko !== editId);
    if (idExists) {
      alert(`⚠️ ID Toko "${currentToko.idToko}" sudah digunakan! Pilih ID lain.`);
      return;
    }

    try {
      const tokoData: SalesToko = {
        idToko: currentToko.idToko,
        nama: currentToko.nama,
        alamat: currentToko.alamat || '',
        telepon: currentToko.telepon || '',
        lokasi: currentToko.lokasi,
        warnaPin: currentToko.warnaPin || '#2196F3',
        folder: currentToko.folder || 'Default',
        hariKunjungan: currentToko.hariKunjungan || [],
        catatan: currentToko.catatan || '',
        createdAt: editId ? (tokoList.find(t => t.idToko === editId)?.createdAt || new Date()) : new Date(),
        updatedAt: new Date()
      };

      if (editId) {
        await TokoRepo.update(tokoData.idToko, tokoData);
        alert('✅ Toko berhasil diupdate!');
      } else {
        await TokoRepo.add(tokoData);
        alert('✅ Toko berhasil disimpan!');
      }

      setShowForm(false);
      setEditId(null);
      setCurrentToko({
        idToko: '', nama: '', alamat: '', telepon: '', lokasi: '', warnaPin: '#2196F3',
        folder: 'Default', hariKunjungan: [], catatan: ''
      });
      loadData();
    } catch (error) {
      console.error('Error saving toko:', error);
      alert('❌ Gagal menyimpan toko');
    }
  };

  const handleEdit = (toko: SalesToko) => {
    setCurrentToko({
      idToko: toko.idToko,
      nama: toko.nama,
      alamat: toko.alamat,
      telepon: toko.telepon,
      lokasi: toko.lokasi,
      warnaPin: toko.warnaPin || '#2196F3',
      folder: toko.folder || 'Default',
      hariKunjungan: toko.hariKunjungan || [],
      catatan: toko.catatan || ''
    });
    setEditId(toko.idToko);
    setShowForm(true);
  };

  const handleDelete = async (idToko: string) => {
    if (confirm('Yakin hapus toko ini?')) {
      try {
        await TokoRepo.delete(idToko);
        loadData();
        alert('✅ Toko berhasil dihapus!');
      } catch (error) {
        console.error('Error deleting toko:', error);
        alert('❌ Gagal menghapus toko');
      }
    }
  };

  const toggleHari = (hari: string) => {
    const currentHari = currentToko.hariKunjungan || [];
    const newHari = currentHari.includes(hari)
      ? currentHari.filter(h => h !== hari)
      : [...currentHari, hari];
    setCurrentToko({ ...currentToko, hariKunjungan: newHari });
  };

  const handleAddNew = () => {
    const newId = generateIdToko(tokoList.map(t => t.idToko));
    setCurrentToko({ 
      idToko: newId, 
      nama: '', 
      alamat: '', 
      telepon: '', 
      lokasi: '', 
      warnaPin: '#2196F3', 
      folder: 'Default', 
      hariKunjungan: [], 
      catatan: '' 
    });
    setEditId(null);
    setShowForm(true);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {tokoList.map(toko => {
            const koordinat = parseKoordinat(toko.lokasi);
            if (!koordinat) return null;
            
            return (
              <Marker
                key={toko.idToko}
                position={koordinat}
                icon={createCustomIcon(toko.warnaPin || '#2196F3')}
              >
                <Popup>
                  <div style={{ minWidth: '200px' }}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#1976D2', fontSize: '16px' }}>{toko.nama}</h3>
                    <p style={{ margin: '4px 0', fontSize: '11px', color: '#999' }}>ID: {toko.idToko}</p>
                    {toko.alamat && <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>📍 {toko.alamat}</p>}
                    {toko.telepon && <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>📞 {toko.telepon}</p>}
                    {toko.hariKunjungan && toko.hariKunjungan.length > 0 && (
                      <p style={{ margin: '4px 0', fontSize: '12px', color: '#1976D2', fontWeight: 'bold' }}>
                        📅 {toko.hariKunjungan.join(', ')}
                      </p>
                    )}
                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleEdit(toko)}
                        style={{ flex: 1, padding: '6px', background: '#1976D2', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(toko.idToko)}
                        style={{ flex: 1, padding: '6px', background: '#F44336', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        🗑️ Hapus
                      </button>
                      {toko.lokasi && (
                        <button
                          onClick={() => handleOpenGoogleMaps(toko.lokasi)}
                          style={{ flex: '1 1 100%', padding: '6px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', marginTop: '4px' }}
                        >
                          🗺️ Buka di Google Maps
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div style={{ background: 'white', padding: '12px', borderTop: '1px solid #ddd', textAlign: 'center', fontSize: '14px', color: '#333' }}>
         Total: <strong>{tokoList.length}</strong> toko tersimpan
      </div>

      <button
        onClick={handleAddNew}
        style={{
          position: 'absolute',
          bottom: '80px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: '#1976D2',
          color: 'white',
          border: 'none',
          fontSize: '32px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
      >
        +
      </button>

      {showForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto'
        }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '25px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#1976D2', textAlign: 'center', marginBottom: '20px' }}>
              {editId ? '✏️ Edit Toko' : '➕ Tambah Toko Baru'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>ID Toko *</label>
                <input
                  type="text"
                  required
                  value={currentToko.idToko}
                  onChange={(e) => setCurrentToko({ ...currentToko, idToko: e.target.value.toUpperCase() })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: '#f5f5f5', fontWeight: 'bold' }}
                  placeholder="TOKO-001"
                />
                <small style={{ fontSize: '11px', color: '#666' }}>Auto-generate, bisa diubah manual. Harus unik!</small>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Nama Toko *</label>
                <input
                  type="text"
                  required
                  value={currentToko.nama}
                  onChange={(e) => setCurrentToko({ ...currentToko, nama: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  placeholder="Contoh: Toko Sejahtera"
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Alamat</label>
                <textarea
                  value={currentToko.alamat}
                  onChange={(e) => setCurrentToko({ ...currentToko, alamat: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', minHeight: '60px', boxSizing: 'border-box' }}
                  placeholder="Alamat lengkap toko"
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>No. Telepon</label>
                <input
                  type="tel"
                  value={currentToko.telepon}
                  onChange={(e) => setCurrentToko({ ...currentToko, telepon: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  placeholder="08xxxxxxxxxx"
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Koordinat Lokasi (Lat, Lng) *</label>
                <input
                  type="text"
                  required
                  value={currentToko.lokasi}
                  onChange={(e) => setCurrentToko({ ...currentToko, lokasi: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '2px solid #FF9800', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  placeholder="-3.3198, 114.5908"
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={handleGetCurrentLocation} style={{ padding: '10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                    📍 Ambil GPS
                  </button>
                  <button type="button" onClick={() => Browser.open({ url: 'https://www.google.com/maps' })} style={{ padding: '10px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                    🗺️ Google Maps
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '10px', textAlign: 'center' }}>Warna Pin (7 Pilihan)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
                  {WARNA_PIN.map(warna => (
                    <div key={warna.value} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div
                        onClick={() => setCurrentToko({ ...currentToko, warnaPin: warna.value })}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: warna.value,
                          border: currentToko.warnaPin === warna.value ? '3px solid #333' : '2px solid #ddd',
                          cursor: 'pointer',
                          boxShadow: currentToko.warnaPin === warna.value ? '0 0 0 2px white, 0 0 0 4px #333' : 'none'
                        }}
                        title={warna.label}
                      />
                      <span style={{ fontSize: '10px', color: '#666' }}>{warna.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '10px', textAlign: 'center' }}>📅 Hari Kunjungan</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {HARI_LIST.map(hari => (
                    <button
                      key={hari}
                      type="button"
                      onClick={() => toggleHari(hari)}
                      style={{
                        padding: '8px 4px',
                        background: (currentToko.hariKunjungan || []).includes(hari) ? '#1976D2' : 'white',
                        color: (currentToko.hariKunjungan || []).includes(hari) ? 'white' : '#333',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: (currentToko.hariKunjungan || []).includes(hari) ? 'bold' : 'normal',
                        cursor: 'pointer'
                      }}
                    >
                      {hari}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button type="submit" style={{ padding: '14px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                  💾 Simpan
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} style={{ padding: '14px', background: '#F44336', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
