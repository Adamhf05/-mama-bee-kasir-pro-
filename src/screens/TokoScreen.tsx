import { useState, useEffect } from 'react';

interface TokoData {
  nama: string;
  alamat: string;
  telepon: string;
  email: string;
  logo: string;
  lokasi: string;
}

export default function TokoScreen() {
  const [toko, setToko] = useState<TokoData>({
    nama: '',
    alamat: '',
    telepon: '',
    email: '',
    logo: '',
    lokasi: ''
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('tokoData');
    if (saved) {
      setToko(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
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
          alert('Gagal mendapatkan lokasi: ' + error.message);
        }
      );
    } else {
      alert('Browser tidak mendukung geolocation');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px', color: '#1976D2' }}>🏪 Profil Toko</h2>
      
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
          Email
        </label>
        <input
          type="email"
          value={toko.email}
          onChange={(e) => setToko({ ...toko, email: e.target.value })}
          placeholder="email@toko.com"
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
          Lokasi Toko
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={toko.lokasi}
            onChange={(e) => setToko({ ...toko, lokasi: e.target.value })}
            placeholder="Latitude,Longitude"
            readOnly
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              background: '#f5f5f5'
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
            📍 Ambil Lokasi
          </button>
        </div>
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
        💾 Simpan Data Toko
      </button>
    </div>
  );
}
