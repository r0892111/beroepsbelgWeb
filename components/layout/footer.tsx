import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type Locale } from '@/i18n';
import { Facebook, Instagram, Youtube } from 'lucide-react';

interface FooterProps {
  locale: Locale;
}

export function Footer({ locale }: FooterProps) {
  const t = useTranslations('footer');

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-4 text-sm font-semibold">{t('contact')}</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>BeroepsBelg</p>
              <p>Groenplaats 1</p>
              <p>2000 Antwerpen</p>
              <p>België</p>
              <p className="pt-2">
                <a href="mailto:info@beroepsbelg.be" className="hover:text-foreground">
                  info@beroepsbelg.be
                </a>
              </p>
              <p>
                <a href="tel:+32123456789" className="hover:text-foreground">
                  +32 123 456 789
                </a>
              </p>
              <p>
                <a
                  href="https://wa.me/32123456789"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
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
                <Link href={`/${locale}/privacy`} className="hover:text-foreground">
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/disclaimer`} className="hover:text-foreground">
                  {t('disclaimer')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">{t('sitemap')}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href={`/${locale}/tours`} className="hover:text-foreground">
                  Tours
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/webshop`} className="hover:text-foreground">
                  Webshop
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/blog`} className="hover:text-foreground">
                  Blog
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/contact/contactformulier`} className="hover:text-foreground">
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
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://www.youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>{t('poweredBy')}</p>
        </div>
      </div>
    </footer>
  );
}
