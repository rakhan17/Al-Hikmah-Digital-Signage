import React, { useState, useEffect } from 'react';
import type { DisplayPhase, PrayerItem } from '../types/signage';

interface AdhanIqomahOverlayProps {
  phase: DisplayPhase;
  prayerContext: PrayerItem | null;
  initialTimeRemainingSec: number;
}

export const AdhanIqomahOverlay: React.FC<AdhanIqomahOverlayProps> = ({
  phase,
  prayerContext,
  initialTimeRemainingSec,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(initialTimeRemainingSec);

  useEffect(() => {
    setSecondsLeft(initialTimeRemainingSec);
  }, [initialTimeRemainingSec, phase]);

  useEffect(() => {
    if (phase === 'EVENT_CAROUSEL') return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  if (phase === 'EVENT_CAROUSEL' || !prayerContext) {
    return null;
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const pName = prayerContext.name.toUpperCase();

  return (
    <div className="overlay-backdrop">
      <div className="overlay-cinematic-container">
        {/* Mosque Official Emblem Logo Header */}
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
          <img
            src="/assets/alhikmah.png"
            alt="Logo Masjid Al Hikmah"
            style={{
              width: 72,
              height: 72,
              objectFit: 'contain',
              filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.6))',
            }}
          />
        </div>

        {/* PHASE 1: REGULAR & FRIDAY ADHAN COUNTDOWN (WITH TIMER) */}
        {phase === 'ADHAN_COUNTDOWN' && (
          <>
            <h2 className="cinematic-title gold">
              {pName.startsWith('ADZAN') ? `MENUJU WAKTU ${pName}` : `MENUJU WAKTU ADZAN ${pName}`}
            </h2>
            <div className="cinematic-timer gold">{mm}:{ss}</div>
            <p className="cinematic-subtitle">
              Hitung mundur persiapan diri menunaikan ibadah shalat berjamaah di masjid.
            </p>
          </>
        )}

        {/* PHASE 2: REGULAR ADHAN ALERT (NO TIMER) */}
        {phase === 'ADHAN_ALERT' && (
          <>
            <h2 className="cinematic-title gold">
              WAKTU ADZAN {pName} TIBA
            </h2>
            <p className="cinematic-subtitle" style={{ marginTop: 36 }}>
              Mendengarkan adzan dan mengumandangkan doa setelah adzan.
            </p>
          </>
        )}

        {/* PHASE 3: REGULAR IQOMAH COUNTDOWN (WITH TIMER) */}
        {phase === 'IQOMAH_COUNTDOWN' && (
          <>
            <h2 className="cinematic-title gold">COUNTDOWN IQOMAH {pName}</h2>
            <div className="cinematic-timer gold">{mm}:{ss}</div>
            <p className="cinematic-subtitle">
              Luruskan dan rapatkan shaf shalat. Heningkan telepon genggam Anda.
            </p>
          </>
        )}

        {/* PHASE 4: REGULAR PRAYER STANDBY (NO TIMER) */}
        {phase === 'PRAYER_STANDBY' && (
          <>
            <h2 className="cinematic-title white">SHALAT BERJAMAAH BERLANGSUNG</h2>
            <p className="cinematic-quote">
              "Luruskan shaf-shaf kalian, karena sejatinya meluruskan shaf adalah bagian dari kesempurnaan shalat."
            </p>
            <div className="cinematic-hadith-source">(HR. Bukhari & Muslim)</div>
          </>
        )}

        {/* SPECIAL FRIDAY PHASES (SINGLE ADZAN WORKFLOW) */}

        {/* FRIDAY PHASE 1: ADZAN SHALAT JUMAT TIBA (NO TIMER DURING ADZAN) */}
        {phase === 'JUMAT_ADHAN1' && (
          <>
            <h2 className="cinematic-title gold">
              WAKTU ADZAN SHALAT JUMAT TIBA
            </h2>
            <p className="cinematic-subtitle" style={{ marginTop: 36 }}>
              Segeralah menuju masjid untuk menunaikan Shalat Jumat.
            </p>
          </>
        )}

        {/* FRIDAY PHASE 2: JEDA KHUTBAH SHALAT JUMAT (WITH TIMER & NUMBERED ADAB CARD) */}
        {phase === 'JUMAT_JEDA_COUNTDOWN' && (
          <>
            <h2 className="cinematic-title gold">
              JEDA KHUTBAH SHALAT JUMAT
            </h2>
            <div className="cinematic-timer gold">{mm}:{ss}</div>

            <div style={{
              background: 'rgba(10, 10, 12, 0.85)',
              backdropFilter: 'blur(16px)',
              padding: '28px 42px',
              borderRadius: 24,
              marginTop: 16,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
              maxWidth: '920px',
              width: '100%',
            }}>
              <h3 style={{
                fontSize: '1.4rem',
                color: '#ffffff',
                fontWeight: 800,
                marginBottom: 18,
                letterSpacing: '0.5px',
                textAlign: 'center',
              }}>
                ADAB-ADAB MENDENGARKAN KHUTBAH JUMAT:
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  'Dilarang berbicara saat Khutbah Jumat berlangsung (Bahkan tegur orang lain).',
                  'Heningkan atau matikan seluruh telepon genggam (HP).',
                  'Duduk dengan tenang dan menyimak Khutbah dengan khusyuk.',
                  'Luruskan dan rapatkan shaf saat shalat hendak dimulai.',
                ].map((adabText, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '12px 20px',
                      borderRadius: 14,
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div
                      style={{
                        minWidth: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: '#ffffff',
                        color: '#000000',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {idx + 1}
                    </div>
                    <span style={{ fontSize: '1.15rem', color: '#f4f4f5', fontWeight: 600, textAlign: 'left' }}>
                      {adabText}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* FRIDAY PHASE 3: KHUTBAH & SHALAT JUMAT BERLANGSUNG */}
        {phase === 'JUMAT_KHUTBAH_STANDBY' && (
          <>
            <h2 className="cinematic-title white">
              KHUTBAH & SHALAT JUMAT BERLANGSUNG
            </h2>
            <p className="cinematic-quote">
              "Jika kamu berkata kepada temanmu pada hari Jumat: 'Diamlah!' ketika imam sedang berkhutbah, maka kamu telah berbuat sia-sia."
            </p>
            <div className="cinematic-hadith-source">(HR. Bukhari & Muslim)</div>
          </>
        )}
      </div>

      {/* COPYRIGHT SUBBAR AT THE BOTTOM OF ALL OVERLAY SCREENS WITH DECABLUE LOGO */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 28,
        background: '#050505',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontSize: '0.65rem',
        fontWeight: 600,
        color: '#52525b',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        zIndex: 10,
      }}>
        <span>© 2026 Al Hikmah Digital Signage │ Powered by</span>
        <img
          src="/assets/decablue.png"
          alt="Decablue Society Logo"
          style={{ width: 14, height: 14, objectFit: 'contain' }}
        />
        <span>Decablue Society │ Developed by Rakhan Ataya Prayetno. All Rights Reserved.</span>
      </div>
    </div>
  );
};
