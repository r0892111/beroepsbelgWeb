'use client';

/**
 * Refined Footer component with "Skyline Sketch" watermark.
 * - Mint Green background (#8CD6B3)
 * - 3-Column Layout: Stay Connected, Explore, Search
 * - Architectural watermark at the bottom
 */
import React from 'react';
import Link from 'next/link';
import { Facebook, Instagram, Linkedin, Search } from 'lucide-react';
import { type Locale } from '@/i18n';
import { useTranslations } from 'next-intl';

// Custom TikTok Icon
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    height="1em"
    width="1em"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

// Custom WhatsApp Icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    height="1em"
    width="1em"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

const ASSETS = {
  centralStation: "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/ce3ebe3b-887b-4797-8470-fe9437121893/1766322327392-d060e164/Central_Station.png"
};

interface FooterProps {
  locale: Locale;
}

export function Footer({ locale }: FooterProps) {
  const t = useTranslations('footer');
  return (
    <footer className="relative bg-[#1BDD95] text-black pt-20 pb-8 overflow-hidden font-sans">

      {/* Watermark Image - Anchored to bottom right */}
      <div className="absolute bottom-0 right-0 w-[90%] md:w-[50%] lg:w-[40%] pointer-events-none z-0 translate-y-[10%] translate-x-[5%]">
        <img
          src={ASSETS.centralStation}
          alt="Central Station Sketch"
          className="w-full h-auto object-contain object-right-bottom opacity-20 mix-blend-multiply"
        />
      </div>

      <div className="container mx-auto px-8 relative z-10">
        {/* Main 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-24">

          {/* Column 1: STAY CONNECTED */}
          <div className="flex flex-col items-start gap-6">
            <h3 className="font-serif text-2xl tracking-wide font-medium">{t('stayConnected')}</h3>

            {/* Social Icons */}
            <div className="flex items-center gap-6 mb-4">
              <SocialLink icon={<Instagram className="w-5 h-5" />} href="https://www.instagram.com/tanguyottomer/" />
              <SocialLink icon={<TikTokIcon className="w-5 h-5" />} href="https://www.tiktok.com/@tanguyottomer" />
              <SocialLink icon={<Linkedin className="w-5 h-5" />} href="https://www.linkedin.com/in/tanguy-ottomer-1649a6a/" />
              <SocialLink icon={<WhatsAppIcon className="w-5 h-5" />} href="https://api.whatsapp.com/send?phone=32494254159" />
              <SocialLink icon={<Facebook className="w-5 h-5" />} href="https://www.facebook.com/tanguy.ottomer/" />
            </div>

            {/* Newsletter */}
            <div className="w-full max-w-sm">
              <h4 className="text-sm font-medium tracking-wider mb-3 uppercase opacity-90">{t('newsletterSignUp')}</h4>
              <form className="flex w-full" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  className="flex-1 bg-white text-gray-800 px-4 py-3 outline-none placeholder:text-gray-400 text-sm"
                />
                <button
                  type="submit"
                  className="bg-white text-[#1BDD95] px-6 py-3 text-sm font-bold tracking-wider hover:bg-gray-100 transition-colors uppercase border-l border-gray-100"
                >
                  {t('subscribe')}
                </button>
              </form>
            </div>
          </div>

          {/* Column 2: EXPLORE (Centered) */}
          <div className="flex flex-col items-start md:items-center text-left md:text-center gap-6">
            <h3 className="font-serif text-2xl tracking-wide font-medium">{t('explore')}</h3>
            <nav className="flex flex-col gap-3 text-lg opacity-90">
              <FooterLink href={`/${locale}/tours`}>Tours</FooterLink>
              <FooterLink href={`/${locale}/webshop`}>Webshop</FooterLink>
              <FooterLink href={`/${locale}/lezing`}>Lezing</FooterLink>
              <FooterLink href={`/${locale}/faq`}>FAQs</FooterLink>
              <FooterLink href={`/${locale}/contact/contactformulier`}>Contact</FooterLink>
            </nav>
          </div>

          {/* Column 3: SEARCH (Right) */}
          <div className="flex flex-col items-start md:items-start gap-6">
             <h3 className="font-serif text-2xl tracking-wide font-medium">{t('search')}</h3>
             <div className="w-full relative">
               <input
                 type="text"
                 placeholder={t('searchPlaceholder')}
                 className="w-full bg-transparent border border-black/60 px-4 py-3 pr-10 text-black placeholder:text-black/70 outline-none focus:border-black transition-colors"
               />
               <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/80" />
             </div>
          </div>

        </div>

        {/* Bottom Section */}
        <div className="border-t border-black/40 pt-8 flex flex-col justify-center items-center text-sm opacity-80 gap-4 text-center">
          <div>
            {t('copyright')}
          </div>
          <div className="flex gap-4">
             <Link href={`/${locale}/disclaimer`} className="hover:underline underline-offset-4">{t('terms')}</Link>
             <span>|</span>
             <Link href={`/${locale}/privacy`} className="hover:underline underline-offset-4">{t('privacy')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ icon, href }: { icon: React.ReactNode; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-black hover:opacity-70 transition-opacity duration-200"
      aria-label="Social Link"
    >
      {icon}
    </a>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="hover:text-black/70 transition-colors hover:underline underline-offset-4 decoration-black/40"
    >
      {children}
    </a>
  );
}
