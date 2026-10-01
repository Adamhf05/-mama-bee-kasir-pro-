import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TokoData {
  idToko: string;
  nama: string;
  alamat: string;
  telepon: string;
  logo: string;
  lokasi: string;
  deskripsi: string;
  folder: string;
  warnaPin: string;
}

function createCustomIcon(color: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
}

export default function MapMarketScreen() {
  const [tokoList, setTokoList] = useState<TokoData[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('Semua');
  const [folders, setFolders] = useState<string[]>(['Semua']);
  const [searchTerm, setSearchTerm] = useState('');
  const [center, setCenter] = useState<[number, number]>([-2.5489, 118.0149]);

  useEffect(() => {
    try {
      // Load dari master data (array)
      const savedList = localStorage.getItem('tokoMasterData');
      if (savedList) {
        setTokoList(JSON.parse(savedList));
      }

      const savedFolders = localStorage.getItem('tokoFolders');
      if (savedFolders) {
        const parsed = JSON.parse(savedFolders);
        setFolders(['Semua', ...parsed]);
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCenter([position.coords.latitude, position.coords.longitude]);
          },
          () => {
            setCenter([-2.5489, 118.0149]);
          }
        );
      }
    } catch (error) {
      console.error('Error loading map data:', error);
    }
  }, []);

  const filteredToko = tokoList.filter(t => {
    const matchFolder = selectedFolder === 'Semua' || t.folder === selectedFolder;
    const matchSearch = t.idToko.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       t.nama.toLowerCase().includes(searchTerm.toLowerCase());
    return matchFolder && matchSearch;
  });

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 60px)', width: '100%' }}>
      <MapContainer
        center={center}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {filteredToko.map((toko, index) => {
          if (!toko.lokasi) return null;
          const [lat, lng] = toko.lokasi.split(',').map(Number);
          return (
            <Marker
              key={index}
              position={[lat, lng]}
              icon={createCustomIcon(toko.warnaPin)}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  {toko.logo && (
                    <img 
                      src={toko.logo} 
                      alt="Logo" 
                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }}
                    />
                  )}
                  <h3 style={{ margin: '0 0 5px 0', color: '#1976D2' }}>{toko.nama}</h3>
                  <p style={{ margin: '3px 0', fontSize: '12px', color: '#666' }}>
                    <strong>ID:</strong> {toko.idToko}
                  </p>
                  <p style={{ margin: '3px 0', fontSize: '12px', color: '#666' }}>
                    📍 {toko.alamat}
                  </p>
                  <p style={{ margin: '3px 0', fontSize: '12px', color: '#666' }}>
                    📞 {toko.telepon}
                  </p>
                  {toko.deskripsi && (
                    <p style={{ margin: '3px 0', fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
                      📝 {toko.deskripsi}
                    </p>
                  )}
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '4px 8px', 
                    background: toko.warnaPin, 
                    color: 'white', 
                    borderRadius: '4px', 
                    fontSize: '11px',
                    textAlign: 'center'
                  }}>
                    Folder: {toko.folder}
                  </div>
                  {toko.lokasi && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${toko.lokasi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        marginTop: '8px',
                        padding: '6px',
                        background: '#1976D2',
                        color: 'white',
                        textAlign: 'center',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      🧭 Navigasi
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        right: '10px',
        zIndex: 1000,
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        padding: '10px'
      }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari ID Toko atau Nama..."
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '10px',
        right: '10px',
        zIndex: 1000,
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        padding: '10px'
      }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', color: '#666' }}>
          Filter Folder:
        </div>
        <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '5px' }}>
          {folders.map(folder => (
            <button
              key={folder}
              onClick={() => setSelectedFolder(folder)}
              style={{
                padding: '6px 12px',
                background: selectedFolder === folder ? '#1976D2' : '#f5f5f5',
                color: selectedFolder === folder ? 'white' : '#333',
                border: 'none',
                borderRadius: '15px',
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {folder}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
