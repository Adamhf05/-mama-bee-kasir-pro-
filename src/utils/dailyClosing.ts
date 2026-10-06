import { db } from '../data/database';
import type {
  DailyRecap,
  DailyRecapProduk,
  KunjunganRecord,
  Product,
  StockLogEntry,
  Transaction
} from '../data/database';
import { ProductRepo } from '../data/repositories/ProductRepo';
import { TokoRepo } from '../data/repositories/TokoRepo';

export const dayKey = (d: Date): string =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

const rupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

function buildRecap(
  tanggal: string,
  trans: Transaction[],
  kunj: KunjunganRecord[],
  products: Product[],
  tokoNama: Map<string, string>,
  logs: StockLogEntry[],
  hariIni: boolean
): DailyRecap {
  const hpp = new Map<number, number>(products.map(p => [p.id as number, p.hpp || 0] as [number, number]));
  const akum = new Map<number, { laku: number; omzet: number }>();
  const tambah = (id: number, qty: number, omzet: number) => {
    const cur = akum.get(id) ?? { laku: 0, omzet: 0 };
    akum.set(id, { laku: cur.laku + qty, omzet: cur.omzet + omzet });
  };

  let omzet = 0;
  let profit = 0;
  let cashDiterima = 0;
  let kembalian = 0;
  let cashBersih = 0;
  let piutang = 0;
  const pel = new Map<string, { nama: string; transaksi: number; total: number }>();
  const tk = new Map<string, { idToko: string; nama: string; transaksi: number; total: number; cash: number; credit: number }>();

  for (const t of trans) {
    omzet += t.total;
    cashBersih += t.total;
    cashDiterima += t.payment;
    kembalian += t.change;
    for (const it of t.items) {
      profit += (it.price - (hpp.get(it.productId) ?? 0)) * it.qty;
      tambah(it.productId, it.qty, it.price * it.qty);
    }
    const key = t.customerId ?? 'umum';
    const cur = pel.get(key) ?? { nama: t.customerName ?? 'Pelanggan Umum', transaksi: 0, total: 0 };
    cur.transaksi += 1;
    cur.total += t.total;
    pel.set(key, cur);
  }

  for (const k of kunj) {
    omzet += k.total;
    if (k.tipe === 'Cash') {
      cashBersih += k.total;
      if (k.uangDiterima !== undefined) {
        cashDiterima += k.uangDiterima;
        kembalian += k.kembalian ?? 0;
      }
    } else {
      piutang += k.total;
    }
    for (const it of k.items) {
      profit += (it.hargaSatuan - (hpp.get(it.produkId) ?? 0)) * it.jumlah;
      tambah(it.produkId, it.jumlah, it.subtotal);
    }
    const cur = tk.get(k.idToko) ?? {
      idToko: k.idToko,
      nama: tokoNama.get(k.idToko) ?? k.idToko,
      transaksi: 0,
      total: 0,
      cash: 0,
      credit: 0
    };
    cur.transaksi += 1;
    cur.total += k.total;
    if (k.tipe === 'Cash') cur.cash += k.total;
    else cur.credit += k.total;
    tk.set(k.idToko, cur);
  }

  const mk = new Map<number, { masuk: number; koreksi: number }>();
  for (const l of logs) {
    if (dayKey(new Date(l.createdAt)) !== tanggal) continue;
    const cur = mk.get(l.productId) ?? { masuk: 0, koreksi: 0 };
    if (l.qty > 0) cur.masuk += l.qty;
    else cur.koreksi += l.qty;
    mk.set(l.productId, cur);
  }

  const produk: DailyRecapProduk[] = [];
  for (const p of products) {
    const a = akum.get(p.id as number) ?? { laku: 0, omzet: 0 };
    const m = mk.get(p.id as number) ?? { masuk: 0, koreksi: 0 };
    const aktif = a.laku > 0 || m.masuk !== 0 || m.koreksi !== 0;
    if (!aktif && !hariIni) continue;
    const stokAkhir = hariIni ? p.stock : null;
    produk.push({
      id: p.id as number,
      nama: p.name,
      satuan: p.unit || 'Pcs',
      stokAwal: stokAkhir === null ? null : stokAkhir + a.laku - (m.masuk + m.koreksi),
      stokAkhir,
      laku: a.laku,
      masuk: m.masuk,
      koreksi: m.koreksi,
      omzet: a.omzet
    });
  }
  produk.sort((x, y) => x.nama.localeCompare(y.nama));

  return {
    tanggal,
    dibuatPada: new Date(),
    omzet,
    hppTotal: omzet - profit,
    profit,
    transaksiKasir: trans.length,
    kunjunganToko: kunj.length,
    cashDiterima,
    kembalian,
    cashBersih,
    piutang,
    produk,
    pelanggan: Array.from(pel.values()).sort((a, b) => b.total - a.total),
    toko: Array.from(tk.values()).sort((a, b) => b.total - a.total)
  };
}

