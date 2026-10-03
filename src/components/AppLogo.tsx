import { useState } from 'react';
import type { CSSProperties } from 'react';
import { LOGO_PNG_URL } from '../assets/logo';

interface AppLogoProps {
  size?: number;
  rounded?: boolean;
  style?: CSSProperties;
}

// Logo Mama Bee Kasir Pro (file yang sama dengan ikon APK), tampil sebagai kotak persegi
export function AppLogo({ size = 64, rounded = true, style }: AppLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span style={{ fontSize: size * 0.8, lineHeight: 1, display: 'inline-block', ...style }}>
        🐝
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        width: size,
        height: size,
        flexShrink: 0,
        overflow: 'hidden',
        background: '#ffffff',
        borderRadius: rounded ? '22%' : 0,
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        verticalAlign: 'middle',
        ...style
      }}
    >
      <img
        src={LOGO_PNG_URL}
        alt="Mama Bee Kasir Pro"
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </span>
  );
}
