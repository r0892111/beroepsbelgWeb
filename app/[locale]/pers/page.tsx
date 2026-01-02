'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';
import type { Press } from '@/lib/data/types';

// Press Card Component with Framer Motion animations
const PressCard = ({
  pressItem,
  delay
}: {
  pressItem: Press;
  delay: number;
}) => (
  <motion.a
    href={pressItem.article_url}
    target="_blank"
    rel="noopener noreferrer"
    initial={{ opacity: 0, scale: 0.95, y: 10 }}
    whileInView={{ opacity: 1, scale: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5, ease: "easeOut" }}
    className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] transition-all duration-300 flex items-center justify-center w-full sm:w-[45%] md:w-[180px] h-[80px] md:h-[110px] p-4 md:p-6 group shrink-0 border border-transparent hover:border-gray-50 relative overflow-hidden"
  >
    {pressItem.image_url ? (
      <div className="relative w-full h-full">
        <Image
          src={pressItem.image_url}
          alt="Press logo"
          fill
          className="object-contain group-hover:scale-110 transition-transform duration-300"
        />
      </div>
    ) : (
      <div className="text-gray-400 font-oswald font-bold text-sm md:text-lg group-hover:text-[#1BDD95] transition-colors duration-300 text-center leading-tight uppercase tracking-tight">
        Press
      </div>
    )}
    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-neutral-100 group-hover:bg-[#1BDD95] flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
      <ExternalLink className="h-3 w-3 text-neutral-700 group-hover:text-white transition-colors" />
    </div>
  </motion.a>
);

export default function PersPage() {
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
  // Alternating pattern: 5, 4, 5, 4... for visual interest
  const organizeIntoRows = (items: Press[]) => {
    const rows: Press[][] = [];
    let index = 0;
    const pattern = [5, 4, 5, 4, 5]; // Brick pattern

    for (const count of pattern) {
      if (index >= items.length) break;
      rows.push(items.slice(index, index + count));
      index += count;
    }

    // Add remaining items
    if (index < items.length) {
      rows.push(items.slice(index));
    }

    return rows;
  };

  const rows = organizeIntoRows(pressItems);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F7] flex items-center justify-center">
        <p className="text-neutral-600 font-inter">{t('loading')}</p>
      </div>
    );
  }

  return (
    <section className="min-h-screen py-16 md:py-24 bg-[#F9F9F7] relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#1BDD95] rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-[#1BDD95] rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-100 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 md:px-8 text-center relative z-10">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center mb-12 md:mb-16"
        >
          {/* Large Title with Decorative Dot */}
          <div className="relative inline-block mb-4">
            {/* Decorative Mint Green Dot */}
            <div className="absolute -top-4 -right-8 md:-top-6 md:-right-12 w-12 h-12 md:w-16 md:h-16 bg-[#1BDD95] rounded-full opacity-80" />

            <h1 className="relative z-10 font-serif text-5xl md:text-7xl lg:text-8xl text-[rgb(23,23,23)] tracking-tight leading-[0.9]">
              {t('title')}
            </h1>
          </div>

          <p className="text-lg md:text-xl text-neutral-600 font-inter max-w-2xl">
            {t('subtitle')}
          </p>
        </motion.div>

        {/* Brick Layout Grid */}
        <div className="flex flex-col gap-3 md:gap-5 items-center max-w-7xl mx-auto overflow-x-hidden pb-8">
          {rows.map((row, rowIndex) => {
            const startDelay = rows.slice(0, rowIndex).reduce((sum, r) => sum + r.length, 0);

            return (
              <div
                key={rowIndex}
                className="flex flex-wrap justify-center gap-3 md:gap-5 w-full"
              >
                {row.map((pressItem, itemIndex) => (
                  <PressCard
                    key={pressItem.id}
                    pressItem={pressItem}
                    delay={(startDelay + itemIndex) * 0.05}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {pressItems.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <p className="text-neutral-600 font-inter text-lg">
              {t('noArticles')}
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
