import { useState, useEffect } from 'react';
import { 
  checkLicenseStatus, 
  activateLicense, 
  getDeviceHash, 
  getInstallDate,
  formatDate,
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
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const result = checkLicenseStatus();
    setStatus(result.status);
    setDaysRemaining(result.daysRemaining);
  }, []);

  const handleActivate = () => {
    if (!licenseKey.trim()) {
      setMessage('Masukkan kode lisensi terlebih dahulu!');
      setMessageType('error');
      return;
    }

    const result = activateLicense(licenseKey);
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
          <div style={{ fontSize: '12px', color: '#666' }}>Status Lisensi</div>
          <div style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            color: getStatusColor(),
            marginTop: '5px'
          }}>
            {getStatusText()}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            {status === 'trial' && `Sisa trial: ${daysRemaining} hari`}
            {status === 'active' && `Aktif selama ${daysRemaining} hari lagi`}
            {status === 'expired' && 'Lisensi telah berakhir'}
          </div>
        </div>

        {/* Info Box */}
        <div style={{ 
          background: '#E3F2FD', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          fontSize: '13px',
          color: '#1565C0'
        }}>
          {status === 'trial' && (
            <>
              <strong>🎉 Selamat! Anda dalam masa trial {daysRemaining} hari.</strong>
              <p style={{ margin: '10px 0 0 0', fontSize: '12px' }}>
                Nikmati semua fitur Mama Bee Kasir Pro. Setelah trial berakhir, 
                aktifkan lisensi untuk继续使用.
              </p>
            </>
          )}
          {status === 'expired' && (
            <>
              <strong>⚠️ Masa trial telah berakhir!</strong>
              <p style={{ margin: '10px 0 0 0', fontSize: '12px' }}>
                Aktifkan lisensi untuk继续使用 semua fitur.
              </p>
            </>
          )}
          {status === 'active' && (
            <>
              <strong>✅ Lisensi aktif!</strong>
              <p style={{ margin: '10px 0 0 0', fontSize: '12px' }}>
                Terima kasih telah berlangganan Mama Bee Kasir Pro.
              </p>
            </>
          )}
        </div>

        {/* Pricing Info */}
        <div style={{ 
          background: '#FFF9C4', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          fontSize: '13px'
        }}>
          <strong style={{ color: '#F57F17' }}>💰 Paket Langganan:</strong>
          <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📅 Bulanan</span>
              <strong style={{ color: '#1976D2' }}>Rp 50.000/bulan</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📆 Tahunan</span>
              <strong style={{ color: '#1976D2' }}>Rp 500.000/tahun</strong>
            </div>
          </div>
          <p style={{ margin: '10px 0 0 0', fontSize: '11px', color: '#666' }}>
            Hubungi admin via WhatsApp untuk membeli lisensi
          </p>
        </div>

        {/* Activation Form */}
        {(status === 'trial' || status === 'expired') && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
               Masukkan Kode Lisensi:
            </label>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
              placeholder="MAMA-XXXX-XXXX-XXXX"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                marginBottom: '10px'
              }}
            />
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
                cursor: 'pointer'
              }}
            >
              ✅ Aktivasi Lisensi
            </button>
          </div>
        )}

        {/* Message */}
        {message && (
          <div style={{
            padding: '12px',
            background: messageType === 'success' ? '#E8F5E9' : messageType === 'error' ? '#FFEBEE' : '#E3F2FD',
            color: messageType === 'success' ? '#2E7D32' : messageType === 'error' ? '#C62828' : '#1565C0',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        {/* Contact Info */}
        <div style={{
          background: '#F5F5F5',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#666'
        }}>
          <strong>📱 Hubungi Admin:</strong>
          <p style={{ margin: '8px 0 0 0' }}>
            WhatsApp: <a href="https://wa.me/6285677455555" style={{ color: '#25D366', textDecoration: 'none', fontWeight: 'bold' }}>
              0856-7745-5555
            </a>
          </p>
          <p style={{ margin: '5px 0 0 0', fontSize: '11px' }}>
            Kirim pesan untuk membeli lisensi
          </p>
        </div>

        {/* Debug (hidden, for admin) */}
        <div style={{ marginTop: '15px', textAlign: 'center' }}>
          <button
            onClick={() => setShowDebug(!showDebug)}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              fontSize: '11px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {showDebug ? 'Sembunyikan' : 'Tampilkan'} Info Device
          </button>
          
          {showDebug && (
            <div style={{
              marginTop: '10px',
              padding: '10px',
              background: '#f5f5f5',
              borderRadius: '6px',
              fontSize: '10px',
              fontFamily: 'monospace',
              color: '#666',
              textAlign: 'left'
            }}>
              <div><strong>Device Hash:</strong> {getDeviceHash()}</div>
              <div><strong>Install Date:</strong> {formatDate(getInstallDate().toISOString())}</div>
              <button
                onClick={handleResetTrial}
                style={{
                  marginTop: '10px',
                  padding: '6px 12px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                Reset Trial (Testing)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
