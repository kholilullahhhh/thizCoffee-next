'use client';

import { useEffect, useRef } from 'react';

export default function ScrollProgressBar() {
  const progressRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        scrollable > 0
          ? Math.min(1, Math.max(0, window.scrollY / scrollable))
          : 0;

      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${progress})`;
      }
      progressRef.current?.setAttribute(
        'aria-valuenow',
        String(Math.round(progress * 100))
      );
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={progressRef}
      role="progressbar"
      aria-label="Progres halaman"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden bg-white/10"
    >
      <div
        ref={fillRef}
        className="relative h-full origin-left bg-gradient-to-r from-[#FF5A1F] via-[#FF6B35] to-[#FFB08A] shadow-[0_0_12px_rgba(255,90,31,0.75)] will-change-transform"
        style={{ transform: 'scaleX(0)' }}
      >
        <span
          aria-hidden
          className="absolute inset-y-0 right-0 w-px bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
        />
      </div>
    </div>
  );
}
