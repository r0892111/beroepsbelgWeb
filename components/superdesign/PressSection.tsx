'use client';

/**
 * The PressSection component displays featured media logos ("Featured In").
 * Features:
 * - Premium "Brick" Layout (Masonry-style offset)
 * - Clean, sophisticated typography
 * - "Mint Wash" background effect
 * - Subtle animations
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

// Organized data for the brick layout pattern
const ROW_1 = ["CNN", "The New York Times", "Vanity Fair", "Financial Times", "The Wall Street Journal"];
const ROW_2 = ["Paris Match", "ELLE", "SABATO.", "nrc>"];
const ROW_3 = ["HLN", "FLANDERS DC", "GVA", "De Standaard", "De Tijd"];
const ROW_4 = ["VRT NU", "Weekend", "Het Nieuwsblad", "atv", "Radio 1"];
const ROW_5 = ["Radio 2", "Travel Agent Central", "unizo", "Radio Minerva Antwerpen"];

// Reusable Card Component
const PressCard = ({ name, delay }: { name: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95, y: 10 }}
    whileInView={{ opacity: 1, scale: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5, ease: "easeOut" }}
    className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] transition-all duration-300 flex items-center justify-center w-[30%] h-[60px] md:w-[180px] md:h-[110px] p-2 md:p-6 group cursor-default shrink-0 border border-transparent hover:border-gray-50"
  >
    <div className="text-gray-300 font-serif font-bold text-xs md:text-lg group-hover:text-gray-900 transition-colors duration-300 text-center leading-tight">
      {name}
    </div>
  </motion.div>
);

export function PressSection() {
  const t = useTranslations('press');
  return (
    <section className="py-16 bg-[#F9F9F7] relative overflow-hidden z-30">
       {/* Decorative Background Elements */}
       <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#1BDD95] rounded-full blur-[100px]" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-100 rounded-full blur-[100px]" />
       </div>

       <div className="container mx-auto px-4 text-center relative z-10">
          {/* Header Section - Redesigned & Shifted Up */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center mb-12"
          >
             {/* Replaced Icon with Premium Typography */}
             <div className="relative inline-block">
                {/* Large Green Dot - Behind text */}
                <div className="absolute -top-4 -right-8 w-16 h-16 bg-[#1BDD95] rounded-full opacity-80" />

                <h2 className="relative z-10 font-serif text-5xl md:text-7xl lg:text-8xl text-[rgb(23,23,23)] tracking-tight leading-[0.9]">
                   {t('featuredIn')}
                </h2>
             </div>
          </motion.div>

          {/* Brick Layout Grid */}
          <div className="flex flex-col gap-2 md:gap-5 items-center max-w-7xl mx-auto overflow-x-hidden pb-4">
             {/* Row 1 - 5 items */}
             <div className="flex flex-wrap justify-center gap-2 md:gap-5 w-full">
                {ROW_1.map((name, i) => <PressCard key={name} name={name} delay={i * 0.05} />)}
             </div>

             {/* Row 2 - 4 items (Offset Brick Effect) */}
             <div className="flex flex-wrap justify-center gap-2 md:gap-5 w-full">
                {ROW_2.map((name, i) => <PressCard key={name} name={name} delay={(i + 5) * 0.05} />)}
             </div>

             {/* Row 3 - 5 items */}
             <div className="flex flex-wrap justify-center gap-2 md:gap-5 w-full">
                {ROW_3.map((name, i) => <PressCard key={name} name={name} delay={(i + 9) * 0.05} />)}
             </div>

              {/* Row 4 - 5 items */}
             <div className="flex flex-wrap justify-center gap-2 md:gap-5 w-full">
                {ROW_4.map((name, i) => <PressCard key={name} name={name} delay={(i + 14) * 0.05} />)}
             </div>

              {/* Row 5 - 4 items (Offset Brick Effect) */}
             <div className="flex flex-wrap justify-center gap-2 md:gap-5 w-full">
                {ROW_5.map((name, i) => <PressCard key={name} name={name} delay={(i + 19) * 0.05} />)}
             </div>
          </div>
       </div>
    </section>
  )
}
