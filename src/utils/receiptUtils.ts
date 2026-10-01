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

export async function shareReceiptViaWhatsApp(
  imageData: string,
  tokoNama: string
): Promise<void> {
  try {
    // Convert base64 to blob
    const response = await fetch(imageData);
    const blob = await response.blob();
    const file = new File([blob], `struk-${tokoNama}-${Date.now()}.png`, {
      type: 'image/png'
    });

    // Coba Web Share API native (support di Chrome Android & APK)
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

    // Fallback: download jika share tidak support
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `struk-${tokoNama}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('✅ Struk didownload! Silakan share manual via WhatsApp dari galeri.');
  } catch (error) {
    console.error('Share error:', error);
    throw error;
  }
}

export async function downloadReceiptImage(
  imageData: string,
  tokoNama: string
): Promise<void> {
  const link = document.createElement('a');
  link.href = imageData;
  link.download = `struk-${tokoNama}-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
