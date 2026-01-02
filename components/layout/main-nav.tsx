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
    { label: t('contact'), href: `/${locale}/contact/contactformulier` },
    { label: t('b2b'), href: `/${locale}/b2b-offerte` },
    { label: t('airbnb'), href: `/${locale}/airbnb` },
  ];

  return (
    <div className={`border-b transition-all duration-500 sticky top-0 z-50 backdrop-blur-lg ${isScrolled ? 'shadow-lg' : 'shadow-sm'}`} style={{
      borderColor: isScrolled ? 'var(--green-accent)' : 'var(--border-light)',
      backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.95)',
      borderBottomWidth: isScrolled ? '2px' : '1px'
    }}>
      {/* Turquoise accent line on scroll */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 transition-all duration-500"
        style={{
          backgroundColor: 'var(--green-accent)',
          opacity: isScrolled ? 1 : 0,
          boxShadow: isScrolled ? '0 0 10px rgba(61, 213, 152, 0.5)' : 'none'
        }}
      />

      <div className="container mx-auto px-6 md:px-12">
        <div className={`flex items-center justify-between transition-all duration-500 ${isScrolled ? 'h-16' : 'h-20'}`}>
          <Link href={`/${locale}`} className="flex items-center group relative">
            <div className="relative">
              {/* Turquoise glow on hover */}
              <div
                className="absolute -inset-2 rounded-lg opacity-0 group-hover:opacity-20 transition-all duration-300 blur-md"
                style={{ backgroundColor: 'var(--green-accent)' }}
              />
              <Image
                src="/Beroepsbelg Logo.png"
                alt="BuroBeroepsBelg"
                width={160}
                height={50}
                priority
                className={`h-10 w-auto transition-all duration-500 relative z-10 ${isScrolled ? 'h-8' : 'h-10'} group-hover:scale-105`}
              />
            </div>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-semibold transition-all duration-300 relative group py-2"
                style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--text-primary)', letterSpacing: '0.025em' }}
              >
                <span className="relative z-10 group-hover:text-[var(--green-accent)] transition-colors duration-300">
                  {item.label}
                </span>

                {/* Animated underline */}
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 transition-all duration-300 group-hover:w-full"
                  style={{ backgroundColor: 'var(--green-accent)' }}
                />

                {/* Glow effect on hover */}
                <span
                  className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"
                  style={{
                    background: 'radial-gradient(circle, rgba(61, 213, 152, 0.1) 0%, transparent 70%)',
                  }}
                />
              </Link>
            ))}
            {(profile?.isAdmin || profile?.is_admin) && (
              <Link
                href={`/${locale}/admin/dashboard`}
                className="text-sm font-semibold transition-all duration-300 relative group px-4 py-2 rounded-full"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  color: 'var(--green-accent)',
                  border: '1.5px solid var(--green-accent)'
                }}
                suppressHydrationWarning
              >
                <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                  {t('adminPanel')}
                </span>
                <span
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ backgroundColor: 'var(--green-accent)' }}
                />
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Link href={`/${locale}/account`} className="relative hidden sm:inline-flex group">
              <Button variant="ghost" size="icon" className="hover:bg-transparent relative">
                <User className="h-5 w-5 transition-all duration-300 group-hover:text-[var(--green-accent)] group-hover:scale-110" />
                <div
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ backgroundColor: 'rgba(61, 213, 152, 0.1)' }}
                />
              </Button>
            </Link>

            <Link href={`/${locale}/account?tab=favorites`} className="relative hidden sm:inline-flex group">
              <Button variant="ghost" size="icon" className="hover:bg-transparent relative">
                <Heart className="h-5 w-5 transition-all duration-300 group-hover:text-[var(--green-accent)] group-hover:scale-110 group-hover:fill-[var(--green-accent)]" />
                <div
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ backgroundColor: 'rgba(61, 213, 152, 0.1)' }}
                />
              </Button>
              {favoritesCount > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white animate-pulse"
                  style={{
                    backgroundColor: 'var(--green-accent)',
                    boxShadow: '0 0 10px rgba(61, 213, 152, 0.5)'
                  }}
                  suppressHydrationWarning
                >
                  {favoritesCount}
                </span>
              )}
            </Link>

            <Link href={`/${locale}/webshop`} className="hidden sm:inline-flex group">
              <Button variant="ghost" size="icon" className="hover:bg-transparent relative">
                <Search className="h-5 w-5 transition-all duration-300 group-hover:text-[var(--green-accent)] group-hover:scale-110" />
                <div
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ backgroundColor: 'rgba(61, 213, 152, 0.1)' }}
                />
              </Button>
            </Link>

            <CartSheet />

            <LangSwitcher locale={locale} />

            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="hover:bg-transparent relative group">
                  <Menu className="h-5 w-5 transition-all duration-300 group-hover:text-[var(--green-accent)] group-hover:scale-110" />
                  <div
                    className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ backgroundColor: 'rgba(61, 213, 152, 0.1)' }}
                  />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <nav className="flex flex-col gap-4 pt-8">
                  <div className="flex flex-col gap-3 border-b pb-4" style={{ borderColor: 'var(--green-accent)' }}>
                    <Link
                      href={`/${locale}/account`}
                      className="flex items-center gap-3 text-sm font-semibold transition-all duration-300 hover:text-[var(--green-accent)] hover:translate-x-1 py-2"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      <User className="h-4 w-4" />
                      {t('account')}
                    </Link>
                    <Link
                      href={`/${locale}/account?tab=favorites`}
                      className="flex items-center gap-3 text-sm font-semibold transition-all duration-300 hover:text-[var(--green-accent)] hover:translate-x-1 py-2"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      <Heart className="h-4 w-4" />
                      {t('favorites')}
                      {favoritesCount > 0 && (
                        <span
                          className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{
                            backgroundColor: 'var(--green-accent)',
                            boxShadow: '0 0 8px rgba(61, 213, 152, 0.4)'
                          }}
                          suppressHydrationWarning
                        >
                          {favoritesCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href={`/${locale}/account?tab=cart`}
                      className="flex items-center gap-3 text-sm font-semibold transition-all duration-300 hover:text-[var(--green-accent)] hover:translate-x-1 py-2"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {t('cart')}
                      {cartCount > 0 && (
                        <span
                          className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{
                            backgroundColor: 'var(--green-accent)',
                            boxShadow: '0 0 8px rgba(61, 213, 152, 0.4)'
                          }}
                          suppressHydrationWarning
                        >
                          {cartCount}
                        </span>
                      )}
                    </Link>
                    {(profile?.isAdmin || profile?.is_admin) && (
                      <Link
                        href={`/${locale}/admin/dashboard`}
                        className="flex items-center gap-3 text-sm font-semibold transition-all duration-300 hover:text-[var(--green-accent)] hover:translate-x-1 py-2"
                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                        suppressHydrationWarning
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
                      className="text-sm font-semibold transition-all duration-300 hover:text-[var(--green-accent)] hover:translate-x-1 py-2 relative group"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      <span className="relative z-10">{item.label}</span>
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 transition-all duration-300 group-hover:h-full rounded-full"
                        style={{ backgroundColor: 'var(--green-accent)' }}
                      />
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
