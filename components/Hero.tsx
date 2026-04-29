'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Zap, MapPin } from 'lucide-react';

export default function Hero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center overflow-hidden bg-[#0A0A0A]"
    >
      {/* Textured orange gradient background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF5A1F] via-[#CC3D00] to-[#0A0A0A]" />
        {/* Grain texture via SVG filter */}
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
        {/* Diagonal slash overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'repeating-linear-gradient(45deg, transparent, transparent 60px, rgba(0,0,0,0.04) 60px, rgba(0,0,0,0.04) 62px)',
          }}
        />
      </div>

      {/* Big decorative "COFFEE" text */}
      <div
        className="absolute bottom-0 left-0 right-0 text-center leading-none select-none pointer-events-none z-0 overflow-hidden"
        style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize: 'clamp(80px, 18vw, 240px)',
          color: 'rgba(255,255,255,0.04)',
          letterSpacing: '0.08em',
        }}
      >
        COFFEE
      </div>

      {/* Orange accent circle top-right */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#FF5A1F]/20 blur-3xl z-0" />
      <div className="absolute top-1/4 right-1/4 w-48 h-48 rounded-full bg-[#FF5A1F]/10 blur-2xl z-0 animate-bounce-slow" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid lg:grid-cols-2 gap-12 items-center w-full">
        {/* LEFT — Text */}
        <div className="text-white">
          {/* Badge */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/20 rounded-full mb-6 backdrop-blur-sm transition-all duration-700 ${
              loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#FF5A1F]" fill="#FF5A1F" />
            <span className="text-xs font-semibold uppercase tracking-widest text-white/90">
              Motorcycle concept
            </span>
          </div>

          {/* Headline */}
          <h1
            className={`leading-none mb-4 transition-all duration-700 delay-100 ${
              loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
            style={{ fontFamily: "'Bebas Neue', cursive" }}
          >
            <span
              className="block text-white"
              style={{ fontSize: 'clamp(52px, 9vw, 108px)' }}
            >
              ThiZ Coffee,
            </span>
            <span
              className="block text-[#FF5A1F]"
              style={{
                fontSize: 'clamp(52px, 9vw, 108px)',
                WebkitTextStroke: '2px #FF5A1F',
              }}
            >
              Bold Taste
            </span>
          </h1>

          <p
            className={`text-white/70 text-lg sm:text-xl max-w-lg mb-8 leading-relaxed transition-all duration-700 delay-200 ${
              loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            Di ThizCoffee, kami menyajikan kopi Aren berkualitas tinggi,
             dengan mix Arabika Toraja dan Robusta Kalosi, 
            untuk dinikmati Ana anaka di Makassar.
          </p>

          {/* CTA Buttons */}
          <div
            className={`flex flex-wrap gap-4 mb-10 transition-all duration-700 delay-300 ${
              loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <a
              href="#order"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-[#FF5A1F] text-white font-bold uppercase tracking-wider rounded-full hover:bg-white hover:text-[#FF5A1F] transition-all duration-250 shadow-xl shadow-orange-500/40 text-sm"
            >
              Order Now
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#menu"
              className="inline-flex items-center gap-2 px-8 py-4 bg-transparent text-white font-bold uppercase tracking-wider rounded-full border border-white/40 hover:border-white hover:bg-white/10 transition-all duration-250 text-sm"
            >
              View Menu
            </a>
          </div>

          {/* Stats */}
          <div
            className={`flex flex-wrap gap-8 transition-all duration-700 delay-400 ${
              loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            {[
              { value: '15 min', label: 'Avg. Delivery' },
              { value: '10K+', label: 'Happy Customers' },
              { value: '4.9★', label: 'Rating' },
            ].map((s) => (
              <div key={s.label}>
                <p
                  className="text-[#FF5A1F] font-black text-2xl"
                  style={{ fontFamily: "'Bebas Neue', cursive" }}
                >
                  {s.value}
                </p>
                <p className="text-white/50 text-xs uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Illustration */}
        <div
          className={`flex items-center justify-center transition-all duration-1000 delay-300 ${
            loaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
          }`}
        >
          <div className="relative w-full max-w-md">
            {/* Glow ring */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-72 h-72 rounded-full bg-[#FF5A1F]/20 blur-3xl animate-bounce-slow" />
            </div>

            {/* SVG Motorcycle + Coffee illustration */}
            <svg
              viewBox="0 0 480 380"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="relative z-10 w-full drop-shadow-2xl animate-bounce-slow"
            >
              {/* Road */}
              <ellipse cx="240" cy="340" rx="200" ry="18" fill="rgba(255,90,31,0.15)" />

              {/* Motorcycle body */}
              <g>
                {/* Rear wheel */}
                <circle cx="130" cy="305" r="48" stroke="#FF5A1F" strokeWidth="10" fill="#1A1A1A" />
                <circle cx="130" cy="305" r="30" stroke="#333" strokeWidth="6" fill="#111" />
                <circle cx="130" cy="305" r="8" fill="#FF5A1F" />

                {/* Front wheel */}
                <circle cx="350" cy="305" r="48" stroke="#FF5A1F" strokeWidth="10" fill="#1A1A1A" />
                <circle cx="350" cy="305" r="30" stroke="#333" strokeWidth="6" fill="#111" />
                <circle cx="350" cy="305" r="8" fill="#FF5A1F" />

                {/* Frame */}
                <path
                  d="M130 260 L200 200 L310 210 L350 260"
                  stroke="#FF5A1F"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <path
                  d="M200 200 L240 250 L310 250 L350 260"
                  stroke="#E04A10"
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M130 260 L200 250 L240 250"
                  stroke="#CC3D00"
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="none"
                />

                {/* Engine block */}
                <rect x="195" y="235" width="100" height="52" rx="8" fill="#222" stroke="#FF5A1F" strokeWidth="3" />

                {/* Exhaust */}
                <path d="M195 270 L140 275 L130 285" stroke="#555" strokeWidth="7" strokeLinecap="round" fill="none" />

                {/* Handlebars */}
                <path d="M330 200 L360 185 M330 200 L340 195" stroke="#888" strokeWidth="6" strokeLinecap="round" />

                {/* Seat */}
                <path d="M220 200 Q260 188 300 200" stroke="#333" strokeWidth="14" strokeLinecap="round" fill="none" />

                {/* Headlight */}
                <ellipse cx="358" cy="240" rx="14" ry="10" fill="#FF5A1F" opacity="0.9" />
                <ellipse cx="358" cy="240" rx="8" ry="6" fill="#FFD700" opacity="0.8" />
              </g>

              {/* Delivery box on back */}
              <g>
                <rect x="148" y="148" width="88" height="72" rx="10" fill="#FF5A1F" />
                <rect x="152" y="152" width="80" height="64" rx="8" fill="#E04A10" />
                {/* Box stripes */}
                <line x1="192" y1="152" x2="192" y2="216" stroke="#FF7A45" strokeWidth="2" />
                <line x1="152" y1="180" x2="232" y2="180" stroke="#FF7A45" strokeWidth="2" />
                {/* Coffee icon on box */}
                <text x="192" y="176" textAnchor="middle" fontSize="22" fill="white" fontFamily="sans-serif">
                  ☕
                </text>
                <text x="192" y="212" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold" fontFamily="sans-serif" letterSpacing="1">
                  THIZ COFFEE
                </text>
                {/* Box handle/strap */}
                <rect x="175" y="144" width="34" height="8" rx="4" fill="#CC3D00" />
              </g>

              {/* Speed lines */}
              <g opacity="0.4">
                <line x1="20" y1="260" x2="90" y2="260" stroke="#FF5A1F" strokeWidth="3" strokeLinecap="round" />
                <line x1="10" y1="280" x2="80" y2="280" stroke="#FF5A1F" strokeWidth="2" strokeLinecap="round" />
                <line x1="30" y1="300" x2="85" y2="300" stroke="#FF5A1F" strokeWidth="1.5" strokeLinecap="round" />
              </g>

              {/* Floating coffee bottle */}
              <g transform="translate(380, 60)" className="animate-bounce-slow">
                {/* Bottle */}
                <rect x="10" y="30" width="36" height="80" rx="8" fill="#1A1A1A" stroke="#FF5A1F" strokeWidth="2" />
                <rect x="14" y="20" width="28" height="16" rx="4" fill="#FF5A1F" />
                <rect x="18" y="14" width="20" height="10" rx="4" fill="#CC3D00" />
                {/* Label */}
                <rect x="13" y="46" width="30" height="40" rx="4" fill="#FF5A1F" />
                <text x="28" y="65" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold" fontFamily="sans-serif">THIZ</text>
                <text x="28" y="76" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold" fontFamily="sans-serif">COFFEE</text>
                {/* <text x="28" y="87" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.7)" fontFamily="sans-serif">COFFEE</text> */}
                {/* Shine */}
                <rect x="38" y="48" width="4" height="30" rx="2" fill="rgba(255,255,255,0.15)" />
              </g>

              {/* Stars / sparkles */}
              <g fill="#FF5A1F" opacity="0.7">
                <circle cx="60" cy="120" r="3" />
                <circle cx="420" cy="160" r="4" />
                <circle cx="440" cy="80" r="2" />
                <circle cx="30" cy="180" r="2.5" />
              </g>
            </svg>

            {/* Location badge */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/80 backdrop-blur border border-white/10 rounded-full px-4 py-2">
              <MapPin className="w-3.5 h-3.5 text-[#FF5A1F]" fill="#FF5A1F" />
              <span className="text-white text-xs font-semibold">Delivering to your area</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent z-10" />
    </section>
  );
}
