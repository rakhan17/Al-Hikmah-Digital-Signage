import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toUpperCase();
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') {
        return;
      }

      // Shortcut 1: Shift + 1 -> Toggle Fullscreen Mode
      if (e.shiftKey && (e.key === '1' || e.key === '!' || e.code === 'Digit1')) {
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

      // Shortcut 2: Shift + 2 -> Toggle Admin Panel
      if (e.shiftKey && (e.key === '2' || e.key === '@' || e.code === 'Digit2')) {
        e.preventDefault();
        setIsAdminOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCloseAdmin = () => {
    setIsAdminOpen(false);
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

      {/* Main Fullscreen Layout */}
      <div className="tv-main-content">
        <div className="hero-top-row">
          <div className="event-carousel-wrapper">
            <EventCarousel events={data.events} />
          </div>

          <div className="clock-sidebar-section">
            {/* Braun Analog Glass Clock with Logo embedded inside dial */}
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

      {/* Admin Panel Drawer */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={handleCloseAdmin}
        onRefreshData={fetchData}
      />
    </div>
  );
}

export default App;
