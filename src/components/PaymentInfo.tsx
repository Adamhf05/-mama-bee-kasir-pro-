import { useTheme } from '../contexts/ThemeContext';

interface PaymentInfoProps {
  method: string;
  received?: number;
  change?: number;
}

const rupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

export function PaymentInfo({ method, received, change }: PaymentInfoProps) {
  const { text, textMuted } = useTheme();
  const isCash = method === 'Cash';
  const row = { display: 'flex', justifyContent: 'space-between', fontSize: '13px' } as const;

  return (
    <div style={{ marginTop: '6px' }}>
      <div style={row}>
        <span style={{ color: textMuted }}>Pembayaran</span>
        <b style={{ color: text }}>{isCash ? '💵 Cash' : '💳 ' + method}</b>
      </div>
      {isCash && received !== undefined && (
        <>
          <div style={row}>
            <span style={{ color: textMuted }}>Uang Diterima</span>
            <b style={{ color: text }}>{rupiah(received)}</b>
          </div>
          <div style={row}>
            <span style={{ color: textMuted }}>Kembalian</span>
            <b style={{ color: text }}>{rupiah(change ?? 0)}</b>
          </div>
        </>
      )}
      {isCash && received === undefined && (
        <div style={{ color: textMuted, fontSize: '12px' }}>Uang diterima tidak tercatat (data lama)</div>
      )}
    </div>
  );
}
