// License Manager untuk Mama Bee Kasir Pro
// Trial 7 hari + lisensi Bulanan/Tahunan.
// Kode lisensi ditandatangani (ECDSA P-256) oleh admin; aplikasi hanya menyimpan kunci publik.

const LICENSE_DB_KEY = 'mamabee_license';
const TRIAL_DAYS = 7;
const INSTALL_DATE_KEY = 'mamabee_install_date';
const DEVICE_ID_KEY = 'mamabee_device_id';
const LAST_SEEN_KEY = 'mamabee_last_seen';
const DAY_MS = 24 * 60 * 60 * 1000;

const PUBLIC_KEY_JWK: JsonWebKey = {"kty":"EC","crv":"P-256","x":"6n_SMy6ULW4k5gEaaFaAeenV-a1P4B1cGamXX5XK4Nw","y":"T3eNkAI1EGyGfZL1BrU2hYJGWF4UhVY8ZgAamzyKMCM"};

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

// ID perangkat acak 8 karakter, dibuat sekali lalu disimpan
export function getDeviceHash(): string {
  try {
    const saved = localStorage.getItem(DEVICE_ID_KEY);
    if (saved && /^[0-9A-Z]{8}$/.test(saved)) return saved;
  } catch {
    // abaikan
  }
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[bytes[i] % 36];
  try {
    localStorage.setItem(DEVICE_ID_KEY, id);
  } catch {
    // abaikan
  }
  return id;
}

// Deteksi jam perangkat dimundurkan (toleransi 2 hari)
function isClockTampered(now: Date): boolean {
  try {
    const last = Number(localStorage.getItem(LAST_SEEN_KEY) || 0);
    const t = now.getTime();
    if (last && t < last - 2 * DAY_MS) return true;
    const next = last ? Math.max(last, Math.min(t, last + 45 * DAY_MS)) : t;
    localStorage.setItem(LAST_SEEN_KEY, String(next));
  } catch {
    // abaikan
  }
  return false;
}

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

type ParsedKey =
  | { ok: true; type: LicenseType; deviceHash: string; expiresAt: Date }
  | { ok: false; reason: 'format' | 'unsupported' };

async function parseLicenseKey(rawKey: string): Promise<ParsedKey> {
  const parts = rawKey.replace(/\s+/g, '').split('.');
  if (parts.length !== 3 || parts[0] !== 'MAMA2') return { ok: false, reason: 'format' };
  if (!globalThis.crypto || !globalThis.crypto.subtle) return { ok: false, reason: 'unsupported' };
  try {
    const payloadBytes = b64urlToBytes(parts[1]);
    const sigBytes = b64urlToBytes(parts[2]);
    const pubKey = await crypto.subtle.importKey(
      'jwk', PUBLIC_KEY_JWK, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
    );
    const good = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' }, pubKey, sigBytes, payloadBytes
    );
    if (!good) return { ok: false, reason: 'format' };
    const [hash, t, ymd] = new TextDecoder().decode(payloadBytes).split('|');
    if (!/^[0-9A-Z]{8}$/.test(hash) || (t !== 'M' && t !== 'Y') || !/^\d{8}$/.test(ymd)) {
      return { ok: false, reason: 'format' };
    }
    const expiresAt = new Date(
      Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)), 23, 59, 59)
    );
    return { ok: true, type: t === 'M' ? 'monthly' : 'yearly', deviceHash: hash, expiresAt };
  } catch {
    return { ok: false, reason: 'format' };
  }
}

// Tanggal pertama app dibuka
export function getInstallDate(): Date {
  const saved = localStorage.getItem(INSTALL_DATE_KEY);
  if (saved) {
    return new Date(saved);
  }
  const now = new Date();
  localStorage.setItem(INSTALL_DATE_KEY, now.toISOString());
  return now;
}

export function getLicense(): LicenseData | null {
  const saved = localStorage.getItem(LICENSE_DB_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export function saveLicense(license: LicenseData): void {
  localStorage.setItem(LICENSE_DB_KEY, JSON.stringify(license));
}

// Hapus lisensi (untuk testing)
export function clearLicense(): void {
  localStorage.removeItem(LICENSE_DB_KEY);
  localStorage.removeItem(INSTALL_DATE_KEY);
}

export function checkLicenseStatus(): {
  status: LicenseStatus;
  daysRemaining: number;
  license?: LicenseData;
} {
  const license = getLicense();
  const installDate = getInstallDate();
  const now = new Date();
  const tampered = isClockTampered(now);

  if (license && license.status === 'active' && license.deviceHash === getDeviceHash()) {
    const expiresAt = new Date(license.expiresAt);
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS);
    if (!tampered && daysRemaining > 0) {
      return { status: 'active', daysRemaining, license };
    }
    return { status: 'expired', daysRemaining: 0, license };
  }

  const trialDaysUsed = Math.floor((now.getTime() - installDate.getTime()) / DAY_MS);
  const trialDaysRemaining = TRIAL_DAYS - trialDaysUsed;
  if (!tampered && trialDaysRemaining > 0) {
    return { status: 'trial', daysRemaining: trialDaysRemaining };
  }
  return { status: 'expired', daysRemaining: 0 };
}

export async function activateLicense(key: string): Promise<{
  success: boolean;
  message: string;
  license?: LicenseData;
}> {
  const parsed = await parseLicenseKey(key);
  if (!parsed.ok) {
    return {
      success: false,
      message: parsed.reason === 'unsupported'
        ? 'Verifikasi lisensi tidak didukung di perangkat ini.'
        : 'Kode lisensi tidak valid!'
    };
  }

  const currentDeviceHash = getDeviceHash();
  if (parsed.deviceHash !== currentDeviceHash) {
    return {
      success: false,
      message: 'Kode lisensi tidak cocok dengan device ini!\n\nPastikan device hash yang dikirim sesuai dengan device ini.'
    };
  }

  const now = new Date();
  if (isClockTampered(now)) {
    return { success: false, message: 'Tanggal perangkat tidak valid. Perbaiki tanggal/jam HP lalu coba lagi.' };
  }
  if (parsed.expiresAt.getTime() <= now.getTime()) {
    return { success: false, message: 'Kode lisensi sudah kedaluwarsa. Minta kode baru ke admin.' };
  }

  const license: LicenseData = {
    key: key.replace(/\s+/g, ''),
    type: parsed.type,
    deviceHash: currentDeviceHash,
    activatedAt: now.toISOString(),
    expiresAt: parsed.expiresAt.toISOString(),
    status: 'active'
  };
  saveLicense(license);

  return {
    success: true,
    message: `Lisensi ${parsed.type === 'monthly' ? 'Bulanan' : 'Tahunan'} berhasil diaktifkan!\nBerlaku sampai: ${parsed.expiresAt.toLocaleDateString('id-ID')}`,
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
