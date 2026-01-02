'use client';

/**
 * Refined Footer component with "Skyline Sketch" watermark.
 * - Mint Green background (#8CD6B3)
 * - 3-Column Layout: Stay Connected, Explore, Search
 * - Architectural watermark at the bottom
 */
import React, { useState } from 'react';
import Link from 'next/link';
import { Facebook, Instagram, Linkedin, Search } from 'lucide-react';
import { type Locale } from '@/i18n';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

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

// Custom TripAdvisor Icon (official owl logo)
const TripAdvisorIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 97.75 97.75"
    fill="black"
    className={className}
    height="1em"
    width="1em"
  >
    <g>
      <path d="M67.211,46.07c-3.291,0-5.971,2.648-5.982,5.917c-0.012,3.252,2.681,5.959,5.939,5.967
        c3.266,0.01,5.949-2.674,5.947-5.943C73.113,48.732,70.465,46.07,67.211,46.07z M67.211,55.02c-1.686,0-3.043-1.332-3.039-2.983
        c0.002-1.716,1.318-3.039,3.02-3.041c1.666-0.002,3.031,1.362,3.017,3.021C70.189,53.672,68.848,55.02,67.211,55.02z"/>
      <path d="M30.512,37.514c-7.9-0.07-14.787,6.523-14.65,14.921c0.129,7.832,6.584,14.472,14.814,14.4
        c8.047-0.068,14.516-6.641,14.531-14.6C45.219,44.063,38.672,37.514,30.512,37.514z M30.748,61.1
        c-5.293,0.242-9.564-3.977-9.555-9.1c0.01-5.191,4.287-9.162,9.125-9.074c5.023-0.006,9.1,4.049,9.086,9.07
        C39.391,57.078,35.385,60.889,30.748,61.1z"/>
      <path d="M48.875,0C21.883,0,0,21.883,0,48.875S21.883,97.75,48.875,97.75S97.75,75.867,97.75,48.875S75.867,0,48.875,0z
         M76.971,67.852c-2.984,1.896-6.283,2.795-9.807,2.814c-1.48,0.01-2.955-0.189-4.4-0.564c-3.522-0.914-6.545-2.672-9.035-5.33
        c-0.33-0.35-0.639-0.713-0.987-1.108c-1.316,1.961-2.611,3.892-3.939,5.871c-1.32-1.974-2.6-3.886-3.873-5.787
        c-0.088,0.045-0.113,0.051-0.131,0.065c-0.029,0.025-0.055,0.056-0.076,0.082c-3.012,3.556-6.801,5.734-11.414,6.465
        c-2.568,0.406-5.109,0.261-7.604-0.428c-3.533-0.971-6.537-2.834-8.963-5.586c-2.371-2.688-3.846-5.812-4.398-9.363
        c-0.633-3.312,0.137-6.508,0.33-7.282c0.559-2.252,1.531-4.322,2.867-6.225c0.094-0.135,0.127-0.375,0.082-0.535
        c-0.545-1.998-1.482-3.816-2.582-5.557c-0.279-0.441-0.613-0.85-0.922-1.275c0-0.049,0-0.098,0-0.148
        c0.061,0.008,0.123,0.02,0.184,0.02c3.697,0.002,7.396,0.002,11.094-0.004c0.162,0,0.34-0.066,0.479-0.154
        c2.598-1.668,5.367-2.988,8.275-4.016c2.098-0.74,4.238-1.318,6.424-1.742c2.115-0.408,4.24-0.697,6.389-0.838
        c5.238-0.404,9.426,0.15,12.211,0.539c2.053,0.289,4.064,0.807,6.051,1.416c3.469,1.068,6.74,2.553,9.818,4.477
        c0.213,0.133,0.5,0.217,0.752,0.217c3.613,0.016,7.227,0.01,10.84,0.014c0.291,0,0.582,0.031,0.871,0.047
        c0,0.07,0.01,0.1-0.002,0.117c-0.168,0.258-0.34,0.516-0.508,0.775c-1.225,1.879-2.273,3.848-2.893,6.021
        c-0.066,0.232-0.082,0.428,0.076,0.658c3.219,4.621,4.243,9.693,2.899,15.162C83.898,61.465,81.15,65.203,76.971,67.852z"/>
      <path d="M30.236,46.07c-3.209,0.006-5.898,2.715-5.891,5.936c0.008,3.26,2.695,5.941,5.963,5.949
        c3.248,0.008,5.939-2.697,5.932-5.965C36.23,48.691,33.564,46.064,30.236,46.07z M30.311,55.051
        c-1.723,0.002-3.051-1.328-3.051-3.061c0-1.701,1.326-3.021,3.043-3.023c1.689-0.002,3.049,1.348,3.057,3.035
        C33.365,53.674,31.994,55.045,30.311,55.051z"/>
      <path d="M66.902,37.57c-8.019,0.164-14.295,6.627-14.367,14.622c0,8.121,6.59,14.756,14.682,14.725
        c8.123-0.029,14.682-6.477,14.676-14.688C81.889,43.766,75.023,37.404,66.902,37.57z M67.562,61.102
        c-5.271,0.203-9.489-4-9.487-9.094c0.002-5.154,4.252-9.17,9.112-9.082c5.027-0.01,9.099,4.039,9.099,9.061
        C76.285,57.027,72.283,60.922,67.562,61.102z"/>
      <path d="M54.732,38.639c3.248-2.98,7.117-4.543,11.506-4.875c-5.209-2.314-10.701-3.299-16.355-3.408
        c-6.424-0.125-12.674,0.822-18.643,3.326c4.463,0.271,8.383,1.828,11.695,4.838c3.305,3.008,5.242,6.756,5.945,11.166
        C49.604,45.328,51.488,41.613,54.732,38.639z"/>
    </g>
  </svg>
);

