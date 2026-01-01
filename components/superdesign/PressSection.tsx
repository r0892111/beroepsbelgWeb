'use client';

/**
 * The PressSection component displays featured media logos ("Featured In").
 * Features:
 * - Premium "Brick" Layout (Masonry-style offset)
 * - Clean, sophisticated typography
 * - "Mint Wash" background effect
 * - Subtle animations
 * - Dynamic data from database
 */
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';
import type { Press } from '@/lib/data/types';

// Reusable Card Component
const PressCard = ({ pressItem, delay }: { pressItem: Press; delay: number }) => (
  <motion.a
    href={pressItem.article_url}
    target="_blank"
    rel="noopener noreferrer"
    initial={{ opacity: 0, scale: 0.95, y: 10 }}
    whileInView={{ opacity: 1, scale: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5, ease: "easeOut" }}
    className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] transition-all duration-300 flex items-center justify-center w-[30%] h-[60px] md:w-[180px] md:h-[110px] p-2 md:p-6 group cursor-pointer shrink-0 border border-transparent hover:border-gray-50"
  >
    {pressItem.image_url ? (
      <div className="relative w-full h-full overflow-hidden">
        <Image
          src={pressItem.image_url}
          alt="Press logo"
          fill
          className="object-contain group-hover:scale-110 transition-transform duration-300"
        />
      </div>
    ) : (
      <div className="text-gray-300 font-serif font-bold text-xs md:text-lg group-hover:text-gray-900 transition-colors duration-300 text-center leading-tight">
        Press
      </div>
    )}
  </motion.a>
);

export function PressSection() {
  const t = useTranslations('press');
  const [pressItems, setPressItems] = useState<Press[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPressItems = async () => {
      try {
        const { data, error } = await supabase
          .from('press')
          .select('*')
          .order('display_order', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Failed to fetch press items:', error);
          return;
        }

        const items: Press[] = (data || []).map((row: any) => ({
          id: row.id,
          image_url: row.image_url || '',
          article_url: row.article_url || '',
          display_order: row.display_order !== null && row.display_order !== undefined ? Number(row.display_order) : undefined,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }));

        setPressItems(items);
      } catch (err) {
        console.error('Failed to fetch press items:', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchPressItems();
  }, []);

  // Organize press items into rows for brick layout
  // Distribute items across rows with varying counts (5, 4, 5, 5, 4 pattern)
  const organizeIntoRows = (items: Press[]) => {
    const rows: Press[][] = [];
    let currentIndex = 0;
    const rowSizes = [5, 4, 5, 5, 4]; // Pattern for brick layout

    for (const size of rowSizes) {
      if (currentIndex >= items.length) break;
      rows.push(items.slice(currentIndex, currentIndex + size));
      currentIndex += size;
    }

    // Add remaining items to last row
    if (currentIndex < items.length) {
      if (rows.length > 0) {
        rows[rows.length - 1].push(...items.slice(currentIndex));
      } else {
        rows.push(items.slice(currentIndex));
      }
    }

    return rows;
  };

  const pressRows = organizeIntoRows(pressItems);
  let delayCounter = 0;

  if (loading) {
    return (
      <section className="py-16 bg-[#F9F9F7] relative overflow-hidden z-30">
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="flex flex-col items-center mb-12">
            <div className="relative inline-block">
              <div className="absolute -top-4 -right-8 w-16 h-16 bg-[#1BDD95] rounded-full opacity-80" />
              <h2 className="relative z-10 font-serif text-5xl md:text-7xl lg:text-8xl text-[rgb(23,23,23)] tracking-tight leading-[0.9]">
                {t('featuredIn')}
              </h2>
            </div>
          </div>
          <div className="text-gray-500">Loading press items...</div>
        </div>
      </section>
    );
  }

  if (pressItems.length === 0) {
    return null; // Don't render section if no press items
  }

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
             {pressRows.map((row, rowIndex) => (
               <div key={rowIndex} className="flex flex-wrap justify-center gap-2 md:gap-5 w-full">
                 {row.map((pressItem) => {
                   const delay = delayCounter * 0.05;
                   delayCounter++;
                   return <PressCard key={pressItem.id} pressItem={pressItem} delay={delay} />;
                 })}
               </div>
             ))}
          </div>
       </div>
    </section>
  )
}
