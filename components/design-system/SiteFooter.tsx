import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Youtube } from 'lucide-react';
import DiagonalStripes from './DiagonalStripes';
import { type Locale } from '@/i18n';

interface SiteFooterProps {
  locale: Locale;
}

export default function SiteFooter({ locale }: SiteFooterProps) {
  return (
    <footer className="relative mint-plane text-on-mint mt-24">
      <DiagonalStripes className="opacity-50" />
      <div className="container py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 relative">
        <div className="space-y-6">
          <Link href="https://beroepsbelg.be" className="block">
            <Image
              src="/Beroepsbelg Logo.png"
              alt="BuroBeroepsBelg"
              width={160}
              height={50}
              className="h-12 w-auto brightness-0 invert"
            />
          </Link>
          <div className="flex items-center gap-5 text-2xl opacity-90">
            <a
              href="https://www.instagram.com/tanguyottomer/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-75 transition-opacity"
            >
              <Instagram className="h-6 w-6" />
            </a>
            <a
              href="https://www.tiktok.com/@tanguyottomer"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-75 transition-opacity"
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
              </svg>
            </a>
            <a
              href="https://www.facebook.com/tanguy.ottomer/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-75 transition-opacity"
            >
              <Facebook className="h-6 w-6" />
            </a>
            <a
              href="https://www.youtube.com/channel/UC-xT2xEycm8Xoig18wo9Sxg"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-75 transition-opacity"
            >
              <Youtube className="h-6 w-6" />
            </a>
          </div>
          <Link href={`/${locale}/newsletter`} className="btn-ghost-white text-lg inline-block">
            Nieuwsbrief
          </Link>
        </div>

        <div className="space-y-2 underline underline-offset-4">
          <a href="#" className="block hover:opacity-75 transition-opacity">
            2000 Antwerpen
          </a>
          <a
            href="mailto:info@beroepsbelg.be"
            className="block hover:opacity-75 transition-opacity"
          >
            info@beroepsbelg.be
          </a>
          <a href="https://api.whatsapp.com/send?phone=32494254159" target="_blank" rel="noopener noreferrer" className="block hover:opacity-75 transition-opacity">
            WhatsApp
          </a>
          <a href="#" className="block hover:opacity-75 transition-opacity">
            BE 0599930251
          </a>
        </div>

        <nav className="space-y-2 underline underline-offset-4">
          <Link
            href={`/${locale}/tours`}
            className="block hover:opacity-75 transition-opacity"
          >
            Tours
          </Link>
          <Link
            href={`/${locale}/webshop`}
            className="block hover:opacity-75 transition-opacity"
          >
            Webshop
          </Link>
          <Link
            href={`/${locale}/privacy`}
            className="block hover:opacity-75 transition-opacity"
          >
            Privacy
          </Link>
          <Link
            href={`/${locale}/disclaimer`}
            className="block hover:opacity-75 transition-opacity"
          >
            Algemene voorwaarden
          </Link>
        </nav>

        <div className="space-y-3">
          <p className="text-sm opacity-80" suppressHydrationWarning>© {new Date().getFullYear()} BeroepsBelg</p>
          <p className="text-sm opacity-80">Alle rechten voorbehouden</p>
        </div>
      </div>
    </footer>
  );
}
