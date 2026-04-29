'use client';

import { useInView } from '@/hooks/use-in-view';
import { Bike, Package, Users, Leaf } from 'lucide-react';

const pillars = [
  {
    icon: <Bike className="w-6 h-6" />,
    title: 'Mobile by Design',
    desc: 'Kedai kopi kami beroda. sepeda motor membawa pesanan Anda langsung ke mana pun Anda berada di kota Makassar.',
  },
  {
    icon: <Package className="w-6 h-6" />,
    title: 'Bottled for Life',
    desc: 'Kopi premium disegel dalam botol ramping — tanpa tumpahan, tersegel aman.',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Built for Gen Z',
    desc: 'Apalagi buat anak muda Makassar. Kamu butuh kopi tanpa ribet dan tanpa nunggu lama, dan itulah yang kami hadirkan. Cocok buat siapa saja, di mana saja.',
  },
  {
    icon: <Leaf className="w-6 h-6" />,
    title: 'Fresh Every Time',
    desc: 'Diseduh segar sesuai pesanan. Tidak ada pemanasan ulang, tidak ada jalan pintas. Kopi asli untuk orang sungguhan yang tahu bedanya.',
  },
];

export default function About() {
  const { ref, inView } = useInView();

  return (
    <section
      id="about"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 bg-white overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* LEFT — Text */}
          <div
            className={`transition-all duration-700 ${
              inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
            }`}
          >
            {/* Tag */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FF5A1F]/10 border border-[#FF5A1F]/30 rounded-full mb-6">
              <span className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#FF5A1F]">
                Who We Are
              </span>
            </div>

            <h2
              className="leading-none mb-6 text-black"
              style={{
                fontFamily: "'Bebas Neue', cursive",
                fontSize: 'clamp(40px, 6vw, 72px)',
              }}
            >
              Street Coffee
              <br />
              <span className="text-[#FF5A1F]">Reinvented</span>
            </h2>

            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              Thiz Coffee bukan sekadar kopi — ini adalah sebuah gerakan. 
              Kami menggabungkan energi dinamis budaya jalanan dengan racikan kopi premium untuk 
              menciptakan sesuatu yang sesuai dengan ritmemu.
            </p>
            <p className="text-gray-500 leading-relaxed mb-8">
              Tanpa antre. Tanpa perlu cari kafe. Cukup satu klik di ponselmu, 
              dan kopimu langsung meluncur ke arahmu di atas motor.
               Kami hadir untuk generasi yang bergerak cepat dan hidup dengan berani.
            </p>

            <a
              href="#menu"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#0A0A0A] text-white font-bold uppercase tracking-wider rounded-full hover:bg-[#FF5A1F] transition-all duration-250 text-sm"
            >
              Gas mi Liat Menunya
            </a>
          </div>

          {/* RIGHT — Pillars grid */}
          <div className="grid grid-cols-2 gap-4">
            {pillars.map((p, i) => (
              <div
                key={p.title}
                className={`group p-6 rounded-2xl border border-gray-100 hover:border-[#FF5A1F]/40 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 cursor-default ${
                  inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${200 + i * 100}ms` }}
              >
                <div className="w-12 h-12 bg-[#FF5A1F]/10 group-hover:bg-[#FF5A1F] rounded-xl flex items-center justify-center mb-4 transition-colors duration-250 text-[#FF5A1F] group-hover:text-white">
                  {p.icon}
                </div>
                <h3 className="font-black text-[#0A0A0A] text-base mb-2 leading-tight">
                  {p.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
