'use client';

import { useInView } from '@/hooks/use-in-view';
import { ArrowRight, Zap } from 'lucide-react';

export default function CTASection() {
  const { ref, inView } = useInView();

  return (
    <section
      id="order"
      ref={ref as React.RefObject<HTMLElement>}
      className="relative py-24 bg-[#FF5A1F] overflow-hidden"
    >
      {/* Grain texture */}
      <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <filter id="grain-cta">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-cta)" />
      </svg>

      {/* Diagonal stripes */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(0,0,0,0.03) 40px, rgba(0,0,0,0.03) 42px)',
        }}
      />

      {/* Big faded text */}
      <div
        className="absolute inset-0 flex items-center justify-center select-none pointer-events-none overflow-hidden"
        style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize: 'clamp(100px, 22vw, 300px)',
          color: 'rgba(0,0,0,0.06)',
          letterSpacing: '0.04em',
          lineHeight: 1,
        }}
      >
        ORDER
      </div>

      {/* Circles */}
      <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-black/10 blur-3xl" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div
          className={`transition-all duration-700 ${
            inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          {/* Icon */}
          <div className="inline-flex w-16 h-16 bg-white/20 rounded-2xl items-center justify-center mb-6 backdrop-blur-sm">
            <Zap className="w-8 h-8 text-white" fill="white" />
          </div>

          <h2
            className="text-white leading-none mb-6"
            style={{
              fontFamily: "'Bebas Neue', cursive",
              fontSize: 'clamp(40px, 7vw, 88px)',
            }}
          >
            Ready for Coffee
            <br />
            Otw mi Thiz Coffee itu
          </h2>

          <p className="text-white/80 text-xl max-w-xl mx-auto mb-10 leading-relaxed">
            Stop waiting in lines. Start getting your coffee delivered at motorcycle speed.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="https://wa.me/628001234567"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 px-10 py-4 bg-white text-[#FF5A1F] font-black uppercase tracking-wider rounded-full hover:bg-[#0A0A0A] hover:text-white transition-all duration-250 shadow-2xl text-sm"
            >
              Order Now
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#menu"
              className="inline-flex items-center gap-2 px-10 py-4 bg-transparent text-white font-bold uppercase tracking-wider rounded-full border-2 border-white/60 hover:border-white hover:bg-white/10 transition-all duration-250 text-sm"
            >
              Browse Menu
            </a>
          </div>

          {/* Small trust note */}
          <p className="text-white/60 text-sm mt-8">
            Delivered in ~15 min &bull; No queue &bull; Pay on delivery
          </p>
        </div>
      </div>
    </section>
  );
}
