import { useState } from 'react';
import { getDeviceHash } from '../utils/licenseManager';

export default function AdminScreen() {
  const [deviceHash, setDeviceHash] = useState('');
  const [licenseType, setLicenseType] = useState<'monthly' | 'yearly'>('monthly');
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);

  const generateKey = () => {
    if (!deviceHash.trim() || deviceHash.length < 4) {
      alert('Device hash tidak valid! Minimal 4 karakter.');
      return;
    }

    const typeCode = licenseType === 'monthly' ? 'M' : 'Y';
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const raw = `${deviceHash.padEnd(8, '0')}${typeCode}${random}`;
    
    let checksum = 0;
    for (let i = 0; i < raw.length; i++) {
      checksum += raw.charCodeAt(i);
    }
    const checksumStr = (checksum % 1000).toString().padStart(3, '0');
    
    const key = `MAMA-${deviceHash.substring(0, 4)}-${typeCode}${random}-${checksumStr}`;
    
    setGeneratedKey(key);
    navigator.clipboard.writeText(key);
    setCopied(true);
    
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ color: '#1976D2', textAlign: 'center', marginBottom: '30px' }}>
        🔑 Generate License Key
      </h2>
      
      <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#333' }}>
            📱 Device Hash Customer:
          </label>
          <input
            type="text"
            value={deviceHash}
            onChange={(e) => setDeviceHash(e.target.value.toUpperCase())}
            placeholder="ABC12345"
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '2px solid #ddd', 
              borderRadius: '8px', 
              fontSize: '18px', 
              fontFamily: 'monospace',
              boxSizing: 'border-box'
            }}
          />
          <small style={{ color: '#666', fontSize: '12px' }}>
            Dapatkan dari customer via tombol "Tampilkan Info Device"
          </small>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#333' }}>
            📦 Tipe Lisensi:
          </label>
          <select
            value={licenseType}
            onChange={(e) => setLicenseType(e.target.value as 'monthly' | 'yearly')}
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '2px solid #ddd', 
              borderRadius: '8px', 
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          >
            <option value="monthly">📅 Bulanan - Rp 50.000</option>
            <option value="yearly">📆 Tahunan - Rp 500.000</option>
          </select>
        </div>

        <button
          onClick={generateKey}
          style={{ 
            width: '100%', 
            padding: '14px', 
            background: '#4CAF50', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            fontSize: '16px', 
            fontWeight: 'bold', 
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
           Generate License Key
        </button>

        {generatedKey && (
          <div style={{ 
            background: '#E8F5E9', 
            padding: '20px', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              ✅ License Key Generated:
            </div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#2E7D32', 
              fontFamily: 'monospace',
              marginBottom: '10px',
              wordBreak: 'break-all'
            }}>
              {generatedKey}
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: copied ? '#4CAF50' : '#666',
              fontWeight: copied ? 'bold' : 'normal'
            }}>
              {copied ? '✅ Tersalin ke clipboard!' : 'Klik untuk copy'}
            </div>
          </div>
        )}
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        background: '#FFF9C4', 
        borderRadius: '8px',
        fontSize: '12px',
        color: '#F57F17'
      }}>
        <strong>💡 Cara Pakai:</strong>
        <ol style={{ margin: '10px 0 0 0', paddingLeft: '20px' }}>
          <li>Minta device hash dari customer</li>
          <li>Pilih tipe lisensi (Bulanan/Tahunan)</li>
          <li>Klik "Generate License Key"</li>
          <li>Copy kode dan kirim ke customer via WhatsApp</li>
        </ol>
      </div>

      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: '#E3F2FD',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#1565C0'
      }}>
        <strong>🔧 Device Hash Kamu:</strong>
        <div style={{ fontFamily: 'monospace', marginTop: '5px', fontSize: '14px' }}>
          {getDeviceHash()}
        </div>
      </div>
    </div>
  );
}
