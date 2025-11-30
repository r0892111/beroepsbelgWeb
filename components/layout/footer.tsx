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
  const tNav = useTranslations('nav');
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
    <footer className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #F0FAF7 0%, #E0F5F0 50%, #D0F0E8 100%)' }}>
      {/* Turquoise decorative elements */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div
          className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl"
          style={{ backgroundColor: 'var(--green-accent)' }}
        />
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl"
          style={{ backgroundColor: 'var(--green-accent)' }}
        />
        <div
          className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full blur-3xl"
          style={{ backgroundColor: 'var(--green-accent)' }}
        />
      </div>

      {/* Turquoise top border */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, transparent, var(--green-accent), transparent)' }} />

      <div className="container mx-auto px-4 py-12 relative">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--green-accent)', fontFamily: 'Montserrat, sans-serif' }}>
              {t('contact')}
            </h3>
            <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Open Sans, sans-serif' }}>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>BeroepsBelg</p>
              <p>Groenplaats 1</p>
              <p>2000 Antwerpen</p>
              <p>België</p>
              <p className="pt-2">
                <a href="mailto:info@beroepsbelg.be" className="transition-colors duration-300 hover:underline" style={{ color: 'var(--green-accent)' }}>
                  info@beroepsbelg.be
                </a>
              </p>
              <p>
                <a href="tel:+32123456789" className="transition-colors duration-300 hover:underline" style={{ color: 'var(--green-accent)' }}>
                  +32 123 456 789
                </a>
              </p>
              <p>
                <a
                  href="https://wa.me/32123456789"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-300 hover:underline"
                  style={{ color: 'var(--green-accent)' }}
                >
                  WhatsApp
                </a>
              </p>
              <p className="pt-2" style={{ color: 'var(--text-secondary)' }}>BE 0123.456.789</p>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--green-accent)', fontFamily: 'Montserrat, sans-serif' }}>
              {t('legal')}
            </h3>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Open Sans, sans-serif' }}>
              <li>
                <Link href={`/${locale}/privacy`} className="transition-all duration-300 hover:translate-x-1 inline-block" style={{ color: 'var(--text-primary)' }}>
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/disclaimer`} className="transition-all duration-300 hover:translate-x-1 inline-block" style={{ color: 'var(--text-primary)' }}>
                  {t('disclaimer')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--green-accent)', fontFamily: 'Montserrat, sans-serif' }}>
              {t('sitemap')}
            </h3>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Open Sans, sans-serif' }}>
              <li>
                <Link href={`/${locale}/tours`} className="transition-all duration-300 hover:translate-x-1 inline-block" style={{ color: 'var(--text-primary)' }}>
                  {tNav('tours')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/webshop`} className="transition-all duration-300 hover:translate-x-1 inline-block" style={{ color: 'var(--text-primary)' }}>
                  {tNav('webshop')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/blog`} className="transition-all duration-300 hover:translate-x-1 inline-block" style={{ color: 'var(--text-primary)' }}>
                  {tNav('blog')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/contact/contactformulier`} className="transition-all duration-300 hover:translate-x-1 inline-block" style={{ color: 'var(--text-primary)' }}>
                  {tNav('contact')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--green-accent)', fontFamily: 'Montserrat, sans-serif' }}>
              {tNav('social')}
            </h3>
            <div className="flex gap-4">
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full transition-all duration-300 hover:scale-110 hover:-rotate-6"
                style={{ backgroundColor: 'var(--green-accent)', color: 'white' }}
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full transition-all duration-300 hover:scale-110 hover:rotate-6"
                style={{ backgroundColor: 'var(--green-accent)', color: 'white' }}
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://www.youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full transition-all duration-300 hover:scale-110 hover:-rotate-6"
                style={{ backgroundColor: 'var(--green-accent)', color: 'white' }}
              >
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 text-center text-sm relative" style={{ color: 'var(--text-secondary)', fontFamily: 'Open Sans, sans-serif' }}>
          {/* Turquoise divider line */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--green-accent), transparent)' }} />
          <p>{t('poweredBy')}</p>
        </div>
      </div>

      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl hover:rotate-12 z-50 ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16 pointer-events-none'}`}
        style={{ backgroundColor: 'var(--green-accent)', color: 'white' }}
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </footer>
  );
}
