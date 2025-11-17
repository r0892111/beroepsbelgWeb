export type Locale = 'nl' | 'en' | 'fr' | 'de';

export type City = {
  slug: string;
  name: Record<Locale, string>;
  teaser: Record<Locale, string>;
  status?: 'live' | 'coming-soon';
  image?: string;
  ctaText?: Record<Locale, string>;
};

export type Tour = {
  citySlug: string;
  slug: string;
  title: Record<Locale, string>;
  price?: number;
  badge?: 'EXCLUSIEF' | 'UITVERKOCHT' | 'NIEUW';
  shortDescription: Record<Locale, string>;
  description?: Record<Locale, string>;
  thumbnail?: string;
  images?: string[];
  details?: {
    start?: Record<Locale, string>;
    end?: Record<Locale, string>;
    duration?: Record<Locale, string>;
    languages?: Record<Locale, string>;
    extraInfo?: Record<Locale, string>;
  };
};

export type Product = {
  slug: string;
  uuid: string;
  title: Record<Locale, string>;
  category: 'Book' | 'Merchandise' | 'Game';
  price: number;
  description: Record<Locale, string>;
  additionalInfo?: Record<Locale, string>;
  label?: string;
  image?: string;
};

export type FaqItem = {
  question: Record<Locale, string>;
  answer: Record<Locale, string>;
};

export type BlogPost = {
  slug: string;
  title: Record<Locale, string>;
  excerpt: Record<Locale, string>;
  date: string;
};

export type PressLink = {
  name: string;
  url: string;
  logo?: string;
};
