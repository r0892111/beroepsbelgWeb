'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { type Locale } from '@/i18n';
import { LangSwitcher } from './lang-switcher';
import { Menu, User, ShoppingCart, Heart, Search, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/lib/contexts/auth-context';
import { useCartContext } from '@/lib/contexts/cart-context';
import { useFavoritesContext } from '@/lib/contexts/favorites-context';
import { useState, useEffect } from 'react';
import { CartSheet } from '@/components/webshop/cart-sheet';

interface MainNavProps {
  locale: Locale;
}

export function MainNav({ locale }: MainNavProps) {
  const t = useTranslations('nav');
  const { user, profile } = useAuth();
  const { cartCount } = useCartContext();
  const { favoritesCount } = useFavoritesContext();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: t('tours'), href: `/${locale}/tours` },
    { label: t('lecture'), href: `/${locale}/lezing` },
    { label: t('webshop'), href: `/${locale}/webshop` },
    { label: t('press'), href: `/${locale}/pers` },
    { label: t('faq'), href: `/${locale}/faq` },
    { label: t('jobs'), href: `/${locale}/jobs/become-a-guide` },
    { label: t('blog'), href: `/${locale}/blog` },
    { label: t('contact'), href: `/${locale}/contact/contactformulier` },
    { label: t('b2b'), href: `/${locale}/b2b-offerte` },
  ];

  return (
    <div className={`border-b transition-all duration-300 sticky top-0 z-50 backdrop-blur-md ${isScrolled ? 'shadow-sm' : ''}`} style={{ borderColor: 'var(--border-light)', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
      <div className="container mx-auto px-6 md:px-12">
        <div className="flex h-20 items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center group">
            <div className="relative">
              <Image
                src="/Beroepsbelg Logo.png"
                alt="BuroBeroepsBelg"
                width={160}
                height={50}
                priority
                className={`h-10 w-auto transition-all duration-300 ${isScrolled ? 'h-8' : 'h-10'}`}
              />
              <div className="absolute inset-0 bg-brass/0 group-hover:bg-brass/5 transition-colors duration-300 rounded" />
            </div>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium transition-all duration-200 relative group"
                style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--text-primary)', letterSpacing: '0.025em' }}
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 transition-all duration-200 group-hover:w-full" style={{ backgroundColor: 'var(--accent)' }} />
              </Link>
            ))}
            {(profile?.isAdmin || profile?.is_admin) && (
              <Link
                href={`/${locale}/admin/dashboard`}
                className="text-sm font-medium transition-colors"
                style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--text-primary)' }}
              >
                {t('adminPanel')}
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Link href={`/${locale}/account`} className="relative hidden sm:inline-flex">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </Link>

            <Link href={`/${locale}/account?tab=favorites`} className="relative hidden sm:inline-flex">
              <Button variant="ghost" size="icon">
                <Heart className="h-5 w-5" />
              </Button>
              {favoritesCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#92F0B1] text-xs font-bold text-[#0d1117]">
                  {favoritesCount}
                </span>
              )}
            </Link>

            <Link href={`/${locale}/webshop`} className="hidden sm:inline-flex">
              <Button variant="ghost" size="icon">
                <Search className="h-5 w-5" />
              </Button>
            </Link>

            <CartSheet />

            <LangSwitcher locale={locale} />

            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <nav className="flex flex-col gap-4 pt-8">
                  <div className="flex flex-col gap-3 border-b pb-4">
                    <Link
                      href={`/${locale}/account`}
                      className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
                    >
                      <User className="h-4 w-4" />
                      {t('account')}
                    </Link>
                    <Link
                      href={`/${locale}/account?tab=favorites`}
                      className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
                    >
                      <Heart className="h-4 w-4" />
                      {t('favorites')}
                      {favoritesCount > 0 && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[#92F0B1] text-xs font-bold text-[#0d1117]">
                          {favoritesCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href={`/${locale}/account?tab=cart`}
                      className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {t('cart')}
                      {cartCount > 0 && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[#92F0B1] text-xs font-bold text-[#0d1117]">
                          {cartCount}
                        </span>
                      )}
                    </Link>
                    {(profile?.isAdmin || profile?.is_admin) && (
                      <Link
                        href={`/${locale}/admin/dashboard`}
                        className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
                      >
                        <Settings className="h-4 w-4" />
                        {t('adminPanel')}
                      </Link>
                    )}
                  </div>
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-sm font-medium transition-colors hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </div>
  );
}
