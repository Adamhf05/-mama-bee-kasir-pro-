// License Manager untuk Mama Bee Kasir Pro
// Sistem: Trial 7 hari + Subscription (Monthly/Yearly)

const LICENSE_DB_KEY = 'mamabee_license';
const TRIAL_DAYS = 7;
const INSTALL_DATE_KEY = 'mamabee_install_date';

export type LicenseType = 'monthly' | 'yearly';
export type LicenseStatus = 'trial' | 'active' | 'expired' | 'invalid';

export interface LicenseData {
  key: string;
  type: LicenseType;
  deviceHash: string;
  activatedAt: string;
  expiresAt: string;
  status: LicenseStatus;
}

// Generate device hash (unique per device)
export function getDeviceHash(): string {
  const components = [
    navigator.userAgent,
    screen.width + 'x' + screen.height,
    navigator.platform,
    navigator.language,
    new Date().getTimezoneOffset()
  ];
  const raw = components.join('|');
  
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(8, '0');
}

// Generate license key (untuk admin/distributor)
export function generateLicenseKey(type: LicenseType = 'monthly'): string {
  const deviceHash = getDeviceHash();
  const typeCode = type === 'monthly' ? 'M' : 'Y';
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  const raw = `${deviceHash}${typeCode}${random}`;
  let checksum = 0;
  for (let i = 0; i < raw.length; i++) {
    checksum += raw.charCodeAt(i);
  }
  const checksumStr = (checksum % 1000).toString().padStart(3, '0');
  
  return `MAMA-${deviceHash.substring(0, 4)}-${typeCode}${random}-${checksumStr}`;
}

// Validate license key
export function validateLicenseKey(key: string): { 
  valid: boolean; 
  type?: LicenseType; 
  deviceHash?: string 
} {
  const parts = key.trim().toUpperCase().split('-');
  
  if (parts.length !== 4 || parts[0] !== 'MAMA') {
    return { valid: false };
  }
  
  const [_, devicePart, typePart, checksumPart] = parts;
  
  if (devicePart.length !== 4 || typePart.length !== 5 || checksumPart.length !== 3) {
    return { valid: false };
  }
  
  const typeCode = typePart[0];
  if (typeCode !== 'M' && typeCode !== 'Y') {
    return { valid: false };
  }
  
  const type: LicenseType = typeCode === 'M' ? 'monthly' : 'yearly';
  const randomPart = typePart.substring(1);
  
  // Reconstruct checksum untuk validasi
  const rawForChecksum = `${devicePart.padEnd(8, '0')}${typeCode}${randomPart}`;
  let checksum = 0;
  for (let i = 0; i < rawForChecksum.length; i++) {
    checksum += rawForChecksum.charCodeAt(i);
  }
  const expectedChecksum = (checksum % 1000).toString().padStart(3, '0');
  
  if (checksumPart !== expectedChecksum) {
    return { valid: false };
  }
  
  return { valid: true, type, deviceHash: devicePart };
}

// Get install date (first time app opened)
export function getInstallDate(): Date {
  const saved = localStorage.getItem(INSTALL_DATE_KEY);
  if (saved) {
    return new Date(saved);
  }
  
  const now = new Date();
  localStorage.setItem(INSTALL_DATE_KEY, now.toISOString());
  return now;
}

// Get license from storage
export function getLicense(): LicenseData | null {
  const saved = localStorage.getItem(LICENSE_DB_KEY);
  if (!saved) return null;
  
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

// Save license to storage
export function saveLicense(license: LicenseData): void {
  localStorage.setItem(LICENSE_DB_KEY, JSON.stringify(license));
}

// Clear license (for testing)
export function clearLicense(): void {
  localStorage.removeItem(LICENSE_DB_KEY);
  localStorage.removeItem(INSTALL_DATE_KEY);
}

// Check license status
export function checkLicenseStatus(): {
  status: LicenseStatus;
  daysRemaining: number;
  license?: LicenseData;
} {
  const license = getLicense();
  const installDate = getInstallDate();
  const now = new Date();
  
  // If has active license
  if (license && license.status === 'active') {
    const expiresAt = new Date(license.expiresAt);
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining > 0) {
      return { status: 'active', daysRemaining, license };
    } else {
      return { status: 'expired', daysRemaining: 0, license };
    }
  }
  
  // Check trial period
  const trialDaysUsed = Math.floor((now.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24));
  const trialDaysRemaining = TRIAL_DAYS - trialDaysUsed;
  
  if (trialDaysRemaining > 0) {
    return { status: 'trial', daysRemaining: trialDaysRemaining };
  }
  
  return { status: 'expired', daysRemaining: 0 };
}

// Activate license
export function activateLicense(key: string): { 
  success: boolean; 
  message: string; 
  license?: LicenseData 
} {
  const validation = validateLicenseKey(key);
  
  if (!validation.valid) {
    return { success: false, message: 'Kode lisensi tidak valid!' };
  }
  
  const currentDeviceHash = getDeviceHash();
  const currentDevicePart = currentDeviceHash.substring(0, 4);
  
  // Bandingkan 4 karakter pertama
  if (validation.deviceHash !== currentDevicePart) {
    return { 
      success: false, 
      message: 'Kode lisensi tidak cocok dengan device ini!\n\nPastikan device hash yang dimasukkan sesuai dengan device ini.' 
    };
  }
  
  const now = new Date();
  const expiresAt = new Date(now);
  
  if (validation.type === 'monthly') {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  } else {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  }
  
  const license: LicenseData = {
    key: key.toUpperCase(),
    type: validation.type!,
    deviceHash: currentDeviceHash,
    activatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'active'
  };
  
  saveLicense(license);
  
  return {
    success: true,
    message: `Lisensi ${validation.type === 'monthly' ? 'Bulanan' : 'Tahunan'} berhasil diaktifkan!\nBerlaku sampai: ${expiresAt.toLocaleDateString('id-ID')}`,
    license
  };
}

// Format tanggal untuk display
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
