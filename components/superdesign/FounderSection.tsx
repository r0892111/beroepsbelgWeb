'use client';

/**
 * The FounderSection component displays information about the founder Tanguy Ottomer.
 * Features:
 * - Clean, sophisticated typography
 * - Subtle animations
 * - Responsive design
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export function FounderSection() {
  const t = useTranslations('founder');

  return (
    <section className="relative w-full bg-[#F9F9F7] py-16 md:py-24 overflow-hidden">
      {/* Subtle background accent - bottom right glow mirrors PressSection's top right for smooth transition */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#1BDD95]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#1BDD95] rounded-full blur-[100px] opacity-10" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center"
        >
          {/* Section title - smaller and green */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="font-serif text-4xl md:text-5xl lg:text-6xl text-[rgb(23,23,23)] mb-8 tracking-tight leading-[1.1]"
          >
            {t('kicker')}
          </motion.h2>

          {/* Main content in solid mint green box */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="bg-[#1BDD95] rounded-2xl p-8 md:p-10"
          >
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
              {/* Placeholder round image */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center">
                  <span className="text-white/60 text-xs uppercase tracking-wider">Photo</span>
                </div>
              </div>

              {/* Vertical white line separator - hidden on mobile */}
              <div className="hidden md:block w-px h-32 bg-white/40 flex-shrink-0" />

              {/* Text content */}
              <div className="space-y-4 text-lg md:text-xl leading-relaxed font-light text-left">
                <p className="text-white">{t('line1')}</p>
                <p className="text-white">{t('line2')}</p>
                <p className="text-white">{t('line3')}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
