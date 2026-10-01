import { useState, useEffect, useRef } from 'react';
import { KunjunganRepo } from '../data/repositories/KunjunganRepo';
import { TokoRepo } from '../data/repositories/TokoRepo';
import type { KunjunganRecord, SalesToko } from '../data/database';
import { ReceiptGenerator } from '../components/ReceiptGenerator';
import { generateReceiptImage, shareReceiptViaWhatsApp, downloadReceiptImage } from '../utils/receiptUtils';

interface TransaksiDetail {
  tokoNama: string;
  tokoId: string;
  tokoAlamat: string;
  tanggal: string;
  tipe: 'Cash' | 'Credit';
  items: {
    produkId: number;
    namaProduk: string;
    hargaSatuan: number;
    jumlah: number;
    subtotal: number;
  }[];
  total: number;
}

export default function RiwayatScreen() {
  const [kunjunganList, setKunjunganList] = useState<(KunjunganRecord & { tokoNama?: string })[]>([]);
  const [tokoList, setTokoList] = useState<SalesToko[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterToko, setFilterToko] = useState<string>('Semua');
  const [filterTipe, setFilterTipe] = useState<string>('Semua');
  const [filterTanggal, setFilterTanggal] = useState<string>('');
  const [showDetail, setShowDetail] = useState<TransaksiDetail | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [kunjungan, toko] = await Promise.all([
        KunjunganRepo.getAll(),
        TokoRepo.getAll()
      ]);
      const tokoMap = new Map(toko.map(t => [t.idToko, t.nama]));
      const kunjunganWithNama = kunjungan.map(k => ({
        ...k,
        tokoNama: tokoMap.get(k.idToko) || k.idToko
      }));
      kunjunganWithNama.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
      setKunjunganList(kunjunganWithNama);
      setTokoList(toko);
    } catch (error) {
      console.error('Error loading riwayat:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredKunjungan = kunjunganList.filter(k => {
    const matchToko = filterToko === 'Semua' || k.idToko === filterToko;
    const matchTipe = filterTipe === 'Semua' || k.tipe === filterTipe;
    const matchTanggal = !filterTanggal || k.tanggal.includes(filterTanggal);
    return matchToko && matchTipe && matchTanggal;
  });

  const totalTransaksi = filteredKunjungan.length;
  const totalOmzet = filteredKunjungan.reduce((sum, k) => sum + k.total, 0);
  const totalCash = filteredKunjungan.filter(k => k.tipe === 'Cash').reduce((sum, k) => sum + k.total, 0);
  const totalCredit = filteredKunjungan.filter(k => k.tipe === 'Credit').reduce((sum, k) => sum + k.total, 0);

  const handleViewDetail = (kunjungan: KunjunganRecord & { tokoNama?: string }) => {
    const toko = tokoList.find(t => t.idToko === kunjungan.idToko);
    setShowDetail({
      tokoNama: kunjungan.tokoNama || toko?.nama || kunjungan.idToko,
      tokoId: kunjungan.idToko,
      tokoAlamat: toko?.alamat || '',
      tanggal: kunjungan.tanggal,
      tipe: kunjungan.tipe,
      items: kunjungan.items,
      total: kunjungan.total
    });
  };

  const handleShareWhatsApp = async () => {
    if (!receiptRef.current || !showDetail) return;
    try {
      const imageData = await generateReceiptImage(receiptRef.current);
      await shareReceiptViaWhatsApp(imageData, showDetail.tokoNama);
    } catch (error) {
      alert('Gagal membagikan struk');
    }
  };

  const handleDownload = async () => {
    if (!receiptRef.current || !showDetail) return;
    try {
      const imageData = await generateReceiptImage(receiptRef.current);
      await downloadReceiptImage(imageData, showDetail.tokoNama);
      alert('Struk didownload!');
    } catch (error) {
      alert('Gagal mendownload struk');
    }
  };

  const handlePrint = () => {
    if (!receiptRef.current) return;
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Fitur print tidak tersedia di versi ini.\n\nSilakan gunakan:\n- Kirim via WhatsApp\n- Download sebagai Gambar\n\nUntuk print thermal, hubungkan printer Bluetooth/USB terlebih dahulu.');
        return;
      }
      const content = receiptRef.current.innerHTML;
      printWindow.document.write('<html><head><title>Print Struk</title><style>@page { size: 58mm auto; margin: 0; } body { width: 58mm; margin: 0; padding: 5mm; font-family: monospace; font-size: 10px; } * { box-sizing: border-box; } img { max-width: 100%; }</style></head><body>' + content + '</body></html>');
      printWindow.document.close();
      setTimeout(() => {
        try {
          if (printWindow && !printWindow.closed) {
            printWindow.print();
            setTimeout(() => { try { printWindow.close(); } catch(e) {} }, 1000);
          }
        } catch (e) {
          alert('Gagal print. Pastikan printer thermal terhubung.');
        }
      }, 500);
    } catch (error) {
      alert('Fitur print tidak tersedia.\n\nGunakan WhatsApp atau Download sebagai alternatif.');
    }
  };

  const formatRupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  if (showDetail) {
    return (
      <div style={{ padding: '20px', minHeight: '100vh', background: '#f5f5f5' }}>
        <button 
          onClick={() => setShowDetail(null)}
          style={{ marginBottom: '15px', background: 'none', border: 'none', color: '#1976D2', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Kembali ke Riwayat
        </button>

        <h2 style={{ color: '#1976D2', textAlign: 'center' }}>Detail Transaksi</h2>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <ReceiptGenerator ref={receiptRef} data={showDetail} />
        </div>

        <div style={{ display: 'grid', gap: '10px', maxWidth: '400px', margin: '0 auto' }}>
          <button onClick={handleShareWhatsApp} style={{ padding: '15px', background: '#25D366', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            Kirim via WhatsApp
          </button>
          <button onClick={handleDownload} style={{ padding: '15px', background: '#1976D2', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            Download sebagai Gambar
          </button>
          <button onClick={handlePrint} style={{ padding: '15px', background: '#333', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            Print Thermal (58mm)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', paddingBottom: '100px' }}>
      <h2 style={{ marginBottom: '20px', color: '#1976D2', textAlign: 'center' }}>Riwayat Transaksi</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        <div style={{ background: '#E3F2FD', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#1976D2' }}>Total Transaksi</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976D2' }}>{totalTransaksi}</div>
        </div>
        <div style={{ background: '#E8F5E9', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#2E7D32' }}>Total Omzet</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2E7D32' }}>{formatRupiah(totalOmzet)}</div>
        </div>
        <div style={{ background: '#FFF3E0', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#E65100' }}>Cash</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#E65100' }}>{formatRupiah(totalCash)}</div>
        </div>
        <div style={{ background: '#FCE4EC', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#C2185B' }}>Credit</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#C2185B' }}>{formatRupiah(totalCredit)}</div>
        </div>
      </div>

      <div style={{ background: 'white', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>Filter:</h3>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px' }}>Toko:</label>
          <select 
            value={filterToko} 
            onChange={(e) => setFilterToko(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          >
            <option value="Semua">Semua Toko</option>
            {tokoList.map(t => (
              <option key={t.idToko} value={t.idToko}>{t.nama}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px' }}>Tipe Pembayaran:</label>
          <select 
            value={filterTipe} 
            onChange={(e) => setFilterTipe(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          >
            <option value="Semua">Semua</option>
            <option value="Cash">Cash</option>
            <option value="Credit">Credit</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px' }}>Tanggal:</label>
          <input 
            type="date" 
            value={filterTanggal}
            onChange={(e) => setFilterTanggal(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
      ) : filteredKunjungan.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <p style={{ fontSize: '48px', margin: 0 }}>📊</p>
          <p>Tidak ada transaksi.</p>
        </div>
      ) : (
        <div>
          {filteredKunjungan.map((k, idx) => (
            <div 
              key={k.id || idx}
              onClick={() => handleViewDetail(k)}
              style={{ 
                background: 'white', 
                padding: '15px', 
                borderRadius: '8px', 
                marginBottom: '10px', 
                border: '1px solid #ddd',
                borderLeft: `4px solid ${k.tipe === 'Cash' ? '#4CAF50' : '#FF9800'}`,
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <strong style={{ color: '#1976D2' }}>{k.tokoNama}</strong>
                <span style={{ 
                  padding: '2px 8px', 
                  background: k.tipe === 'Cash' ? '#E8F5E9' : '#FFF3E0',
                  color: k.tipe === 'Cash' ? '#2E7D32' : '#E65100',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}>
                  {k.tipe}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>{k.tanggal}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#999' }}>{k.items.length} item</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#2E7D32' }}>{formatRupiah(k.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
