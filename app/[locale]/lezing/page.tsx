import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { type Locale } from '@/i18n';

export default async function LezingPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations('lecture');
  return (
    <div className="min-h-screen bg-[#F9F9F7] py-16 md:py-24 px-4 md:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-center md:text-left text-5xl md:text-6xl lg:text-7xl font-bold font-oswald uppercase tracking-tight text-neutral-900">
          {t('title')}
        </h1>

        <div className="mb-12 grid gap-6 sm:grid-cols-3">
          <div className="flex items-center gap-4 bg-white rounded-2xl p-6 shadow-md">
            <div className="w-12 h-12 rounded-full bg-[#1BDD95] flex items-center justify-center flex-shrink-0">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-inter uppercase tracking-wider mb-1">{t('date')}</p>
              <p className="font-bold text-neutral-900 font-oswald text-lg">{t('onRequest')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white rounded-2xl p-6 shadow-md">
            <div className="w-12 h-12 rounded-full bg-[#1BDD95] flex items-center justify-center flex-shrink-0">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-inter uppercase tracking-wider mb-1">{t('location')}</p>
              <p className="font-bold text-neutral-900 font-oswald text-lg">{t('antwerp')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white rounded-2xl p-6 shadow-md">
            <div className="w-12 h-12 rounded-full bg-[#1BDD95] flex items-center justify-center flex-shrink-0">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-inter uppercase tracking-wider mb-1">{t('groupSize')}</p>
              <p className="font-bold text-neutral-900 font-oswald text-lg">{t('people')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 md:p-12 shadow-md mb-8">
          <p className="text-lg md:text-xl leading-relaxed text-neutral-700 font-inter mb-6">
            {t('description1')}
          </p>
          <p className="text-base md:text-lg leading-relaxed text-neutral-600 font-inter">
            {t('description2')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href={`/${locale}/contact/contactformulier`}
            className="group/btn relative inline-flex items-center justify-center gap-2 px-8 py-5 bg-[#1BDD95] hover:bg-[#14BE82] rounded-full text-white font-oswald font-bold text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
          >
            <span>{t('bookLecture')}</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" />
          </Link>
          <Link
            href={`/${locale}/contact/contactformulier`}
            className="group/btn relative inline-flex items-center justify-center gap-2 px-8 py-5 bg-white border-2 border-neutral-900 rounded-full text-neutral-900 font-oswald font-bold text-sm uppercase tracking-widest overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
          >
            <div className="absolute inset-0 bg-neutral-900 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
            <span className="relative z-10 group-hover/btn:text-white transition-colors duration-300">
              {t('moreInfo')}
            </span>
            <ArrowRight className="relative z-10 w-5 h-5 group-hover/btn:text-white transition-colors duration-300" />
          </Link>
        </div>
      </div>
    </div>
  );
}
