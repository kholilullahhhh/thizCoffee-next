'use client';

import { useState, useEffect } from 'react';
import { Menu, X, Coffee } from 'lucide-react';

const links = [
  { label: 'About', href: '#about' },
  { label: 'Menu', href: '#menu' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Reviews', href: '#testimonials' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-black/95 backdrop-blur-md shadow-lg shadow-black/30'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group">
          <div className="w-9 h-9 bg-[#FF5A1F] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
            <Coffee className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span
            className="text-white text-xl font-black tracking-widest uppercase"
            style={{ fontFamily: "'Bebas Neue', cursive" }}
          >
            THIZ COFFEE
          </span>
        </a>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-white/80 hover:text-[#FF5A1F] text-sm font-semibold uppercase tracking-wider transition-colors duration-200"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="#menu"
            className="px-5 py-2 text-sm font-bold uppercase tracking-wider text-white border border-white/30 rounded-full hover:border-[#FF5A1F] hover:text-[#FF5A1F] transition-all duration-200"
          >
            View Menu
          </a>
          <a
            href="#order"
            className="px-5 py-2 text-sm font-bold uppercase tracking-wider bg-[#FF5A1F] text-white rounded-full hover:bg-[#E04A10] transition-all duration-200 shadow-lg shadow-orange-500/30"
          >
            Order Now
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-white p-2"
          aria-label="Toggle menu"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={`md:hidden transition-all duration-300 overflow-hidden ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        } bg-black/98 backdrop-blur-md`}
      >
        <ul className="px-6 py-4 flex flex-col gap-4">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-white/80 hover:text-[#FF5A1F] text-base font-semibold uppercase tracking-wider transition-colors block"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li className="pt-2 border-t border-white/10">
            <a
              href="#order"
              onClick={() => setOpen(false)}
              className="block w-full text-center px-5 py-3 font-bold uppercase tracking-wider bg-[#FF5A1F] text-white rounded-full hover:bg-[#E04A10] transition-all"
            >
              Order Now
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
