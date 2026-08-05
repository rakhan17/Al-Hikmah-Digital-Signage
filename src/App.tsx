import { useState, useEffect } from 'react';
import { Settings, Calendar, DollarSign, Monitor } from 'lucide-react';
import { AdhanIqomahOverlay } from './components/AdhanIqomahOverlay';
import { PrayerBar } from './components/PrayerBar';
import { EventCarousel } from './components/EventCarousel';
import { RunningTextFooter } from './components/RunningTextFooter';
import { AdminPanel } from './components/AdminPanel';
import { GlassClock } from './components/ui/glass-clock';
import type { PublicSignageBundle } from './types/signage';

export function App() {
  const [data, setData] = useState<PublicSignageBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(
    typeof window !== 'undefined' && window.location.pathname === '/admin'
  );
  const [adminTab, setAdminTab] = useState<'settings' | 'events' | 'finances'>('settings');
  const [isHoverSidebarOpen, setIsHoverSidebarOpen] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [dataFetchLocalTime, setDataFetchLocalTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkAdminPath = () => {
      if (window.location.pathname === '/admin') {
        setIsAdminOpen(true);
      }
    };
    checkAdminPath();
    window.addEventListener('popstate', checkAdminPath);
    return () => window.removeEventListener('popstate', checkAdminPath);
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/public/data');
      if (!res.ok) throw new Error('Gagal terhubung ke backend server.');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setDataFetchLocalTime(Date.now());
        setError(null);
      } else {
        setError(json.message || 'Gagal mengambil data signage.');
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Koneksi backend terputus.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard Shortcuts: Press "p" or "P" to toggle Fullscreen Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toUpperCase();
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') {
        return;
      }

      // Key "p" or "P" -> Toggle Fullscreen Mode
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch((err) => {
            console.error('Failed to enter fullscreen:', err);
          });
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global Mouse Cursor Detection for Left-Edge Slide-Out Sidebar Drawer
  useEffect(() => {
    if (isAdminOpen) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientX <= 20) {
        setIsHoverSidebarOpen(true);
      } else if (e.clientX > 330) {
        setIsHoverSidebarOpen(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isAdminOpen]);

  const handleOpenAdminTab = (tab: 'settings' | 'events' | 'finances') => {
    setAdminTab(tab);
    setIsAdminOpen(true);
    setIsHoverSidebarOpen(false);
  };

  const handleCloseAdmin = () => {
    setIsAdminOpen(false);
    setIsHoverSidebarOpen(false);
    if (window.location.pathname === '/admin') {
      window.history.pushState({}, '', '/');
    }
  };

  if (loading) {
    return (
      <div className="tv-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <h1 style={{ color: '#ffffff', fontSize: '2.5rem', fontWeight: 800 }}>
          Al Hikmah Digital Signage
        </h1>
        <p style={{ color: '#a1a1aa', marginTop: 12 }}>Memuat sistem signage...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="tv-container" style={{ justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <h2 style={{ color: '#ffffff', fontSize: '2.4rem', fontWeight: 800 }}>
          Koneksi Backend Terputus
        </h2>
        <p style={{ color: '#a1a1aa', marginTop: 12, textAlign: 'center', maxWidth: 600 }}>
          {error || 'Tidak dapat terhubung ke server local port 5001.'}
        </p>
        <button
          onClick={fetchData}
          style={{
            marginTop: 24,
            padding: '12px 28px',
            background: '#ffffff',
            color: '#000000',
            border: 'none',
            borderRadius: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Coba Hubungkan Kembali
        </button>
      </div>
    );
  }

  // Compute live ticking clock time (handles both real and custom simulated modes)
  let activeClockTime = currentTime;
  if (data.prayerData.simulatedNow) {
    const simBaseMs = new Date(data.prayerData.simulatedNow).getTime();
    const elapsedMs = Math.max(0, currentTime.getTime() - dataFetchLocalTime);
    activeClockTime = new Date(simBaseMs + elapsedMs);
  }

  const hh = String(activeClockTime.getHours()).padStart(2, '0');
  const mm = String(activeClockTime.getMinutes()).padStart(2, '0');
  const ss = String(activeClockTime.getSeconds()).padStart(2, '0');

  return (
    <div className="tv-container">
      {/* Fullscreen Overlay for Adhan, Iqomah & Friday Phases */}
      <AdhanIqomahOverlay
        phase={data.prayerData.currentPhase}
        prayerContext={data.prayerData.activePrayerContext}
        initialTimeRemainingSec={data.prayerData.timeRemainingSec}
      />

      {/* Left Edge Mouse Trigger Sensor (Active on Signage View) */}
      {!isAdminOpen && (
        <div
          onMouseEnter={() => setIsHoverSidebarOpen(true)}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: 20,
            zIndex: 999990,
            cursor: 'pointer',
          }}
        />
      )}

      {/* Slide-Out Hover Admin Sidebar Drawer (Same structure as Admin Panel Sidebar) */}
      {!isAdminOpen && (
        <aside
          className="admin-sidebar"
          onMouseEnter={() => setIsHoverSidebarOpen(true)}
          onMouseLeave={() => setIsHoverSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 999999,
            transform: isHoverSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: isHoverSidebarOpen ? '10px 0 40px rgba(0,0,0,0.8)' : 'none',
          }}
        >
          <div className="sidebar-brand">
            <h2 className="sidebar-title">Management System</h2>
            <p className="sidebar-subtitle">{data.settings.mosque_name || 'Masjid Al Hikmah'}</p>
          </div>

          <nav className="sidebar-nav">
            <button
              className="sidebar-nav-item"
              onClick={() => handleOpenAdminTab('settings')}
            >
              <Settings size={20} />
              <span>Pengaturan Shalat & Lokasi</span>
            </button>

            <button
              className="sidebar-nav-item"
              onClick={() => handleOpenAdminTab('events')}
            >
              <Calendar size={20} />
              <span>Agenda & Acara</span>
            </button>

            <button
              className="sidebar-nav-item"
              onClick={() => handleOpenAdminTab('finances')}
            >
              <DollarSign size={20} />
              <span>Laporan Keuangan Kas</span>
            </button>
          </nav>

          <div className="sidebar-footer">
            <button className="sidebar-btn-exit" onClick={() => setIsHoverSidebarOpen(false)}>
              <Monitor size={18} />
              <span>Ke Tampilan Signage TV</span>
            </button>
            <div style={{ marginTop: 14, textAlign: 'center', fontSize: '0.72rem', color: '#71717a', fontWeight: 600, lineHeight: 1.4 }}>
              © 2026 Al Hikmah Digital Signage<br />Powered by Decablue Society │ Developed by Rakhan Ataya Prayetno
            </div>
          </div>
        </aside>
      )}

      {/* Main Fullscreen Layout */}
      <div className="tv-main-content">
        <div className="hero-top-row">
          <div className="event-carousel-wrapper">
            <EventCarousel events={data.events} />
          </div>

          <div className="clock-sidebar-section">
            {/* Braun Analog Glass Clock */}
            <div className="analog-clock-wrapper">
              <GlassClock targetDate={activeClockTime} />
            </div>

            <div className="clock-info-box">
              <h1 className="clock-brand-title">
                {data.settings.mosque_name || 'Masjid Al Hikmah'}
              </h1>
              <div className="clock-date-gregorian">{data.prayerData.gregorianDate}</div>
              <div className="clock-date-hijri">{data.prayerData.hijriDate}</div>

              <div className="cardless-digital-clock">
                <span className="clock-num-digits">{hh}:{mm}</span>
                <span className="clock-num-sec">:{ss}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 6 Prayer Times Bar */}
        <PrayerBar prayers={data.prayerData.prayers} />
      </div>

      {/* 100% Finance & Kas Masjid Ticker Footer */}
      <RunningTextFooter
        finances={data.finances}
      />

      {/* Fullscreen Admin Panel Workspace */}
      <AdminPanel
        isOpen={isAdminOpen}
        initialTab={adminTab}
        onClose={handleCloseAdmin}
        onRefreshData={fetchData}
      />
    </div>
  );
}

export default App;
