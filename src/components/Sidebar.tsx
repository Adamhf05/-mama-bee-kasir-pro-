import { AppLogo } from './AppLogo';
import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  currentMenu: string;
  onMenuChange: (menu: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ currentMenu, onMenuChange, isOpen, onClose }: SidebarProps) {
  const { text, card, dark, toggle } = useTheme();
  const [logoClicks, setLogoClicks] = useState(0);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'kasir', label: 'Kasir', icon: '🛒' },
    { id: 'produk', label: 'Produk', icon: '📦' },
    { id: 'katalog', label: 'Katalog', icon: '🛍️' },
    { id: 'toko', label: 'Toko', icon: '🏪' },
    { id: 'pelanggan', label: 'Pelanggan', icon: '👥' },
    { id: 'mapmarket', label: 'Map Market', icon: '🗺️' },
    { id: 'riwayat', label: 'Riwayat', icon: '🕒' },
    { id: 'laporan', label: 'Laporan', icon: '📊' },
    { id: 'voice', label: 'Voice AI', icon: '🎙️' },
    { id: 'license', label: 'Lisensi', icon: '🔑' },
  ];

  const handleLogoClick = () => {
    const newCount = logoClicks + 1;
    setLogoClicks(newCount);
    if (newCount >= 5) {
      onMenuChange('admin');
      setLogoClicks(0);
      onClose();
    }
    setTimeout(() => setLogoClicks(0), 3000);
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }}
        />
      )}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: isOpen ? '0' : '-300px',
          width: '300px',
          height: '100vh',
          background: card,
          boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
          transition: 'left 0.3s ease',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div 
          onClick={handleLogoClick}
          style={{ 
            padding: '20px', 
            borderBottom: '1px solid #ddd',
            cursor: 'pointer'
          }}
        >
          <h2 style={{ margin: 0, color: text, fontSize: '20px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><AppLogo size={36} />Mama Bee Kasir</span>
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '12px' }}>
            Pro v1.0.0
          </p>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto' }}>
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                onMenuChange(item.id);
                onClose();
              }}
              style={{
                width: '100%',
                padding: '15px 20px',
                background: currentMenu === item.id ? '#E3F2FD' : 'transparent',
                border: 'none',
                borderBottom: '1px solid #f0f0f0',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '16px',
                color: currentMenu === item.id ? '#1976D2' : text,
                fontWeight: currentMenu === item.id ? 'bold' : 'normal',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '20px', borderTop: '1px solid #ddd' }}>
          <button
            onClick={toggle}
            style={{
              width: '100%',
              padding: '12px',
              background: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '10px'
            }}
          >
            {dark ? '☀️ Mode Terang' : '🌙 Dark Mode'}
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('isLoggedIn');
              window.location.reload();
            }}
            style={{
              width: '100%',
              padding: '12px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
             Logout
          </button>
        </div>
      </div>
    </>
  );
}
