import { Coffee, MapPin, Phone, Mail, Instagram, Twitter, Youtube } from 'lucide-react';

const menuLinks = ['Iced Coffee Milk', 'Caramel Latte', 'Vanilla Coffee', 'Matcha Coffee'];
const companyLinks = ['About Us', 'How It Works', 'Careers', 'Press'];
const socialLinks = [
  { icon: <Instagram className="w-5 h-5" />, label: 'Instagram', href: '#' },
  { icon: <Twitter className="w-5 h-5" />, label: 'Twitter', href: '#' },
  { icon: <Youtube className="w-5 h-5" />, label: 'YouTube', href: '#' },
];

export default function Footer() {
  return (
    <footer className="bg-[#0A0A0A] text-white">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-[#FF5A1F] rounded-lg flex items-center justify-center">
                <Coffee className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span
                className="text-white text-xl font-black tracking-widest uppercase"
                style={{ fontFamily: "'Bebas Neue', cursive" }}
              >
                MotoBrewa
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Fast bottled coffee delivered by motorcycle. Built for the bold generation.
            </p>
            {/* Social */}
            <div className="flex gap-3">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:bg-[#FF5A1F] hover:border-[#FF5A1F] hover:text-white transition-all duration-200"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Menu */}
          <div>
            <h4 className="font-black uppercase tracking-widest text-xs text-gray-500 mb-4">Menu</h4>
            <ul className="space-y-2.5">
              {menuLinks.map((l) => (
                <li key={l}>
                  <a
                    href="#menu"
                    className="text-gray-400 hover:text-[#FF5A1F] text-sm transition-colors"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-black uppercase tracking-widest text-xs text-gray-500 mb-4">Company</h4>
            <ul className="space-y-2.5">
              {companyLinks.map((l) => (
                <li key={l}>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-[#FF5A1F] text-sm transition-colors"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-black uppercase tracking-widest text-xs text-gray-500 mb-4">Contact</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#FF5A1F] flex-shrink-0 mt-0.5" />
                <span className="text-gray-400 text-sm">
                  Jl. Sudirman No. 88, Jakarta Selatan, 12190
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#FF5A1F] flex-shrink-0" />
                <a href="tel:+628001234567" className="text-gray-400 hover:text-white text-sm transition-colors">
                  +62 800 1234 567
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#FF5A1F] flex-shrink-0" />
                <a href="mailto:hello@motobrewa.id" className="text-gray-400 hover:text-white text-sm transition-colors">
                  hello@motobrewa.id
                </a>
              </li>
            </ul>

            {/* WhatsApp order button */}
            <a
              href="https://wa.me/628001234567"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-[#FF5A1F] text-white text-sm font-bold rounded-full hover:bg-[#E04A10] transition-all"
            >
              Order via WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-600 text-xs">
            &copy; {new Date().getFullYear()} MotoBrewa. All rights reserved.
          </p>
          <div className="flex gap-5">
            {['Privacy Policy', 'Terms of Service'].map((l) => (
              <a key={l} href="#" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
