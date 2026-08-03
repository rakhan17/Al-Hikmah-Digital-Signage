import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import db from './db.js';

function formatHHMM(date) {
  if (!date || isNaN(date.getTime())) return '--:--';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseHHMM(timeStr, referenceDate = new Date()) {
  if (!timeStr || !/^\d{1,2}:\d{2}$/.test(timeStr)) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date(referenceDate);
  date.setHours(h, m, 0, 0);
  return date;
}

export function getPrayerData(overrideDate = null) {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();

  // Determine Effective Current Time (supports Continuous Ticking Custom Simulation)
  let now = new Date();
  if (settings.use_custom_datetime === 1 && settings.custom_date && settings.custom_time) {
    try {
      const simStr = `${settings.custom_date}T${settings.custom_time}:00`;
      const baseSim = new Date(simStr);
      if (!isNaN(baseSim.getTime())) {
        const setTimestamp = settings.custom_set_timestamp || Date.now();
        const elapsedMs = Math.max(0, Date.now() - setTimestamp);
        now = new Date(baseSim.getTime() + elapsedMs);
      }
    } catch {
      // fallback to real now
    }
  }

  const targetDate = overrideDate || now;
  const coords = new Coordinates(settings.latitude, settings.longitude);

  let params;
  switch (settings.calculation_method) {
    case 'MWL':
      params = CalculationMethod.MuslimWorldLeague();
      break;
    case 'Egyptian':
      params = CalculationMethod.Egyptian();
      break;
    case 'UmmAlQura':
      params = CalculationMethod.UmmAlQura();
      break;
    case 'KEMAG':
    case 'Singapore':
    default:
      params = CalculationMethod.Singapore();
      break;
  }

  const rawPrayerTimes = new PrayerTimes(coords, targetDate, params);

  const baseTimes = {
    subuh: rawPrayerTimes.fajr,
    syuruq: rawPrayerTimes.sunrise,
    dzuhur: rawPrayerTimes.dhuhr,
    ashar: rawPrayerTimes.asr,
    maghrib: rawPrayerTimes.maghrib,
    isya: rawPrayerTimes.isha,
  };

  const activeTimes = {};
  const activeDates = {};
  const keys = ['subuh', 'syuruq', 'dzuhur', 'ashar', 'maghrib', 'isya'];

  keys.forEach((key) => {
    const overrideVal = settings[`${key}_override`];
    if (overrideVal && overrideVal.trim() !== '') {
      activeTimes[key] = overrideVal.trim();
      activeDates[key] = parseHHMM(overrideVal.trim(), targetDate);
    } else {
      activeTimes[key] = formatHHMM(baseTimes[key]);
      activeDates[key] = baseTimes[key];
    }
  });

  const isFriday = targetDate.getDay() === 5;

  const prayerList = [
    {
      name: 'Subuh',
      key: 'subuh',
      time: activeTimes.subuh,
      date: activeDates.subuh,
      iqomahMin: settings.iqomah_subuh || 10,
      standbyMin: settings.standby_subuh || settings.standby_duration || 15,
    },
    {
      name: 'Syuruq',
      key: 'syuruq',
      time: activeTimes.syuruq,
      date: activeDates.syuruq,
      iqomahMin: 0,
      standbyMin: 0,
    },
    {
      name: isFriday ? 'Jumat' : 'Dzuhur',
      key: 'dzuhur',
      time: activeTimes.dzuhur,
      date: activeDates.dzuhur,
      iqomahMin: settings.iqomah_dzuhur || 10,
      standbyMin: settings.standby_dzuhur || settings.standby_duration || 15,
    },
    {
      name: 'Ashar',
      key: 'ashar',
      time: activeTimes.ashar,
      date: activeDates.ashar,
      iqomahMin: settings.iqomah_ashar || 10,
      standbyMin: settings.standby_ashar || settings.standby_duration || 15,
    },
    {
      name: 'Maghrib',
      key: 'maghrib',
      time: activeTimes.maghrib,
      date: activeDates.maghrib,
      iqomahMin: settings.iqomah_maghrib || 7,
      standbyMin: settings.standby_maghrib || settings.standby_duration || 15,
    },
    {
      name: 'Isya',
      key: 'isya',
      time: activeTimes.isya,
      date: activeDates.isya,
      iqomahMin: settings.iqomah_isya || 10,
      standbyMin: settings.standby_isya || settings.standby_duration || 15,
    },
  ];

  let nextPrayer = null;
  for (const item of prayerList) {
    if (item.date && item.date > now) {
      nextPrayer = item;
      break;
    }
  }

  if (!nextPrayer) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowRaw = new PrayerTimes(coords, tomorrow, params);
    const subuhOverride = settings.subuh_override;
    let tomorrowSubuhDate;
    if (subuhOverride && subuhOverride.trim() !== '') {
      tomorrowSubuhDate = parseHHMM(subuhOverride.trim(), tomorrow);
    } else {
      tomorrowSubuhDate = tomorrowRaw.fajr;
    }
    nextPrayer = {
      name: 'Subuh',
      key: 'subuh',
      time: formatHHMM(tomorrowSubuhDate),
      date: tomorrowSubuhDate,
      iqomahMin: settings.iqomah_subuh || 10,
      standbyMin: settings.standby_subuh || settings.standby_duration || 15,
      isTomorrow: true,
    };
  }

  let currentPhase = 'EVENT_CAROUSEL';
  let activePrayerContext = null;
  let timeRemainingSec = 0;

  const activePrayersForMode = prayerList.filter((p) => p.key !== 'syuruq');

  for (const item of activePrayersForMode) {
    if (!item.date) continue;

    const nowTime = now.getTime();

    // SPECIAL SINGLE ADZAN FRIDAY MODE (SHALAT JUMAT)
    if (isFriday && item.key === 'dzuhur') {
      const baseDzuhurTime = item.date.getTime();

      const adhanMs = (settings.jumat_adhan1_duration || 3) * 60 * 1000;
      const jedaMs = (settings.jumat_jeda_duration || 10) * 60 * 1000;
      const khutbahMs = (settings.jumat_khutbah_duration || 45) * 60 * 1000;

      let adhanTime = baseDzuhurTime;
      if (settings.jumat_adhan1_time && settings.jumat_adhan1_time.trim() !== '') {
        const customAdhanDate = parseHHMM(settings.jumat_adhan1_time.trim(), targetDate);
        if (customAdhanDate) {
          adhanTime = customAdhanDate.getTime();
        }
      }

      const adhanEnd = adhanTime + adhanMs;
      const jedaEnd = adhanEnd + jedaMs;
      const khutbahEnd = jedaEnd + khutbahMs;

      // 0. Approaching Friday Adhan (10 mins before Adzan Shalat Jumat)
      const adhanCountdownStart = adhanTime - 10 * 60 * 1000;
      if (nowTime >= adhanCountdownStart && nowTime < adhanTime) {
        currentPhase = 'ADHAN_COUNTDOWN';
        activePrayerContext = { ...item, name: 'Adzan Shalat Jumat' };
        timeRemainingSec = Math.floor((adhanTime - nowTime) / 1000);
        break;
      }

      // 1. Adzan Shalat Jumat
      if (nowTime >= adhanTime && nowTime < adhanEnd) {
        currentPhase = 'JUMAT_ADHAN1';
        activePrayerContext = { ...item, name: 'Adzan Shalat Jumat' };
        timeRemainingSec = Math.floor((adhanEnd - nowTime) / 1000);
        break;
      }

      // 2. Jeda Khutbah Jumat (Countdown + Adab Khutbah)
      if (nowTime >= adhanEnd && nowTime < jedaEnd) {
        currentPhase = 'JUMAT_JEDA_COUNTDOWN';
        activePrayerContext = { ...item, name: 'Khutbah & Shalat Jumat' };
        timeRemainingSec = Math.floor((jedaEnd - nowTime) / 1000);
        break;
      }

      // 3. Khutbah & Shalat Jumat Berlangsung (Includes Adzan 2 at mimbar + Khutbah & Shalat)
      if (nowTime >= jedaEnd && nowTime < khutbahEnd) {
        currentPhase = 'JUMAT_KHUTBAH_STANDBY';
        activePrayerContext = item;
        timeRemainingSec = Math.floor((khutbahEnd - nowTime) / 1000);
        break;
      }

      continue;
    }

    // REGULAR PRAYER DAY FLOW
    const adhanTime = item.date.getTime();
    const adhanDurationMs = (settings.adhan_duration || 3) * 60 * 1000;
    const iqomahDurationMs = (item.iqomahMin || 10) * 60 * 1000;
    const standbyDurationMs = (item.standbyMin || 15) * 60 * 1000;

    const adhanAlertEnd = adhanTime + adhanDurationMs;
    const iqomahEnd = adhanAlertEnd + iqomahDurationMs;
    const standbyEnd = iqomahEnd + standbyDurationMs;

    const adhanCountdownStart = adhanTime - 10 * 60 * 1000;
    if (nowTime >= adhanCountdownStart && nowTime < adhanTime) {
      currentPhase = 'ADHAN_COUNTDOWN';
      activePrayerContext = item;
      timeRemainingSec = Math.floor((adhanTime - nowTime) / 1000);
      break;
    }

    if (nowTime >= adhanTime && nowTime < adhanAlertEnd) {
      currentPhase = 'ADHAN_ALERT';
      activePrayerContext = item;
      timeRemainingSec = Math.floor((adhanAlertEnd - nowTime) / 1000);
      break;
    }

    if (nowTime >= adhanAlertEnd && nowTime < iqomahEnd) {
      currentPhase = 'IQOMAH_COUNTDOWN';
      activePrayerContext = item;
      timeRemainingSec = Math.floor((iqomahEnd - nowTime) / 1000);
      break;
    }

    if (nowTime >= iqomahEnd && nowTime < standbyEnd) {
      currentPhase = 'PRAYER_STANDBY';
      activePrayerContext = item;
      timeRemainingSec = Math.floor((standbyEnd - nowTime) / 1000);
      break;
    }
  }

  let hijriDateStr = '';
  try {
    const formatter = new Intl.DateTimeFormat('id-TN-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const formatted = formatter.format(targetDate).trim();
    hijriDateStr = formatted.endsWith('H') ? formatted : `${formatted} H`;
  } catch {
    hijriDateStr = '1448 H';
  }

  const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthsIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayName = daysIndo[targetDate.getDay()];
  const dateNum = targetDate.getDate();
  const monthName = monthsIndo[targetDate.getMonth()];
  const yearNum = targetDate.getFullYear();
  const gregorianDateStr = `${dayName}, ${dateNum} ${monthName} ${yearNum}`;

  return {
    prayers: prayerList.map((p) => ({
      name: p.name,
      key: p.key,
      time: p.time,
      iqomahMin: p.iqomahMin,
      standbyMin: p.standbyMin,
      isNext: nextPrayer && nextPrayer.key === p.key,
    })),
    nextPrayer: nextPrayer
      ? {
          name: nextPrayer.name,
          key: nextPrayer.key,
          time: nextPrayer.time,
          timeRemainingSec: Math.max(0, Math.floor((nextPrayer.date.getTime() - now.getTime()) / 1000)),
        }
      : null,
    gregorianDate: gregorianDateStr,
    hijriDate: hijriDateStr,
    currentPhase,
    activePrayerContext,
    timeRemainingSec,
    simulatedNow: now.toISOString(),
  };
}
