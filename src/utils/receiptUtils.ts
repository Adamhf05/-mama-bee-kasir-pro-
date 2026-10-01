import html2canvas from 'html2canvas';
import { Filesystem, Directory } from '@capacitor/filesystem';

export async function generateReceiptImage(element: HTMLDivElement): Promise<string> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false
  });
  
  return canvas.toDataURL('image/png');
}

export async function shareReceiptViaWhatsApp(
  imageData: string,
  tokoNama: string
): Promise<void> {
  try {
    const response = await fetch(imageData);
    const blob = await response.blob();
    const file = new File([blob], `struk-${tokoNama}.png`, { type: 'image/png' });

    if (navigator.share && navigator.canShare) {
      const shareData = {
        files: [file],
        title: `Struk Transaksi - ${tokoNama}`,
        text: `Struk transaksi dari Mama Bee Kasir Pro untuk ${tokoNama}`
      };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return;
      }
    }

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head><title>Struk - ${tokoNama}</title></head>
          <body style="text-align:center; padding:20px; background:#f5f5f5;">
            <h3>Struk Transaksi - ${tokoNama}</h3>
            <img src="${imageData}" style="max-width:100%; border:1px solid #ddd; margin:20px 0;" />
            <p style="color:#666; font-size:14px;">
              📱 <strong>Cara share ke WhatsApp:</strong><br/>
              1. Long press gambar di atas<br/>
              2. Pilih "Share" atau "Bagikan"<br/>
              3. Pilih WhatsApp<br/>
              4. Pilih kontak tujuan
            </p>
          </body>
        </html>
      `);
    } else {
      alert('Gagal share. Silakan screenshot struk dan share manual.');
    }
  } catch (error) {
    console.error('Share error:', error);
    alert('Gagal share. Silakan screenshot struk dan share manual via WhatsApp.');
  }
}

export async function downloadReceiptImage(
  imageData: string,
  tokoNama: string
): Promise<void> {
  try {
    const base64Data = imageData.split(',')[1];
    const fileName = `struk-${tokoNama.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
    
    // Save to External storage (Pictures folder)
    await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.External,
    });
    
    alert(`✅ Struk berhasil disimpan!\n\nFile: ${fileName}\n\nSilakan cek di:\n• File Manager > Pictures\n• Atau Galeri HP`);
    
  } catch (error) {
    console.error('Download error:', error);
    
    // Fallback: Save to Data directory
    try {
      const base64Data = imageData.split(',')[1];
      const fileName = `struk-${tokoNama.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
      
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Data,
      });
      
      alert(`✅ Struk berhasil disimpan!\n\nFile: ${fileName}\n\nLokasi: Internal storage > Android > data`);
      
    } catch (error2) {
      console.error('Fallback error:', error2);
      
      // Final fallback: Tampilkan gambar di tab baru
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>Struk - ${tokoNama}</title></head>
            <body style="text-align:center; padding:20px; background:#f5f5f5;">
              <h3>Struk Transaksi - ${tokoNama}</h3>
              <img src="${imageData}" style="max-width:100%; border:1px solid #ddd; margin:20px 0;" />
              <p style="color:#666; font-size:14px;">
                💾 <strong>Cara simpan gambar:</strong><br/>
                1. Long press gambar di atas<br/>
                2. Pilih "Save image" atau "Simpan gambar"<br/>
                3. Gambar tersimpan di galeri HP
              </p>
            </body>
          </html>
        `);
      } else {
        alert('Gagal menyimpan. Silakan screenshot struk.');
      }
    }
  }
}
