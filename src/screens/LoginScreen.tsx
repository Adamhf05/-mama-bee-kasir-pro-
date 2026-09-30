import { useState } from 'react';

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    const savedPin = localStorage.getItem('owner_pin') || '1234';
    if (pin === savedPin) {
      localStorage.setItem('isLoggedIn', 'true');
      onLogin();
    } else {
      setError('PIN salah!');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1976D2 0%, #0D47A1 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '60px', marginBottom: '10px' }}>🐝</div>
          <h1 style={{ margin: 0, color: '#1976D2', fontSize: '24px' }}>Mama Bee Kasir Pro</h1>
          <p style={{ margin: '10px 0 0', color: '#666', fontSize: '14px' }}>Masukkan PIN untuk masuk</p>
        </div>

        <input
          type="password"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setError('');
          }}
          placeholder="PIN (default: 1234)"
          maxLength={6}
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '18px',
            textAlign: 'center',
            border: '2px solid #ddd',
            borderRadius: '8px',
            marginBottom: '20px',
            boxSizing: 'border-box'
          }}
        />

        {error && (
          <p style={{ color: '#f44336', textAlign: 'center', margin: '0 0 20px 0' }}>{error}</p>
        )}

        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            padding: '15px',
            background: '#1976D2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          MASUK
        </button>

        <p style={{ textAlign: 'center', color: '#999', fontSize: '12px', marginTop: '20px' }}>
          v1.0.0 - 2026
        </p>
      </div>
    </div>
  );
}
