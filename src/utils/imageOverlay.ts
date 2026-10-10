import { generateReceiptImage } from './receiptUtils';

// Ubah halaman HTML lengkap (string) menjadi gambar, tanpa membuka jendela baru.
export function renderHtmlToImage(html: string, width = 760): Promise<string> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText =
      'position:fixed;left:-10000px;top:0;width:' + width + 'px;height:1200px;border:0;background:white;';
    const cleanup = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };
    iframe.onload = async () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc || !doc.body) throw new Error('Dokumen laporan tidak tersedia');
        await new Promise<void>(r => setTimeout(r, 200));
        iframe.style.height = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight) + 'px';
        await new Promise<void>(r => setTimeout(r, 100));
        const data = await generateReceiptImage(doc.body as unknown as HTMLDivElement);
        cleanup();
        resolve(data);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
  });
}

// Tampilkan gambar di dalam aplikasi dengan tombol Tutup (seperti struk).
export function showImageOverlay(imageData: string, title: string): void {
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:10000;overflow-y:auto;padding:12px;';
  const close = () => {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  };
  overlay.innerHTML =
    '<div style="background:white;border-radius:16px;padding:16px;max-width:700px;margin:0 auto;">' +
    '<h3 id="mbrOverlayTitle" style="margin:0 0 10px 0;text-align:center;color:#1976D2;"></h3>' +
    '<div style="background:#FFF9C4;padding:12px;border-radius:8px;font-size:13px;line-height:1.5;color:#333;margin-bottom:12px;">' +
    '<b>Cara bagikan / simpan:</b><br/>Tekan lama gambar di bawah, lalu pilih "Bagikan" atau "Simpan gambar". ' +
    'Untuk cetak thermal, kirim gambar ke aplikasi printer Anda.</div>' +
    '<div style="border:2px dashed #ddd;border-radius:8px;overflow:hidden;"><img id="mbrOverlayImg" alt="Gambar" style="width:100%;display:block;" /></div>' +
    '<button id="mbrOverlayClose" style="width:100%;margin-top:14px;padding:14px;background:#1976D2;color:white;border:none;border-radius:8px;font-size:16px;font-weight:bold;cursor:pointer;">✖ Tutup</button>' +
    '</div>';
  const h = overlay.querySelector('#mbrOverlayTitle');
  if (h) h.textContent = title;
  const img = overlay.querySelector('#mbrOverlayImg') as HTMLImageElement | null;
  if (img) img.src = imageData;
  const btn = overlay.querySelector('#mbrOverlayClose') as HTMLButtonElement | null;
  if (btn) btn.onclick = close;
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };
  document.body.appendChild(overlay);
}