// Custom YouTube Icon
const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    height="1em"
    width="1em"
  >
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
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
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [consent, setConsent] = useState(false);
  const [showExtendedFields, setShowExtendedFields] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value.length > 0 && !showExtendedFields) {
      setShowExtendedFields(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(t('newsletter.invalidEmail') || 'Please enter a valid email address');
      return;
    }

    if (!firstName || !lastName) {
      toast.error(t('newsletter.nameRequired') || 'Please enter your first and last name');
      return;
    }

    if (!consent) {
      toast.error(t('newsletter.consentRequired') || 'Please accept the privacy policy');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/newsletter-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: lastName,
          consent_given: consent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      toast.success(t('newsletter.success') || 'Successfully subscribed to newsletter!');
      // Reset form
      setEmail('');
      setFirstName('');
      setLastName('');
      setConsent(false);
      setShowExtendedFields(false);
    } catch (error: any) {
      console.error('Newsletter subscription error:', error);
      toast.error(error.message || t('newsletter.error') || 'Failed to subscribe. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

            {/* Social Icons - 2x4 Grid */}
            <div className="grid grid-cols-4 grid-rows-2 gap-4 mb-4">
              <SocialLink icon={<Instagram className="w-9 h-9" />} href="https://www.instagram.com/tanguyottomer/" />
              <SocialLink icon={<TikTokIcon className="w-9 h-9" />} href="https://www.tiktok.com/@tanguyottomer" />
              <SocialLink icon={<Linkedin className="w-9 h-9" />} href="https://www.linkedin.com/in/tanguy-ottomer-1649a6a/" />
              <SocialLink icon={<WhatsAppIcon className="w-9 h-9" />} href="https://api.whatsapp.com/send?phone=32494254159" />
              <SocialLink icon={<Facebook className="w-9 h-9" />} href="https://www.facebook.com/tanguy.ottomer/" />
              <SocialLink icon={<TripAdvisorIcon className="w-9 h-9" />} href="https://www.tripadvisor.be/Attraction_Review-g188636-d13545814-Reviews-BeroepsBelg-Antwerp_Antwerp_Province.html" />
              <SocialLink icon={<YouTubeIcon className="w-9 h-9" />} href="https://www.youtube.com/channel/UC-xT2xEycm8Xoig18wo9Sxg" />
            </div>

            {/* Newsletter */}
            <div className="w-full max-w-sm">
              <h4 className="text-sm font-medium tracking-wider mb-3 uppercase opacity-90">{t('newsletterSignUp')}</h4>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex w-full">
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder={t('emailPlaceholder')}
                    className="flex-1 bg-white text-gray-800 px-4 py-3 outline-none placeholder:text-gray-400 text-sm"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-white text-[#1BDD95] px-6 py-3 text-sm font-bold tracking-wider hover:bg-gray-100 transition-colors uppercase border-l border-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? t('newsletter.submitting') || '...' : t('subscribe')}
                  </button>
                </div>
                
                {/* Extended Fields - Show when user starts typing email */}
                {showExtendedFields && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={t('newsletter.firstName') || 'First Name'}
                      className="w-full bg-white text-gray-800 px-4 py-3 outline-none placeholder:text-gray-400 text-sm"
                      required
                    />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={t('newsletter.lastName') || 'Last Name'}
                      className="w-full bg-white text-gray-800 px-4 py-3 outline-none placeholder:text-gray-400 text-sm"
                      required
                    />
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="newsletter-consent"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-1 w-4 h-4 text-[#1BDD95] border-gray-300 rounded focus:ring-[#1BDD95]"
                        required
                      />
                      <label htmlFor="newsletter-consent" className="text-xs text-black/80 leading-tight">
                        {t('newsletter.consentText') || 'I agree to the'} {' '}
                        <Link href={`/${locale}/privacy`} className="underline hover:text-black">
                          {t('newsletter.privacyPolicy') || 'privacy policy'}
                        </Link>
                      </label>
                    </div>
                  </div>
                )}
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
              <FooterLink href={`/${locale}/blog`}>Blog</FooterLink>
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
          <div>
            VAT: BE0599930251
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
