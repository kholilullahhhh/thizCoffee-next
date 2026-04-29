'use client';

import { useInView } from '@/hooks/use-in-view';
import { Smartphone, ClipboardList, Bike, Coffee } from 'lucide-react';

const steps = [
  {
    icon: <Smartphone className="w-8 h-8" />,
    number: '01',
    title: 'Choose Your Drink',
    desc: 'Browse our menu and pick the bottled coffee that hits right. Iced, caramel, vanilla — you decide.',
  },
  {
    icon: <ClipboardList className="w-8 h-8" />,
    number: '02',
    title: 'Place Your Order',
    desc: 'Order via WhatsApp or our app. Drop your location pin and we\'ll handle the rest.',
  },
  {
    icon: <Bike className="w-8 h-8" />,
    number: '03',
    title: 'We Ride to You',
    desc: 'Our motorcycle courier grabs your freshly made bottle and zips through the city straight to you.',
  },
  {
    icon: <Coffee className="w-8 h-8" />,
    number: '04',
    title: 'Enjoy Your Coffee',
    desc: 'Crack open the bottle and enjoy. No waiting, no queues — just bold coffee on your schedule.',
  },
];

export default function HowItWorks() {
  const { ref, inView } = useInView();

  return (
    <section
      id="how-it-works"
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
              How It Works
            </span>
          </div>
          <h2
            className="text-white leading-none"
            style={{
              fontFamily: "'Bebas Neue', cursive",
              fontSize: 'clamp(40px, 6vw, 72px)',
            }}
          >
            Coffee in <span className="text-[#FF5A1F]">4 Steps</span>
          </h2>
          <p className="text-gray-400 text-lg mt-4 max-w-xl mx-auto">
            From your phone screen to your hand — ridiculously simple.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-16 left-1/2 -translate-x-1/2 w-3/4 h-0.5 bg-gradient-to-r from-transparent via-[#FF5A1F]/40 to-transparent" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div
                key={s.number}
                className={`relative flex flex-col items-center text-center transition-all duration-700 ${
                  inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${150 + i * 130}ms` }}
              >
                {/* Step number badge */}
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-[#FF5A1F] flex items-center justify-center text-white shadow-xl shadow-orange-500/30 z-10 relative">
                    {s.icon}
                  </div>
                  {/* Glow */}
                  <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-[#FF5A1F]/40 blur-lg" />
                </div>

                <span
                  className="text-[#FF5A1F]/30 text-5xl font-black leading-none mb-2"
                  style={{ fontFamily: "'Bebas Neue', cursive" }}
                >
                  {s.number}
                </span>
                <h3
                  className="text-white font-black text-lg mb-3"
                >
                  {s.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA strip */}
        <div
          className={`mt-16 text-center transition-all duration-700 delay-600 ${
            inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="text-gray-500 text-sm mb-4">Ready? It only takes 30 seconds to order.</p>
          <a
            href="https://wa.me/628001234567"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#FF5A1F] text-white font-bold uppercase tracking-wider rounded-full hover:bg-[#E04A10] transition-all text-sm shadow-xl shadow-orange-500/30"
          >
            Order via WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
