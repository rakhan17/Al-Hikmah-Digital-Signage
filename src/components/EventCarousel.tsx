import React, { useState, useEffect, useRef } from 'react';
import type { MosqueEvent } from '../types/signage';

interface EventCarouselProps {
  events: MosqueEvent[];
}

interface SlideItem extends MosqueEvent {
  isWelcome?: boolean;
  isDonation?: boolean;
  durationSec?: number;
}

export const EventCarousel: React.FC<EventCarouselProps> = ({ events }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFastRewind, setIsFastRewind] = useState(false);
  const [bannerImages, setBannerImages] = useState<string[]>([]);
  const [assignedImages, setAssignedImages] = useState<Record<string | number, string>>({});

  const imageMapRef = useRef<Record<string | number, string>>({});
  const touchStartX = useRef<number | null>(null);

  // 1. Mandatory Opening Welcome Banner at Start (7s duration, uses /assets/opening.jpeg)
  const welcomeSlide: SlideItem = {
    id: -100,
    title: 'Selamat Datang di Masjid Al Hikmah',
    speaker: 'Himbauan Jamaah',
    event_date: 'Setiap Hari',
    event_time: '24 Jam',
    description: 'Jagalah ketertiban, kebersihan, dan kekhusyukan selama berada di lingkungan masjid.',
    is_active: 1,
    isWelcome: true,
    durationSec: 7,
  };

  // 2. Mandatory Donation Poster Banner at End (5s duration, uses /assets/qris.jpeg)
  const donationSlide: SlideItem = {
    id: -200,
    title: 'Infaq & Donasi Digital Masjid Al Hikmah',
    speaker: 'QRIS & Transfer Bank',
    event_date: 'Setiap Saat',
    event_time: 'Online 24 Jam',
    description: 'BSI: 7123-4567-89  │  Mandiri: 149-00-1234567-8 (a.n. Masjid Al Hikmah)',
    is_active: 1,
    isDonation: true,
    durationSec: 5,
  };

  // Combine slides: [Welcome] -> [Middle Event Slides (if any)] -> [Donation Poster]
  const middleEvents: SlideItem[] = events && events.length > 0
    ? events.map((e) => ({ ...e, durationSec: 7 }))
    : [];

  const activeSlides: SlideItem[] = [welcomeSlide, ...middleEvents, donationSlide];
  const totalCards = activeSlides.length;

  // Fetch available banner images from /api/banner-images
  useEffect(() => {
    fetch('/api/banner-images')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.images) && json.images.length > 0) {
          setBannerImages(json.images);
        }
      })
      .catch((err) => console.error('Failed to load banner images:', err));
  }, []);

  // Unique non-repeating image assignment algorithm
  useEffect(() => {
    if (!bannerImages || bannerImages.length === 0) return;

    const currentMap = { ...imageMapRef.current };

    const activeKeys = new Set<string | number>();
    const usedImages = new Set<string>();

    activeSlides.forEach((item, idx) => {
      const key = item.id !== undefined ? item.id : `idx-${idx}`;
      activeKeys.add(key);
      if (currentMap[key]) {
        usedImages.add(currentMap[key]);
      }
    });

    Object.keys(currentMap).forEach((k) => {
      const numK = Number(k);
      const isNum = !isNaN(numK);
      if (!activeKeys.has(k) && (!isNum || !activeKeys.has(numK))) {
        delete currentMap[k];
      }
    });

    let unusedPool = bannerImages.filter((img) => !usedImages.has(img));

    activeSlides.forEach((item, idx) => {
      const key = item.id !== undefined ? item.id : `idx-${idx}`;

      if (!currentMap[key]) {
        if (unusedPool.length === 0) {
          const currentlyUsed = new Set(Object.values(currentMap));
          unusedPool = bannerImages.filter((img) => !currentlyUsed.has(img));
          if (unusedPool.length === 0) {
            unusedPool = [...bannerImages];
          }
        }

        const randomIndex = Math.floor(Math.random() * unusedPool.length);
        const chosenImage = unusedPool[randomIndex];

        unusedPool.splice(randomIndex, 1);
        usedImages.add(chosenImage);

        currentMap[key] = chosenImage;
      }
    });

    imageMapRef.current = currentMap;
    setAssignedImages({ ...currentMap });
  }, [bannerImages, events]);

  // Dynamic Slide Timer (7s for regular/event slides, 5s for Donation Poster slide)
  useEffect(() => {
    if (activeSlides.length <= 1) return;

    const currentSlide = activeSlides[currentIndex];
    const durationMs = ((currentSlide && currentSlide.durationSec) ? currentSlide.durationSec : 7) * 1000;

    const timer = setTimeout(() => {
      setCurrentIndex((prevIndex) => {
        if (prevIndex >= activeSlides.length - 1) {
          setIsFastRewind(true);
          setTimeout(() => setIsFastRewind(false), 500);
          return 0;
        } else {
          setIsFastRewind(false);
          return prevIndex + 1;
        }
      });
    }, durationMs);

    return () => clearTimeout(timer);
  }, [currentIndex, activeSlides.length]);

  // Manual Navigation Handlers
  const handlePrev = () => {
    setIsFastRewind(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalCards - 1));
  };

  const handleNext = () => {
    setIsFastRewind(false);
    setCurrentIndex((prev) => (prev < totalCards - 1 ? prev + 1 : 0));
  };

  const handleSelectSlide = (idx: number) => {
    setIsFastRewind(false);
    setCurrentIndex(idx);
  };

  // Keyboard Navigation (Arrow Left & Arrow Right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toUpperCase();
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalCards]);

  // Touch Swipe Handlers for Mobile / Touchscreens
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
  };

  const getBgImage = (item: SlideItem, idx: number) => {
    if (item.isWelcome) {
      return '/assets/opening.jpeg';
    }
    if (item.isDonation) {
      return '/assets/qris.jpeg';
    }
    const key = item.id !== undefined ? item.id : `idx-${idx}`;
    if (assignedImages[key]) {
      return assignedImages[key];
    }
    if (bannerImages.length > 0) {
      return bannerImages[idx % bannerImages.length];
    }
    return '/assets/bg.jpeg';
  };

  const isSpecialSlide = activeSlides[currentIndex]?.isWelcome || activeSlides[currentIndex]?.isDonation;

  return (
    <div
      className="carousel-container-minimal"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Horizontal Filmstrip Track */}
      <div
        className="carousel-track-flex"
        style={{
          display: 'flex',
          width: `${totalCards * 100}%`,
          height: '100%',
          transform: `translateX(-${currentIndex * (100 / totalCards)}%)`,
          transition: isFastRewind
            ? 'transform 0.4s ease-in-out'
            : 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {activeSlides.map((slideItem, idx) => (
          <div
            key={slideItem.id || idx}
            className="carousel-slide-card-flex"
            style={{
              width: `${100 / totalCards}%`,
              height: '100%',
              backgroundImage: `url("${getBgImage(slideItem, idx)}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* 1. ELEGANT BOTTOM-ALIGNED OPENING WELCOME BANNER (Keeps top 60% mosque arch completely clear, smooth bottom gradient for 100% legibility) */}
            {slideItem.isWelcome ? (
              <div className="carousel-slide-overlay" style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(180deg, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.88) 85%)',
                padding: '36px 48px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'flex-start',
                textAlign: 'left',
              }}>
                {/* Gold Arabic Calligraphy Greeting */}
                <div style={{
                  fontFamily: "'Amiri', serif",
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: '#fef08a',
                  marginBottom: 6,
                  textShadow: '0 2px 10px rgba(0,0,0,0.9)',
                }}>
                  أَهْلًا وَسَهْلًا وَمَرْحَبًا بِكُمْ
                </div>

                {/* Clean Main Title */}
                <h2 style={{
                  fontSize: '2.8rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1.2,
                  marginBottom: 10,
                  letterSpacing: '-0.5px',
                  textShadow: '0 4px 20px rgba(0,0,0,0.9)',
                }}>
                  {slideItem.title}
                </h2>

                {/* Clean Description */}
                <p style={{
                  fontSize: '1.2rem',
                  fontWeight: 500,
                  color: '#d4d4d8',
                  lineHeight: 1.5,
                  maxWidth: '850px',
                  textShadow: '0 2px 10px rgba(0,0,0,0.9)',
                }}>
                  {slideItem.description}
                </p>
              </div>
            ) : slideItem.isDonation ? (
              /* 2. BRIGHT FULL-TRANSPARENT DONATION POSTER SLIDE (Uses /assets/qris.jpeg, Black Text, No Dark Overlay, No Cards) */
              <div style={{
                width: '100%',
                height: '100%',
                background: 'transparent',
                padding: '48px 60px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                maxWidth: '65%',
                textAlign: 'left',
              }}>
                <h2 style={{
                  fontSize: '2.8rem',
                  fontWeight: 900,
                  color: '#000000',
                  marginBottom: 16,
                  lineHeight: 1.2,
                  letterSpacing: '-0.5px',
                }}>
                  {slideItem.title}
                </h2>

                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#18181b',
                  marginBottom: 24,
                  lineHeight: 1.5,
                }}>
                  Salurkan infaq & sedekah terbaik Anda untuk kemakmuran dan operasional masjid.
                </div>

                {/* Direct Black Text Bank Account Details */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: '#000000',
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#3f3f46', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    TRANSFER REKENING BANK:
                  </div>
                  <div>
                    BSI: <span style={{ color: '#000000' }}>7123-4567-89</span> <span style={{ color: '#3f3f46', fontWeight: 600, fontSize: '1rem' }}>(a.n. Masjid Al Hikmah)</span>
                  </div>
                  <div>
                    Mandiri: <span style={{ color: '#000000' }}>149-00-1234567-8</span> <span style={{ color: '#3f3f46', fontWeight: 600, fontSize: '1rem' }}>(a.n. Masjid Al Hikmah)</span>
                  </div>
                </div>
              </div>
            ) : (
              /* 3. REGULAR EVENT BANNER SLIDE (Dark Gradient Overlay, White Text) */
              <div className="carousel-slide-overlay">
                <h2 className="carousel-title">{slideItem.title}</h2>

                {(slideItem.speaker || slideItem.event_date || slideItem.event_time) && (
                  <div className="carousel-meta-row">
                    {slideItem.speaker && (
                      <span className="carousel-meta-item">{slideItem.speaker}</span>
                    )}
                    {slideItem.speaker && (slideItem.event_date || slideItem.event_time) && (
                      <span className="carousel-meta-divider">│</span>
                    )}
                    {slideItem.event_date && (
                      <span className="carousel-meta-item">{slideItem.event_date}</span>
                    )}
                    {slideItem.event_time && (
                      <span className="carousel-meta-item">{slideItem.event_time}</span>
                    )}
                  </div>
                )}

                {slideItem.description && (
                  <p className="carousel-desc">{slideItem.description}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Synchronized Clickable Dot Indicators (HIDDEN ON OPENING & DONATION SLIDES) */}
      {totalCards > 1 && !isSpecialSlide && (
        <div className="carousel-dots">
          {activeSlides.map((_, idx) => (
            <span
              key={idx}
              onClick={() => handleSelectSlide(idx)}
              className={`dot ${idx === currentIndex ? 'active' : ''}`}
              title={`Buka Banner ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
