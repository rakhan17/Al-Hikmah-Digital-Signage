import React, { useState, useEffect, useRef } from 'react';
import type { MosqueEvent } from '../types/signage';

interface EventCarouselProps {
  events: MosqueEvent[];
}

export const EventCarousel: React.FC<EventCarouselProps> = ({ events }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFastRewind, setIsFastRewind] = useState(false);
  const [bannerImages, setBannerImages] = useState<string[]>([]);
  const [assignedImages, setAssignedImages] = useState<Record<string | number, string>>({});

  const imageMapRef = useRef<Record<string | number, string>>({});

  const activeEvents = events && events.length > 0 ? events : [
    {
      id: 0,
      title: 'Selamat Datang di Masjid Al Hikmah',
      speaker: 'Himbauan Jamaah',
      event_date: 'Setiap Hari',
      event_time: '24 Jam',
      description: 'Jagalah ketertiban, kebersihan, dan kekhusyukan selama berada di lingkungan masjid.',
      is_active: 1,
    }
  ];

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

    // Track active event keys & currently used images
    const activeKeys = new Set<string | number>();
    const usedImages = new Set<string>();

    activeEvents.forEach((item, idx) => {
      const key = item.id !== undefined && item.id !== 0 ? item.id : `idx-${idx}`;
      activeKeys.add(key);
      if (currentMap[key]) {
        usedImages.add(currentMap[key]);
      }
    });

    // Clean up deleted events from map so their images become available again
    Object.keys(currentMap).forEach((k) => {
      const numK = Number(k);
      const isNum = !isNaN(numK);
      if (!activeKeys.has(k) && (!isNum || !activeKeys.has(numK))) {
        delete currentMap[k];
      }
    });

    // Build pool of available images not used by any active banner
    let unusedPool = bannerImages.filter((img) => !usedImages.has(img));

    // Assign unique random image to any new banner that doesn't have one yet
    activeEvents.forEach((item, idx) => {
      const key = item.id !== undefined && item.id !== 0 ? item.id : `idx-${idx}`;

      if (!currentMap[key]) {
        // If unusedPool is empty, replenish from all bannerImages minus currently used
        if (unusedPool.length === 0) {
          const currentlyUsed = new Set(Object.values(currentMap));
          unusedPool = bannerImages.filter((img) => !currentlyUsed.has(img));
          
          // If still empty (e.g. more banners than images), reset pool to full list
          if (unusedPool.length === 0) {
            unusedPool = [...bannerImages];
          }
        }

        // Pick a random image from unusedPool
        const randomIndex = Math.floor(Math.random() * unusedPool.length);
        const chosenImage = unusedPool[randomIndex];

        // Remove chosenImage from unusedPool so next banner won't pick it
        unusedPool.splice(randomIndex, 1);
        usedImages.add(chosenImage);

        currentMap[key] = chosenImage;
      }
    });

    imageMapRef.current = currentMap;
    setAssignedImages({ ...currentMap });
  }, [bannerImages, events]);

  const totalCards = activeEvents.length;

  // Smooth Carousel Rotation Timer (7 seconds per slide, fast rewind to 0 on loop)
  useEffect(() => {
    if (totalCards <= 1) {
      setCurrentIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        if (prevIndex >= totalCards - 1) {
          setIsFastRewind(true);
          setTimeout(() => setIsFastRewind(false), 500);
          return 0;
        } else {
          setIsFastRewind(false);
          return prevIndex + 1;
        }
      });
    }, 7000);

    return () => clearInterval(interval);
  }, [totalCards]);

  const getBgImage = (item: MosqueEvent, idx: number) => {
    const key = item.id !== undefined && item.id !== 0 ? item.id : `idx-${idx}`;
    if (assignedImages[key]) {
      return assignedImages[key];
    }
    if (bannerImages.length > 0) {
      return bannerImages[idx % bannerImages.length];
    }
    return '/assets/bg.jpeg';
  };

  return (
    <div className="carousel-container-minimal">
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
        {activeEvents.map((eventItem, idx) => (
          <div
            key={eventItem.id || idx}
            className="carousel-slide-card-flex"
            style={{
              width: `${100 / totalCards}%`,
              height: '100%',
              backgroundImage: `url("${getBgImage(eventItem, idx)}")`,
            }}
          >
            {/* Top-Left Corner Official Mosque Emblem Glass Pill Badge */}
            <div style={{
              position: 'absolute',
              top: 24,
              left: 28,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'rgba(10, 10, 12, 0.65)',
              backdropFilter: 'blur(16px)',
              padding: '8px 18px 8px 12px',
              borderRadius: 30,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              zIndex: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            }}>
              <img
                src="/assets/alhikmah.png"
                alt="Logo Masjid Al Hikmah"
                style={{ width: 44, height: 44, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}
              />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.3px', lineHeight: 1.2 }}>
                  MASJID AL HIKMAH
                </div>
                <div style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 700, letterSpacing: '0.5px' }}>
                  BALIKPAPAN SELATAN
                </div>
              </div>
            </div>

            <div className="carousel-slide-overlay">
              <h2 className="carousel-title">{eventItem.title}</h2>

              {(eventItem.speaker || eventItem.event_date || eventItem.event_time) && (
                <div className="carousel-meta-row">
                  {eventItem.speaker && (
                    <span className="carousel-meta-item">{eventItem.speaker}</span>
                  )}
                  {eventItem.speaker && (eventItem.event_date || eventItem.event_time) && (
                    <span className="carousel-meta-divider">│</span>
                  )}
                  {eventItem.event_date && (
                    <span className="carousel-meta-item">{eventItem.event_date}</span>
                  )}
                  {eventItem.event_time && (
                    <span className="carousel-meta-item">{eventItem.event_time}</span>
                  )}
                </div>
              )}

              {eventItem.description && (
                <p className="carousel-desc">{eventItem.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Synchronized Dot Indicators */}
      {totalCards > 1 && (
        <div className="carousel-dots">
          {activeEvents.map((_, idx) => (
            <span
              key={idx}
              className={`dot ${idx === currentIndex ? 'active' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
