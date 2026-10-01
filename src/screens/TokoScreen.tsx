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
  const [tokoList, setTokoList] = useState<TokoData[]>([]);
  const [currentToko, setCurrentToko] = useState<TokoData>({
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
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [folders, setFolders] = useState<string[]>(['Default']);
  const [newFolder, setNewFolder] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);

  useEffect(() => {
    try {
      const savedList = localStorage.getItem('tokoMasterData');
      if (savedList) {
        setTokoList(JSON.parse(savedList));
      }

      const savedFolders = localStorage.getItem('tokoFolders');
      if (savedFolders) {
        setFolders(JSON.parse(savedFolders));
      }

      generateNewId();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  const generateNewId = () => {
    const newId = 'TOKO-' + String(tokoList.length + 1).padStart(4, '0');
    setCurrentToko(prev => ({ ...prev, idToko: newId }));
  };

  const handleSave = () => {
    try {
      if (!currentToko.nama) {
        alert('⚠️ Nama toko harus diisi!');
        return;
      }

      let updatedList;
      if (editId) {
        // Update toko yang sudah ada
        updatedList = tokoList.map(t => 
          t.idToko === editId ? currentToko : t
        );
        alert('✅ Data toko berhasil diupdate!');
      } else {
        // Tambah toko baru
        updatedList = [...tokoList, currentToko];
        alert('✅ Data toko berhasil disimpan!');
      }

      setTokoList(updatedList);
      localStorage.setItem('tokoMasterData', JSON.stringify(updatedList));
      
      // Reset form
      setEditId(null);
      setShowForm(false);
      setCurrentToko({
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
      
      // Generate ID baru untuk toko berikutnya
      setTimeout(() => generateNewId(), 100);
    } catch (error) {
      console.error('Error saving data:', error);
      alert('❌ Gagal menyimpan data: ' + (error as Error).message);
    }
  };

  const handleEdit = (toko: TokoData) => {
    setCurrentToko(toko);
    setEditId(toko.idToko);
    setShowForm(true);
  };

  const handleDelete = (idToko: string) => {
    if (confirm('Yakin ingin menghapus toko ini?')) {
      const updatedList = tokoList.filter(t => t.idToko !== idToko);
      setTokoList(updatedList);
      localStorage.setItem('tokoMasterData', JSON.stringify(updatedList));
      alert('️ Toko berhasil dihapus!');
    }
  };

  const handleCancel = () => {
    setEditId(null);
    setShowForm(false);
    setCurrentToko({
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
    generateNewId();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentToko({ ...currentToko, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLokasi = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lokasi = `${position.coords.latitude},${position.coords.longitude}`;
          setCurrentToko({ ...currentToko, lokasi });
          alert('✅ Lokasi berhasil diambil: ' + lokasi);
        },
        (error) => {
          alert('❌ Gagal mendapatkan lokasi: ' + error.message);
        }
      );
    } else {
      alert(' Browser tidak mendukung geolocation');
    }
  };

  const handleAddFolder = () => {
    if (newFolder && !folders.includes(newFolder)) {
      const updatedFolders = [...folders, newFolder];
      setFolders(updatedFolders);
      localStorage.setItem('tokoFolders', JSON.stringify(updatedFolders));
      setCurrentToko({ ...currentToko, folder: newFolder });
      setNewFolder('');
      setShowNewFolder(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', paddingBottom: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#1976D2' }}> Master Data Toko</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
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
            + Tambah Toko
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0 }}>{editId ? 'Edit Toko' : 'Tambah Toko Baru'}</h3>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              ID Toko (Unik)
            </label>
            <input
              type="text"
              value={currentToko.idToko}
              onChange={(e) => setCurrentToko({ ...currentToko, idToko: e.target.value })}
              placeholder="TOKO-XXXX"
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #1976D2',
                borderRadius: '8px',
                fontSize: '14px',
                background: '#E3F2FD',
                fontWeight: 'bold',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Nama Toko
            </label>
            <input
              type="text"
              value={currentToko.nama}
              onChange={(e) => setCurrentToko({ ...currentToko, nama: e.target.value })}
              placeholder="Masukkan nama toko"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Alamat Toko
            </label>
            <textarea
              value={currentToko.alamat}
              onChange={(e) => setCurrentToko({ ...currentToko, alamat: e.target.value })}
              placeholder="Masukkan alamat lengkap"
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Nomor Telepon
            </label>
            <input
              type="tel"
              value={currentToko.telepon}
              onChange={(e) => setCurrentToko({ ...currentToko, telepon: e.target.value })}
              placeholder="08xxxxxxxxxx"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Deskripsi/Catatan
            </label>
            <textarea
              value={currentToko.deskripsi}
              onChange={(e) => setCurrentToko({ ...currentToko, deskripsi: e.target.value })}
              placeholder="Catatan tambahan tentang toko ini"
              rows={2}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Folder/Kategori
            </label>
            {!showNewFolder ? (
              <select
                value={currentToko.folder}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setShowNewFolder(true);
                  } else {
                    setCurrentToko({ ...currentToko, folder: e.target.value });
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'white',
                  boxSizing: 'border-box'
                }}
              >
                {folders.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
                <option value="__new__">+ Buat Folder Baru</option>
              </select>
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
                  onClick={() => setCurrentToko({ ...currentToko, warnaPin: w.value })}
                  style={{
                    width: '50px',
                    height: '50px',
                    background: w.value,
                    border: currentToko.warnaPin === w.value ? '3px solid #000' : '2px solid #ddd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transform: currentToko.warnaPin === w.value ? 'scale(1.1)' : 'scale(1)'
                  }}
                  title={w.label}
                />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Logo Toko
            </label>
            {currentToko.logo && (
              <img
                src={currentToko.logo}
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
                value={currentToko.lokasi}
                onChange={(e) => setCurrentToko({ ...currentToko, lokasi: e.target.value })}
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
                📍 Ambil Lokasi
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
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
              💾 Simpan
            </button>
            <button
              onClick={handleCancel}
              style={{
                flex: 1,
                padding: '12px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Daftar Toko Tersimpan */}
      <h3 style={{ color: '#1976D2', marginBottom: '15px' }}>
         Daftar Toko ({tokoList.length})
      </h3>
      
      {tokoList.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#999'
        }}>
          <p style={{ fontSize: '48px', margin: 0 }}>🏪</p>
          <p>Belum ada toko tersimpan</p>
          <p style={{ fontSize: '14px' }}>Klik "+ Tambah Toko" untuk menambah toko pertama</p>
        </div>
      ) : (
        <div>
          {tokoList.map(toko => (
            <div
              key={toko.idToko}
              style={{
                background: 'white',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '10px',
                border: '1px solid #ddd',
                borderLeft: `5px solid ${toko.warnaPin}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
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
                    display: 'inline-block'
                  }}>
                    Folder: {toko.folder}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    onClick={() => handleEdit(toko)}
                    style={{
                      padding: '5px 10px',
                      background: '#FFC107',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(toko.idToko)}
                    style={{
                      padding: '5px 10px',
                      background: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
