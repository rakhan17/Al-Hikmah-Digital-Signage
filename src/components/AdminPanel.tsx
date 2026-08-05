import React, { useState, useEffect } from 'react';
import {
  Settings,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  Save,
  RefreshCw,
  Monitor,
  CheckCircle,
  AlertCircle,
  XCircle,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import type { MosqueEvent, FinanceRecord, FinanceSummary } from '../types/signage';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => void;
  initialTab?: 'settings' | 'events' | 'finances';
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  onRefreshData,
  initialTab = 'settings',
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'events' | 'finances'>(initialTab);
  const [showAdvancedDevMode, setShowAdvancedDevMode] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Settings State
  const [settingsForm, setSettingsForm] = useState<Record<string, any>>({});
  const [savingSettings, setSavingSettings] = useState(false);

  // Events State
  const [eventsList, setEventsList] = useState<MosqueEvent[]>([]);
  const [newEvent, setNewEvent] = useState({
    title: '',
    speaker: '',
    event_date: '',
    event_time: '',
    description: '',
  });

  // Finances State & Edit State
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([]);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  });
  const [editingFinanceId, setEditingFinanceId] = useState<number | null>(null);
  const [newFinance, setNewFinance] = useState({
    type: 'income' as 'income' | 'expense',
    category: 'Kas Umum',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  // UI Toast State
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (json.success) {
        setSettingsForm(json.data || json.settings || {});
      }
    } catch {
      showToast('Gagal memuat pengaturan database', 'error');
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const json = await res.json();
      if (json.success) {
        const list = json.data || json.events || [];
        setEventsList(Array.isArray(list) ? list : []);
      }
    } catch {
      showToast('Gagal memuat daftar agenda', 'error');
    }
  };

  const fetchFinances = async () => {
    try {
      const res = await fetch('/api/finances');
      const json = await res.json();
      if (json.success) {
        const list = json.data?.records || json.records || json.finances || [];
        const sum = json.data?.summary || json.summary || { totalIncome: 0, totalExpense: 0, balance: 0 };
        setFinanceRecords(Array.isArray(list) ? list : []);
        setFinanceSummary(sum);
      }
    } catch {
      showToast('Gagal memuat laporan keuangan', 'error');
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      fetchEvents();
      fetchFinances();
    }
  }, [isOpen]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Seluruh pengaturan berhasil disimpan!');
        onRefreshData();
      } else {
        showToast(json.message || 'Gagal menyimpan pengaturan', 'error');
      }
    } catch {
      showToast('Koneksi server terganggu', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleDevModeSwitch = () => {
    if (!showAdvancedDevMode) {
      const pass = window.prompt('Masukkan Kode Verifikasi Teknisi (Password):');
      if (pass === '17oktober2009') {
        setShowAdvancedDevMode(true);
        setSettingsForm((prev) => ({ ...prev, use_custom_datetime: 1 }));
        showToast('Akses Teknisi Diberikan! Mode Manual & Simulator Aktif.');
      } else if (pass !== null) {
        showToast('Kode verifikasi salah! Akses ditolak.', 'error');
      }
    } else {
      setShowAdvancedDevMode(false);
      setSettingsForm((prev) => ({ ...prev, use_custom_datetime: 0 }));
      showToast('Mode Lanjutan Dikunci Kembali (Mode Otomatis Real-Time).');
    }
  };

  const handleNumChange = (field: string, val: string) => {
    setSettingsForm({
      ...settingsForm,
      [field]: val === '' ? '' : parseInt(val, 10),
    });
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Agenda baru berhasil ditambahkan!');
        setNewEvent({
          title: '',
          speaker: '',
          event_date: '',
          event_time: '',
          description: '',
        });
        fetchEvents();
        onRefreshData();
      } else {
        showToast(json.message, 'error');
      }
    } catch {
      showToast('Gagal menambah agenda', 'error');
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('Hapus agenda ini dari tayangan TV?')) return;
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Agenda berhasil dihapus!');
        fetchEvents();
        onRefreshData();
      }
    } catch {
      showToast('Gagal menghapus agenda', 'error');
    }
  };

  const handleSaveFinance = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      type: newFinance.type,
      category: newFinance.category,
      amount: parseFloat(newFinance.amount),
      description: newFinance.description,
      date: newFinance.date,
    };

    try {
      const url = editingFinanceId !== null ? `/api/finances/${editingFinanceId}` : '/api/finances';
      const method = editingFinanceId !== null ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        showToast(editingFinanceId !== null ? 'Catatan kas berhasil diubah!' : 'Transaksi kas baru berhasil dicatat!');
        setEditingFinanceId(null);
        setNewFinance({
          type: 'income',
          category: 'Kas Umum',
          amount: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
        });
        fetchFinances();
        onRefreshData();
      } else {
        showToast(json.message, 'error');
      }
    } catch {
      showToast('Gagal menyimpan transaksi', 'error');
    }
  };

  const handleStartEditFinance = (rec: FinanceRecord) => {
    setEditingFinanceId(rec.id);
    setNewFinance({
      type: rec.type,
      category: rec.category,
      amount: String(rec.amount),
      description: rec.description,
      date: rec.date,
    });
  };

  const handleCancelEditFinance = () => {
    setEditingFinanceId(null);
    setNewFinance({
      type: 'income',
      category: 'Kas Umum',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handleDeleteFinance = async (id: number) => {
    if (!confirm('Hapus catatan transaksi ini?')) return;
    try {
      const res = await fetch(`/api/finances/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Transaksi berhasil dihapus!');
        if (editingFinanceId === id) handleCancelEditFinance();
        fetchFinances();
        onRefreshData();
      }
    } catch {
      showToast('Gagal menghapus transaksi', 'error');
    }
  };

  if (!isOpen) return null;

  const defaultIqomahMap: Record<string, number> = {
    subuh: 10,
    dzuhur: 10,
    ashar: 10,
    maghrib: 7,
    isya: 10,
  };

  const safeTotalIncome = (financeSummary && typeof financeSummary.totalIncome === 'number') ? financeSummary.totalIncome : 0;
  const safeTotalExpense = (financeSummary && typeof financeSummary.totalExpense === 'number') ? financeSummary.totalExpense : 0;
  const safeBalance = (financeSummary && typeof financeSummary.balance === 'number') ? financeSummary.balance : 0;
  const safeMonthlyIncome = financeSummary?.monthlyIncome;
  const safeMonthlyExpense = financeSummary?.monthlyExpense;

  return (
    <div className="admin-fullscreen-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <h2 className="sidebar-title">Management System</h2>
          <p className="sidebar-subtitle">{settingsForm.mosque_name || 'Masjid Al Hikmah'}</p>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} />
            <span>Pengaturan Shalat & Lokasi</span>
          </button>

          <button
            className={`sidebar-nav-item ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            <Calendar size={20} />
            <span>Agenda & Acara</span>
          </button>

          <button
            className={`sidebar-nav-item ${activeTab === 'finances' ? 'active' : ''}`}
            onClick={() => setActiveTab('finances')}
          >
            <DollarSign size={20} />
            <span>Laporan Keuangan Kas</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-btn-exit" onClick={onClose}>
            <Monitor size={18} />
            <span>Ke Tampilan Signage TV</span>
          </button>
          <div style={{ marginTop: 14, textAlign: 'center', fontSize: '0.72rem', color: '#71717a', fontWeight: 600, lineHeight: 1.4 }}>
            © 2026 Al Hikmah Digital Signage<br />Powered by Decablue Society │ Developed by Rakhan Ataya Prayetno
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="admin-workspace">
        <header className="workspace-header">
          <div>
            <h1 className="workspace-title">
              {activeTab === 'settings' && 'Pengaturan Waktu Shalat & Layar Signage'}
              {activeTab === 'events' && 'Manajemen Agenda & Kajian Masjid'}
              {activeTab === 'finances' && 'Manajemen Kas & Laporan Keuangan'}
            </h1>
            <p className="workspace-subtitle">
              Sistem Pengelolaan Informasi Digital Signage Minimalis & Presisi
            </p>
          </div>

          {message && (
            <div className={`toast-badge ${message.type}`}>
              {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{message.text}</span>
            </div>
          )}
        </header>

        <div className="workspace-scroll-area">
          {/* TAB 1: SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="admin-card">
              {/* SPECIAL FRIDAY PRAYER SETTINGS (SINGLE ADZAN WORKFLOW) */}
              <div className="card-section-title">Pengaturan Khusus Shalat Jumat</div>
              <p className="card-section-hint">Atur jam dan durasi alur Shalat Jumat (Adzan Shalat Jumat ➔ Jeda + Adab Khutbah ➔ Khutbah & Shalat Jumat).</p>
              
              <div className="form-group" style={{ maxWidth: '400px', marginBottom: 20 }}>
                <label>Jam Adzan Shalat Jumat (HH:mm)</label>
                <input
                  type="time"
                  className="form-control"
                  placeholder="Kosongkan (Otomatis Waktu Dzuhur/Jumat)"
                  value={settingsForm.jumat_adhan1_time ?? ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, jumat_adhan1_time: e.target.value })}
                />
                <span style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: 4, display: 'block' }}>
                  Isi jam khusus (misal 12:00) atau kosongkan untuk mengikuti waktu Dzuhur.
                </span>
              </div>

              <div className="grid-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div className="form-group">
                  <label>Durasi Adzan (Menit)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="3"
                    value={settingsForm.jumat_adhan1_duration ?? ''}
                    onChange={(e) => handleNumChange('jumat_adhan1_duration', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Jeda & Adab Khutbah (Menit)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="10"
                    value={settingsForm.jumat_jeda_duration ?? ''}
                    onChange={(e) => handleNumChange('jumat_jeda_duration', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Khutbah & Shalat (Menit)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="45"
                    value={settingsForm.jumat_khutbah_duration ?? ''}
                    onChange={(e) => handleNumChange('jumat_khutbah_duration', e.target.value)}
                  />
                </div>
              </div>

              <div className="card-section-title" style={{ marginTop: 32 }}>Durasi Tampilan Layar Adzan Shalat Harian (Menit)</div>
              <p className="card-section-hint">Kosongkan jika ingin menggunakan durasi otomatis default (3 menit).</p>
              <div className="form-group" style={{ maxWidth: '300px' }}>
                <label>Durasi Layar Waktu Adzan</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  placeholder="Otomatis (3 Menit)"
                  className="form-control"
                  value={settingsForm.adhan_duration ?? ''}
                  onChange={(e) => handleNumChange('adhan_duration', e.target.value)}
                />
              </div>

              <div className="card-section-title" style={{ marginTop: 32 }}>Durasi Countdown Iqomah per Shalat Harian (Menit)</div>
              <p className="card-section-hint">Kosongkan jika ingin menggunakan durasi otomatis default.</p>
              <div className="grid-5col">
                {(['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'] as const).map((pKey) => (
                  <div key={pKey} className="form-group">
                    <label style={{ textTransform: 'capitalize' }}>{pKey}</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      placeholder={`Otomatis (${defaultIqomahMap[pKey]}m)`}
                      className="form-control"
                      value={settingsForm[`iqomah_${pKey}`] ?? ''}
                      onChange={(e) => handleNumChange(`iqomah_${pKey}`, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="card-section-title" style={{ marginTop: 32 }}>Durasi Layar Waktu Shalat Berjamaah / Standby Harian (Menit)</div>
              <p className="card-section-hint">Kosongkan jika ingin menggunakan durasi otomatis default (15 menit).</p>
              <div className="grid-5col">
                {(['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'] as const).map((pKey) => (
                  <div key={pKey} className="form-group">
                    <label style={{ textTransform: 'capitalize' }}>{pKey}</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      placeholder="Otomatis (15m)"
                      className="form-control"
                      value={settingsForm[`standby_${pKey}`] ?? ''}
                      onChange={(e) => handleNumChange(`standby_${pKey}`, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="card-section-title" style={{ marginTop: 32 }}>Manual Prayer Time Overrides (Opsional)</div>
              <p className="card-section-hint">Isi jam (HH:mm) jika ingin mematikan kalkulasi adhan.js otomatis untuk waktu shalat tertentu. Kosongkan untuk otomatis.</p>
              <div className="grid-6col">
                {(['subuh', 'syuruq', 'dzuhur', 'ashar', 'maghrib', 'isya'] as const).map((pKey) => (
                  <div key={pKey} className="form-group">
                    <label style={{ textTransform: 'capitalize' }}>{pKey}</label>
                    <input
                      placeholder="Otomatis"
                      className="form-control"
                      value={settingsForm[`${pKey}_override`] ?? ''}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, [`${pKey}_override`]: e.target.value })
                      }
                    />
                  </div>
                ))}
              </div>

              {/* REVEALED DEVELOPER / TECHNICAL ZONE PANEL */}
              {showAdvancedDevMode && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: 20,
                  padding: 28,
                  marginTop: 32,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#f87171', fontWeight: 800, fontSize: '1.05rem', marginBottom: 16 }}>
                    <AlertTriangle size={20} />
                    <span>AREA LANJUTAN & SIMULATOR TEKNIS (MANUAL MODE)</span>
                  </div>

                  {/* CUSTOM TIME & DATE SIMULATOR */}
                  <div className="card-section-title" style={{ fontSize: '1.05rem', color: '#fca5a5' }}>
                    Simulator Pengujian Waktu Custom (Pengujian Layar Adzan/Iqomah/Jumat)
                  </div>
                  <p className="card-section-hint" style={{ color: '#f87171', marginBottom: 16 }}>
                    Perhatian: Gunakan fitur ini HANYA untuk menguji simulasi waktu tanpa mengubah jam sistem komputer masjid.
                  </p>
                  
                  <div className="grid-2col" style={{ marginBottom: 28, background: 'rgba(0,0,0,0.4)', padding: 18, borderRadius: 16, border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Tanggal Custom</label>
                      <input
                        type="date"
                        className="form-control"
                        value={settingsForm.custom_date ?? ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, custom_date: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Jam Custom (HH:mm)</label>
                      <input
                        type="time"
                        className="form-control"
                        value={settingsForm.custom_time ?? ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, custom_time: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* PROFIL & KOORDINAT LOKASI */}
                  <div className="card-section-title" style={{ fontSize: '1.05rem', color: '#fca5a5' }}>
                    Profil & Koordinat Lokasi GPS Masjid
                  </div>
                  <div className="grid-2col">
                    <div className="form-group">
                      <label>Nama Masjid</label>
                      <input
                        className="form-control"
                        value={settingsForm.mosque_name ?? ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, mosque_name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Alamat Singkat</label>
                      <input
                        className="form-control"
                        value={settingsForm.address ?? ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Latitude (Garis Lintang)</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control"
                        value={settingsForm.latitude ?? ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, latitude: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Longitude (Garis Bujur)</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control"
                        value={settingsForm.longitude ?? ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, longitude: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 50/50 FLEX BUTTON LAYOUT AT BOTTOM */}
              <div style={{ marginTop: 32, display: 'flex', gap: 16 }}>
                <button type="submit" className="btn-primary" disabled={savingSettings} style={{ flex: 1 }}>
                  {savingSettings ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} Simpan Seluruh Pengaturan
                </button>

                <button
                  type="button"
                  onClick={handleToggleDevModeSwitch}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    borderRadius: 12,
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    background: '#dc2626',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ShieldAlert size={20} color="#ffffff" />
                  <span>{showAdvancedDevMode ? 'Tutup Technical Zone' : 'Developer Technical Zone'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: EVENTS */}
          {activeTab === 'events' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="admin-card">
                <div className="card-section-title">Tambah Agenda / Kajian Baru</div>
                <form onSubmit={handleAddEvent}>
                  <div className="grid-2col">
                    <div className="form-group">
                      <label>Judul Acara / Kajian</label>
                      <input
                        required
                        className="form-control"
                        placeholder="Contoh: Kajian Rutin Subuh Kitab Riyadhus Shalihin"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Penceramah / Ustadz</label>
                      <input
                        className="form-control"
                        placeholder="Contoh: Ust. Dr. Ahmad Fathoni, M.A."
                        value={newEvent.speaker}
                        onChange={(e) => setNewEvent({ ...newEvent, speaker: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Tanggal / Hari</label>
                      <input
                        required
                        placeholder="Contoh: Setiap Hari Ahad / 15 Agt 2026"
                        className="form-control"
                        value={newEvent.event_date}
                        onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Jam Pelaksanaan</label>
                      <input
                        required
                        placeholder="Contoh: 05:30 WITA"
                        className="form-control"
                        value={newEvent.event_time}
                        onChange={(e) => setNewEvent({ ...newEvent, event_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Deskripsi Singkat</label>
                    <input
                      className="form-control"
                      placeholder="Ringkasan penjelasan acara untuk ditampilkan pada TV"
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>
                    <Plus size={18} /> Tambahkan Agenda
                  </button>
                </form>
              </div>

              <div className="admin-card">
                <div className="card-section-title">Daftar Agenda Masjid Aktif</div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Judul Agenda</th>
                      <th>Penceramah</th>
                      <th>Waktu</th>
                      <th>Deskripsi</th>
                      <th style={{ textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(eventsList || []).map((evt) => (
                      <tr key={evt.id}>
                        <td style={{ fontWeight: 700, color: '#ffffff' }}>{evt.title}</td>
                        <td style={{ color: '#d4d4d8' }}>{evt.speaker || '-'}</td>
                        <td>{evt.event_date} @ {evt.event_time}</td>
                        <td style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{evt.description || '-'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn-danger" onClick={() => handleDeleteEvent(evt.id)}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!eventsList || eventsList.length === 0) && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                          Belum ada agenda terdaftar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: FINANCES */}
          {activeTab === 'finances' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="stat-cards-grid">
                <div className="stat-card">
                  <div className="stat-label">TOTAL PEMASUKAN</div>
                  <div className="stat-value" style={{ color: '#ffffff' }}>
                    Rp {safeTotalIncome.toLocaleString('id-ID')}
                  </div>
                  {safeMonthlyIncome !== undefined && (
                    <div style={{ fontSize: '0.82rem', color: '#a1a1aa', marginTop: 4 }}>
                      Bulan Ini: Rp {(safeMonthlyIncome || 0).toLocaleString('id-ID')}
                    </div>
                  )}
                </div>
                <div className="stat-card">
                  <div className="stat-label">TOTAL PENGELUARAN</div>
                  <div className="stat-value" style={{ color: '#d4d4d8' }}>
                    Rp {safeTotalExpense.toLocaleString('id-ID')}
                  </div>
                  {safeMonthlyExpense !== undefined && (
                    <div style={{ fontSize: '0.82rem', color: '#a1a1aa', marginTop: 4 }}>
                      Bulan Ini: Rp {(safeMonthlyExpense || 0).toLocaleString('id-ID')}
                    </div>
                  )}
                </div>
                <div className="stat-card">
                  <div className="stat-label">SALDO KAS SAAT INI</div>
                  <div className="stat-value" style={{ color: '#ffffff' }}>
                    Rp {safeBalance.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              <div className="admin-card">
                <div className="card-section-title">
                  {editingFinanceId !== null ? 'Edit Transaksi Keuangan Kas' : 'Catat Transaksi Keuangan Kas'}
                </div>
                <form onSubmit={handleSaveFinance}>
                  <div className="grid-3col">
                    <div className="form-group">
                      <label>Tipe Transaksi</label>
                      <select
                        className="form-control"
                        value={newFinance.type}
                        onChange={(e) => setNewFinance({ ...newFinance, type: e.target.value as 'income' | 'expense' })}
                      >
                        <option value="income">Pemasukan (+)</option>
                        <option value="expense">Pengeluaran (-)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Kategori</label>
                      <input
                        className="form-control"
                        value={newFinance.category}
                        onChange={(e) => setNewFinance({ ...newFinance, category: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Nominal (Rp)</label>
                      <input
                        type="number"
                        required
                        className="form-control"
                        placeholder="Contoh: 500000"
                        value={newFinance.amount}
                        onChange={(e) => setNewFinance({ ...newFinance, amount: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid-2col">
                    <div className="form-group">
                      <label>Keterangan Transaksi</label>
                      <input
                        required
                        className="form-control"
                        placeholder="Contoh: Perawatan Taman & Air"
                        value={newFinance.description}
                        onChange={(e) => setNewFinance({ ...newFinance, description: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Tanggal Transaksi</label>
                      <input
                        type="date"
                        required
                        className="form-control"
                        value={newFinance.date}
                        onChange={(e) => setNewFinance({ ...newFinance, date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button type="submit" className="btn-primary">
                      {editingFinanceId !== null ? <Save size={18} /> : <Plus size={18} />}
                      <span>{editingFinanceId !== null ? 'Simpan Perubahan (Edit)' : 'Simpan Transaksi Kas'}</span>
                    </button>

                    {editingFinanceId !== null && (
                      <button type="button" className="btn-danger" onClick={handleCancelEditFinance}>
                        <XCircle size={18} />
                        <span>Batal Edit</span>
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="admin-card">
                <div className="card-section-title">Riwayat Transaksi Kas Masjid</div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Tipe</th>
                      <th>Kategori</th>
                      <th>Keterangan</th>
                      <th>Nominal</th>
                      <th style={{ textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(financeRecords || []).map((fin) => (
                      <tr key={fin.id}>
                        <td>{fin.date}</td>
                        <td>
                          <span className={`pill-badge ${fin.type}`}>
                            {fin.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                          </span>
                        </td>
                        <td style={{ color: '#cbd5e1' }}>{fin.category}</td>
                        <td style={{ color: '#ffffff', fontWeight: 600 }}>{fin.description}</td>
                        <td style={{ fontWeight: 800, color: fin.type === 'income' ? '#ffffff' : '#d4d4d8' }}>
                          {fin.type === 'income' ? '+' : '-'} Rp {(fin.amount || 0).toLocaleString('id-ID')}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button
                              className="status-toggle-btn active"
                              onClick={() => handleStartEditFinance(fin)}
                              title="Edit Transaksi"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              className="btn-danger"
                              onClick={() => handleDeleteFinance(fin.id)}
                              title="Hapus Transaksi"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!financeRecords || financeRecords.length === 0) && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                          Belum ada catatan transaksi keuangan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
