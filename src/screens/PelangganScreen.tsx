import { useState, useEffect } from 'react';

interface Pelanggan {
  id: string;
  nama: string;
  telepon: string;
  alamat: string;
  catatan: string;
}

export default function PelangganScreen() {
  const [pelanggan, setPelanggan] = useState<Pelanggan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    telepon: '',
    alamat: '',
    catatan: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('pelangganData');
    if (saved) {
      setPelanggan(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    let updatedPelanggan;
    if (editId) {
      updatedPelanggan = pelanggan.map(p =>
        p.id === editId ? { ...formData, id: editId } : p
      );
    } else {
      updatedPelanggan = [...pelanggan, { ...formData, id: Date.now().toString() }];
    }
    setPelanggan(updatedPelanggan);
    localStorage.setItem('pelangganData', JSON.stringify(updatedPelanggan));
    resetForm();
  };

  const handleEdit = (p: Pelanggan) => {
    setFormData({
      nama: p.nama,
      telepon: p.telepon,
      alamat: p.alamat,
      catatan: p.catatan
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus pelanggan ini?')) {
      const updated = pelanggan.filter(p => p.id !== id);
      setPelanggan(updated);
      localStorage.setItem('pelangganData', JSON.stringify(updated));
    }
  };

  const resetForm = () => {
    setFormData({ nama: '', telepon: '', alamat: '', catatan: '' });
    setEditId(null);
    setShowForm(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#1976D2' }}> Manajemen Pelanggan</h2>
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
          + Tambah
        </button>
      </div>

      {showForm && (
        <div style={{
          background: '#f5f5f5',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0 }}>{editId ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nama</label>
            <input
              type="text"
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              placeholder="Nama pelanggan"
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
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>No. Telepon</label>
            <input
              type="tel"
              value={formData.telepon}
              onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
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
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Alamat</label>
            <textarea
              value={formData.alamat}
              onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
              placeholder="Alamat lengkap"
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
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Catatan</label>
            <input
              type="text"
              value={formData.catatan}
              onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
              placeholder="Catatan tambahan"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                padding: '10px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {editId ? 'Update' : 'Simpan'}
            </button>
            <button
              onClick={resetForm}
              style={{
                flex: 1,
                padding: '10px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {pelanggan.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#999'
        }}>
          <p style={{ fontSize: '48px', margin: 0 }}>👥</p>
          <p>Belum ada pelanggan</p>
          <p style={{ fontSize: '14px' }}>Klik "+ Tambah" untuk menambah pelanggan pertama</p>
        </div>
      ) : (
        <div>
          {pelanggan.map(p => (
            <div
              key={p.id}
              style={{
                background: 'white',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '10px',
                border: '1px solid #ddd'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 5px 0', color: '#1976D2' }}>{p.nama}</h3>
                  <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                    📞 {p.telepon}
                  </p>
                  {p.alamat && (
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                      📍 {p.alamat}
                    </p>
                  )}
                  {p.catatan && (
                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
                      📝 {p.catatan}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    onClick={() => handleEdit(p)}
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
                    onClick={() => handleDelete(p.id)}
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
