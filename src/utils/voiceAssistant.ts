// Voice AI sementara dinonaktifkan karena incompatibility TypeScript di CI
export interface VoiceResult { matches: string[]; isFinal: boolean; }
export const startListening = async (onResult: (text: string) => void, onError?: (err: any) => void): Promise<void> => {
  console.warn('Voice AI disabled');
  if (onError) onError(new Error('Voice feature temporarily unavailable'));
};
export const stopListening = async (): Promise<void> => {};
export const parseVoiceCommand = (text: string): { name?: string; qty?: number } => {
  const cleanText = text.toLowerCase().trim();
  const match = cleanText.match(/^(.+?)\s+(\d+|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)(?:\s+(?:pcs|bungkus|botol|kaleng|dus))?$/i);
  if (match) {
    const numMap: Record<string, number> = {'satu': 1, 'dua': 2, 'tiga': 3, 'empat': 4, 'lima': 5, 'enam': 6, 'tujuh': 7, 'delapan': 8, 'sembilan': 9, 'sepuluh': 10};
    return { name: match[1].trim(), qty: numMap[match[2]] || parseInt(match[2], 10) };
  }
  return { name: cleanText, qty: 1 };
};
