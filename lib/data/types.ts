import type { Locale as I18nLocale } from '@/i18n';

export type Locale = I18nLocale;

export type City = {
  slug: string;
  name: Record<Locale, string>;
  teaser: Record<Locale, string>;
  status?: 'live' | 'coming-soon';
  image?: string;
  ctaText?: Record<Locale, string>;
  comingSoonText?: Record<Locale, string>;
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
  image?: string; // Primary image URL for display
  tourImages?: TourImage[]; // All tour images
  displayOrder?: number; // Display order within city (lower numbers appear first)
  themes?: string[]; // Array of theme tags (e.g., architecture, fashion, history)
  options?: {
    thumbnail?: string;
    badge?: string;
    stripe_product_id?: string;
    stripe_price_id?: string;
    [key: string]: any;
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
  displayOrder?: number; // Global display order (lower numbers appear first)
  categoryDisplayOrder?: number; // Per-category display order (lower numbers appear first within category)
};

export type ProductImage = {
  id: string;
  product_uuid: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
  storage_folder_name?: string;
  created_at?: string;
  updated_at?: string;
};

export type TourImage = {
  id: string;
  tour_id: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
  storage_folder_name?: string;
  created_at?: string;
  updated_at?: string;
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
