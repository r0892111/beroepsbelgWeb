import Link from 'next/link';
import DiagonalStripes from './DiagonalStripes';
import { type Locale } from '@/i18n';

interface HeroProps {
  locale: Locale;
}

export default function Hero({ locale }: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-[68%] mint-plane angle-clip" />

      <div className="relative ml-auto h-[60vh] min-h-[520px] w-full bg-gradient-to-br from-slate-100 to-slate-200" />

      <DiagonalStripes className="opacity-90 mix-blend-screen" />

      <div className="absolute top-24 left-4 sm:left-20 max-w-xl">
        <span className="copy-card text-lg sm:text-xl leading-relaxed font-semibold">
          "One of the 7 savviest guides in the world" — CNN
        </span>
      </div>

      <section className="relative overflow-hidden bg-white font-sans -mt-8">
        <div className="diag-lines" aria-hidden="true" />

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="px-6 sm:px-10 md:px-16 lg:pl-16 xl:pl-24 py-12 md:py-16">
            <p className="copy text-[15px] md:text-[16px]">
              <strong>Tanguy Ottomer</strong>, award-winning city guide and author. Experience
              Belgium through unique perspectives and fascinating stories that bring history and
              culture to life.
            </p>
          </div>

          <div className="relative min-h-[220px]">
            <div className="absolute inset-0 wedge-right" />
            <div className="relative flex flex-col items-start justify-center h-full pl-8 sm:pl-12 md:pl-16 lg:pl-24 pr-6">
              <h2 className="text-[#0d1117] text-[30px] md:text-[34px] font-semibold mb-6">
                Uw gids in België
              </h2>
              <Link href={`/${locale}/tours`} className="btn-outline-white text-[16px] h-[56px]">
                Ontdek onze tours
              </Link>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