// Tutup hari: buat/perbarui rekap tiap tanggal yang masih punya transaksi belum diarsipkan,
// lalu tandai transaksinya sebagai arsip. Tidak ada data yang dihapus.
export async function closeDay(): Promise<{ tanggal: string[]; jumlah: number }> {
  const [products, trans, kunj, toko, logs] = await Promise.all([
    ProductRepo.getAll(),
    db.transactions.toArray(),
    db.kunjungan.toArray(),
    TokoRepo.getAll(),
    db.stockLog.toArray()
  ]);

  const belumT = trans.filter(t => !t.diarsipkan);
  const belumK = kunj.filter(k => !k.diarsipkan);
  const tanggalSet = new Set<string>();
  belumT.forEach(t => tanggalSet.add(dayKey(new Date(t.createdAt))));
  belumK.forEach(k => tanggalSet.add(dayKey(new Date(k.createdAt))));
  if (tanggalSet.size === 0) return { tanggal: [], jumlah: 0 };

  const tokoNama = new Map<string, string>(toko.map(t => [t.idToko, t.nama] as [string, string]));
  const hariIni = dayKey(new Date());
  const tanggal = Array.from(tanggalSet).sort();

  const recaps = tanggal.map(d =>
    buildRecap(
      d,
      trans.filter(t => dayKey(new Date(t.createdAt)) === d),
      kunj.filter(k => dayKey(new Date(k.createdAt)) === d),
      products,
      tokoNama,
      logs,
      d === hariIni
    )
  );

  await db.transaction('rw', db.dailyRecaps, db.transactions, db.kunjungan, async () => {
    for (const r of recaps) await db.dailyRecaps.put(r);
    for (const t of belumT) {
      if (t.id !== undefined) await db.transactions.update(t.id, { diarsipkan: dayKey(new Date(t.createdAt)) });
    }
    for (const k of belumK) {
      if (k.id !== undefined) await db.kunjungan.update(k.id, { diarsipkan: dayKey(new Date(k.createdAt)) });
    }
  });

  return { tanggal, jumlah: belumT.length + belumK.length };
}

// Halaman HTML rekap (untuk dijadikan gambar)
export function recapToHtml(r: DailyRecap): string {
  const esc = (v: unknown) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const num = (n: number | null) => (n === null ? '-' : String(n));
  const tgl = new Date(r.tanggal + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const row = (label: string, value: string) =>
    '<tr><td>' + label + '</td><td class="r"><b>' + value + '</b></td></tr>';

  let h = '<html><head><meta charset="utf-8"><style>' +
    'body{font-family:sans-serif;padding:20px;color:#222}' +
    'h2,h3{margin:0}.c{text-align:center;margin-bottom:12px}' +
    'table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}' +
    'th,td{border:1px solid #ddd;padding:6px;text-align:left}' +
    'th{background:#1976D2;color:white}.r{text-align:right}' +
    '.note{font-size:11px;color:#666;margin-top:10px;line-height:1.5}' +
    '</style></head><body>';
  h += '<div class="c"><h2>MAMA BEE KASIR PRO</h2><h3>Rekap Harian</h3><p>' + esc(tgl) + '</p></div>';
  h += '<table><tbody>' +
    row('Omzet', rupiah(r.omzet)) +
    row('HPP (modal)', rupiah(r.hppTotal)) +
    row('Profit', rupiah(r.profit)) +
    row('Transaksi Kasir', String(r.transaksiKasir)) +
    row('Kunjungan Toko', String(r.kunjunganToko)) +
    row('Uang Diterima (Cash)', rupiah(r.cashDiterima)) +
    row('Kembalian', rupiah(r.kembalian)) +
    row('Uang Cash Bersih di Laci', rupiah(r.cashBersih)) +
    row('Piutang (Credit Toko)', rupiah(r.piutang)) +
    '</tbody></table>';

  h += '<h3 style="margin-top:20px">Stok Produk</h3>';
  h += r.produk.length === 0
    ? '<p>Tidak ada pergerakan produk.</p>'
    : '<table><thead><tr><th>Produk</th><th>Awal</th><th>Masuk</th><th>Koreksi</th><th>Laku</th><th>Akhir</th><th>Omzet</th></tr></thead><tbody>' +
      r.produk.map(p =>
        '<tr><td>' + esc(p.nama) + '</td><td class="r">' + num(p.stokAwal) + '</td><td class="r">' +
        (p.masuk ? '+' + p.masuk : '-') + '</td><td class="r">' + (p.koreksi ? String(p.koreksi) : '-') +
        '</td><td class="r">' + p.laku + '</td><td class="r">' + num(p.stokAkhir) + '</td><td class="r">' +
        rupiah(p.omzet) + '</td></tr>'
      ).join('') + '</tbody></table>';

  h += '<h3 style="margin-top:20px">Per Pelanggan (Kasir)</h3>';
  h += r.pelanggan.length === 0
    ? '<p>Tidak ada transaksi Kasir.</p>'
    : '<table><thead><tr><th>Pelanggan</th><th>Transaksi</th><th>Total</th></tr></thead><tbody>' +
      r.pelanggan.map(p => '<tr><td>' + esc(p.nama) + '</td><td class="r">' + p.transaksi + '</td><td class="r">' + rupiah(p.total) + '</td></tr>').join('') +
      '</tbody></table>';

  h += '<h3 style="margin-top:20px">Per Toko (Kunjungan)</h3>';
  h += r.toko.length === 0
    ? '<p>Tidak ada kunjungan Toko.</p>'
    : '<table><thead><tr><th>Toko</th><th>Transaksi</th><th>Total</th><th>Cash</th><th>Credit</th></tr></thead><tbody>' +
      r.toko.map(t => '<tr><td>' + esc(t.nama) + '</td><td class="r">' + t.transaksi + '</td><td class="r">' + rupiah(t.total) + '</td><td class="r">' + rupiah(t.cash) + '</td><td class="r">' + rupiah(t.credit) + '</td></tr>').join('') +
      '</tbody></table>';

  h += '<p class="note">Stok Awal = Stok Akhir + Laku − (Masuk + Koreksi). Stok hanya tercatat bila hari ditutup pada hari yang sama. Profit memakai HPP produk saat rekap dibuat.</p>';
  h += '</body></html>';
  return h;
}
