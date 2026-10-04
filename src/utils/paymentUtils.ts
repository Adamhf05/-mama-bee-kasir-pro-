import type { Transaction, KunjunganRecord } from '../data/database';

export const KASIR_ID = 'KASIR';
export const KASIR_NAMA = 'Kasir Umum';

// Ubah transaksi Kasir Utama ke bentuk yang sama dengan kunjungan Toko.
export function transactionToRecord(t: Transaction): KunjunganRecord & { tokoNama?: string } {
  const created = new Date(t.createdAt);
  return {
    id: -(t.id ?? 0),
    idToko: KASIR_ID,
    tokoNama: KASIR_NAMA,
    tanggal: created.toLocaleString('id-ID'),
    tipe: 'Cash',
    total: t.total,
    items: t.items.map(it => ({
      produkId: it.productId,
      namaProduk: it.name,
      hargaSatuan: it.price,
      jumlah: it.qty,
      subtotal: it.price * it.qty
    })),
    createdAt: created,
    uangDiterima: t.payment,
    kembalian: t.change
  };
}
