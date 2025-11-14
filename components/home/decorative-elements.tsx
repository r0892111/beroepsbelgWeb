'use client';

import { useEffect, useState } from 'react';

export function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-brass/30 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
      <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-navy/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-brass/40 rounded-full animate-ping" style={{ animationDuration: '4s', animationDelay: '2s' }} />
      <div className="absolute top-2/3 right-1/3 w-1.5 h-1.5 bg-navy/30 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
    </div>
  );
}

export function MouseTracker() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsMoving(true);

      clearTimeout(timeout);
      timeout = setTimeout(() => setIsMoving(false), 150);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div
      className="fixed w-96 h-96 bg-brass/5 rounded-full blur-3xl pointer-events-none transition-all duration-1000 ease-out z-0"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `translate(-50%, -50%) scale(${isMoving ? 1 : 0.8})`,
        opacity: isMoving ? 0.6 : 0.3,
      }}
    />
  );
}

export function ParallaxBackground() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40">
      <div
        className="absolute w-full h-full"
        style={{ transform: `translateY(${scrollY * 0.3}px)` }}
      >
        <div className="absolute top-20 left-10 w-64 h-64 bg-brass/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-navy/10 rounded-full blur-3xl" />
      </div>
      <div
        className="absolute w-full h-full"
        style={{ transform: `translateY(${scrollY * 0.5}px)` }}
      >
        <div className="absolute bottom-40 left-1/4 w-80 h-80 bg-brass/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-navy/8 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
