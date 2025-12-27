import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LezingPage() {
  return (
    <div className="min-h-screen bg-[#F9F9F7] py-16 md:py-24 px-4 md:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-center md:text-left text-5xl md:text-6xl lg:text-7xl font-bold font-oswald uppercase tracking-tight text-neutral-900">
          Lezing: De Boerentoren
        </h1>

        <div className="mb-12 grid gap-6 sm:grid-cols-3">
          <div className="flex items-center gap-4 bg-white rounded-2xl p-6 shadow-md">
            <div className="w-12 h-12 rounded-full bg-[#1BDD95] flex items-center justify-center flex-shrink-0">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-inter uppercase tracking-wider mb-1">Datum</p>
              <p className="font-bold text-neutral-900 font-oswald text-lg">Op aanvraag</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white rounded-2xl p-6 shadow-md">
            <div className="w-12 h-12 rounded-full bg-[#1BDD95] flex items-center justify-center flex-shrink-0">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-inter uppercase tracking-wider mb-1">Locatie</p>
              <p className="font-bold text-neutral-900 font-oswald text-lg">Antwerpen</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white rounded-2xl p-6 shadow-md">
            <div className="w-12 h-12 rounded-full bg-[#1BDD95] flex items-center justify-center flex-shrink-0">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-inter uppercase tracking-wider mb-1">Groepsgrootte</p>
              <p className="font-bold text-neutral-900 font-oswald text-lg">10-50 personen</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 md:p-12 shadow-md mb-8">
          <p className="text-lg md:text-xl leading-relaxed text-neutral-700 font-inter mb-6">
            De Boerentoren, ook bekend als de KBC-toren, is een iconisch gebouw in het Antwerpse stadsbeeld.
            Deze lezing neemt u mee door de fascinerende geschiedenis van wat ooit het hoogste gebouw van
            Europa was.
          </p>
          <p className="text-base md:text-lg leading-relaxed text-neutral-600 font-inter">
            Van de ambitieuze bouwplannen in de jaren '20 tot de moderne transformatie, u ontdekt de
            architecturale hoogtepunten, de verhalen van de mensen die er werkten, en de rol die het
            gebouw speelde in de ontwikkeling van Antwerpen als moderne metropool.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/contact/contactformulier"
            className="group/btn relative inline-flex items-center justify-center gap-2 px-8 py-5 bg-[#1BDD95] hover:bg-[#14BE82] rounded-full text-white font-oswald font-bold text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
          >
            <span>Boek deze lezing</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" />
          </Link>
          <Link
            href="/contact/contactformulier"
            className="group/btn relative inline-flex items-center justify-center gap-2 px-8 py-5 bg-white border-2 border-neutral-900 rounded-full text-neutral-900 font-oswald font-bold text-sm uppercase tracking-widest overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
          >
            <div className="absolute inset-0 bg-neutral-900 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
            <span className="relative z-10 group-hover/btn:text-white transition-colors duration-300">
              Meer informatie
            </span>
            <ArrowRight className="relative z-10 w-5 h-5 group-hover/btn:text-white transition-colors duration-300" />
          </Link>
        </div>
      </div>
    </div>
  );
}
