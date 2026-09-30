import { useTheme } from '../contexts/ThemeContext';

export function DashboardScreen() {
  const { card, text, textMuted } = useTheme();

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ color: text, marginBottom: '20px' }}>Dashboard</h1>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {[
          { icon: '💰', label: 'Penjualan Hari Ini', value: 'Rp 0' },
          { icon: '📦', label: 'Total Produk', value: '0' },
          { icon: '🧾', label: 'Transaksi Hari Ini', value: '0' },
          { icon: '📈', label: 'Profit Hari Ini', value: 'Rp 0' }
        ].map((stat, idx) => (
          <div key={idx} style={{
            background: card,
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>{stat.icon}</div>
            <div style={{ color: textMuted, fontSize: '12px', marginBottom: '5px' }}>{stat.label}</div>
            <div style={{ color: text, fontSize: '24px', fontWeight: 'bold' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{
        background: card,
        padding: '30px',
        borderRadius: '12px',
        textAlign: 'center',
        color: textMuted
      }}>
        <p style={{ fontSize: '48px', marginBottom: '10px' }}>👋</p>
        <p style={{ fontSize: '18px', marginBottom: '10px' }}>Selamat datang di Mama Bee Kasir Pro!</p>
        <p style={{ fontSize: '14px' }}>Mulai dengan menambahkan produk di menu Produk</p>
      </div>
    </div>
  );
}
