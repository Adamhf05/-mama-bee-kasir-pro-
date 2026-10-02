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

type Wanted = { product: Product; qty: number };

// Cari nama produk di kalimat, jumlah = angka sesudah (atau sebelum) nama produk
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
      if (isNum(tokens[after]) && !used[after]) {
        qty = Number(tokens[after]);
        used[after] = true;
      } else if (i > 0 && isNum(tokens[i - 1]) && !used[i - 1]) {
        qty = Number(tokens[i - 1]);
        used[i - 1] = true;
      }
      found.push({ product: p, qty: Math.max(1, qty) });
      break;
    }
  }
  return found;
}

// Cadangan: cocokkan sebagian nama ("kopi" untuk "Kopi Hitam")
function findPartial(tokens: string[], products: Product[]): Product[] {
  return products.filter(p =>
    norm(p.name).split(' ').some(nt => nt.length >= 3 && tokens.includes(nt))
  );
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

  if (/\b(stok|stock|sisa)\b/.test(joined)) {
    const p = findItems(tokens, products)[0]?.product ?? findPartial(tokens, products)[0];
    if (!p) return { reply: 'Produk tidak ditemukan.', goKasir: false };
    return { reply: `Stok ${p.name}: ${p.stock} ${p.unit || 'pcs'}.`, goKasir: false };
  }

  // Tambah ke keranjang
  let items = findItems(tokens, products);
  if (!items.length) {
    const cand = findPartial(tokens, products);
    if (cand.length === 1) {
      const n = tokens.find(t => isNum(t));
      items = [{ product: cand[0], qty: n ? Math.max(1, Number(n)) : 1 }];
    } else if (cand.length > 1) {
      return { reply: 'Maksudnya yang mana: ' + cand.map(c => c.name).join(', ') + '?', goKasir: false };
    }
  }
  if (!items.length) {
    return {
      reply: 'Maaf, belum paham. Coba: "tambah kopi dua" atau "omzet hari ini".',
      goKasir: false
    };
  }

  const added: string[] = [];
  const notes: string[] = [];
  const wanted: Array<{ productId: number; qty: number }> = [];
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
      const avail = (await SpeechRecognition.available()) as unknown as { available?: boolean };
      if (!avail.available) {
        setStatus('Pengenalan suara tidak tersedia di perangkat ini. Pakai kolom ketik di bawah.');
        return;
      }
      const perm = (await SpeechRecognition.requestPermissions()) as unknown as { speechRecognition?: string };
      if (perm.speechRecognition !== 'granted') {
        setStatus('Izin mikrofon ditolak. Izinkan di pengaturan HP.');
        return;
      }
      setListening(true);
      setStatus('Mendengarkan... bicara sekarang');
      const options = { language: 'id-ID', maxResults: 3, partialResults: false, popup: false };
      const res = (await SpeechRecognition.start(options)) as unknown as { matches?: string[] };
      setListening(false);
      setStatus('Tekan tombol, lalu bicara');
      const spoken = res.matches && res.matches[0] ? res.matches[0] : '';
      await handleCommand(spoken);
    } catch (e) {
      setListening(false);
      setStatus('Gagal mendengar: ' + (e instanceof Error ? e.message : String(e)));
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
