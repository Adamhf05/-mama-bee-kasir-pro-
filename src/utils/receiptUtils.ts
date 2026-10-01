import html2canvas from 'html2canvas';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

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
    const base64Data = imageData.split(',')[1];
    const fileName = `struk-${tokoNama.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
    
    // Save file to cache directory
    await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache,
    });
    
    // Get file URI
    const statResult = await Filesystem.stat({
      path: fileName,
      directory: Directory.Cache,
    });
    
    // Share via Capacitor Share plugin
    await Share.share({
      title: `Struk Transaksi - ${tokoNama}`,
      text: `Struk transaksi dari Mama Bee Kasir Pro untuk ${tokoNama}`,
      url: statResult.uri,
      dialogTitle: 'Kirim Struk via'
    });
    
  } catch (error) {
    console.error('Share error:', error);
    
    // Fallback: Tampilkan gambar di tab baru
    try {
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
    } catch (fallbackError) {
      alert('Gagal share. Silakan screenshot struk dan share manual via WhatsApp.');
    }
  }
}

export async function downloadReceiptImage(
  imageData: string,
  tokoNama: string
): Promise<void> {
  try {
    const base64Data = imageData.split(',')[1];
    const fileName = `struk-${tokoNama.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
    
    // Try ExternalStorage first (Android 10+, accessible from gallery)
    try {
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.ExternalStorage,
      });
      
      alert(`✅ Struk berhasil disimpan!\n\nFile: ${fileName}\n\nSilakan cek di:\n• File Manager > Pictures\n• Atau Galeri HP`);
      return;
    } catch (extStorageError) {
      console.log('ExternalStorage failed:', extStorageError);
    }
    
    // Fallback to External
    try {
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.External,
      });
      
      alert(`✅ Struk berhasil disimpan!\n\nFile: ${fileName}\n\nSilakan cek di:\n• File Manager > Pictures\n• Atau Galeri HP`);
      return;
    } catch (extError) {
      console.log('External failed:', extError);
    }
    
    // Fallback to Data directory
    try {
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Data,
      });
      
      alert(`✅ Struk berhasil disimpan!\n\nFile: ${fileName}\n\nLokasi: Internal storage > Android > data`);
      return;
    } catch (dataError) {
      console.log('Data failed:', dataError);
    }
    
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
    
  } catch (error) {
    console.error('Download error:', error);
    alert('Gagal menyimpan. Silakan screenshot struk.');
  }
}
