// Logo Mama Bee Kasir Pro - pakai file PNG yang sama dengan APK
export const LOGO_PNG_URL = '/logo-apk.png';

// Fallback SVG jika PNG tidak load
export const LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100" height="100">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFA500;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="95" fill="url(#bgGradient)" stroke="#333" stroke-width="2"/>
  <text x="100" y="80" font-size="50" text-anchor="middle">🐝</text>
  <text x="100" y="115" font-size="20" font-weight="bold" text-anchor="middle" fill="#333" font-family="Arial">MAMA BEE</text>
  <text x="100" y="140" font-size="16" font-weight="bold" text-anchor="middle" fill="#333" font-family="Arial">KASIR PRO</text>
  <text x="100" y="165" font-size="10" text-anchor="middle" fill="#555" font-family="Arial">Professional POS</text>
</svg>
`;
