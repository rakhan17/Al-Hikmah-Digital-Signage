import React from 'react';
import type { PrayerItem } from '../types/signage';

interface PrayerBarProps {
  prayers: PrayerItem[];
}

const arabicNames: Record<string, string> = {
  subuh: 'الفجر',
  syuruq: 'الشروق',
  dzuhur: 'الظهر',
  jumat: 'الجمعة',
  ashar: 'العصر',
  maghrib: 'المغرب',
  isya: 'العشاء',
};

export const PrayerBar: React.FC<PrayerBarProps> = ({ prayers }) => {
  return (
    <div className="prayer-bar-grid">
      {prayers.map((item) => {
        const isNext = item.isNext;
        const lookupKey = item.name.toLowerCase() === 'jumat' ? 'jumat' : item.key;
        const arabicText = arabicNames[lookupKey] || '';

        return (
          <div
            key={item.key}
            className={`prayer-item-minimal ${isNext ? 'next-prayer' : ''}`}
          >
            <div className="prayer-name-row">
              <span className="prayer-name">{item.name}</span>
              {arabicText && <span className="prayer-name-arabic">{arabicText}</span>}
            </div>
            <div className="prayer-time">{item.time}</div>
          </div>
        );
      })}
    </div>
  );
};
