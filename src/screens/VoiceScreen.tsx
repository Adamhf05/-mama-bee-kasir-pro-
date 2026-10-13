import { useState } from 'react';
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition';
import { useTheme } from '../contexts/ThemeContext';
import { ProductRepo } from '../data/repositories/ProductRepo';
import { TransactionRepo } from '../data/repositories/TransactionRepo';
import { KunjunganRepo } from '../data/repositories/KunjunganRepo';
import type { Product } from '../data/database';

const VOICE_CART_KEY = 'mamabee_voice_cart';

const UNITS = new Map<string, number>([
  ['nol', 0], ['satu', 1], ['dua', 2], ['tiga', 3], ['empat', 4],
  ['lima', 5], ['enam', 6], ['tujuh', 7], ['delapan', 8], ['sembilan', 9]
]);

const formatRupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const isNum = (s?: string) => !!s && /^\d+$/.test(s);

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// "dua puluh lima" -> "25", "dua belas" -> "12", "sepuluh" -> "10"
function wordsToNumbers(tokens: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === 'sepuluh') { out.push('10'); i++; continue; }
    if (t === 'sebelas') { out.push('11'); i++; continue; }
    if (t === 'seratus') { out.push('100'); i++; continue; }
    const u = UNITS.get(t);
    if (u !== undefined) {
      const next = tokens[i + 1];
      if (next === 'belas') { out.push(String(u + 10)); i += 2; continue; }
      if (next === 'puluh') {
        let n = u * 10;
        i += 2;
        const nu = UNITS.get(tokens[i]);
        if (nu !== undefined && nu > 0) { n += nu; i++; }
        out.push(String(n));
        continue;
      }
      out.push(String(u));
      i++;
      continue;
    }
    out.push(t);
    i++;
  }
  return out;
}


// ---- Pencarian produk dari ucapan: huruf, angka, romawi, sebagian nama, salah dengar ----
const ROMAWI = new Map<string, number>([
  ['i', 1], ['ii', 2], ['iii', 3], ['iv', 4], ['v', 5],
  ['vi', 6], ['vii', 7], ['viii', 8], ['ix', 9], ['x', 10]
]);

// Kata perintah/pengisi yang bukan nama produk
const KATA_PERINTAH = new Set([
  'tambah', 'tambahkan', 'masukkan', 'masukin', 'beli', 'tolong', 'dong', 'ya', 'buat', 'mau',
  'pesan', 'order', 'minta', 'catat', 'input', 'ke', 'keranjang', 'dan', 'sama', 'lalu', 'terus',
  'juga', 'pcs', 'buah', 'biji', 'bungkus', 'pack', 'dus', 'kg', 'liter'
]);

const PESAN_OFFLINE =
  'Tidak ada internet dan paket suara offline Bahasa Indonesia belum terpasang. ' +
  'Pasang paket suara offline di pengaturan HP/Google, atau ketik perintah di kolom bawah.';

// "2" atau "ii" menjadi 2 (null bila bukan angka)
function parseQty(tok?: string): number | null {
  if (!tok) return null;
  if (isNum(tok)) return Number(tok);
  const r = ROMAWI.get(tok);
  return r === undefined ? null : r;
}

function ambilJumlah(tokens: string[]): number {
  const angka = tokens.find(t => isNum(t));
  if (angka) return Math.max(1, Number(angka));
  const romawi = tokens.map(t => ROMAWI.get(t)).find(v => v !== undefined);
  return romawi ?? 1;
}

// Samakan ejaan bunyi: "copy" menjadi "kopi", "ph" menjadi "f", huruf dobel dirapatkan
const fon = (s: string) =>
  s.replace(/ph/g, 'f').replace(/c/g, 'k').replace(/y/g, 'i').replace(/(.)\1+/g, '$1');

