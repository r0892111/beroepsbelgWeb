import type { Locale as I18nLocale } from '@/i18n';

export type Locale = I18nLocale;

export type City = {
  slug: string;
  name: Record<Locale, string>;
  teaser: Record<Locale, string>;
  status?: 'live' | 'coming-soon';
  image?: string;
  ctaText?: Record<Locale, string>;
};

export type Tour = {
  id: string;
  city: string;
  slug: string;
  title: string;
  type: string;
  durationMinutes: number;
  price?: number;
  startLocation?: string;
  endLocation?: string;
  languages: string[];
  description: string;
  notes?: string;
  op_maat?: boolean;
  local_stories?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
