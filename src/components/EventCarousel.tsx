import React, { useState, useEffect } from 'react';
import type { MosqueEvent } from '../types/signage';

interface EventCarouselProps {
  events: MosqueEvent[];
}

export const EventCarousel: React.FC<EventCarouselProps> = ({ events }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFastRewind, setIsFastRewind] = useState(false);
  const [bannerImages, setBannerImages] = useState<string[]>([]);

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

  useEffect(() => {
    if (activeEvents.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        if (prevIndex >= activeEvents.length - 1) {
          // Fast rewind straight back to Slide 0 passing through all slides quickly!
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
  }, [activeEvents.length]);

  const getBgImage = (idx: number) => {
    if (bannerImages.length > 0) {
      return bannerImages[idx % bannerImages.length];
    }
    return '/assets/bg.jpeg';
  };

  const totalCards = activeEvents.length;

  return (
    <div className="carousel-container-minimal">
      {/* Horizontal Filmstrip Track (Fast Rewind 0.4s when returning to start) */}
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
              backgroundImage: `url(${getBgImage(idx)})`,
            }}
          >
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
