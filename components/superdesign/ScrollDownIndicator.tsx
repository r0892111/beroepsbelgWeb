'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

interface ScrollDownIndicatorProps {
  onClick?: () => void;
  className?: string;
  color?: string;
  label?: string;
}

export function ScrollDownIndicator({
  onClick,
  className = "",
  color = "#1a3628",
  label = "Scroll"
}: ScrollDownIndicatorProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 cursor-pointer z-50 group ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.8 }}
      whileHover={{ scale: 1.05 }}
    >
      <span
        className="text-[10px] font-sans tracking-[0.25em] uppercase opacity-60 group-hover:opacity-100 transition-opacity"
        style={{ color }}
      >
        {label}
      </span>
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="p-3 rounded-full border border-current bg-white/10 backdrop-blur-sm group-hover:bg-white/30 transition-colors"
        style={{ color, borderColor: color }}
      >
        <ArrowDown className="w-5 h-5" />
      </motion.div>
    </motion.button>
  );
}
