import type { Locale as I18nLocale } from '@/i18n';

export type Locale = I18nLocale;

export type City = {
  id: string;
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
  city: string; // City slug (kept for backward compatibility)
  cityId?: string; // City ID (primary way to link tours to cities)
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
  primaryMediaType?: 'image' | 'video'; // Type of primary media (image or video)
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
  media_type?: 'image' | 'video'; // Defaults to 'image' for backward compatibility
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

export type LectureImage = {
  id: string;
  lecture_id: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
  storage_folder_name?: string;
  created_at?: string;
  updated_at?: string;
};

export type Lecture = {
  id: string;
  title: string; // Dutch
  title_en?: string; // English
  date?: string; // Dutch (e.g., "Op aanvraag")
  date_en?: string; // English (e.g., "On request")
  location?: string; // Dutch
  location_en?: string; // English
  group_size?: string; // Dutch (e.g., "10-50 personen")
  group_size_en?: string; // English (e.g., "10-50 people")
  description1?: string; // Dutch - First description paragraph
  description1_en?: string; // English - First description paragraph
  description2?: string; // Dutch - Second description paragraph
  description2_en?: string; // English - Second description paragraph
  description?: string; // Dutch - Full description (for expanded view)
  description_en?: string; // English - Full description (for expanded view)
  image?: string; // Primary image URL from image_url column
  lectureImages?: LectureImage[]; // Array of lecture images
  display_order?: number; // For ordering lectures
  created_at?: string;
  updated_at?: string;
};

export type LectureBooking = {
  id?: string;
  lecture_id?: string;
  name: string;
  phone?: string;
  email?: string;
  preferred_date?: string;
  number_of_people?: number;
  location_description?: string;
  needs_room_provided: boolean;
  status?: 'pending' | 'confirmed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
};
