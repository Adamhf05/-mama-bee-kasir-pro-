import { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { ProdukScreen } from './screens/ProdukScreen';
import { KasirScreen } from './screens/KasirScreen';
import TokoScreen from './screens/TokoScreen';
import PelangganScreen from './screens/PelangganScreen';
import MapMarketScreen from './screens/MapMarketScreen';
import RiwayatScreen from './screens/RiwayatScreen';
import LaporanScreen from './screens/LaporanScreen';

function MainApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentMenu, setCurrentMenu] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { bg, text } = useTheme();

  useEffect(() => {
    const saved = localStorage.getItem('isLoggedIn');
    if (saved === 'true') setIsLoggedIn(true);
  }, []);

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: bg }}>
      <Sidebar
        currentMenu={currentMenu}
        onMenuChange={setCurrentMenu}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'white',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        zIndex: 100
      }}>
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            marginRight: '15px'
          }}
        >
          ☰
        </button>
        <h1 style={{ margin: 0, color: text, fontSize: '18px' }}>Mama Bee Kasir Pro</h1>
      </header>

      <main style={{ paddingTop: '60px', minHeight: '100vh' }}>
        {currentMenu === 'dashboard' && <DashboardScreen />}
        {currentMenu === 'kasir' && <KasirScreen />}
        {currentMenu === 'produk' && <ProdukScreen />}
        {currentMenu === 'toko' && <TokoScreen />}
        {currentMenu === 'pelanggan' && <PelangganScreen />}
        {currentMenu === 'mapmarket' && <MapMarketScreen />}
        {currentMenu === 'riwayat' && <RiwayatScreen />}
        {currentMenu === 'laporan' && <LaporanScreen />}
        {currentMenu === 'voice' && <div style={{ padding: '20px', color: text, textAlign: 'center' }}>🎙️ Voice AI (Coming Soon)</div>}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