// Jarak edit (Levenshtein)
function jarak(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

type Wanted = { product: Product; qty: number };

// Cocokkan nama produk lengkap di kalimat; jumlah = angka/romawi sesudah atau sebelum nama
function findItems(tokens: string[], products: Product[]): Wanted[] {
  const used: boolean[] = tokens.map(() => false);
  const found: Wanted[] = [];
  const sorted = [...products].sort((a, b) => b.name.length - a.name.length);
  for (const p of sorted) {
    const nameTokens = norm(p.name).split(' ').filter(Boolean);
    if (!nameTokens.length) continue;
    for (let i = 0; i <= tokens.length - nameTokens.length; i++) {
      const match = nameTokens.every((nt, k) => tokens[i + k] === nt && !used[i + k]);
      if (!match) continue;
      for (let k = 0; k < nameTokens.length; k++) used[i + k] = true;
      const after = i + nameTokens.length;
      let qty = 1;
      const qAfter = parseQty(tokens[after]);
      const qBefore = i > 0 ? parseQty(tokens[i - 1]) : null;
      if (qAfter !== null && !used[after]) {
        qty = qAfter;
        used[after] = true;
      } else if (qBefore !== null && !used[i - 1]) {
        qty = qBefore;
        used[i - 1] = true;
      }
      found.push({ product: p, qty: Math.max(1, qty) });
      break;
    }
  }
  return found;
}

// Cadangan 1: sebagian nama ("kopi" untuk "Kopi Tubruk")
function findPartial(tokens: string[], products: Product[]): Product[] {
  return products.filter(p =>
    norm(p.name).split(' ').some(nt => nt.length >= 3 && tokens.includes(nt))
  );
}

// Cadangan 2: salah dengar ("copy" untuk "kopi"); hanya kandidat terdekat
function findFuzzy(tokens: string[], products: Product[]): Product[] {
  const kata = tokens.filter(t => t.length >= 3 && !isNum(t) && !ROMAWI.has(t) && !KATA_PERINTAH.has(t));
  if (!kata.length) return [];
  const skor: Array<{ p: Product; d: number }> = [];
  for (const p of products) {
    let best = 99;
    for (const nt of norm(p.name).split(' ').filter(x => x.length >= 3)) {
      for (const k of kata) {
        const d = jarak(fon(k), fon(nt));
        const batas = Math.max(nt.length, k.length) >= 6 ? 2 : 1;
        if (d <= batas && d < best) best = d;
      }
    }
    if (best < 99) skor.push({ p, d: best });
  }
  if (!skor.length) return [];
  const terbaik = Math.min(...skor.map(x => x.d));
  return skor.filter(x => x.d === terbaik).map(x => x.p);
}

function pesanTidakKetemu(tokens: string[], products: Product[]): string {
  const nama = tokens.filter(t => !isNum(t) && !ROMAWI.has(t) && !KATA_PERINTAH.has(t)).join(' ');
  if (!nama) return 'Maaf, belum paham. Coba: "tambah kopi dua" atau "omzet hari ini".';
  const contoh = products.slice(0, 5).map(p => p.name).join(', ');
  return 'Produk "' + nama + '" belum terdaftar. Produk yang ada: ' + contoh +
    (products.length > 5 ? ', ...' : '') + '. Tambahkan produk baru di menu Produk.';
}

async function todayReport() {
  const [products, trans, kunj] = await Promise.all([
    ProductRepo.getAll(),
    TransactionRepo.getToday(),
    KunjunganRepo.getAll()
  ]);
  const hpp = new Map<number, number>(
    products.map(p => [p.id as number, p.hpp || 0] as [number, number])
  );
  let omzetKasir = 0;
  let profit = 0;
  for (const t of trans) {
    omzetKasir += t.total;
    for (const it of t.items) {
      profit += (it.price - (hpp.get(it.productId) ?? 0)) * it.qty;
    }
  }
  let omzetKunj = 0;
  let countKunj = 0;
  const todayStr = new Date().toDateString();
  for (const k of kunj) {
    const d = new Date(k.createdAt as unknown as string);
    if (isNaN(d.getTime()) || d.toDateString() !== todayStr) continue;
    countKunj++;
    omzetKunj += k.total;
    for (const it of k.items) {
      profit += (it.hargaSatuan - (hpp.get(it.produkId) ?? 0)) * it.jumlah;
    }
  }
  return { omzetKasir, omzetKunj, count: trans.length + countKunj, profit };
}

async function runCommand(raw: string): Promise<{ reply: string; goKasir: boolean }> {
  const tokens = wordsToNumbers(norm(raw).split(' ').filter(Boolean));
  const joined = tokens.join(' ');
  if (!joined) return { reply: 'Tidak ada suara terdengar. Coba lagi.', goKasir: false };

  if (/\b(omzet|penjualan|pendapatan)\b/.test(joined)) {
    const r = await todayReport();
    const detail = r.omzetKunj > 0
      ? ` (Kasir ${formatRupiah(r.omzetKasir)}, Kunjungan ${formatRupiah(r.omzetKunj)})`
      : '';
    return {
      reply: `Omzet hari ini ${formatRupiah(r.omzetKasir + r.omzetKunj)} dari ${r.count} transaksi${detail}.`,
      goKasir: false
    };
  }
  if (/\b(profit|untung|keuntungan|laba)\b/.test(joined)) {
    const r = await todayReport();
    return { reply: `Profit hari ini ${formatRupiah(r.profit)}.`, goKasir: false };
  }
  if (/\btransaksi\b/.test(joined)) {
    const r = await todayReport();
    return { reply: `Ada ${r.count} transaksi hari ini.`, goKasir: false };
  }

  const products = await ProductRepo.getAll();
  if (products.length === 0) {
    return {
      reply: 'Belum ada produk di database aplikasi ini. Tambahkan produk dulu di menu Produk.',
      goKasir: false
    };
  }

  if (/\b(stok|stock|sisa)\b/.test(joined)) {
    const exact = findItems(tokens, products)[0]?.product;
    let kandidat: Product[] = exact ? [exact] : findPartial(tokens, products);
    if (kandidat.length === 0) kandidat = findFuzzy(tokens, products);
    if (kandidat.length === 0) return { reply: pesanTidakKetemu(tokens, products), goKasir: false };
    if (kandidat.length > 1) {
      return { reply: 'Maksudnya yang mana: ' + kandidat.map(c => c.name).join(', ') + '?', goKasir: false };
    }
    const p = kandidat[0];
    return { reply: `Stok ${p.name}: ${p.stock} ${p.unit || 'pcs'}.`, goKasir: false };
  }

  // Tambah ke keranjang
  let items = findItems(tokens, products);
  let tidakDikenali = '';
  if (items.length) {
    const dikenal = new Set<string>();
    items.forEach(it => norm(it.product.name).split(' ').forEach(t => dikenal.add(t)));
    tidakDikenali = tokens
      .filter(t => t.length >= 3 && !isNum(t) && !ROMAWI.has(t) && !KATA_PERINTAH.has(t) && !dikenal.has(t))
      .join(' ');
  } else {
    let cand = findPartial(tokens, products);
    if (cand.length === 0) cand = findFuzzy(tokens, products);
    if (cand.length > 1) {
      return { reply: 'Maksudnya yang mana: ' + cand.map(c => c.name).join(', ') + '?', goKasir: false };
    }
    if (cand.length === 1) items = [{ product: cand[0], qty: ambilJumlah(tokens) }];
  }
  if (!items.length) return { reply: pesanTidakKetemu(tokens, products), goKasir: false };

  const added: string[] = [];
  const notes: string[] = [];
  const wanted: Array<{ productId: number; qty: number }> = [];
  if (tidakDikenali) notes.push('Tidak dikenali: ' + tidakDikenali);
  for (const it of items) {
    const p = it.product;
    if (p.stock <= 0) { notes.push(`${p.name} stok habis`); continue; }
    const qty = Math.min(it.qty, p.stock);
    if (qty < it.qty) notes.push(`${p.name} hanya tersisa ${p.stock}`);
    wanted.push({ productId: p.id as number, qty });
    added.push(`${p.name} × ${qty}`);
  }
  if (!wanted.length) {
    return { reply: notes.join('. ') + '.', goKasir: false };
  }
  localStorage.setItem(VOICE_CART_KEY, JSON.stringify(wanted));
  return {
    reply: `Ditambahkan: ${added.join(', ')}.` + (notes.length ? ' ' + notes.join('. ') + '.' : '') + ' Membuka Kasir...',
    goKasir: true
  };
}

export default function VoiceScreen({ onGoKasir }: { onGoKasir: () => void }) {
  const { card, text, textMuted } = useTheme();
  const [status, setStatus] = useState('Tekan tombol, lalu bicara');
  const [heard, setHeard] = useState('');
  const [reply, setReply] = useState('');
  const [typed, setTyped] = useState('');
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleCommand = async (raw: string) => {
    setHeard(raw);
    setReply('');
    setBusy(true);
    try {
      const res = await runCommand(raw);
      setReply(res.reply);
      if (res.goKasir) setTimeout(onGoKasir, 1200);
    } catch (e) {
      setReply('Terjadi kesalahan: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  const listen = async () => {
    if (busy || listening) return;
    setHeard('');
    setReply('');
    try {
      const { available } = await SpeechRecognition.available();
      if (!available) {
        setStatus('Pengenalan suara tidak tersedia di perangkat ini. Pakai kolom ketik di bawah.');
        return;
      }
      const izin = await SpeechRecognition.requestPermissions();
      if (izin.speechRecognition !== 'granted') {
        setStatus('Izin mikrofon ditolak. Izinkan di pengaturan HP.');
        return;
      }

      // Offline: pakai jalur pengenalan di perangkat bila tersedia
      const online = typeof navigator === 'undefined' ? true : navigator.onLine;
      let pakaiOnDevice = false;
      if (!online) {
        try {
          const cek = await SpeechRecognition.isOnDeviceRecognitionAvailable({ language: 'id-ID' });
          pakaiOnDevice = cek.available;
        } catch {
          pakaiOnDevice = false;
        }
      }

      setListening(true);
      setStatus(
        online
          ? 'Mendengarkan... bicara sekarang'
          : pakaiOnDevice
            ? 'Mendengarkan (offline, di perangkat)... bicara sekarang'
            : 'Mendengarkan (offline)... bicara sekarang'
      );
      const hasil = await SpeechRecognition.start({
        language: 'id-ID',
        maxResults: 3,
        partialResults: false,
        popup: false,
        useOnDeviceRecognition: pakaiOnDevice
      });
      setListening(false);
      const ucapan = hasil.matches?.[0] ?? '';
      if (!ucapan) {
        setStatus(online ? 'Tidak ada suara terdengar. Tekan tombol lalu bicara lagi.' : PESAN_OFFLINE);
        return;
      }
      setStatus('Tekan tombol, lalu bicara');
      await handleCommand(ucapan);
    } catch (e) {
      setListening(false);
      const pesan =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
            ? String((e as { message: unknown }).message)
            : String(e);
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      setStatus(offline ? PESAN_OFFLINE + ' (' + pesan + ')' : 'Gagal mendengar: ' + pesan);
    }
  };

  const sendTyped = () => {
    if (!typed.trim()) return;
    handleCommand(typed);
    setTyped('');
  };

  const box = {
    background: card,
    borderRadius: '12px',
    padding: '15px',
    marginBottom: '15px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  } as const;

  return (
    <div style={{ padding: '20px', paddingBottom: '100px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ color: text, margin: '0 0 20px 0', textAlign: 'center' }}>🎙️ Voice AI</h1>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button
          onClick={listen}
          disabled={busy}
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            border: 'none',
            fontSize: '48px',
            cursor: 'pointer',
            color: 'white',
            background: listening ? '#f44336' : '#4CAF50',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
          }}
        >
          {listening ? '⏺️' : '🎙️'}
        </button>
        <p style={{ color: textMuted, marginTop: '12px' }}>{status}</p>
      </div>

      {heard && (
        <div style={box}>
          <div style={{ color: textMuted, fontSize: '13px' }}>Terdengar:</div>
          <div style={{ color: text, fontSize: '18px', fontWeight: 'bold' }}>{heard}</div>
        </div>
      )}
      {reply && (
        <div style={{ ...box, borderLeft: '4px solid #4CAF50' }}>
          <div style={{ color: text, fontSize: '16px' }}>{reply}</div>
        </div>
      )}

      <div style={box}>
        <div style={{ color: textMuted, fontSize: '13px', marginBottom: '8px' }}>Atau ketik perintah:</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendTyped(); }}
            placeholder="tambah kopi dua"
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px' }}
          />
          <button
            onClick={sendTyped}
            disabled={busy}
            style={{ background: '#1976D2', color: 'white', border: 'none', borderRadius: '8px', padding: '0 16px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Kirim
          </button>
        </div>
      </div>

      <div style={box}>
        <div style={{ color: text, fontWeight: 'bold', marginBottom: '8px' }}>💡 Contoh perintah:</div>
        <div style={{ color: textMuted, lineHeight: 1.8 }}>
          • "tambah kopi dua"<br />
          • "kopi tiga teh dua"<br />
          • "omzet hari ini"<br />
          • "profit hari ini"<br />
          • "berapa transaksi hari ini"<br />
          • "stok kopi"
        </div>
      </div>
    </div>
  );
}
