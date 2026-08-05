'use client';

import React, { useEffect, useRef } from 'react';

export interface GlassClockProps {
  targetDate?: Date;
}

export function GlassClock({ targetDate }: GlassClockProps): React.ReactElement {
  const hourMarksRef = useRef<HTMLDivElement>(null);
  const glossyOverlayRef = useRef<HTMLDivElement>(null);
  const reflectionOverlayRef = useRef<HTMLDivElement>(null);
  const hourHandRef = useRef<HTMLDivElement>(null);
  const minuteHandRef = useRef<HTMLDivElement>(null);
  const secondHandContainerRef = useRef<HTMLDivElement>(null);
  const secondHandShadowRef = useRef<HTMLDivElement>(null);
  const glassEdgeShadowRef = useRef<HTMLDivElement>(null);
  const glassDarkEdgeRef = useRef<HTMLDivElement>(null);
  const glassEffectShadowRef = useRef<HTMLDivElement>(null);

  const requestAnimationRef = useRef<number | null>(null);
  const targetDateRef = useRef<Date | undefined>(targetDate);

  useEffect(() => {
    targetDateRef.current = targetDate;
  }, [targetDate]);

  useEffect(() => {
    const rootStyle = document.documentElement.style;

    const setInitialVariables = () => {
      rootStyle.setProperty('--primary-light-angle', '-45deg');
      rootStyle.setProperty('--dark-edge-angle', '135deg');
      rootStyle.setProperty('--minute-marker-opacity', '1');
      rootStyle.setProperty('--inner-shadow-opacity', '0.15');
      rootStyle.setProperty('--outer-shadow-opacity', '1');
      rootStyle.setProperty('--reflection-opacity', '0.5');
      rootStyle.setProperty('--glossy-opacity', '0.3');
      rootStyle.setProperty('--hour-number-opacity', '1');
      rootStyle.setProperty('--hour-number-color', 'rgba(50, 50, 50, 0.9)');
      rootStyle.setProperty('--minute-marker-color', 'rgba(80, 80, 80, 0.5)');
      rootStyle.setProperty('--hand-color', 'rgba(50, 50, 50, 0.9)');
      rootStyle.setProperty('--second-hand-color', 'rgba(255, 107, 0, 1)');
    };

    const clearHourMarks = () => {
      const container = hourMarksRef.current;
      if (container) {
        container.replaceChildren();
      }
    };

    const createHourMarks = () => {
      const container = hourMarksRef.current;
      if (!container) return;

      clearHourMarks();

      for (let i = 0; i < 60; i += 1) {
        if (i % 5 === 0) {
          const hourIndex = i / 5;
          const hourNumber = document.createElement('div');
          hourNumber.className = 'clock-number';

          const angleDeg = i * 6;
          const angleRad = (angleDeg * Math.PI) / 180;
          const radiusPercent = 38;

          const x = 50 + Math.sin(angleRad) * radiusPercent;
          const y = 50 - Math.cos(angleRad) * radiusPercent;

          hourNumber.style.position = 'absolute';
          hourNumber.style.left = `${x}%`;
          hourNumber.style.top = `${y}%`;
          hourNumber.style.transform = 'translate(-50%, -50%)';
          hourNumber.textContent = hourIndex === 0 ? '12' : hourIndex.toString();
          container.appendChild(hourNumber);
        } else {
          const minuteMarker = document.createElement('div');
          minuteMarker.className = 'minute-marker';
          minuteMarker.style.transform = `rotate(${i * 6}deg)`;
          container.appendChild(minuteMarker);
        }
      }
    };

    const getNow = () => targetDateRef.current || new Date();

    const updateHourAndMinuteHands = (now: Date) => {
      const hours = now.getHours() % 12;
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      const minutesDegrees = minutes * 6 + (seconds / 60) * 6;
      const hoursDegrees = hours * 30 + (minutes / 60) * 30;

      if (hourHandRef.current) {
        hourHandRef.current.style.transform = `rotate(${hoursDegrees}deg)`;
      }

      if (minuteHandRef.current) {
        minuteHandRef.current.style.transform = `rotate(${minutesDegrees}deg)`;
      }
    };

    const applySecondHandRotation = (angle: number) => {
      if (secondHandContainerRef.current) {
        secondHandContainerRef.current.style.transition = 'none';
        secondHandContainerRef.current.style.transform = `rotate(${angle}deg)`;
      }

      if (secondHandShadowRef.current) {
        secondHandShadowRef.current.style.transition = 'none';
        secondHandShadowRef.current.style.transform = `rotate(${angle + 0.5}deg)`;
      }
    };

    const cancelSecondHandAnimation = () => {
      if (requestAnimationRef.current !== null) {
        cancelAnimationFrame(requestAnimationRef.current);
        requestAnimationRef.current = null;
      }
    };

    const startClockAnimation = () => {
      cancelSecondHandAnimation();

      const animate = () => {
        const now = getNow();
        const seconds = now.getSeconds();
        const milliseconds = now.getMilliseconds();
        const angle = seconds * 6 + (milliseconds / 1000) * 6;

        applySecondHandRotation(angle);
        updateHourAndMinuteHands(now);

        requestAnimationRef.current = requestAnimationFrame(animate);
      };

      animate();
    };

    const initializeOverlays = () => {
      if (glossyOverlayRef.current) {
        glossyOverlayRef.current.style.background = `linear-gradient(135deg,
          rgba(255, 255, 255, 0.4) 0%,
          rgba(255, 255, 255, 0.2) 25%,
          rgba(255, 255, 255, 0.05) 60%,
          rgba(255, 255, 255, 0) 100%)`;
        glossyOverlayRef.current.style.filter = 'blur(8px)';
      }

      if (reflectionOverlayRef.current) {
        reflectionOverlayRef.current.style.transform = 'rotate(-15deg)';
        reflectionOverlayRef.current.style.filter = 'blur(10px)';
      }
    };

    setInitialVariables();
    createHourMarks();
    initializeOverlays();
    startClockAnimation();

    return () => {
      cancelSecondHandAnimation();
      clearHourMarks();
    };
  }, []);

  return (
    <div className="glass-clock-container">
      <div className="glass-effect-wrapper">
        <div className="glass-effect-shadow" ref={glassEffectShadowRef} />
        <div className="glass-clock-face">
          <div className="glass-glossy-overlay" ref={glossyOverlayRef} />
          <div className="glass-edge-highlight" />
          <div className="glass-edge-highlight-outer" />
          <div className="glass-edge-shadow" ref={glassEdgeShadowRef} />
          <div className="glass-dark-edge" ref={glassDarkEdgeRef} />
          <div className="glass-reflection" />
          <div className="glass-reflection-overlay" ref={reflectionOverlayRef} />

          <div className="clock-hour-marks" ref={hourMarksRef} />
          <div className="hour-hand clock-hand" ref={hourHandRef} />
          <div className="minute-hand clock-hand" ref={minuteHandRef} />

          <div className="second-hand-container" ref={secondHandContainerRef}>
            <div className="second-hand" />
            <div className="second-hand-counterweight" />
          </div>

          <div className="second-hand-shadow" ref={secondHandShadowRef} />

          <div className="clock-center-dot" />
          <div className="clock-center-blur" />
        </div>
      </div>
    </div>
  );
}

export default GlassClock;
