import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'signage.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      mosque_name TEXT NOT NULL DEFAULT 'Masjid Al Hikmah',
      address TEXT DEFAULT 'Jl. Mandiri, Sepinggan, Balikpapan Selatan, Kota Balikpapan',
      latitude REAL NOT NULL DEFAULT -1.2654,
      longitude REAL NOT NULL DEFAULT 116.8924,
      calculation_method TEXT NOT NULL DEFAULT 'KEMAG',
      iqomah_subuh INTEGER NOT NULL DEFAULT 10,
      iqomah_dzuhur INTEGER NOT NULL DEFAULT 10,
      iqomah_ashar INTEGER NOT NULL DEFAULT 10,
      iqomah_maghrib INTEGER NOT NULL DEFAULT 7,
      iqomah_isya INTEGER NOT NULL DEFAULT 10,
      standby_subuh INTEGER NOT NULL DEFAULT 15,
      standby_dzuhur INTEGER NOT NULL DEFAULT 15,
      standby_ashar INTEGER NOT NULL DEFAULT 15,
      standby_maghrib INTEGER NOT NULL DEFAULT 15,
      standby_isya INTEGER NOT NULL DEFAULT 15,
      subuh_override TEXT DEFAULT NULL,
      syuruq_override TEXT DEFAULT NULL,
      dzuhur_override TEXT DEFAULT NULL,
      ashar_override TEXT DEFAULT NULL,
      maghrib_override TEXT DEFAULT NULL,
      isya_override TEXT DEFAULT NULL,
      adhan_duration INTEGER NOT NULL DEFAULT 3,
      standby_duration INTEGER NOT NULL DEFAULT 15,
      jumat_adhan1_time TEXT DEFAULT NULL,
      jumat_adhan1_duration INTEGER NOT NULL DEFAULT 3,
      jumat_jeda_duration INTEGER NOT NULL DEFAULT 10,
      jumat_adhan2_duration INTEGER NOT NULL DEFAULT 3,
      jumat_khutbah_duration INTEGER NOT NULL DEFAULT 45,
      use_custom_datetime INTEGER NOT NULL DEFAULT 0,
      custom_date TEXT DEFAULT NULL,
      custom_time TEXT DEFAULT NULL,
      custom_set_timestamp INTEGER DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS running_texts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      speaker TEXT DEFAULT '',
      event_date TEXT NOT NULL,
      event_time TEXT NOT NULL,
      description TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS finances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
      category TEXT DEFAULT 'Kas Umum',
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const existingSettings = db.prepare('SELECT COUNT(*) as count FROM settings').get();
  if (existingSettings.count === 0) {
    db.prepare(`
      INSERT INTO settings (id, mosque_name, address, latitude, longitude, calculation_method)
      VALUES (1, 'Masjid Al Hikmah', 'Jl. Mandiri, Sepinggan, Balikpapan Selatan, Kota Balikpapan', -1.2654, 116.8924, 'KEMAG')
    `).run();
  } else {
    const columns = db.prepare("PRAGMA table_info('settings')").all();
    const colNames = columns.map((c) => c.name);

    const checkAndAdd = (colName, typeDef) => {
      if (!colNames.includes(colName)) {
        try {
          db.exec(`ALTER TABLE settings ADD COLUMN ${colName} ${typeDef};`);
        } catch {
          // ignore
        }
      }
    };

    ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'].forEach((pKey) => {
      checkAndAdd(`standby_${pKey}`, 'INTEGER NOT NULL DEFAULT 15');
    });

    checkAndAdd('jumat_adhan1_time', 'TEXT DEFAULT NULL');
    checkAndAdd('jumat_adhan1_duration', 'INTEGER NOT NULL DEFAULT 3');
    checkAndAdd('jumat_jeda_duration', 'INTEGER NOT NULL DEFAULT 10');
    checkAndAdd('jumat_adhan2_duration', 'INTEGER NOT NULL DEFAULT 3');
    checkAndAdd('jumat_khutbah_duration', 'INTEGER NOT NULL DEFAULT 45');
    checkAndAdd('use_custom_datetime', 'INTEGER NOT NULL DEFAULT 0');
    checkAndAdd('custom_date', 'TEXT DEFAULT NULL');
    checkAndAdd('custom_time', 'TEXT DEFAULT NULL');
    checkAndAdd('custom_set_timestamp', 'INTEGER DEFAULT NULL');
  }

  // Populate 13 Realistic Mosque Events if fewer than 10 events exist
  const existingEvents = db.prepare('SELECT COUNT(*) as count FROM events').get();
  if (existingEvents.count < 10) {
    db.prepare('DELETE FROM events').run();
    const insertEvent = db.prepare(`
      INSERT INTO events (title, speaker, event_date, event_time, description, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    const dummyEvents = [
      {
        title: "Kajian Rutin Subuh: Tafsir Tematik Al-Qur'an Surah Al-Kahfi",
        speaker: 'Ust. Dr. H. Ahmad Fathoni, M.A.',
        event_date: 'Setiap Hari Ahad',
        event_time: '05:30 WITA',
        description: "Pembahasan makna mendalam dan hikmah kandungan Surah Al-Kahfi bagi kehidupan modern.",
      },
      {
        title: 'Kajian Fiqih Muamalah: Hukum Jual Beli & Transaksi Syariah',
        speaker: 'Ust. Syihabuddin, Lc., M.H.',
        event_date: 'Setiap Hari Senin',
        event_time: '19:45 WITA',
        description: 'Memahami adab dan kaidah muamalah islami dalam perdagangan dan bisnis sehari-hari.',
      },
      {
        title: 'Majlis Akhlaq & Tazkiyatun Nufs: Menyucikan Jiwa & Adab Jamaah',
        speaker: 'KH. Muhammad Ridwan, S.Ag.',
        event_date: 'Setiap Hari Selasa',
        event_time: '18:30 WITA',
        description: "Panduan praktis menjaga kebersihan hati, kerendahan hati, dan husnuzhan kepada sesama.",
      },
      {
        title: "Kajian Hadits Arbain An-Nawawiyah: 42 Pilar Utama Agama Islam",
        speaker: 'Ust. Muhammad Al-Ghazali, M.Pd.',
        event_date: 'Setiap Hari Rabu',
        event_time: '19:45 WITA',
        description: 'Mengkaji hadits-hadits pokok ajaran Islam lengkap dengan riwayat dan faidah hukumnya.',
      },
      {
        title: 'Kajian Sirah Nabawiyah: Meneladani Perjuangan Rasulullah SAW',
        speaker: 'Ust. H. Nur Kholis, Lc.',
        event_date: 'Setiap Hari Kamis',
        event_time: '18:30 WITA',
        description: 'Menelusuri rekam jejak perjuangan Rasulullah SAW dan para sahabat dalam menegakkan dakwah.',
      },
      {
        title: 'Kajian Khusus Muslimah: Fiqih Wanita & Manajemen Keluarga Sakinah',
        speaker: 'Ustadzah Hjh. Nurul Hidayah, S.Th.I.',
        event_date: 'Sabtu Pekan Ke-2',
        event_time: '09:00 WITA',
        description: "Kajian khusus akhwat dan ibu-ibu dalam membina generasi qur'ani dan keluarga sakinah.",
      },
      {
        title: 'Kajian Tabligh Akbar: Menjaga Kekhusyukan Shalat Berjamaah',
        speaker: 'KH. Abdul Samad, Lc.',
        event_date: 'Jumat Malam Sabtu',
        event_time: '19:45 WITA',
        description: 'Terbuka untuk umum, disiarkan langsung melalui TV Signage & Live Streaming Youtube.',
      },
      {
        title: "Kajian Tahsin & Tahfizh Al-Qur'an Jamaah Dewasa",
        speaker: 'Ust. M. Zulkifli, S.Q.',
        event_date: 'Setiap Hari Sabtu',
        event_time: '16:30 WITA',
        description: "Bimbingan tajwid, makhraj huruf, serta setoran hafalan Juz 30 bagi jamaah masjid.",
      },
      {
        title: 'Program Bekam & Layanan Kesehatan Gratis Jamaah',
        speaker: 'Tim Medis & Thibbun Nabawi Al-Hikmah',
        event_date: 'Ahad Pekan Pertama',
        event_time: '08:00 WITA',
        description: 'Pemeriksaan kesehatan gratis, cek gula darah, tekanan darah, serta terapi bekam sunnah.',
      },
      {
        title: "Kajian Remaja Masjid (IRMA): Pemuda Qur'ani di Era Digital",
        speaker: 'Ust. Hanif Al-Banjari, S.Sos.',
        event_date: 'Sabtu Malam Minggu',
        event_time: '20:00 WITA',
        description: 'Diskusi interaktif pemuda muslim seputar tantangan media sosial dan moralitas muda-mudi.',
      },
      {
        title: 'Dauroh Jenazah: Pelatihan Tata Cara Mengurus Jenazah Sesuai Sunnah',
        speaker: 'Ust. H. Syamsuddin, S.Ag.',
        event_date: 'Ahad Pekan Ke-3',
        event_time: '09:00 WITA',
        description: 'Praktek langsung memandikan, mengkafani, menyalatkan, dan memakamkan jenazah.',
      },
      {
        title: 'Santunan Anak Yatim & Dhuafa Bulanan',
        speaker: 'Pengurus LAZIS Masjid Al-Hikmah',
        event_date: 'Jumat Pekan Ke-4',
        event_time: '16:00 WITA',
        description: 'Penyaluran dana infaq dan paket sembako untuk 50 anak yatim dan keluarga kurang mampu.',
      },
      {
        title: 'Kajian Tematik Subuh: Manajemen Waktu & Keberkahan Rezeki',
        speaker: 'Ust. Syihabuddin, Lc., M.H.',
        event_date: 'Sabtu Pagi',
        event_time: '05:30 WITA',
        description: 'Menggali rahasia rezeki yang berkah dan produktivitas pagi hari sesuai keteladanan Nabi.',
      },
    ];

    dummyEvents.forEach((e) => {
      insertEvent.run(e.title, e.speaker, e.event_date, e.event_time, e.description);
    });
  }

  // Populate Realistic Mosque Finances if fewer than 5 records exist
  const existingFinances = db.prepare('SELECT COUNT(*) as count FROM finances').get();
  if (existingFinances.count < 5) {
    db.prepare('DELETE FROM finances').run();
    const insertFinance = db.prepare(`
      INSERT INTO finances (type, category, amount, description, date)
      VALUES (?, ?, ?, ?, ?)
    `);

    const dummyFinances = [
      { type: 'income', category: 'Infaq Jumat', amount: 12850000, description: 'Kotak Infaq Shalat Jumat Pekan Pertama', date: '2026-08-01' },
      { type: 'income', category: 'Infaq Subuh', amount: 3450000, description: 'Kotak Infaq Harian & Subuh Jamaah', date: '2026-08-02' },
      { type: 'expense', category: 'Operasional', amount: 2450000, description: 'Tagihan Listrik PLN & Air PDAM Bulan Agustus', date: '2026-08-02' },
      { type: 'expense', category: 'Kebersihan', amount: 1200000, description: 'Maintenance Kebersihan & Cuci Karpet Masjid', date: '2026-08-02' },
      { type: 'income', category: 'Donasi', amount: 5000000, description: 'Donasi Hamba Allah via Transfer Kas Masjid', date: '2026-08-03' },
      { type: 'expense', category: 'Bisyarah Ust.', amount: 2500000, description: 'Honor & Bisyarah Penceramah Kajian Rutin', date: '2026-08-03' },
      { type: 'income', category: 'Infaq Jumat', amount: 14200000, description: 'Kotak Infaq Shalat Jumat Pekan Kedua', date: '2026-08-04' },
      { type: 'expense', category: 'Pemeliharaan', amount: 1850000, description: 'Service & Maintenance AC Ruang Utama', date: '2026-08-04' },
      { type: 'income', category: 'Kantin & Parkir', amount: 1650000, description: 'Pemasukan Kas Parkir & Kantin Masjid', date: '2026-08-05' },
      { type: 'expense', category: 'Konsumsi', amount: 850000, description: 'Konsumsi Snacking Jamaah Kajian Subuh', date: '2026-08-05' },
    ];

    dummyFinances.forEach((f) => {
      insertFinance.run(f.type, f.category, f.amount, f.description, f.date);
    });
  }
}

export default db;
