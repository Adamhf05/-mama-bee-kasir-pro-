import { ReceiptGenerator } from '../components/ReceiptGenerator';
import { generateReceiptImage, shareReceiptViaWhatsApp, downloadReceiptImage } from '../utils/receiptUtils';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ProductRepo } from '../data/repositories/ProductRepo';
import { TransactionRepo } from '../data/repositories/TransactionRepo';
import type { Product, Transaction } from '../data/database';

interface CartItem {
  productId: number;
  name: string;
  price: number;
  qty: number;
  stock: number;
  image?: string;
}

export function KasirScreen() {
  const { bg, card, text, textMuted, border, primary } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [payment, setPayment] = useState(0);

  useEffect(() => {
    loadProducts();
  }, []);

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
            items.push({ productId: p.id!, name: p.name, price: p.price, qty: Math.min(w.qty, p.stock), stock: p.stock, image: p.image });
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

  const allCategories = Array.from(new Set(products.map(p => p.category).filter(c => c)));

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    return matchSearch && matchCategory && p.stock > 0;
  });

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      if (existing.qty < product.stock) {
        setCart(cart.map(item =>
          item.productId === product.id
            ? { ...item, qty: item.qty + 1 }
            : item
        ));
      } else {
        alert('Stok tidak mencukupi!');
      }
    } else {
      setCart([...cart, {
        productId: product.id!,
        name: product.name,
        price: product.price,
        qty: 1,
        stock: product.stock,
        image: product.image
      }]);
    }
  };

  const updateQty = (productId: number, newQty: number) => {
    if (newQty <= 0) {
      setCart(cart.filter(item => item.productId !== productId));
    } else {
      const item = cart.find(i => i.productId === productId);
      if (item && newQty <= item.stock) {
        setCart(cart.map(item =>
          item.productId === productId ? { ...item, qty: newQty } : item
        ));
      } else {
        alert('Stok tidak mencukupi!');
      }
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const change = payment - total;

  const handleCheckout = async () => {
    if (payment < total) {
      alert('Pembayaran kurang!');
      return;
    }

    const invoice = `MB-${Date.now()}`;
    const transaction: Omit<Transaction, 'id'> = {
      invoice,
      items: cart.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        qty: item.qty
      })),
      total,
      payment,
      change,
      createdAt: new Date()
    };

    // Simpan transaksi
    await TransactionRepo.add(transaction);

    // Kurangi stok
    for (const item of cart) {
      await ProductRepo.addStock(item.productId, -item.qty);
    }

    setLastTransaction({ ...transaction, id: Date.now() } as Transaction);
    setShowReceipt(true);
    setShowCheckout(false);
    setCart([]);
    setPayment(0);
    loadProducts();
  };

  const receiptRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  // Data struk Kasir Utama, bentuknya sama dengan struk Toko
  const kasirReceiptData = lastTransaction
    ? {
        tokoNama: 'Kasir Umum',
        tokoId: lastTransaction.invoice,
        tokoAlamat: '-',
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
      setSharing(true);
      const imageData = await generateReceiptImage(receiptRef.current);
      await shareReceiptViaWhatsApp(imageData, 'Kasir Umum');
    } catch (error) {
      console.error('Share error:', error);
      alert('❌ Gagal membagikan struk: ' + (error as Error).message);
    } finally {
      setSharing(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current) return;
    try {
      setSharing(true);
      const imageData = await generateReceiptImage(receiptRef.current);
      await downloadReceiptImage(imageData, 'Kasir Umum');
      alert('✅ Struk berhasil didownload!');
    } catch (error) {
      console.error('Download error:', error);
      alert('❌ Gagal mendownload struk');
    } finally {
      setSharing(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('⚠️ Popup diblokir! Izinkan popup untuk print.');
      return;
    }
    const content = receiptRef.current.innerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Struk</title>
          <style>
            @page { size: 58mm auto; margin: 0; }
            body { width: 58mm; margin: 0; padding: 5mm; font-family: monospace; font-size: 10px; }
            * { box-sizing: border-box; }
            img { max-width: 100%; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const formatRupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  return (
    <div style={{ padding: '20px', paddingBottom: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: text, margin: 0 }}>🛒 Kasir</h1>
        {cart.length > 0 && (
          <button
            onClick={() => setShowCheckout(true)}
            style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🛒 {totalItems} item • {formatRupiah(total)}
          </button>
        )}
      </div>

      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder=" Cari produk..."
        style={{
          width: '100%',
          padding: '12px',
          border: `1px solid ${border}`,
          borderRadius: '8px',
          marginBottom: '15px',
          boxSizing: 'border-box',
          fontSize: '14px'
        }}
      />

      {allCategories.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' }}>
          <button
            onClick={() => setSelectedCategory('Semua')}
            style={{
              padding: '8px 16px',
              background: selectedCategory === 'Semua' ? primary : card,
              color: selectedCategory === 'Semua' ? 'white' : text,
              border: `1px solid ${border}`,
              borderRadius: '20px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '12px'
            }}
          >
            Semua
          </button>
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '8px 16px',
                background: selectedCategory === cat ? primary : card,
                color: selectedCategory === cat ? 'white' : text,
                border: `1px solid ${border}`,
                borderRadius: '20px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: '12px'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {filteredProducts.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: textMuted }}>
          <p style={{ fontSize: '48px', marginBottom: '10px' }}></p>
          <p>Belum ada produk tersedia</p>
          <p style={{ fontSize: '12px' }}>Tambahkan produk di menu Produk terlebih dahulu</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
          {filteredProducts.map(p => (
            <div key={p.id} style={{
              background: card,
              borderRadius: '12px',
              padding: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer'
            }} onClick={() => addToCart(p)}>
              {p.image ? (
                <img src={p.image} alt={p.name} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} />
              ) : (
                <div style={{ width: '100%', height: '100px', background: bg, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '8px' }}>
                  📦
                </div>
              )}
              <div style={{ fontWeight: 'bold', color: text, fontSize: '13px', marginBottom: '4px' }}>{p.name}</div>
              <div style={{ fontSize: '11px', color: textMuted, marginBottom: '4px' }}>{p.category} • {(p as any).unit || 'Pcs'}</div>
              <div style={{ fontSize: '13px', color: primary, fontWeight: 'bold', marginBottom: '4px' }}>{formatRupiah(p.price)}</div>
              <div style={{ fontSize: '11px', color: p.stock < 10 ? '#f44336' : textMuted }}>Stok: {p.stock}</div>
            </div>
          ))}
        </div>
      )}

      {showCheckout && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'flex-end'
        }}>
          <div style={{
            background: card,
            width: '100%',
            maxHeight: '80vh',
            borderRadius: '16px 16px 0 0',
            padding: '20px',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: text }}>🛒 Keranjang</h2>
              <button
                onClick={() => setShowCheckout(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: text }}
              >
                ✕
              </button>
            </div>

            {cart.map(item => (
              <div key={item.productId} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 0',
                borderBottom: `1px solid ${border}`
              }}>
                {item.image ? (
                  <img src={item.image} alt={item.name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px' }} />
                ) : (
                  <div style={{ width: '50px', height: '50px', background: bg, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}></div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: text, fontSize: '14px' }}>{item.name}</div>
                  <div style={{ fontSize: '12px', color: primary }}>{formatRupiah(item.price)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => updateQty(item.productId, item.qty - 1)}
                    style={{ width: '28px', height: '28px', background: '#f44336', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}
                  >
                    -
                  </button>
                  <span style={{ color: text, fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.productId, item.qty + 1)}
                    style={{ width: '28px', height: '28px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}
                  >
                    +
                  </button>
                </div>
                <div style={{ color: text, fontWeight: 'bold', minWidth: '80px', textAlign: 'right' }}>
                  {formatRupiah(item.price * item.qty)}
                </div>
              </div>
            ))}

            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: `2px solid ${border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <span style={{ color: text, fontSize: '18px', fontWeight: 'bold' }}>Total:</span>
                <span style={{ color: primary, fontSize: '20px', fontWeight: 'bold' }}>{formatRupiah(total)}</span>
              </div>

              <label style={{ fontSize: '12px', color: textMuted, fontWeight: 'bold' }}>PEMBAYARAN</label>
              <input
                type="number"
                value={payment || ''}
                onChange={(e) => setPayment(parseInt(e.target.value) || 0)}
                placeholder="0"
                style={{ width: '100%', padding: '12px', border: `1px solid ${border}`, borderRadius: '8px', marginBottom: '15px', boxSizing: 'border-box', fontSize: '16px' }}
              />

              {payment > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', padding: '10px', background: bg, borderRadius: '8px' }}>
                  <span style={{ color: textMuted }}>Kembalian:</span>
                  <span style={{ color: change >= 0 ? '#4CAF50' : '#f44336', fontWeight: 'bold' }}>{formatRupiah(change)}</span>
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={payment < total}
                style={{
                  width: '100%',
                  padding: '15px',
                  background: payment >= total ? '#4CAF50' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: payment >= total ? 'pointer' : 'not-allowed'
                }}
              >
                💳 Bayar {formatRupiah(total)}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceipt && lastTransaction && kasirReceiptData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          overflowY: 'auto',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            width: '100%',
            maxWidth: '420px',
            margin: '0 auto',
            borderRadius: '16px',
            padding: '20px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <div style={{ fontSize: '40px' }}>✅</div>
              <h2 style={{ margin: 0, color: '#4CAF50' }}>Transaksi Berhasil!</h2>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <ReceiptGenerator ref={receiptRef} data={kasirReceiptData} />
            </div>

            <div style={{ display: 'grid', gap: '10px', marginTop: '15px' }}>
              <button
                onClick={handleShareReceipt}
                disabled={sharing}
                style={{ padding: '14px', background: '#25D366', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                📱 Share ke WhatsApp
              </button>
              <button
                onClick={handleDownloadReceipt}
                disabled={sharing}
                style={{ padding: '14px', background: '#1976D2', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                💾 Download Struk
              </button>
              <button
                onClick={handlePrintReceipt}
                style={{ padding: '14px', background: '#607D8B', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🖨️ Cetak Thermal
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                style={{ padding: '12px', background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
