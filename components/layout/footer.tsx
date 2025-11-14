'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type Locale } from '@/i18n';
import { Facebook, Instagram, Youtube, ArrowUp } from 'lucide-react';
import { useState, useEffect } from 'react';

interface FooterProps {
  locale: Locale;
}

export function Footer({ locale }: FooterProps) {
  const t = useTranslations('footer');
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-border bg-gradient-to-b from-sand/30 to-sand/60 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brass/30 rounded-full blur-3xl" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-navy/20 rounded-full blur-3xl" />
      </div>
      <div className="container mx-auto px-4 py-12 relative">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-4 text-sm font-semibold">{t('contact')}</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>BeroepsBelg</p>
              <p>Groenplaats 1</p>
              <p>2000 Antwerpen</p>
              <p>België</p>
              <p className="pt-2">
                <a href="mailto:info@beroepsbelg.be" className="hover:text-brass transition-colors duration-300">
                  info@beroepsbelg.be
                </a>
              </p>
              <p>
                <a href="tel:+32123456789" className="hover:text-brass transition-colors duration-300">
                  +32 123 456 789
                </a>
              </p>
              <p>
                <a
                  href="https://wa.me/32123456789"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brass transition-colors duration-300"
                >
                  WhatsApp
                </a>
              </p>
              <p className="pt-2">BE 0123.456.789</p>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">{t('legal')}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href={`/${locale}/privacy`} className="hover:text-brass transition-colors duration-300">
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/disclaimer`} className="hover:text-brass transition-colors duration-300">
                  {t('disclaimer')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">{t('sitemap')}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href={`/${locale}/tours`} className="hover:text-brass transition-colors duration-300">
                  Tours
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/webshop`} className="hover:text-brass transition-colors duration-300">
                  Webshop
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/blog`} className="hover:text-brass transition-colors duration-300">
                  Blog
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/contact/contactformulier`} className="hover:text-brass transition-colors duration-300">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">Social</h3>
            <div className="flex gap-4">
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-navy/60 transition-all duration-300 hover:text-brass hover:scale-110 hover:-rotate-6"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-navy/60 transition-all duration-300 hover:text-brass hover:scale-110 hover:rotate-6"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://www.youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-navy/60 transition-all duration-300 hover:text-brass hover:scale-110 hover:-rotate-6"
              >
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground relative">
          <p>{t('poweredBy')}</p>
        </div>
      </div>

      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 bg-brass text-navy p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl hover:rotate-12 z-50 ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16 pointer-events-none'}`}
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </footer>
  );
}
