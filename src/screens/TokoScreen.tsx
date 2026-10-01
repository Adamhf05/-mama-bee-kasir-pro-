import { useState, useEffect } from 'react';

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

const WARNA_PIN = [
  { value: '#2196F3', label: 'Biru' },
  { value: '#4CAF50', label: 'Hijau' },
  { value: '#F44336', label: 'Merah' },
  { value: '#E91E63', label: 'Pink' },
  { value: '#9C27B0', label: 'Ungu' },
  { value: '#FF9800', label: 'Orange' },
  { value: '#795548', label: 'Coklat' },
  { value: '#607D8B', label: 'Abu-abu' },
];

export default function TokoScreen() {
  const [toko, setToko] = useState<TokoData>({
    idToko: '',
    nama: '',
    alamat: '',
    telepon: '',
    logo: '',
    lokasi: '',
    deskripsi: '',
    folder: 'Default',
    warnaPin: '#2196F3'
  });
  const [saved, setSaved] = useState(false);
  const [folders, setFolders] = useState<string[]>(['Default']);
  const [newFolder, setNewFolder] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);

  useEffect(() => {
    const savedToko = localStorage.getItem('tokoData');
    if (savedToko) {
      setToko(JSON.parse(savedToko));
    } else {
      const autoId = 'TOKO-' + Math.floor(Math.random() * 9000 + 1000);
      setToko(prev => ({ ...prev, idToko: autoId }));
    }

    const savedFolders = localStorage.getItem('tokoFolders');
    if (savedFolders) {
      setFolders(JSON.parse(savedFolders));
    }
  }, []);

  const handleSave = () => {
    if (!toko.nama) {
      alert('Nama toko harus diisi!');
      return;
    }
    localStorage.setItem('tokoData', JSON.stringify(toko));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setToko({ ...toko, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLokasi = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lokasi = `${position.coords.latitude},${position.coords.longitude}`;
          setToko({ ...toko, lokasi });
        },
        (error) => {
          alert('Gagal mendapatkan lokasi: ' + error.message + '\n\nTips: Buka Settings → Apps → Mama Bee Kasir Pro → Permissions → Location → Allow');
        }
      );
    } else {
      alert('Browser tidak mendukung geolocation');
    }
  };

  const handleAddFolder = () => {
    if (newFolder && !folders.includes(newFolder)) {
      const updatedFolders = [...folders, newFolder];
      setFolders(updatedFolders);
      localStorage.setItem('tokoFolders', JSON.stringify(updatedFolders));
      setToko({ ...toko, folder: newFolder });
      setNewFolder('');
      setShowNewFolder(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px', color: '#1976D2' }}> Profil Toko</h2>
      
      {saved && (
        <div style={{
          background: '#4CAF50',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          ✅ Data toko berhasil disimpan!
        </div>
      )}

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          ID Toko (Unik)
        </label>
        <input
          type="text"
          value={toko.idToko}
          onChange={(e) => setToko({ ...toko, idToko: e.target.value })}
          placeholder="TOKO-XXXX"
          style={{
            width: '100%',
            padding: '10px',
            border: '2px solid #1976D2',
            borderRadius: '8px',
            fontSize: '14px',
            background: '#E3F2FD',
            fontWeight: 'bold'
          }}
        />
        <small style={{ color: '#666' }}>ID unik untuk pencarian di Map Market</small>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Nama Toko
        </label>
        <input
          type="text"
          value={toko.nama}
          onChange={(e) => setToko({ ...toko, nama: e.target.value })}
          placeholder="Masukkan nama toko"
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Alamat Toko
        </label>
        <textarea
          value={toko.alamat}
          onChange={(e) => setToko({ ...toko, alamat: e.target.value })}
          placeholder="Masukkan alamat lengkap"
          rows={3}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px',
            resize: 'vertical'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Nomor Telepon
        </label>
        <input
          type="tel"
          value={toko.telepon}
          onChange={(e) => setToko({ ...toko, telepon: e.target.value })}
          placeholder="08xxxxxxxxxx"
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Deskripsi/Catatan
        </label>
        <textarea
          value={toko.deskripsi}
          onChange={(e) => setToko({ ...toko, deskripsi: e.target.value })}
          placeholder="Catatan tambahan tentang toko ini"
          rows={2}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px',
            resize: 'vertical'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Folder/Kategori
        </label>
        {!showNewFolder ? (
          <>
            <select
              value={toko.folder}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  setShowNewFolder(true);
                } else {
                  setToko({ ...toko, folder: e.target.value });
                }
              }}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              {folders.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
              <option value="__new__">+ Buat Folder Baru</option>
            </select>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              placeholder="Nama folder baru"
              style={{
                flex: 1,
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
            <button
              onClick={handleAddFolder}
              style={{
                padding: '10px 20px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              OK
            </button>
            <button
              onClick={() => setShowNewFolder(false)}
              style={{
                padding: '10px 20px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Batal
            </button>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Warna Pin di Peta
        </label>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {WARNA_PIN.map(w => (
            <button
              key={w.value}
              onClick={() => setToko({ ...toko, warnaPin: w.value })}
              style={{
                width: '50px',
                height: '50px',
                background: w.value,
                border: toko.warnaPin === w.value ? '3px solid #000' : '2px solid #ddd',
                borderRadius: '8px',
                cursor: 'pointer',
                transform: toko.warnaPin === w.value ? 'scale(1.1)' : 'scale(1)'
              }}
              title={w.label}
            />
          ))}
        </div>
        <small style={{ color: '#666', display: 'block', marginTop: '8px' }}>
          Warna pin yang akan muncul di Map Market
        </small>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Logo Toko
        </label>
        {toko.logo && (
          <img
            src={toko.logo}
            alt="Logo Toko"
            style={{
              width: '100px',
              height: '100px',
              objectFit: 'cover',
              borderRadius: '8px',
              marginBottom: '10px'
            }}
          />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '8px'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Lokasi Toko (Koordinat)
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={toko.lokasi}
            onChange={(e) => setToko({ ...toko, lokasi: e.target.value })}
            placeholder="Latitude,Longitude"
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
          <button
            onClick={handleLokasi}
            style={{
              padding: '10px 20px',
              background: '#1976D2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
             Ambil Lokasi
          </button>
        </div>
        <small style={{ color: '#666' }}>
          Atau buka Google Maps → tekan lama lokasi → copy koordinat → paste di sini
        </small>
      </div>

      <button
        onClick={handleSave}
        style={{
          width: '100%',
          padding: '12px',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
          Simpan Data Toko
      </button>
    </div>
  );
}
