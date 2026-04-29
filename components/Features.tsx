'use client';

import { useInView } from '@/hooks/use-in-view';
import { Zap, Thermometer, DollarSign, MapPin } from 'lucide-react';

const features = [
  {
    icon: <Zap className="w-7 h-7" />,
    title: 'Lightning Delivery',
    desc: 'Motorcycle couriers hit 15 minutes average delivery time — rain or shine, we roll.',
    highlight: '~15 min avg',
  },
  {
    icon: <Thermometer className="w-7 h-7" />,
    title: 'Freshly Brewed',
    desc: 'Every bottle is made to order. We don\'t batch brew yesterday\'s coffee.',
    highlight: 'Made to order',
  },
  {
    icon: <DollarSign className="w-7 h-7" />,
    title: 'Pocket-Friendly',
    desc: 'Premium taste at street-level prices. Your daily coffee fix shouldn\'t break the bank.',
    highlight: 'From Rp 18K',
  },
  {
    icon: <MapPin className="w-7 h-7" />,
    title: 'Come to You',
    desc: 'Office, campus, park, gym — we deliver wherever you are within the city.',
    highlight: 'City-wide',
  },
];

export default function Features() {
  const { ref, inView } = useInView();

  return (
    <section
      id="features"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 bg-white overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FF5A1F]/10 border border-[#FF5A1F]/30 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#FF5A1F]">
              Why MotoBrewa
            </span>
          </div>
          <h2
            className="text-[#0A0A0A] leading-none"
            style={{
              fontFamily: "'Bebas Neue', cursive",
              fontSize: 'clamp(40px, 6vw, 72px)',
            }}
          >
            Built for the <span className="text-[#FF5A1F]">Bold</span>
          </h2>
        </div>

        {/* Feature cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`group relative p-7 rounded-2xl border border-gray-100 bg-white hover:bg-[#0A0A0A] hover:border-transparent hover:-translate-y-2 transition-all duration-300 shadow-sm hover:shadow-2xl hover:shadow-black/20 ${
                inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${150 + i * 100}ms` }}
            >
              {/* Number */}
              <span
                className="absolute top-4 right-5 text-5xl text-gray-100 group-hover:text-white/5 font-black leading-none transition-colors"
                style={{ fontFamily: "'Bebas Neue', cursive" }}
              >
                0{i + 1}
              </span>

              {/* Icon */}
              <div className="w-14 h-14 bg-[#FF5A1F]/10 group-hover:bg-[#FF5A1F] rounded-2xl flex items-center justify-center mb-5 text-[#FF5A1F] group-hover:text-white transition-all duration-300">
                {f.icon}
              </div>

              <h3 className="font-black text-[#0A0A0A] group-hover:text-white text-lg mb-2 transition-colors">
                {f.title}
              </h3>
              <p className="text-gray-500 group-hover:text-gray-300 text-sm leading-relaxed mb-4 transition-colors">
                {f.desc}
              </p>

              {/* Highlight pill */}
              <span className="inline-block px-3 py-1 bg-[#FF5A1F]/10 group-hover:bg-[#FF5A1F]/20 text-[#FF5A1F] text-xs font-bold rounded-full transition-colors">
                {f.highlight}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom accent bar */}
        <div
          className={`mt-16 rounded-2xl bg-[#0A0A0A] p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all duration-700 delay-500 ${
            inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div>
            <p className="text-white/50 text-sm uppercase tracking-widest mb-1">Currently serving</p>
            <p
              className="text-white text-3xl"
              style={{ fontFamily: "'Bebas Neue', cursive" }}
            >
              10,000+ satisfied customers
            </p>
          </div>
          <div className="flex gap-6">
            {['4.9★ Rating', '15 min Avg', '50+ Riders'].map((s) => (
              <div key={s} className="text-center">
                <p className="text-[#FF5A1F] font-black text-xl" style={{ fontFamily: "'Bebas Neue', cursive" }}>
                  {s.split(' ')[0]}
                </p>
                <p className="text-gray-500 text-xs">{s.split(' ').slice(1).join(' ')}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
