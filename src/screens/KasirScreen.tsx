import { showImageOverlay } from '../utils/imageOverlay';
// KASIR_V2_BERSIH: Kasir fokus transaksi (tanpa katalog visual)
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ProductRepo } from '../data/repositories/ProductRepo';
import { TransactionRepo } from '../data/repositories/TransactionRepo';
import { CustomerRepo } from '../data/repositories/CustomerRepo';
import type { Product, Transaction, Customer } from '../data/database';
import { ReceiptGenerator } from '../components/ReceiptGenerator';
import { generateReceiptImage, shareReceiptViaWhatsApp, downloadReceiptImage } from '../utils/receiptUtils';

interface CartItem {
  productId: number;
  name: string;
  price: number;
  qty: number;
  stock: number;
}

const formatRupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

export function KasirScreen() {
  const { card, text, textMuted, border, dark } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentStr, setPaymentStr] = useState('');
  const [saving, setSaving] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const loadProducts = async () => {
    const data = await ProductRepo.getAll();
    setProducts(data);

    // Barang dari Voice AI
    try {
      const raw = localStorage.getItem('mamabee_voice_cart');
      if (raw) {
        localStorage.removeItem('mamabee_voice_cart');
        const wanted: Array<{ productId: number; qty: number }> = JSON.parse(raw);
        const items: CartItem[] = [];
        for (const w of wanted) {
          const p = data.find(x => x.id === w.productId);
          if (p && p.stock > 0) {
            items.push({ productId: p.id as number, name: p.name, price: p.price, qty: Math.min(w.qty, p.stock), stock: p.stock });
          }
        }
        if (items.length) {
          setCart(prev => {
            const next = prev.map(c => ({ ...c }));
            for (const it of items) {
              const e = next.find(c => c.productId === it.productId);
              if (e) e.qty = Math.min(e.qty + it.qty, it.stock);
              else next.push(it);
            }
            return next;
          });
        }
      }
    } catch {
      // abaikan
    }
  };

  useEffect(() => {
    loadProducts();
    CustomerRepo.getAll().then(setCustomers);
  }, []);

  const q = query.trim().toLowerCase();
  const suggestions = q
    ? products
        .filter(p => p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q))
        .sort((a, b) => {
          const sa = a.name.toLowerCase().startsWith(q) ? 0 : 1;
          const sb = b.name.toLowerCase().startsWith(q) ? 0 : 1;
          return sa - sb || a.name.localeCompare(b.name);
        })
        .slice(0, 8)
    : [];

  const addToCart = (product: Product) => {
    if (product.id === undefined) return;
    const existing = cart.find(i => i.productId === product.id);
    if (existing) {
      if (existing.qty < product.stock) {
        setCart(cart.map(i => (i.productId === product.id ? { ...i, qty: i.qty + 1 } : i)));
      } else {
        alert('Stok tidak mencukupi!');
      }
    } else if (product.stock > 0) {
      setCart([...cart, { productId: product.id, name: product.name, price: product.price, qty: 1, stock: product.stock }]);
    } else {
      alert('Stok habis!');
    }
    setQuery('');
  };

  const updateQty = (productId: number, newQty: number) => {
    if (newQty <= 0) {
      setCart(cart.filter(i => i.productId !== productId));
      return;
    }
    const item = cart.find(i => i.productId === productId);
    if (item && newQty > item.stock) {
      alert('Stok tidak mencukupi!');
      return;
    }
    setCart(cart.map(i => (i.productId === productId ? { ...i, qty: newQty } : i)));
  };

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
  const payment = Number(paymentStr) || 0;
  const kurang = payment < total;

  const handleCheckout = async () => {
    if (cart.length === 0 || saving) return;
    if (kurang) {
      alert('Pembayaran kurang!');
      return;
    }
    setSaving(true);
    try {
      const invoice = `MB-${Date.now()}`;
      const pelanggan = customers.find(c => String(c.id) === selectedCustomerId);
      const transaction: Omit<Transaction, 'id'> = {
        invoice,
        items: cart.map(i => ({ productId: i.productId, name: i.name, price: i.price, qty: i.qty })),
        total,
        payment,
        change: payment - total,
        createdAt: new Date(),
        ...(pelanggan ? { customerId: String(pelanggan.id), customerName: pelanggan.nama } : {})
      };

      await TransactionRepo.add(transaction);
      for (const item of cart) {
        await ProductRepo.addStock(item.productId, -item.qty);
      }

      setLastTransaction({ ...transaction, id: Date.now() } as Transaction);
      setShowReceipt(true);
      setCart([]);
      setPaymentStr('');
      setSelectedCustomerId('');
      await loadProducts();
    } catch (error) {
      console.error('Error checkout:', error);
      alert('Gagal memproses transaksi: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Data struk, bentuknya sama dengan struk Toko
  const kasirReceiptData = lastTransaction
    ? {
        tokoNama: 'Kasir Umum',
        tokoId: lastTransaction.invoice,
        tokoAlamat: '-',
        pelanggan: lastTransaction.customerName,
        tanggal: new Date(lastTransaction.createdAt).toLocaleString('id-ID'),
        tipe: 'Cash' as const,
        items: lastTransaction.items.map(it => ({
          namaProduk: it.name,
          jumlah: it.qty,
          hargaSatuan: it.price,
          subtotal: it.price * it.qty
        })),
        total: lastTransaction.total,
        uangDiterima: lastTransaction.payment,
        kembalian: lastTransaction.change
      }
    : null;

  const handleShareReceipt = async () => {
    if (!receiptRef.current) return;
    try {
      setSaving(true);
      const imageData = await generateReceiptImage(receiptRef.current);
      await shareReceiptViaWhatsApp(imageData, 'Kasir Umum');
    } catch (error) {
      console.error('Share error:', error);
      alert('Gagal membagikan struk: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current) return;
    try {
      setSaving(true);
      const imageData = await generateReceiptImage(receiptRef.current);
      await downloadReceiptImage(imageData, 'Kasir Umum');
      alert('Struk berhasil didownload!');
    } catch (error) {
      console.error('Download error:', error);
      alert('Gagal mendownload struk');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!receiptRef.current) return;
    try {
      setSaving(true);
      const imageData = await generateReceiptImage(receiptRef.current);
      showImageOverlay(imageData, 'Struk Kasir');
    } catch (error) {
      console.error('Print error:', error);
      alert('Gagal membuat gambar struk');
    } finally {
      setSaving(false);
    }
  };

  const inputBase = {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: `1px solid ${border}`,
    background: dark ? '#3a3a3a' : '#ffffff',
    color: text,
    fontSize: '16px',
    boxSizing: 'border-box'
  } as const;

  const qtyBtn = (bg: string) => ({
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    border: 'none',
    background: bg,
    color: 'white',
    fontWeight: 'bold',
    fontSize: '18px',
    cursor: 'pointer'
  }) as const;

  return (
    <div style={{ padding: '16px', paddingBottom: '100px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ color: text, margin: '0 0 14px 0', fontSize: '22px' }}>🛒 Kasir</h1>

      <div style={{ marginBottom: '16px' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const first = suggestions.find(p => p.stock > 0);
              if (first) addToCart(first);
            }
          }}
          placeholder="🔍 Ketik nama produk untuk menambah..."
          style={inputBase}
        />
        {q && (
          <div style={{ marginTop: '6px', background: card, border: `1px solid ${border}`, borderRadius: '10px', overflow: 'hidden' }}>
            {suggestions.length === 0 ? (
              <div style={{ padding: '12px', color: textMuted, fontSize: '14px' }}>
                Produk tidak ditemukan. Tambahkan di menu Produk.
              </div>
            ) : (
              suggestions.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={p.stock <= 0}
                  style={{
                    display: 'flex',
                    width: '100%',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${border}`,
                    color: text,
                    textAlign: 'left',
                    fontSize: '15px',
                    cursor: p.stock > 0 ? 'pointer' : 'not-allowed',
                    opacity: p.stock > 0 ? 1 : 0.5
                  }}
                >
                  <span>
                    <b>{p.name}</b>
                    <br />
                    <span style={{ color: textMuted, fontSize: '12px' }}>
                      {p.category} • Stok {p.stock} {p.unit || 'Pcs'}
                    </span>
                  </span>
                  <span style={{ color: '#1976D2', fontWeight: 'bold' }}>
                    {p.stock > 0 ? formatRupiah(p.price) : 'Habis'}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {cart.length === 0 ? (
        <div style={{ textAlign: 'center', color: textMuted, padding: '40px 0' }}>
          <div style={{ fontSize: '40px' }}>🧾</div>
          <div>Keranjang kosong.</div>
          <div style={{ fontSize: '13px' }}>Ketik nama produk di atas untuk mulai transaksi.</div>
        </div>
      ) : (
        <>
          <div style={{ color: text, fontWeight: 'bold', marginBottom: '8px' }}>🛍️ Keranjang ({totalItems} item)</div>
          <div style={{ background: card, borderRadius: '12px', border: `1px solid ${border}`, marginBottom: '16px' }}>
            {cart.map((item, i) => (
              <div key={item.productId} style={{ padding: '12px', borderTop: i ? `1px solid ${border}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: text, fontWeight: 'bold' }}>{item.name}</div>
                    <div style={{ color: textMuted, fontSize: '12px' }}>{formatRupiah(item.price)} × {item.qty}</div>
                  </div>
                  <div style={{ color: '#1976D2', fontWeight: 'bold' }}>{formatRupiah(item.price * item.qty)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                  <button onClick={() => updateQty(item.productId, item.qty - 1)} style={qtyBtn('#f44336')}>−</button>
                  <span style={{ color: text, fontWeight: 'bold', minWidth: '24px', textAlign: 'center' }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.productId, item.qty + 1)} style={qtyBtn('#4CAF50')}>+</button>
                  <button onClick={() => updateQty(item.productId, 0)} style={{ ...qtyBtn('#FF9800'), marginLeft: 'auto', fontSize: '14px' }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: card, borderRadius: '12px', border: `1px solid ${border}`, padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
              <span style={{ color: textMuted }}>Total</span>
              <span style={{ color: '#1976D2', fontSize: '26px', fontWeight: 'bold' }}>{formatRupiah(total)}</span>
            </div>

            <label style={{ display: 'block', color: textMuted, fontSize: '12px', marginBottom: '6px' }}>💵 Uang Diterima (Rp)</label>
            <input
              type="number"
              inputMode="numeric"
              value={paymentStr}
              onChange={(e) => setPaymentStr(e.target.value)}
              placeholder="Contoh: 50000"
              style={inputBase}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0 14px', padding: '12px', borderRadius: '8px', background: dark ? '#1f1f1f' : '#f5f5f5', fontWeight: 'bold' }}>
              <span style={{ color: textMuted }}>Kembalian</span>
              <span style={{ color: paymentStr !== '' && kurang ? '#f44336' : '#4CAF50' }}>
                {paymentStr === ''
                  ? formatRupiah(0)
                  : kurang
                    ? 'Kurang ' + formatRupiah(total - payment)
                    : formatRupiah(payment - total)}
              </span>
            </div>

            <label style={{ display: 'block', color: textMuted, fontSize: '12px', marginBottom: '6px' }}> Pilih Pelanggan</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              style={{ ...inputBase, padding: '10px', fontSize: '15px', marginBottom: '14px' }}
            >
              <option value=""> Pelanggan Umum (Tanpa Nama)</option>
              {customers.map(c => (
                <option key={c.id} value={String(c.id)}>
                  {c.nama}{c.telepon ? ' • ' + c.telepon : ''}
                </option>
              ))}
            </select>

            <button
              onClick={handleCheckout}
              disabled={saving || kurang}
              style={{
                width: '100%',
                padding: '15px',
                background: saving || kurang ? '#9e9e9e' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: saving || kurang ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? '⏳ Memproses...' : '💳 Bayar ' + formatRupiah(total)}
            </button>
          </div>
        </>
      )}

      {showReceipt && lastTransaction && kasirReceiptData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, overflowY: 'auto', padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '420px', margin: '0 auto', borderRadius: '16px', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <div style={{ fontSize: '40px' }}>✅</div>
              <h2 style={{ margin: 0, color: '#4CAF50' }}>Transaksi Berhasil!</h2>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <ReceiptGenerator ref={receiptRef} data={kasirReceiptData} />
            </div>

            <div style={{ display: 'grid', gap: '10px', marginTop: '15px' }}>
              <button onClick={handleShareReceipt} disabled={saving} style={{ padding: '14px', background: '#25D366', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
                📱 Share ke WhatsApp
              </button>
              <button onClick={handleDownloadReceipt} disabled={saving} style={{ padding: '14px', background: '#1976D2', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
                💾 Download Struk
              </button>
              <button onClick={handlePrintReceipt} style={{ padding: '14px', background: '#607D8B', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
                ️ Cetak (Gambar Struk)
              </button>
              <button onClick={() => setShowReceipt(false)} style={{ padding: '12px', background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
