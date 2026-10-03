import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { resizeImage } from '../utils/imageUtils';

interface PhotoPickerProps {
  value: string;
  onChange: (dataUrl: string) => void;
}

// Input foto: kamera atau galeri, dengan pratinjau. Aman untuk Chrome Android.
export function PhotoPicker({ value, onChange }: PhotoPickerProps) {
  const { text, textMuted, border, card } = useTheme();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      onChange(await resizeImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat foto');
    } finally {
      setBusy(false);
    }
  };

  const btn = {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: `1px solid ${border}`,
    background: card,
    color: text,
    cursor: 'pointer',
    fontSize: '15px'
  } as const;

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" disabled={busy} onClick={() => cameraRef.current?.click()} style={btn}>
           Ambil Foto
        </button>
        <button type="button" disabled={busy} onClick={() => galleryRef.current?.click()} style={btn}>
          🖼️ Galeri
        </button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: 'none' }} />
      <input ref={galleryRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      {busy && <div style={{ color: textMuted, fontSize: '13px', marginTop: '6px' }}>Memproses foto...</div>}
      {error && <div style={{ color: '#f44336', fontSize: '13px', marginTop: '6px' }}>{error}</div>}
      {value && (
        <div style={{ marginTop: '10px', textAlign: 'center' }}>
          <img src={value} alt="Pratinjau" style={{ width: '140px', height: '140px', objectFit: 'cover', borderRadius: '8px' }} />
          <div>
            <button
              type="button"
              onClick={() => onChange('')}
              style={{ marginTop: '6px', background: 'none', border: 'none', color: '#f44336', cursor: 'pointer' }}
            >
              Hapus foto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
