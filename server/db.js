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

  const existingEvents = db.prepare('SELECT COUNT(*) as count FROM events').get();
  if (existingEvents.count === 0) {
    const insertEvent = db.prepare(`
      INSERT INTO events (title, speaker, event_date, event_time, description, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    insertEvent.run(
      'Kajian Subuh: Tafsir Al-Qur\'an Surah Al-Kahfi',
      'Ust. Dr. H. Ahmad Fathoni, M.A.',
      'Setiap Hari Ahad',
      '05:30 WITA',
      'Pembahasan rutin tafsir dan tadabbur Al-Qur\'an bersama seluruh jamaah.'
    );
    insertEvent.run(
      'Kajian Tabligh Akbar: Kunci Kebahagiaan Keluarga Muslim',
      'KH. Abdul Shamad, Lc.',
      'Jumat Malam Sabtu',
      '19:45 WITA',
      'Terbuka untuk umum, disiarkan langsung melalui TV Kiosk & Live Streaming.'
    );
  }

  const existingFinances = db.prepare('SELECT COUNT(*) as count FROM finances').get();
  if (existingFinances.count === 0) {
    const insertFinance = db.prepare(`
      INSERT INTO finances (type, category, amount, description, date)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertFinance.run('income', 'Infaq Jumat', 12500000, 'Kotak Infaq Shalat Jumat Pekan Ini', '2026-08-01');
    insertFinance.run('income', 'Donasi Operasional', 5000000, 'Hamba Allah via Transfer Bank', '2026-08-02');
    insertFinance.run('expense', 'Listrik & Air', 2350000, 'Pembayaran Tagihan Listrik PLN & PDAM', '2026-08-02');
    insertFinance.run('expense', 'Kebersihan & Taman', 1200000, 'Maintenance Karpet & Kebersihan Area Utama', '2026-08-02');
  }
}

export default db;
