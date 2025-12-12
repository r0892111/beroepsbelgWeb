import Link from 'next/link';
import { type Tour, type Locale } from '@/lib/data/types';
import { Clock, MapPin } from 'lucide-react';

interface TourUpsellCardProps {
  tour: Tour;
  locale: Locale;
}

export function TourUpsellCard({ tour, locale }: TourUpsellCardProps) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}min`;
    if (hours > 0) return `${hours}h`;
    return `${mins}min`;
  };

  return (
    <Link
      href={`/${locale}/tours-${tour.city}/${tour.slug}`}
      className="group block relative overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      style={{
        borderColor: 'var(--border-subtle)',
        backgroundColor: 'var(--bg-base)',
      }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-lg leading-tight group-hover:text-[var(--primary-base)] transition-colors" style={{ color: 'var(--text-primary)' }}>
            {tour.title}
          </h3>
          {tour.price && (
            <span className="text-lg font-bold whitespace-nowrap" style={{ color: 'var(--primary-base)' }}>
              €{tour.price}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(tour.durationMinutes)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            <span className="capitalize">{tour.city}</span>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
        style={{ backgroundColor: 'var(--primary-base)' }}
      />
    </Link>
  );
}
