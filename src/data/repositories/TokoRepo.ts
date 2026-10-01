import { db } from '../database';
import type { SalesToko } from '../database';

export const TokoRepo = {
  getAll: async (): Promise<SalesToko[]> => {
    return db.salesToko.toArray();
  },

  getById: async (idToko: string): Promise<SalesToko | undefined> => {
    return db.salesToko.get(idToko);
  },

  getByHari: async (hari: string): Promise<SalesToko[]> => {
    const all = await db.salesToko.toArray();
    return all.filter(t => t.hariKunjungan.includes(hari));
  },

  search: async (query: string): Promise<SalesToko[]> => {
    const lower = query.toLowerCase();
    const all = await db.salesToko.toArray();
    return all.filter(t => 
      t.nama.toLowerCase().includes(lower) || 
      t.idToko.toLowerCase().includes(lower)
    );
  },

  add: async (toko: SalesToko): Promise<void> => {
    await db.salesToko.add({
      ...toko,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  },

  update: async (idToko: string, updates: Partial<SalesToko>): Promise<void> => {
    await db.salesToko.update(idToko, {
      ...updates,
      updatedAt: new Date()
    });
  },

  delete: async (idToko: string): Promise<void> => {
    await db.salesToko.delete(idToko);
    // Hapus semua kunjungan terkait
    const kunjunganIds = await db.kunjungan.where('idToko').equals(idToko).primaryKeys();
    await db.kunjungan.bulkDelete(kunjunganIds);
  },

  getCountByHari: async (hari: string): Promise<number> => {
    const all = await db.salesToko.toArray();
    return all.filter(t => t.hariKunjungan.includes(hari)).length;
  },

  // Migrasi dari localStorage ke IndexedDB (sekali saja)
  migrateFromLocalStorage: async (): Promise<number> => {
    const saved = localStorage.getItem('tokoMasterData');
    if (!saved) return 0;
    
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) return 0;
      
      // Cek apakah sudah ada data di IndexedDB
      const existingCount = await db.salesToko.count();
      if (existingCount > 0) {
        console.log('⏭️ Data sudah ada di IndexedDB, skip migrasi');
        return 0;
      }
      
      // Migrasi data
      const tokoList: SalesToko[] = parsed.map((t: any) => ({
        idToko: t.idToko || `TOKO-${Date.now()}`,
        nama: t.nama || 'Tanpa Nama',
        alamat: t.alamat || '',
        telepon: t.telepon || '',
        lokasi: t.lokasi || '',
        warnaPin: t.warnaPin || '#2196F3',
        folder: t.folder || 'Default',
        hariKunjungan: t.hariKunjungan || [],
        catatan: t.catatan || '',
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      await db.salesToko.bulkAdd(tokoList);
      console.log(`✅ Migrasi ${tokoList.length} toko dari localStorage ke IndexedDB`);
      
      // Hapus dari localStorage setelah berhasil migrasi
      localStorage.removeItem('tokoMasterData');
      
      return tokoList.length;
    } catch (error) {
      console.error('❌ Error migrasi:', error);
      return 0;
    }
  }
};
