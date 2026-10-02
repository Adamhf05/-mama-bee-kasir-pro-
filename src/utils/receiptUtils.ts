import html2canvas from 'html2canvas';

export async function generateReceiptImage(element: HTMLDivElement): Promise<string> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false
  });
  return canvas.toDataURL('image/png');
}

// Fungsi untuk menampilkan gambar struk dengan tombol refresh
export function showReceiptImage(
  imageData: string, 
  tokoNama: string, 
  mode: 'share' | 'download'
): void {
  // Buat modal/overlay di halaman yang sama (TIDAK buka tab baru!)
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    overflow-y: auto;
  `;

  const title = mode === 'share' ? 'Share Struk' : 'Simpan Struk';
  const instruction = mode === 'share'
    ? `Cara Share ke WhatsApp:<br/>1. <b>Tekan lama (long press)</b> gambar di atas<br/>2. Pilih "Share" atau "Bagikan"<br/>3. Pilih WhatsApp<br/>4. Pilih kontak tujuan`
    : `Cara Simpan Gambar:<br/>1. <b>Tekan lama (long press)</b> gambar di atas<br/>2. Pilih "Save image" atau "Simpan gambar"<br/>3. Gambar tersimpan di Galeri HP`;

  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 16px;
      padding: 25px;
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    ">
      <h2 style="color: #1976D2; text-align: center; margin-bottom: 20px;">
        ${title} - ${tokoNama}
      </h2>
      
      <div style="
        background: #f5f5f5;
        padding: 15px;
        border-radius: 12px;
        margin-bottom: 20px;
        border: 2px dashed #ddd;
      ">
        <img src="${imageData}" 
             alt="Struk ${tokoNama}" 
             style="
               max-width: 100%;
               height: auto;
               display: block;
               margin: 0 auto;
               border-radius: 8px;
             " 
        />
      </div>

      <div style="
        background: #FFF9C4;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 15px;
        font-size: 14px;
        line-height: 1.6;
        color: #333;
      ">
        ${instruction}
      </div>

      <div style="
        background: #E3F2FD;
        padding: 12px;
        border-radius: 8px;
        font-size: 13px;
        color: #1565C0;
        margin-bottom: 20px;
      ">
        💡 <strong>Tips:</strong> Jika long-press tidak muncul opsi, coba screenshot layar ini.
      </div>

      <button id="closeModalBtn" style="
        width: 100%;
        padding: 14px;
        background: #1976D2;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
      ">
        🔄 Tutup / Refresh
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listener untuk tombol close
  const closeBtn = document.getElementById('closeModalBtn');
  if (closeBtn) {
    closeBtn.onclick = () => {
      document.body.removeChild(modal);
    };
  }

  // Klik di luar modal untuk close
  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
}

export async function shareReceiptViaWhatsApp(
  imageData: string,
  tokoNama: string
): Promise<void> {
  try {
    // Coba Web Share API (work di Chrome Android)
    if (navigator.share && navigator.canShare) {
      const response = await fetch(imageData);
      const blob = await response.blob();
      const file = new File([blob], `struk-${tokoNama}.png`, { type: 'image/png' });
      
      const shareData = {
        files: [file],
        title: `Struk Transaksi - ${tokoNama}`,
        text: `Struk dari Mama Bee Kasir Pro`
      };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return;
      }
    }
    
    // Fallback: Tampilkan modal dengan gambar
    showReceiptImage(imageData, tokoNama, 'share');
    
  } catch (error) {
    console.error('Share error:', error);
    showReceiptImage(imageData, tokoNama, 'share');
  }
}

export async function downloadReceiptImage(
  imageData: string,
  tokoNama: string
): Promise<void> {
  try {
    // Coba download langsung
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `struk-${tokoNama.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`✅ Struk sedang didownload!\n\nCek di folder Downloads.`);
    
  } catch (error) {
    console.error('Download error:', error);
  }
  
  // Selalu tampilkan modal sebagai backup
  showReceiptImage(imageData, tokoNama, 'download');
}
