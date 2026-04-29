'use client';

import { useInView } from '@/hooks/use-in-view';
import { Star, ShoppingCart } from 'lucide-react';

const products = [
  {
    id: 1,
    name: 'Kopi Gula Aren',
    desc: 'Classic iced coffee palm sugar with creamy fresh milk.',
    price: 15000,
    rating: 4.9,
    reviews: 834,
    badge: 'Best Seller',
    bottleColor: '#8B4513',
    labelColor: '#FF5A1F',
    img: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?w=400&q=80',
  },
  {
    id: 2,
    name: 'Caramel Latte',
    desc: 'Rich espresso with silky caramel and steamed milk in a bottle.',
    price: 15000,
    rating: 4.8,
    reviews: 621,
    badge: 'Fan Fave',
    bottleColor: '#6B3A2A',
    labelColor: '#CC8800',
    img: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?w=400&q=80',
  },
  {
    id: 3,
    name: 'Vanilla Coffee',
    desc: 'Velvety vanilla infused with bold arabica for a sweet kick.',
    price: 20000,
    rating: 4.7,
    reviews: 510,
    badge: 'New',
    bottleColor: '#5C3317',
    labelColor: '#E8D5A3',
    img: 'https://images.pexels.com/photos/1170659/pexels-photo-1170659.jpeg?w=400&q=80',
  },
  {
    id: 4,
    name: 'Matcha Coffee',
    desc: 'Japanese matcha meets bold espresso. The perfect energy combo.',
    price: 24000,
    rating: 4.8,
    reviews: 389,
    badge: 'Limited',
    bottleColor: '#2D5016',
    labelColor: '#6DB33F',
    img: 'https://images.pexels.com/photos/3879495/pexels-photo-3879495.jpeg?w=400&q=80',
  },
];

function formatPrice(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function BottleIllustration({ bottleColor, labelColor, label }: { bottleColor: string; labelColor: string; label: string }) {
  return (
    <svg viewBox="0 0 120 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Bottle body */}
      <path
        d="M35 80 Q30 90 28 110 L28 185 Q28 200 60 200 Q92 200 92 185 L92 110 Q90 90 85 80 Z"
        fill={bottleColor}
      />
      {/* Bottle neck */}
      <rect x="42" y="48" width="36" height="36" rx="8" fill={bottleColor} />
      {/* Bottle cap */}
      <rect x="44" y="34" width="32" height="18" rx="8" fill={labelColor} />
      <rect x="48" y="28" width="24" height="10" rx="5" fill={labelColor} opacity="0.7" />
      {/* Label */}
      <rect x="30" y="100" width="60" height="72" rx="6" fill={labelColor} opacity="0.9" />
      {/* Label text */}
      <text x="60" y="124" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold" fontFamily="sans-serif">
        MOTO
      </text>
      <text x="60" y="136" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold" fontFamily="sans-serif">
        BREWA
      </text>
      <text x="60" y="152" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.7)" fontFamily="sans-serif">
        {label.toUpperCase().slice(0, 10)}
      </text>
      {/* Shine */}
      <rect x="80" y="104" width="6" height="60" rx="3" fill="rgba(255,255,255,0.12)" />
      {/* Bottom reflection */}
      <ellipse cx="60" cy="198" rx="28" ry="6" fill="rgba(0,0,0,0.15)" />
    </svg>
  );
}

export default function Menu() {
  const { ref, inView } = useInView();

  return (
    <section
      id="menu"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 bg-[#0A0A0A] overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FF5A1F]/20 border border-[#FF5A1F]/40 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#FF5A1F]">
              Our Menu
            </span>
          </div>
          <h2
            className="text-white leading-none"
            style={{
              fontFamily: "'Bebas Neue', cursive",
              fontSize: 'clamp(40px, 6vw, 72px)',
            }}
          >
            Pick Your <span className="text-[#FF5A1F]">Fuel</span>
          </h2>
          <p className="text-gray-400 text-lg mt-4 max-w-xl mx-auto">
            Every bottle is brewed fresh to order. No reheating, no compromise.
          </p>
        </div>

        {/* Product cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p, i) => (
            <div
              key={p.id}
              className={`group relative bg-[#141414] border border-white/5 rounded-2xl overflow-hidden hover:border-[#FF5A1F]/50 hover:-translate-y-2 transition-all duration-300 cursor-pointer ${
                inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${150 + i * 100}ms` }}
            >
              {/* Badge */}
              <div className="absolute top-4 left-4 z-10">
                <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-[#FF5A1F] text-white rounded-full">
                  {p.badge}
                </span>
              </div>

              {/* Bottle visual */}
              <div className="relative h-52 flex items-center justify-center bg-gradient-to-b from-[#1a1a1a] to-[#111] overflow-hidden px-8 pt-8">
                <div className="absolute inset-0 opacity-5">
                  <svg className="w-full h-full">
                    <filter id={`grain-${p.id}`}>
                      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" />
                      <feColorMatrix type="saturate" values="0" />
                    </filter>
                    <rect width="100%" height="100%" filter={`url(#grain-${p.id})`} />
                  </svg>
                </div>
                <div className="relative h-44 w-28 group-hover:scale-105 group-hover:-translate-y-1 transition-transform duration-300">
                  <BottleIllustration
                    bottleColor={p.bottleColor}
                    labelColor={p.labelColor}
                    label={p.name}
                  />
                </div>
              </div>

              {/* Info */}
              <div className="p-5">
                <div className="flex items-center gap-1 mb-1.5">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-yellow-400 text-xs font-bold">{p.rating}</span>
                  <span className="text-gray-500 text-xs">({p.reviews})</span>
                </div>

                <h3 className="text-white font-black text-base mb-1.5 leading-tight">
                  {p.name}
                </h3>
                <p className="text-gray-500 text-xs leading-relaxed mb-4 line-clamp-2">
                  {p.desc}
                </p>

                <div className="flex items-center justify-between">
                  <p className="text-[#FF5A1F] font-black text-lg" style={{ fontFamily: "'Bebas Neue', cursive" }}>
                    {formatPrice(p.price)}
                  </p>
                  <button className="w-9 h-9 bg-[#FF5A1F]/10 text-[#FF5A1F] rounded-full flex items-center justify-center hover:bg-[#FF5A1F] hover:text-white transition-all duration-200 group-hover:scale-110">
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className={`text-center mt-12 transition-all duration-700 delay-500 ${
            inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <a
            href="#order"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#FF5A1F] text-white font-bold uppercase tracking-wider rounded-full hover:bg-[#E04A10] transition-all text-sm shadow-xl shadow-orange-500/30"
          >
            Order the Full Menu
          </a>
        </div>
      </div>
    </section>
  );
}
