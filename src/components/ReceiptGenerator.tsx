import { forwardRef } from 'react';
import { LOGO_PNG_URL } from '../assets/logo';

interface ReceiptItem {
  namaProduk: string;
  jumlah: number;
  hargaSatuan: number;
  subtotal: number;
}

interface ReceiptData {
  tokoNama: string;
  tokoId: string;
  tokoAlamat: string;
  tanggal: string;
  tipe: 'Cash' | 'Credit';
  items: ReceiptItem[];
  total: number;
  catatan?: string;
  uangDiterima?: number;
  kembalian?: number;
}

interface ReceiptGeneratorProps {
  data: ReceiptData;
}

export const ReceiptGenerator = forwardRef<HTMLDivElement, ReceiptGeneratorProps>(
  ({ data }, ref) => {
    const formatRupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

    return (
      <div
        ref={ref}
        style={{
          width: '380px',
          background: 'white',
          padding: '20px',
          fontFamily: 'monospace',
          color: '#000',
          border: '1px solid #ddd'
        }}
      >
        {/* Header dengan Logo PNG APK */}
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
          <img 
            src={LOGO_PNG_URL} 
            alt="Mama Bee Kasir Pro"
            style={{ width: '100px', height: '100px', marginBottom: '10px' }}
            onError={(e) => {
              // Fallback ke SVG jika PNG gagal load
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <h2 style={{ margin: '5px 0', fontSize: '18px', fontWeight: 'bold' }}>
            MAMA BEE KASIR PRO
          </h2>
          <p style={{ margin: '2px 0', fontSize: '10px', color: '#666' }}>
          </p>
          <div style={{ borderTop: '2px dashed #000', margin: '10px 0' }}></div>
        </div>

        {/* Info Toko */}
        <div style={{ marginBottom: '10px', fontSize: '11px' }}>
          <p style={{ margin: '2px 0' }}><strong>Toko:</strong> {data.tokoNama}</p>
          <p style={{ margin: '2px 0' }}><strong>ID:</strong> {data.tokoId}</p>
          {data.tokoAlamat && (
            <p style={{ margin: '2px 0' }}>📍 {data.tokoAlamat}</p>
          )}
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>

        {/* Info Transaksi */}
        <div style={{ marginBottom: '10px', fontSize: '11px' }}>
          <p style={{ margin: '2px 0' }}><strong>Tanggal:</strong> {data.tanggal}</p>
          <p style={{ margin: '2px 0' }}><strong>Pembayaran:</strong> {data.tipe}</p>
        </div>

        <div style={{ borderTop: '2px dashed #000', margin: '8px 0' }}></div>

        {/* List Item */}
        <div style={{ marginBottom: '10px', fontSize: '11px' }}>
          <p style={{ margin: '5px 0', fontWeight: 'bold' }}>DETAIL ITEM:</p>
          {data.items.map((item, idx) => (
            <div key={idx} style={{ marginBottom: '5px' }}>
              <p style={{ margin: '2px 0' }}>{item.namaProduk}</p>
              <p style={{ margin: '2px 0', paddingLeft: '10px' }}>
                {item.jumlah} x {formatRupiah(item.hargaSatuan)}
              </p>
              <p style={{ margin: '2px 0', paddingLeft: '10px', fontWeight: 'bold' }}>
                = {formatRupiah(item.subtotal)}
              </p>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '2px dashed #000', margin: '8px 0' }}></div>

        {/* Total */}
        <div style={{ textAlign: 'right', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
          <p style={{ margin: '2px 0' }}>TOTAL: {formatRupiah(data.total)}</p>
          {data.tipe === 'Cash' && data.uangDiterima !== undefined && (
            <>
              <p style={{ margin: '2px 0', fontSize: '12px', fontWeight: 'normal' }}>Uang Diterima: {formatRupiah(data.uangDiterima)}</p>
              <p style={{ margin: '2px 0', fontSize: '12px', fontWeight: 'normal' }}>Kembalian: {formatRupiah(data.kembalian ?? 0)}</p>
            </>
          )}
        </div>

        <div style={{ borderTop: '2px dashed #000', margin: '8px 0' }}></div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '10px' }}>
          <p style={{ margin: '2px 0' }}>✨ Terima Kasih! ✨</p>
          <p style={{ margin: '2px 0' }}>Kunjungan Anda Berharga</p>
          <p style={{ margin: '2px 0' }}>Bagi Kami</p>
          <div style={{ marginTop: '10px', fontSize: '8px', color: '#666' }}>
            Powered by Mama Bee Kasir Pro
          </div>
        </div>

        {data.catatan && (
          <>
            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>
            <p style={{ fontSize: '10px', fontStyle: 'italic' }}>
              Catatan: {data.catatan}
            </p>
          </>
        )}
      </div>
    );
  }
);

ReceiptGenerator.displayName = 'ReceiptGenerator';
