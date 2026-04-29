'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';

export default function WhatsAppButton() {
  const [visible, setVisible] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(true);
      if (!dismissed) {
        const t2 = setTimeout(() => setTooltipOpen(true), 800);
        return () => clearTimeout(t2);
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [dismissed]);

  useEffect(() => {
    if (tooltipOpen) {
      const t = setTimeout(() => setTooltipOpen(false), 5000);
      return () => clearTimeout(t);
    }
  }, [tooltipOpen]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Tooltip */}
      {tooltipOpen && !dismissed && (
        <div className="relative bg-white rounded-2xl shadow-2xl shadow-black/20 p-4 max-w-[220px] border border-gray-100 animate-fade-up">
          <button
            onClick={() => { setTooltipOpen(false); setDismissed(true); }}
            className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600"
          >
            <X className="w-3 h-3" />
          </button>
          <p className="text-xs font-bold text-[#0A0A0A] mb-0.5">Order in 30 seconds</p>
          <p className="text-xs text-gray-500">Tap to order via WhatsApp — we reply instantly!</p>
          {/* Arrow */}
          <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-r border-b border-gray-100 rotate-45 shadow-sm" />
        </div>
      )}

      {/* Main button */}
      <a
        href="https://wa.me/628001234567?text=Hi!%20I%20want%20to%20order%20from%20MotoBrewa%20"
        target="_blank"
        rel="noopener noreferrer"
        className="relative w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-xl shadow-green-500/40 hover:scale-110 hover:shadow-green-500/60 transition-all duration-250"
        aria-label="Order via WhatsApp"
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />
        <MessageCircle className="w-7 h-7 text-white fill-white" />
      </a>
    </div>
  );
}
