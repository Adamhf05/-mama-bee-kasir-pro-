import { useTheme } from '../contexts/ThemeContext';

interface PaymentInfoProps {
  method: string;
  received?: number;
  change?: number;
  compact?: boolean;
  color?: string;
  mutedColor?: string;
}

const rupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

export function PaymentInfo({ method, received, change, compact = false, color, mutedColor }: PaymentInfoProps) {
  const theme = useTheme();
  const text = color ?? theme.text;
  const muted = mutedColor ?? theme.textMuted;
  const isCash = method === 'Cash';
  const row = { display: 'flex', justifyContent: 'space-between', fontSize: '13px' } as const;

  if (compact && (!isCash || received === undefined)) return null;

  return (
    <div style={{ marginTop: '6px' }}>
      {!compact && (
        <div style={row}>
          <span style={{ color: muted }}>Pembayaran</span>
          <b style={{ color: text }}>{isCash ? '💵 Cash' : ' ' + method}</b>
        </div>
      )}
      {isCash && received !== undefined && (
        <>
          <div style={row}>
            <span style={{ color: muted }}>Uang Diterima</span>
            <b style={{ color: text }}>{rupiah(received)}</b>
          </div>
          <div style={row}>
            <span style={{ color: muted }}>Kembalian</span>
            <b style={{ color: text }}>{rupiah(change ?? 0)}</b>
          </div>
        </>
      )}
      {!compact && isCash && received === undefined && (
        <div style={{ color: muted, fontSize: '12px' }}>Uang diterima tidak tercatat (data lama)</div>
      )}
    </div>
  );
}
