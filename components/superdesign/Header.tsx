'use client';

/**
 * Header navigation component - Updated with full functionality
 */
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ShoppingCart, User, ChevronDown, Menu, X, Heart, Search, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Locale, locales } from '@/i18n';
import { useAuth } from '@/lib/contexts/auth-context';
import { useCartContext } from '@/lib/contexts/cart-context';
import { useFavoritesContext } from '@/lib/contexts/favorites-context';
import { CartSheet } from '@/components/webshop/cart-sheet';

interface HeaderProps {
  locale: Locale;
}

export function Header({ locale }: HeaderProps) {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const { cartCount } = useCartContext();
  const { favoritesCount } = useFavoritesContext();

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Tours', href: `/${locale}/tours`, hasDropdown: false },
    { label: 'Lezing', href: `/${locale}/lezing`, hasDropdown: false },
    { label: 'Webshop', href: `/${locale}/webshop`, hasDropdown: false },
    { label: 'Press', href: `/${locale}/pers`, hasDropdown: false },
    { label: 'FAQ', href: `/${locale}/faq`, hasDropdown: false },
    { label: 'Jobs', href: `/${locale}/jobs/become-a-guide`, hasDropdown: false },
    { label: 'Contact', href: `/${locale}/contact/contactformulier`, hasDropdown: false },
    { label: 'B2B', href: `/${locale}/b2b-offerte`, hasDropdown: false },
  ];

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const getLocalizedPath = (newLocale: Locale) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    return segments.join('/');
  };

  const languageLabels: Record<Locale, string> = {
    nl: 'NL',
    en: 'EN',
    fr: 'FR',
    de: 'DE',
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 py-4 px-4 md:px-12 flex items-center justify-between z-[100] transition-all duration-300 ${
          isScrolled ? 'bg-[#F9F9F7]/90 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-6'
        }`}
      >
        {/* Logo */}
        <Link
          href={`/${locale}`}
          className="flex items-center gap-3 cursor-pointer relative z-[101]"
        >
          <Image
            src="/Beroepsbelg Logo.png"
            alt="Buro BeroepsBelg"
            width={160}
            height={50}
            priority
            className="h-10 md:h-12 w-auto object-contain"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-gray-900 font-medium text-sm hover:opacity-70 flex items-center gap-1 font-serif tracking-wide transition-colors"
            >
              {item.label}
              {item.hasDropdown && <ChevronDown className="w-3 h-3" />}
            </Link>
          ))}
          {(profile?.isAdmin || profile?.is_admin) && (
            <Link
              href={`/${locale}/admin/dashboard`}
              className="text-sm font-semibold transition-all duration-300 px-4 py-2 rounded-full border-2 border-[#1BDD95] text-[#1BDD95] hover:bg-[#1BDD95] hover:text-white"
            >
              Admin
            </Link>
          )}
        </nav>

        {/* Right Icons & Mobile Toggle */}
        <div className="flex items-center gap-2 md:gap-4 relative z-[101]">
          {/* Language Selector - Desktop */}
          <div className="hidden md:flex items-center gap-1 text-sm font-medium mr-2">
            {locales.map((loc, index) => (
              <React.Fragment key={loc}>
                {index > 0 && <span className="mx-1.5 text-gray-400">|</span>}
                <Link
                  href={getLocalizedPath(loc)}
                  className={`transition-colors ${
                    loc === locale
                      ? 'text-[#1BDD95] font-bold'
                      : 'text-gray-600 hover:text-[#1BDD95]'
                  }`}
                >
                  {languageLabels[loc]}
                </Link>
              </React.Fragment>
            ))}
          </div>

          {/* User Icon - Desktop */}
          <Link href={`/${locale}/account`} className="hidden md:block">
            <button className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <User className="w-5 h-5 text-gray-900" />
            </button>
          </Link>

          {/* Favorites Icon - Desktop */}
          <Link href={`/${locale}/account?tab=favorites`} className="hidden md:block relative">
            <button className="p-2 hover:bg-black/5 rounded-full transition-colors relative">
              <Heart className="w-5 h-5 text-gray-900" />
              {favoritesCount > 0 && (
                <span className="absolute top-0 right-0 bg-[#1BDD95] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                  {favoritesCount}
                </span>
              )}
            </button>
          </Link>

          {/* Search Icon - Desktop */}
          <Link href={`/${locale}/webshop`} className="hidden md:block">
            <button className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <Search className="w-5 h-5 text-gray-900" />
            </button>
          </Link>

          {/* Cart Icon */}
          <CartSheet />

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 hover:bg-black/5 rounded-full transition-colors"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-gray-900" />
            ) : (
              <Menu className="w-6 h-6 text-gray-900" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-[#F9F9F7] z-[90] pt-24 px-6 md:hidden flex flex-col overflow-y-auto"
          >
            {/* User Actions Section */}
            <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 mb-6">
              <Link
                href={`/${locale}/account`}
                className="flex items-center gap-3 text-base font-semibold hover:text-[#1BDD95] transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <User className="w-5 h-5" />
                Account
              </Link>
              <Link
                href={`/${locale}/account?tab=favorites`}
                className="flex items-center gap-3 text-base font-semibold hover:text-[#1BDD95] transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <Heart className="w-5 h-5" />
                Favorites
                {favoritesCount > 0 && (
                  <span className="ml-auto bg-[#1BDD95] text-white text-xs font-bold px-2 py-1 rounded-full">
                    {favoritesCount}
                  </span>
                )}
              </Link>
              <Link
                href={`/${locale}/account?tab=cart`}
                className="flex items-center gap-3 text-base font-semibold hover:text-[#1BDD95] transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <ShoppingCart className="w-5 h-5" />
                Cart
                {cartCount > 0 && (
                  <span className="ml-auto bg-[#1BDD95] text-white text-xs font-bold px-2 py-1 rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>
              {(profile?.isAdmin || profile?.is_admin) && (
                <Link
                  href={`/${locale}/admin/dashboard`}
                  className="flex items-center gap-3 text-base font-semibold hover:text-[#1BDD95] transition-colors py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Settings className="w-5 h-5" />
                  Admin Panel
                </Link>
              )}
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col gap-6 items-start mb-8">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-gray-900 text-2xl font-serif font-bold hover:text-[#1BDD95] transition-colors flex items-center gap-2 w-full justify-between border-b border-gray-100 pb-4"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                  {item.hasDropdown && <ChevronDown className="w-5 h-5 opacity-50" />}
                </Link>
              ))}
            </nav>

            {/* Language Selector - Mobile */}
            <div className="border-t border-gray-200 pt-4 mb-8">
              <h4 className="text-gray-500 font-medium mb-3">Language</h4>
              <div className="flex gap-3">
                {locales.map((loc) => (
                  <Link
                    key={loc}
                    href={getLocalizedPath(loc)}
                    className={`px-4 py-2 rounded-full border-2 font-semibold transition-all ${
                      loc === locale
                        ? 'bg-[#1BDD95] text-white border-[#1BDD95]'
                        : 'bg-white text-gray-900 border-gray-300 hover:border-[#1BDD95]'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {languageLabels[loc]}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-auto mb-8 text-center text-gray-400 text-sm">
              © 2024 Buro BeroepsBelg
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
