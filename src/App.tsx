import { AppLogo } from './components/AppLogo';
import { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { LoginScreen } from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import { ProdukScreen } from './screens/ProdukScreen';
import { KatalogScreen } from './screens/KatalogScreen';
import { KasirScreen } from './screens/KasirScreen';
import TokoScreen from './screens/TokoScreen';
import PelangganScreen from './screens/PelangganScreen';
import MapMarketScreen from './screens/MapMarketScreen';
import RiwayatScreen from './screens/RiwayatScreen';
import LaporanScreen from './screens/LaporanScreen';
import AdminScreen from './screens/AdminScreen';
import LicenseScreen from './screens/LicenseScreen';
import VoiceScreen from './screens/VoiceScreen';
import { checkLicenseStatus } from './utils/licenseManager';

function MainApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentMenu, setCurrentMenu] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [licenseValid, setLicenseValid] = useState(false);
  const [licenseChecked, setLicenseChecked] = useState(false);
  const { bg, text, card, border } = useTheme();

  useEffect(() => {
    const saved = localStorage.getItem('isLoggedIn');
    if (saved === 'true') setIsLoggedIn(true);
    
    // CHECK LICENSE STATUS
    const licenseResult = checkLicenseStatus();
    if (licenseResult.status === 'active' || licenseResult.status === 'trial') {
      setLicenseValid(true);
    }
    setLicenseChecked(true);
  }, []);

  const handleLicenseActivated = () => {
    setLicenseValid(true);
  };

  // Loading screen saat check license
  if (!licenseChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '20px' }}><AppLogo size={90} /></div>
          <p style={{ color: '#666' }}>Memverifikasi lisensi...</p>
        </div>
      </div>
    );
  }

  // Jika lisensi tidak valid, tampilkan LicenseScreen
  if (!licenseValid) {
    return <LicenseScreen onActivated={handleLicenseActivated} />;
  }

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
        background: card,
        borderBottom: `1px solid ${border}`,
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
            color: text,
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
        {currentMenu === 'katalog' && <KatalogScreen />}
        {currentMenu === 'toko' && <TokoScreen />}
        {currentMenu === 'pelanggan' && <PelangganScreen />}
        {currentMenu === 'mapmarket' && <MapMarketScreen />}
        {currentMenu === 'riwayat' && <RiwayatScreen />}
        {currentMenu === 'laporan' && <LaporanScreen />}
        {currentMenu === 'admin' && <AdminScreen />}
        {currentMenu === 'license' && <LicenseScreen onActivated={() => setCurrentMenu('dashboard')} />}
        {currentMenu === 'voice' && <VoiceScreen onGoKasir={() => setCurrentMenu('kasir')} />}
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
