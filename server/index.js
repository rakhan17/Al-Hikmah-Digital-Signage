import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { initDb } from './db.js';
import { getPrayerData } from './prayerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database schema & sample data
initDb();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

// -------------------------------------------------------------
// DYNAMIC BANNER IMAGES API (Reads public/assets/bgbanner dynamically)
// -------------------------------------------------------------
app.get('/api/banner-images', (req, res) => {
  try {
    const bannerDir = path.join(publicDir, 'assets/bgbanner');
    let images = [];
    if (fs.existsSync(bannerDir)) {
      const files = fs.readdirSync(bannerDir);
      images = files
        .filter((file) => /\.(jpe?g|png|webp|svg)$/i.test(file))
        .map((file) => `/assets/bgbanner/${file}`);
    }
    if (images.length === 0) {
      images = ['/assets/bg.jpeg'];
    }
    res.json({ success: true, images });
  } catch (err) {
    console.error('Error reading banner images:', err);
    res.json({ success: true, images: ['/assets/bg.jpeg'] });
  }
});

// Helper to compute overall + monthly finance totals and breakdown
function getFinanceSummaryData() {
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const summary = db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpense,
      COALESCE(SUM(CASE WHEN type = 'income' AND date LIKE ? THEN amount ELSE 0 END), 0) as monthlyIncome,
      COALESCE(SUM(CASE WHEN type = 'expense' AND date LIKE ? THEN amount ELSE 0 END), 0) as monthlyExpense
    FROM finances
  `).get(`${currentMonthStr}%`, `${currentMonthStr}%`);

  const monthlyIncomes = db.prepare(`
    SELECT category, description, SUM(amount) as totalAmount
    FROM finances
    WHERE type = 'income' AND date LIKE ?
    GROUP BY description
    ORDER BY totalAmount DESC
  `).all(`${currentMonthStr}%`);

  const monthlyExpenses = db.prepare(`
    SELECT category, description, SUM(amount) as totalAmount
    FROM finances
    WHERE type = 'expense' AND date LIKE ?
    GROUP BY description
    ORDER BY totalAmount DESC
  `).all(`${currentMonthStr}%`);

  const balance = summary.totalIncome - summary.totalExpense;

  return {
    totalIncome: summary.totalIncome,
    totalExpense: summary.totalExpense,
    monthlyIncome: summary.monthlyIncome,
    monthlyExpense: summary.monthlyExpense,
    balance,
    monthlyIncomes,
    monthlyExpenses,
  };
}

// -------------------------------------------------------------
// PUBLIC TV SIGNAGE BUNDLE API
// -------------------------------------------------------------
app.get('/api/public/data', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    const prayerData = getPrayerData();

    const activeEvents = db.prepare(`
      SELECT * FROM events 
      WHERE is_active = 1 
      ORDER BY id DESC
    `).all();

    const activeRunningTexts = db.prepare(`
      SELECT * FROM running_texts
      WHERE is_active = 1
      ORDER BY id ASC
    `).all();

    const finances = getFinanceSummaryData();

    res.json({
      success: true,
      data: {
        settings,
        prayerData,
        events: activeEvents,
        runningTexts: activeRunningTexts,
        finances,
      },
    });
  } catch (err) {
    console.error('Error fetching public data:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data signage.' });
  }
});

// -------------------------------------------------------------
// SETTINGS API
// -------------------------------------------------------------
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const {
      mosque_name,
      address,
      latitude,
      longitude,
      calculation_method,
      iqomah_subuh,
      iqomah_dzuhur,
      iqomah_ashar,
      iqomah_maghrib,
      iqomah_isya,
      standby_subuh,
      standby_dzuhur,
      standby_ashar,
      standby_maghrib,
      standby_isya,
      subuh_override,
      syuruq_override,
      dzuhur_override,
      ashar_override,
      maghrib_override,
      isya_override,
      adhan_duration,
      standby_duration,
      jumat_adhan1_time,
      jumat_adhan1_duration,
      jumat_jeda_duration,
      jumat_adhan2_duration,
      jumat_khutbah_duration,
      use_custom_datetime,
      custom_date,
      custom_time,
    } = req.body;

    const getNumOrDefault = (val, defaultVal) => {
      if (val === '' || val === null || val === undefined || isNaN(Number(val))) {
        return defaultVal;
      }
      return Number(val);
    };

    const strOrNull = (val) => (val !== undefined && val !== null && String(val).trim() !== '' ? String(val).trim() : null);

    const nowTimestamp = Date.now();

    const stmt = db.prepare(`
      UPDATE settings SET
        mosque_name = COALESCE(?, mosque_name),
        address = COALESCE(?, address),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        calculation_method = COALESCE(?, calculation_method),
        iqomah_subuh = ?,
        iqomah_dzuhur = ?,
        iqomah_ashar = ?,
        iqomah_maghrib = ?,
        iqomah_isya = ?,
        standby_subuh = ?,
        standby_dzuhur = ?,
        standby_ashar = ?,
        standby_maghrib = ?,
        standby_isya = ?,
        subuh_override = ?,
        syuruq_override = ?,
        dzuhur_override = ?,
        ashar_override = ?,
        maghrib_override = ?,
        isya_override = ?,
        adhan_duration = ?,
        standby_duration = ?,
        jumat_adhan1_time = ?,
        jumat_adhan1_duration = ?,
        jumat_jeda_duration = ?,
        jumat_adhan2_duration = ?,
        jumat_khutbah_duration = ?,
        use_custom_datetime = ?,
        custom_date = ?,
        custom_time = ?,
        custom_set_timestamp = ?
      WHERE id = 1
    `);

    stmt.run(
      mosque_name,
      address,
      latitude,
      longitude,
      calculation_method,
      getNumOrDefault(iqomah_subuh, 10),
      getNumOrDefault(iqomah_dzuhur, 10),
      getNumOrDefault(iqomah_ashar, 10),
      getNumOrDefault(iqomah_maghrib, 7),
      getNumOrDefault(iqomah_isya, 10),
      getNumOrDefault(standby_subuh, 15),
      getNumOrDefault(standby_dzuhur, 15),
      getNumOrDefault(standby_ashar, 15),
      getNumOrDefault(standby_maghrib, 15),
      getNumOrDefault(standby_isya, 15),
      strOrNull(subuh_override),
      strOrNull(syuruq_override),
      strOrNull(dzuhur_override),
      strOrNull(ashar_override),
      strOrNull(maghrib_override),
      strOrNull(isya_override),
      getNumOrDefault(adhan_duration, 3),
      getNumOrDefault(standby_duration, 15),
      strOrNull(jumat_adhan1_time),
      getNumOrDefault(jumat_adhan1_duration, 3),
      getNumOrDefault(jumat_jeda_duration, 10),
      getNumOrDefault(jumat_adhan2_duration, 3),
      getNumOrDefault(jumat_khutbah_duration, 45),
      use_custom_datetime ? 1 : 0,
      strOrNull(custom_date),
      strOrNull(custom_time),
      nowTimestamp
    );

    const updated = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    res.json({ success: true, data: updated, message: 'Pengaturan berhasil diperbarui.' });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// RUNNING TEXTS CRUD API
// -------------------------------------------------------------
app.get('/api/running-texts', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM running_texts ORDER BY id ASC').all();
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/running-texts', (req, res) => {
  try {
    const { text, is_active } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Teks running text wajib diisi.' });
    }

    const stmt = db.prepare('INSERT INTO running_texts (text, is_active) VALUES (?, ?)');
    const info = stmt.run(text.trim(), is_active !== undefined ? (is_active ? 1 : 0) : 1);
    const newItem = db.prepare('SELECT * FROM running_texts WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: newItem, message: 'Running text berhasil ditambahkan.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/running-texts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { text, is_active } = req.body;

    const stmt = db.prepare(`
      UPDATE running_texts SET
        text = COALESCE(?, text),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `);

    stmt.run(text !== undefined ? text.trim() : null, is_active, id);
    const updated = db.prepare('SELECT * FROM running_texts WHERE id = ?').get(id);
    res.json({ success: true, data: updated, message: 'Running text diperbarui.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/running-texts/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM running_texts WHERE id = ?').run(id);
    res.json({ success: true, message: 'Running text berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// EVENTS CRUD API
// -------------------------------------------------------------
app.get('/api/events', (req, res) => {
  try {
    const events = db.prepare('SELECT * FROM events ORDER BY id DESC').all();
    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/events', (req, res) => {
  try {
    const { title, speaker, event_date, event_time, description, is_active } = req.body;
    if (!title || !event_date || !event_time) {
      return res.status(400).json({ success: false, message: 'Judul, Tanggal, dan Jam Wajib Diisi.' });
    }

    const stmt = db.prepare(`
      INSERT INTO events (title, speaker, event_date, event_time, description, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      title,
      speaker || '',
      event_date,
      event_time,
      description || '',
      is_active !== undefined ? (is_active ? 1 : 0) : 1
    );

    const newEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: newEvent, message: 'Acara berhasil ditambahkan.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/events/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, speaker, event_date, event_time, description, is_active } = req.body;

    const stmt = db.prepare(`
      UPDATE events SET
        title = COALESCE(?, title),
        speaker = COALESCE(?, speaker),
        event_date = COALESCE(?, event_date),
        event_time = COALESCE(?, event_time),
        description = COALESCE(?, description),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `);

    stmt.run(title, speaker, event_date, event_time, description, is_active, id);
    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    res.json({ success: true, data: updated, message: 'Acara berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/events/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM events WHERE id = ?').run(id);
    res.json({ success: true, message: 'Acara berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// FINANCES CRUD & EDIT API
// -------------------------------------------------------------
app.get('/api/finances', (req, res) => {
  try {
    const records = db.prepare('SELECT * FROM finances ORDER BY date DESC, id DESC').all();
    const summary = getFinanceSummaryData();

    res.json({
      success: true,
      data: {
        records,
        summary,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/finances', (req, res) => {
  try {
    const { type, category, amount, description, date } = req.body;
    if (!type || !amount || !description || !date) {
      return res.status(400).json({ success: false, message: 'Tipe, Jumlah, Deskripsi, dan Tanggal Wajib Diisi.' });
    }

    const stmt = db.prepare(`
      INSERT INTO finances (type, category, amount, description, date)
      VALUES (?, ?, ?, ?, ?)
    `);

    const info = stmt.run(type, category || 'Kas Umum', Number(amount), description, date);
    const newRecord = db.prepare('SELECT * FROM finances WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: newRecord, message: 'Transaksi berhasil dicatat.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/finances/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { type, category, amount, description, date } = req.body;

    const stmt = db.prepare(`
      UPDATE finances SET
        type = COALESCE(?, type),
        category = COALESCE(?, category),
        amount = COALESCE(?, amount),
        description = COALESCE(?, description),
        date = COALESCE(?, date)
      WHERE id = ?
    `);

    stmt.run(type, category, amount !== undefined ? Number(amount) : null, description, date, id);
    const updated = db.prepare('SELECT * FROM finances WHERE id = ?').get(id);
    res.json({ success: true, data: updated, message: 'Transaksi berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/finances/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM finances WHERE id = ?').run(id);
    res.json({ success: true, message: 'Transaksi berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Fallback for SPA routing in production dist mode
if (fs.existsSync(distDir)) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`===================================================`);
  console.log(`Al Hikmah Digital Signage Backend Server Active`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`===================================================`);
});
