import { useState, useEffect } from 'react';
import { 
  checkLicenseStatus, 
  activateLicense, 
  getDeviceHash, 
   
   
  clearLicense 
} from '../utils/licenseManager';
import type { LicenseStatus } from '../utils/licenseManager';

interface LicenseScreenProps {
  onActivated: () => void;
}

export default function LicenseScreen({ onActivated }: LicenseScreenProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [status, setStatus] = useState<LicenseStatus>('trial');
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [deviceHash, setDeviceHash] = useState('');
  const [showHash, setShowHash] = useState(false);

  useEffect(() => {
    const result = checkLicenseStatus();
    setStatus(result.status);
    setDaysRemaining(result.daysRemaining);
    setDeviceHash(getDeviceHash());
  }, []);

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setMessage('Masukkan kode lisensi terlebih dahulu!');
      setMessageType('error');
      return;
    }

    const result = await activateLicense(licenseKey);
    setMessage(result.message);
    setMessageType(result.success ? 'success' : 'error');

    if (result.success) {
      setTimeout(() => {
        onActivated();
      }, 1500);
    }
  };

  const handleResetTrial = () => {
    if (confirm('Reset trial? Ini hanya untuk testing!')) {
      clearLicense();
      window.location.reload();
    }
  };

  const handleSimulateExpired = () => {
    if (confirm('Simulasi trial habis (10 hari lalu)?')) {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      localStorage.setItem('mamabee_install_date', oldDate.toISOString());
      localStorage.removeItem('mamabee_license');
      window.location.reload();
    }
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(deviceHash).then(() => {
      alert('✅ Device Hash disalin! Kirim ke admin via WhatsApp.');
    }).catch(() => {
      alert('Gagal copy. Silakan screenshot dan kirim ke admin.');
    });
  };

  const getStatusColor = () => {
    if (status === 'active') return '#4CAF50';
    if (status === 'trial') return '#FF9800';
    return '#f44336';
  };

  const getStatusText = () => {
    if (status === 'active') return 'AKTIF';
    if (status === 'trial') return 'TRIAL';
    return 'EXPIRED';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '30px',
        maxWidth: '450px',
        width: '100%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '60px', marginBottom: '10px' }}>🐝</div>
          <h1 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '24px' }}>
            Mama Bee Kasir Pro
          </h1>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            Professional POS System
          </p>
        </div>

        {/* Status Badge */}
        <div style={{
          textAlign: 'center',
          padding: '10px',
          background: getStatusColor() + '20',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <span style={{ 
            color: getStatusColor(), 
            fontWeight: 'bold', 
            fontSize: '16px' 
          }}>
            Status: {getStatusText()}
          </span>
          {status === 'trial' && (
            <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
              Sisa {daysRemaining} hari trial
            </div>
          )}
        </div>

        {/* Device Hash Section */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#333' }}>
            📱 Device Hash Anda:
          </label>
          
          {showHash ? (
            <div style={{ 
              background: '#f5f5f5', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '10px',
              border: '2px dashed #1976D2'
            }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                color: '#1976D2',
                textAlign: 'center',
                marginBottom: '10px',
                wordBreak: 'break-all'
              }}>
                {deviceHash}
              </div>
              <button
                onClick={handleCopyHash}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#1976D2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                 Copy Device Hash
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowHash(true)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '10px'
              }}
            >
              ️ Tampilkan Device Hash
            </button>
          )}

          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            textAlign: 'center',
            background: '#FFF9C4',
            padding: '10px',
            borderRadius: '6px'
          }}>
            💡 Kirim Device Hash ini ke admin via WhatsApp untuk mendapatkan kode lisensi
          </div>
        </div>

        {/* License Key Input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#333' }}>
            🔑 Masukkan Kode Lisensi:
          </label>
          <input
            type="text"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="MAMA-XXXX-XXXX-XXX"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box',
              textAlign: 'center',
              fontWeight: 'bold',
              letterSpacing: '1px'
            }}
          />
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            background: messageType === 'success' ? '#E8F5E9' : 
                       messageType === 'error' ? '#FFEBEE' : '#E3F2FD',
            color: messageType === 'success' ? '#2E7D32' : 
                   messageType === 'error' ? '#C62828' : '#1565C0',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        {/* Activate Button */}
        <button
          onClick={handleActivate}
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
            marginBottom: '10px'
          }}
        >
          ✅ Aktifkan Lisensi
        </button>

        {/* Simulate Expired Button (Testing) */}
        <button
          onClick={handleSimulateExpired}
          style={{
            width: '100%',
            padding: '10px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginBottom: '10px'
          }}
        >
          ️ Simulasi Trial Habis (Test)
        </button>

        {/* Reset Trial Button (Debug) */}
        <button
          onClick={handleResetTrial}
          style={{
            width: '100%',
            padding: '10px',
            background: '#9E9E9E',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          🔄 Reset Trial (Testing Only)
        </button>

        {/* Instructions */}
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#FFF9C4',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#666',
          lineHeight: '1.6'
        }}>
          <strong>📝 Cara Aktivasi:</strong>
          <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Klik "Tampilkan Device Hash" di atas</li>
            <li>Copy & kirim ke admin via WhatsApp</li>
            <li>Admin akan kirim kode lisensi</li>
            <li>Masukkan kode di kolom di atas</li>
            <li>Klik "Aktifkan Lisensi"</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
