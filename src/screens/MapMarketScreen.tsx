import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TokoData {
  idToko: string;
  nama: string;
  alamat: string;
  telepon: string;
  lokasi: string;
  folder: string;
  warnaPin: string;
  kunjungan: any[];
}

const WARNA_PIN = [
  { value: '#2196F3', label: 'Biru' }, { value: '#4CAF50', label: 'Hijau' },
  { value: '#F44336', label: 'Merah' }, { value: '#FF9800', label: 'Orange' },
];

function createCustomIcon(color: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30]
  });
}

export default function MapMarketScreen() {
  const [tokoList, setTokoList] = useState<TokoData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [currentToko, setCurrentToko] = useState<any>({ idToko: '', nama: '', alamat: '', telepon: '', lokasi: '', folder: 'Default', warnaPin: '#2196F3', kunjungan: [] });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const savedList = localStorage.getItem('tokoMasterData');
    if (savedList) setTokoList(JSON.parse(savedList));
  }, []);

  const handleSave = () => {
    if (!currentToko.nama || !currentToko.lokasi) {
      alert('⚠️ Nama dan Lokasi (Koordinat) wajib diisi!');
      return;
    }
    let updatedList;
    if (editId) {
      updatedList = tokoList.map(t => t.idToko === editId ? { ...currentToko, kunjungan: t.kunjungan } : t);
    } else {
      const newId = 'TOKO-' + String(tokoList.length + 1).padStart(4, '0');
      updatedList = [...tokoList, { ...currentToko, idToko: newId, kunjungan: [] }];
    }
    setTokoList(updatedList);
    localStorage.setItem('tokoMasterData', JSON.stringify(updatedList));
    setShowForm(false);
    setEditId(null);
    alert('✅ Data toko berhasil disimpan di Peta!');
  };

  const handleDelete = (id: string) => {
    if (confirm('Yakin hapus toko ini dari peta? (Status menjadi Inactive)')) {
      const updated = tokoList.filter(t => t.idToko !== id);
      setTokoList(updated);
      localStorage.setItem('tokoMasterData', JSON.stringify(updated));
    }
  };

  const filteredToko = tokoList.filter(t => t.nama.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 60px)', width: '100%' }}>
      <MapContainer center={[-2.5489, 118.0149]} zoom={5} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {filteredToko.map((toko, idx) => {
          if (!toko.lokasi) return null;
          const [lat, lng] = toko.lokasi.split(',').map(Number);
          return (
            <Marker key={idx} position={[lat, lng]} icon={createCustomIcon(toko.warnaPin)}>
              <Popup>
                <div style={{ minWidth: '180px' }}>
                  <h3 style={{ margin: '0 0 5px 0', color: '#1976D2' }}>{toko.nama}</h3>
                  <p style={{ margin: '3px 0', fontSize: '12px' }}>📍 {toko.alamat}</p>
                  <p style={{ margin: '3px 0', fontSize: '12px' }}>📞 {toko.telepon}</p>
                  <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                    <button onClick={() => { setCurrentToko(toko); setEditId(toko.idToko); setShowForm(true); }} style={{ flex: 1, padding: '6px', background: '#FFC107', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✏️ Edit</button>
                    <button onClick={() => handleDelete(toko.idToko)} style={{ flex: 1, padding: '6px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🗑️ Hapus</button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', zIndex: 1000, background: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', padding: '10px' }}>
        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Cari toko di peta..." style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }} />
      </div>

      {!showForm && (
        <button onClick={() => { setCurrentToko({ idToko: '', nama: '', alamat: '', telepon: '', lokasi: '', folder: 'Default', warnaPin: '#2196F3', kunjungan: [] }); setEditId(null); setShowForm(true); }} style={{ position: 'absolute', bottom: '30px', right: '20px', zIndex: 1000, padding: '15px 25px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
          ➕ Tambah Toko
        </button>
      )}

      {showForm && (
        <div style={{ position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', background: 'white', zIndex: 2000, overflowY: 'auto', padding: '20px' }}>
          <h2 style={{ color: '#1976D2' }}>{editId ? 'Edit Data Toko' : 'Tambah Toko Baru'}</h2>
          <div style={{ marginBottom: '15px' }}><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Nama Toko</label><input type="text" value={currentToko.nama} onChange={(e) => setCurrentToko({...currentToko, nama: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' }} /></div>
          <div style={{ marginBottom: '15px' }}><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Alamat</label><textarea value={currentToko.alamat} onChange={(e) => setCurrentToko({...currentToko, alamat: e.target.value})} rows={2} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' }} /></div>
          <div style={{ marginBottom: '15px' }}><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>No. Telepon</label><input type="tel" value={currentToko.telepon} onChange={(e) => setCurrentToko({...currentToko, telepon: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' }} /></div>
          <div style={{ marginBottom: '15px' }}><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Koordinat (Lat,Lng)</label><input type="text" value={currentToko.lokasi} onChange={(e) => setCurrentToko({...currentToko, lokasi: e.target.value})} placeholder="-3.3198, 114.5908" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' }} /><small style={{color:'#666'}}>Copy dari Google Maps</small></div>
          <div style={{ marginBottom: '15px' }}><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Warna Pin</label><div style={{ display: 'flex', gap: '10px' }}>{WARNA_PIN.map(w => (<button key={w.value} onClick={() => setCurrentToko({...currentToko, warnaPin: w.value})} style={{ width: '40px', height: '40px', background: w.value, border: currentToko.warnaPin === w.value ? '3px solid #000' : '2px solid #ddd', borderRadius: '50%', cursor: 'pointer' }} />))}</div></div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button onClick={handleSave} style={{ flex: 1, padding: '12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>💾 Simpan</button>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '12px', background: '#f44336', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}
