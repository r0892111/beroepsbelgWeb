import { getPressLinks } from '@/lib/api/content';
import { ExternalLink } from 'lucide-react';

export default async function PersPage() {
  const pressLinks = await getPressLinks();

  return (
    <div className="min-h-screen bg-[#F9F9F7] py-16 md:py-24 px-4 md:px-8">
      <div className="container mx-auto max-w-5xl">
        <h1 className="mb-6 text-center text-5xl md:text-6xl lg:text-7xl font-bold font-oswald uppercase tracking-tight text-neutral-900">
          In de Pers
        </h1>
        <p className="mb-16 text-center text-lg md:text-xl text-neutral-600 font-inter max-w-2xl mx-auto">
          BeroepsBelg in de media
        </p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {pressLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between bg-white rounded-2xl p-6 md:p-8 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            >
              <span className="text-lg md:text-xl font-bold font-oswald uppercase tracking-tight text-neutral-900 group-hover:text-[#1BDD95] transition-colors">
                {link.name}
              </span>
              <div className="w-10 h-10 rounded-full bg-neutral-100 group-hover:bg-[#1BDD95] flex items-center justify-center transition-all">
                <ExternalLink className="h-5 w-5 text-neutral-700 group-hover:text-white transition-colors" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
