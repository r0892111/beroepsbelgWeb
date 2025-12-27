'use client';

/**
 * The ShopSection component displaying a curated collection.
 * Style: Pixel-perfect Modern Editorial Layout
 * - Simple 2x4 Grid Roster
 * - Clean typography
 * - Custom "Mint Brush Stroke" Separator with Shape Divider
 */
import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';

// --- Assets & Data ---
const ASSETS = {
  webshop1: "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/ce3ebe3b-887b-4797-8470-fe9437121893/1766435864572-30c172aa/Webshop1.png",
  webshop2: "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/ce3ebe3b-887b-4797-8470-fe9437121893/1766435864798-db55c84b/Webshop2.jpg",
  webshop3: "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/ce3ebe3b-887b-4797-8470-fe9437121893/1766435865022-a57f5b18/Webshop3.jpg",
  webshop4: "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/ce3ebe3b-887b-4797-8470-fe9437121893/1766435865264-a96aaf9f/Webshop4.jpg",
  webshop5: "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/ce3ebe3b-887b-4797-8470-fe9437121893/1766437288548-1ca4ac00/Webshop5.png",
  webshop6: "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/ce3ebe3b-887b-4797-8470-fe9437121893/1766437288770-dd6b8700/Webshop6.jpg",
  webshop7: "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/ce3ebe3b-887b-4797-8470-fe9437121893/1766437288978-900da839/Webshop7.jpg",
};

const PRODUCTS = [
  { id: "001", title: "ANTWERPEN ZWART/WIT", subtitle: "ORGANIC FORM VESSEL", price: "€250", image: ASSETS.webshop4 },
  { id: "002", title: "NELLO & PATRASCHE", subtitle: "TEXTURED THROW", price: "€120", image: ASSETS.webshop2 },
  { id: "003", title: "STUDIO LIGHT", subtitle: "BRASS EDITION", price: "€180", image: ASSETS.webshop3 },
  { id: "004", title: "ONDERNEMEN IN 'T STAD", subtitle: "CREATIVE SUITE", price: "€95", image: ASSETS.webshop1 },
  { id: "005", title: "UITGAAN", subtitle: "NIGHT GUIDE", price: "€60", image: ASSETS.webshop5 },
  { id: "006", title: "KNOKKE", subtitle: "COASTAL SERIES", price: "€45", image: ASSETS.webshop6 },
  { id: "007", title: "LEUVEN", subtitle: "ACADEMIC HERITAGE", price: "€75", image: ASSETS.webshop7 },
  { id: "008", title: "DESIGN COLLECTION", subtitle: "LIMITED ARCHIVE", price: "€140", image: ASSETS.webshop3 }, // Reusing asset for 8th item
];

// --- Components ---

const Marquee = () => {
  return (
    <div className="w-full bg-[#1BDD95] overflow-hidden py-4 border-t border-[#1BDD95]">
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: [0, -1000] }}
        transition={{ repeat: Infinity, ease: "linear", duration: 25 }}
      >
        {[...Array(8)].map((_, i) => (
          <span key={i} className="text-[#F9F9F5] font-sans font-medium text-sm tracking-[0.2em] px-12">
            WEBSHOP — NEW COLLECTION — DISCOVER NOW 
          </span>
        ))}
      </motion.div>
    </div>
  );
};

const ProductCard = ({ 
  product, 
  aspect = "aspect-[3/4]", 
  showSubtitle = true,
  className = "",
  imageClassName = "",
  buttonClassName = "text-xs md:text-sm"
}: { 
  product: any, 
  aspect?: string, 
  showSubtitle?: boolean,
  className?: string,
  imageClassName?: string,
  buttonClassName?: string
}) => {
  return (
    <div className={`h-full bg-transparent ${className}`}>
      {/* Bordered Container - Wraps Image AND Text */}
      <div className="flex flex-col h-full border border-[#1a3628] bg-[#F0F0EB] p-4 group transition-all duration-300 hover:shadow-lg">
        {/* Image Container */}
        <div className={`relative w-full ${aspect} mb-4 overflow-hidden border border-[#1a3628]/10 ${imageClassName}`}>
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
          />
        </div>

        {/* Info Area - Now Inside */}
        <div className="mt-auto flex flex-col gap-2">
          <div className="text-sm font-sans font-medium text-[#1a3628] uppercase tracking-wide truncate">
            <span className="hidden md:inline">NO. {product.id} — </span>
            {showSubtitle && product.subtitle}
          </div>
          {!showSubtitle && (
             <div className="text-sm font-sans font-medium text-[#1a3628] uppercase tracking-wide truncate">
                {product.title}
             </div>
          )}
          
          <div className="flex justify-between items-end mt-2">
            <span className="font-sans font-bold text-[#1a3628] text-lg">{product.price}</span>
            <button className={`${buttonClassName} font-bold uppercase bg-[#1BDD95] text-white px-2 py-1.5 md:px-4 md:py-2 hover:bg-[#14BE82] leading-none transition-colors rounded-full flex items-center justify-center`}>
              <span className="md:hidden"><ShoppingCart size={14} strokeWidth={2.5} /></span>
              <span className="hidden md:inline">Add to Cart</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * SeparatorWave Component
 * An organic, brush-stroke style wave that serves as the section separator.
 * It sits on top of the section (negative margin) and fills the gap with the section color.
 */
function SeparatorWave() {
  return (
    <div className="absolute top-0 left-0 w-full z-20 pointer-events-none -translate-y-[98%] leading-none">
      <svg 
        viewBox="0 0 1440 200" 
        preserveAspectRatio="none" 
        className="w-full h-auto min-h-[150px]"
      >
        <defs>
          <filter id="rough-edges-separator" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        
        {/* Filled Shape - Connects the background seamlessly to the section below */}
        {/* New "Asymmetric Wave" Path: Start Low -> Left Rise -> Center Dip -> Right High Arch -> Drop */}
        <path 
          d="M0,200 L0,160 C320,30 550,180 720,140 S1150,-20 1440,160 L1440,200 Z" 
          fill="#F9F9F5" 
          filter="url(#rough-edges-separator)"
        />

        {/* The Mint Green Brush Stroke on Top Edge - Follows the curve */}
        <path 
          d="M0,160 C320,30 550,180 720,140 S1150,-20 1440,160" 
          fill="none" 
          stroke="#1BDD95" 
          strokeWidth="12"
          strokeLinecap="round"
          filter="url(#rough-edges-separator)"
          className="opacity-90"
        />
      </svg>
    </div>
  );
}

export function ShopSection() {
  return (
    <section className="relative w-full bg-[#F9F9F5]">
      <SeparatorWave />

      {/* Intro Text - Padding adjusted to clear the wave */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="text-center mb-16 px-4 pt-32"
      >
        <h2 className="font-serif text-5xl md:text-7xl lg:text-8xl text-[rgb(23,23,23)] mb-4 tracking-tight leading-[0.9]">
          Curated <br/>
          <span className="italic font-light">Collection</span>
        </h2>
        <p className="font-sans text-[rgb(23,23,23)] uppercase tracking-widest text-sm md:text-base max-w-md mx-auto">
          Exclusive books, prints & objects
        </p>
      </motion.div>

      {/* Product Grid - 2x4 Layout (4 cols on desktop) */}
      <div className="container mx-auto px-4 lg:px-8 mb-20">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 lg:gap-8">
          {PRODUCTS.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
            />
          ))}
        </div>
      </div>

      {/* Marquee Banner */}
      <Marquee />
    </section>
  );
}
