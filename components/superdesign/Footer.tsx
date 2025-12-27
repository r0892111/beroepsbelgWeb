'use client';

/**
 * Refined Footer component with "Skyline Sketch" watermark.
 * - Mint Green background (#8CD6B3)
 * - 3-Column Layout: Stay Connected, Explore, Search
 * - Architectural watermark at the bottom
 */
import React from 'react';
import Link from 'next/link';
import { Facebook, Instagram, Twitter, Search } from 'lucide-react';
import { type Locale } from '@/i18n';
import { useTranslations } from 'next-intl';

// Custom Pinterest Icon since it might not be in the specific lucide version or for custom styling
const PinterestIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="0"
    className={className}
    height="1em"
    width="1em"
  >
    <path stroke="none" d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.399.165-1.495-.69-2.433-2.864-2.433-4.624 0-3.77 2.748-7.229 7.93-7.229 4.173 0 6.91 2.978 6.91 6.958 0 4.138-2.607 7.502-6.23 7.502-1.216 0-2.359-.635-2.75-1.392l-.753 2.864c-.29 1.123-1.009 2.566-1.506 3.42 1.129.35 2.369.538 3.619.538 6.622 0 11.987-5.365 11.987-11.987S17.255 0 12.017 0z"/>
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
              <SocialLink icon={<Instagram className="w-5 h-5" />} href="https://www.instagram.com/beroepsbelg" />
              <SocialLink icon={<Facebook className="w-5 h-5" />} href="https://www.facebook.com/beroepsbelg" />
              <SocialLink icon={<Twitter className="w-5 h-5" />} href="https://twitter.com/beroepsbelg" />
              <SocialLink icon={<PinterestIcon className="w-5 h-5" />} href="https://pinterest.com/beroepsbelg" />
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
