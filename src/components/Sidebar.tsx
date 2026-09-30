import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  currentMenu: string;
  onMenuChange: (menu: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ currentMenu, onMenuChange, isOpen, onClose }: SidebarProps) {
  const { dark, toggle, card, text, textMuted, border } = useTheme();

  const menus = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'kasir', label: 'Kasir', icon: '🛒' },
    { id: 'produk', label: 'Produk', icon: '📦' },
    { id: 'riwayat', label: 'Riwayat', icon: '📋' },
    { id: 'laporan', label: 'Laporan', icon: '📊' },
    { id: 'toko', label: 'Toko', icon: '⚙️' },
    { id: 'voice', label: 'Voice AI', icon: '🎙️' },
  ];

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
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '280px',
          background: card,
          borderRight: `1px solid ${border}`,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 0'
        }}
      >
        <div style={{ padding: '0 20px 20px', borderBottom: `1px solid ${border}` }}>
          <h1 style={{ margin: 0, color: text, fontSize: '20px' }}>🐝 Mama Bee Kasir</h1>
          <p style={{ margin: '5px 0 0', color: textMuted, fontSize: '12px' }}>Pro v1.0.0</p>
        </div>

        <nav style={{ flex: 1, padding: '20px 0' }}>
          {menus.map((menu) => (
            <button
              key={menu.id}
              onClick={() => {
                onMenuChange(menu.id);
                onClose();
              }}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: currentMenu === menu.id ? (dark ? '#333' : '#e3f2fd') : 'transparent',
                border: 'none',
                color: currentMenu === menu.id ? '#1976D2' : text,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '18px' }}>{menu.icon}</span>
              <span>{menu.label}</span>
            </button>
          ))}
        </nav>

        <div style={{ padding: '20px', borderTop: `1px solid ${border}` }}>
          <button
            onClick={toggle}
            style={{
              width: '100%',
              padding: '10px',
              background: 'transparent',
              border: `1px solid ${border}`,
              color: text,
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '10px'
            }}
          >
            {dark ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('isLoggedIn');
              window.location.reload();
            }}
            style={{
              width: '100%',
              padding: '10px',
              background: '#f44336',
              border: 'none',
              color: 'white',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🚪 Logout
          </button>
        </div>
      </aside>
    </>
  );
}
