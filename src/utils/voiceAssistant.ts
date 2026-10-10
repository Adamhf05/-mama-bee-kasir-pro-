import { SpeechRecognition } from '@capgo/capacitor-speech-recognition';

export interface VoiceResult {
  matches: string[];
  isFinal: boolean;
}

// Fungsi utama untuk mendengarkan suara
// FIX: Menggunakan callback langsung di start(), bukan addListener
export const startListening = async (
  onResult: (text: string) => void,
  onError?: (err: any) => void
): Promise<void> => {
  try {
    const available = await SpeechRecognition.available();
    if (!available) {
      onError?.('Fitur suara tidak didukung');
      return;
    }

    // Mulai listening dengan callback hasil langsung
    await SpeechRecognition.start({
      language: 'id-ID',
      partialResults: true,
      popup: false,
      maxResults: 5,
      // Callback hasil suara ditaruh DI SINI, bukan di addListener
      onResult: (result: VoiceResult) => {
        if (result.matches && result.matches.length > 0) {
          onResult(result.matches[0]);
        }
      },
      onError: (err: any) => {
        console.error('Voice Error:', err);
        onError?.(err);
      }
    });

  } catch (error) {
    console.error('Gagal memulai voice:', error);
    onError?.(error);
  }
};

// Fungsi stop listening
export const stopListening = async (): Promise<void> => {
  try {
    await SpeechRecognition.stop();
  } catch (error) {
    console.error('Gagal stop voice:', error);
  }
};

// Parser sederhana: "Kopi 3" -> { name: "Kopi", qty: 3 }
export const parseVoiceCommand = (text: string): { name?: string; qty?: number } => {
  const cleanText = text.toLowerCase().trim();
  const match = cleanText.match(/^(.+?)\s+(\d+|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)(?:\s+(?:pcs|bungkus|botol|kaleng|dus))?$/i);
  
  if (match) {
    let qtyStr = match[2];
    const numMap: Record<string, number> = {
      'satu': 1, 'dua': 2, 'tiga': 3, 'empat': 4, 'lima': 5,
      'enam': 6, 'tujuh': 7, 'delapan': 8, 'sembilan': 9, 'sepuluh': 10
    };
    const qty = numMap[qtyStr] || parseInt(qtyStr, 10);
    return { name: match[1].trim(), qty };
  }
  return { name: cleanText, qty: 1 };
};
