import { useState, useEffect } from 'react';
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
      await ProductRepo.updateStock(item.productId, -item.qty);
    }

    setLastTransaction({ ...transaction, id: Date.now() } as Transaction);
    setShowReceipt(true);
    setShowCheckout(false);
    setCart([]);
    setPayment(0);
    loadProducts();
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

      {showReceipt && lastTransaction && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            width: '100%',
            maxWidth: '400px',
            borderRadius: '16px',
            padding: '30px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
              <h2 style={{ margin: 0, color: '#4CAF50' }}>Transaksi Berhasil!</h2>
              <p style={{ color: '#666', fontSize: '12px' }}>{lastTransaction.invoice}</p>
            </div>

            <div style={{ borderTop: '1px dashed #ddd', paddingTop: '15px', marginBottom: '15px' }}>
              {lastTransaction.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span>{item.name} x{item.qty}</span>
                  <span>{formatRupiah(item.price * item.qty)}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px dashed #ddd', paddingTop: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Total:</span>
                <span style={{ fontWeight: 'bold' }}>{formatRupiah(lastTransaction.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Bayar:</span>
                <span>{formatRupiah(lastTransaction.payment)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Kembali:</span>
                <span style={{ fontWeight: 'bold', color: '#4CAF50' }}>{formatRupiah(lastTransaction.change)}</span>
              </div>
            </div>

            <button
              onClick={() => setShowReceipt(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#1976D2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginTop: '20px'
              }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
