import React, { useState, useEffect } from 'react';
import type { AppSettings } from '../types/signage';

interface TVHeaderProps {
  settings: AppSettings | null;
  gregorianDate: string;
  hijriDate: string;
}

export const TVHeader: React.FC<TVHeaderProps> = ({
  settings,
  gregorianDate,
  hijriDate,
}) => {
  const [timeStr, setTimeStr] = useState({ hoursMin: '00:00', seconds: '00' });

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setTimeStr({ hoursMin: `${h}:${m}`, seconds: s });
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="tv-header">
      <div className="mosque-brand">
        <h1 className="mosque-title">{settings?.mosque_name || 'Masjid Al Hikmah'}</h1>
      </div>

      <div className="header-clock-section">
        <div className="date-badge-box">
          <div className="gregorian-date">{gregorianDate || 'Senin, 3 Agustus 2026'}</div>
          <div className="hijri-date">{hijriDate || '19 Safar 1448 H'}</div>
        </div>

        <div className="digital-clock-display">
          <span className="clock-digits">{timeStr.hoursMin}</span>
          <span className="clock-seconds">:{timeStr.seconds}</span>
        </div>
      </div>
    </header>
  );
};
