'use client';

import { useInView } from '@/hooks/use-in-view';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Rizky A.',
    role: 'Graphic Designer, 24',
    review:
      'Bro this is literally the best thing that happened to my mornings. I order before I even get out of bed and by the time I\'m dressed, it\'s at my door. The caramel latte is top tier.',
    rating: 5,
    avatar: 'RA',
    color: '#FF5A1F',
  },
  {
    name: 'Sasha W.',
    role: 'Uni Student, 21',
    review:
      'Finally a coffee brand that gets the hustle. Between campus and internship, I never have time for café lines. MotoBrewa is always on time and the iced coffee slaps.',
    rating: 5,
    avatar: 'SW',
    color: '#2563EB',
  },
  {
    name: 'Dani P.',
    role: 'Content Creator, 26',
    review:
      'The matcha coffee is unreal. I was skeptical but now it\'s my go-to. The packaging is also super Instagrammable. 10/10 would recommend to every Gen Z out there.',
    rating: 5,
    avatar: 'DP',
    color: '#16A34A',
  },
  {
    name: 'Mia K.',
    role: 'Startup Founder, 29',
    review:
      'We use MotoBrewa for our whole office now. They even have group order options. Fast, affordable, and the team loves it. This is how coffee should work in 2024.',
    rating: 5,
    avatar: 'MK',
    color: '#DC2626',
  },
  {
    name: 'Tio R.',
    role: 'Freelancer, 23',
    review:
      'I literally haven\'t been to a café in two months. Why would I? MotoBrewa delivers better coffee faster and cheaper. The vanilla coffee is my fuel for late-night work.',
    rating: 5,
    avatar: 'TR',
    color: '#9333EA',
  },
  {
    name: 'Clara N.',
    role: 'Marketing Exec, 27',
    review:
      'Fast delivery is not a lie with these guys. I ordered during a meeting and it arrived before the meeting ended. The iced coffee milk is clean and not too sweet — perfect.',
    rating: 5,
    avatar: 'CN',
    color: '#0891B2',
  },
];

export default function Testimonials() {
  const { ref, inView } = useInView();

  return (
    <section
      id="testimonials"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 bg-[#F5F5F5] overflow-hidden"
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
              What They Say
            </span>
          </div>
          <h2
            className="text-[#0A0A0A] leading-none"
            style={{
              fontFamily: "'Bebas Neue', cursive",
              fontSize: 'clamp(40px, 6vw, 72px)',
            }}
          >
            The Streets <span className="text-[#FF5A1F]">Love Us</span>
          </h2>
          <p className="text-gray-500 text-lg mt-4 max-w-xl mx-auto">
            Real reviews from real people who drink real coffee.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`group bg-white rounded-2xl p-6 border border-gray-100 hover:border-[#FF5A1F]/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 transition-all duration-300 ${
                inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${100 + i * 80}ms` }}
            >
              {/* Quote icon */}
              <Quote className="w-6 h-6 text-[#FF5A1F]/30 mb-4" fill="currentColor" />

              {/* Stars */}
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>

              {/* Review text */}
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                &ldquo;{t.review}&rdquo;
              </p>

              {/* User */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                  style={{ background: t.color }}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="font-black text-[#0A0A0A] text-sm">{t.name}</p>
                  <p className="text-gray-400 text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust bar */}
        <div
          className={`mt-14 flex flex-wrap items-center justify-center gap-8 transition-all duration-700 delay-600 ${
            inView ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {[
            { val: '4.9/5', label: 'Average Rating' },
            { val: '10K+', label: 'Orders Delivered' },
            { val: '98%', label: 'On-Time Rate' },
            { val: '0', label: 'Complaints (this month)' },
          ].map((s) => (
            <div key={s.label} className="text-center px-4">
              <p
                className="text-[#FF5A1F] text-3xl font-black"
                style={{ fontFamily: "'Bebas Neue', cursive" }}
              >
                {s.val}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
