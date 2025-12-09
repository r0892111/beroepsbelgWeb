import { supabaseServer } from '@/lib/supabase/server';
import type { Locale, City, Tour, TourOptions, Product, FaqItem, BlogPost, PressLink } from '@/lib/data/types';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const citySlugify = (city: string): string => {
  if (!city) return '';
  const cityMap: Record<string, string> = {
    'antwerpen': 'antwerpen',
    'antwerp': 'antwerpen',
    'anvers': 'antwerpen',
    'brussel': 'brussel',
    'brussels': 'brussel',
    'bruxelles': 'brussel',
    'brugge': 'brugge',
    'bruges': 'brugge',
    'gent': 'gent',
    'ghent': 'gent',
    'gand': 'gent',
    'leuven': 'leuven',
    'louvain': 'leuven',
    'mechelen': 'mechelen',
    'malines': 'mechelen',
    'hasselt': 'hasselt',
    'knokke-heist': 'knokke-heist',
    'knokke heist': 'knokke-heist',
    'knokkeheis': 'knokke-heist',
    'knokke': 'knokke-heist',
    'heist': 'knokke-heist',
  };
  const normalized = city.toLowerCase().trim();
  return cityMap[normalized] || slugify(normalized);
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim();
    if (!normalized) return null;
    const parsed = Number.parseFloat(normalized);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

export async function getCities(): Promise<City[]> {
  const { data, error } = await supabaseServer
    .from('cities')
    .select('*')
    .order('slug');

  if (error) {
    throw error;
  }

  const cities = (data || []).map((row: any) => ({
    slug: row.slug,
    name: {
      nl: row.name_nl,
      en: row.name_en,
      fr: row.name_fr,
      de: row.name_de,
    },
    teaser: {
      nl: row.teaser_nl,
      en: row.teaser_en,
      fr: row.teaser_fr,
      de: row.teaser_de,
    },
    ctaText: row.cta_text_nl ? {
      nl: row.cta_text_nl,
      en: row.cta_text_en,
      fr: row.cta_text_fr,
      de: row.cta_text_de,
    } : undefined,
    image: row.image,
    status: row.status,
  }));

  return cities;
}

export async function getTours(citySlug?: string): Promise<Tour[]> {
  // Fetch all tours first, then filter client-side for better matching
  const { data, error } = await supabaseServer
    .from('tours_table_prod')
    .select('*');
  if (error) {
    throw error;
  }

  const tours = (data || []).map((row: any): Tour => {
    const slugifiedCity = citySlugify(row.city);
    
    return {
      id: row.id,
      city: slugifiedCity,
      slug: slugify(row.title),
      title: row.title,
      type: row.type,
      durationMinutes: row.duration_minutes,
      price: row.price ? Number(row.price) : undefined,
      startLocation: row.start_location,
      endLocation: row.end_location,
      languages: row.languages || [],
      description: row.description,
      notes: row.notes,
      options: row.options as TourOptions,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  // Filter by exact city slug if provided (for more accurate matching)
  const filteredTours = citySlug 
    ? tours.filter(t => t.city === citySlug)
    : tours;

  return filteredTours;
}

export async function getTourBySlug(citySlug: string, slug: string): Promise<Tour | null> {
  // Fetch all tours for the city and find by generated slug
  const { data, error } = await supabaseServer
    .from('tours_table_prod')
    .select('*');

  if (error) {
    throw error;
  }

  // Find matching tour by city and generated slug
  const matchingTour = (data || []).find((row: any) => {
    const rowCitySlug = citySlugify(row.city);
    const rowSlug = slugify(row.title);
    return rowCitySlug === citySlug && rowSlug === slug;
  });

  if (!matchingTour) {
    return null;
  }

  return {
    id: matchingTour.id,
    city: citySlugify(matchingTour.city),
    slug: slugify(matchingTour.title),
    title: matchingTour.title,
    type: matchingTour.type,
    durationMinutes: matchingTour.duration_minutes,
    price: matchingTour.price ? Number(matchingTour.price) : undefined,
    startLocation: matchingTour.start_location,
    endLocation: matchingTour.end_location,
    languages: matchingTour.languages || [],
    description: matchingTour.description,
    notes: matchingTour.notes,
    options: matchingTour.options as TourOptions,
    createdAt: matchingTour.created_at,
    updatedAt: matchingTour.updated_at,
  };
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabaseServer
    .from('webshop_data')
    .select('*');
  if (error) {
    throw error;
  }

  const categoryOptions: Product['category'][] = ['Book', 'Merchandise', 'Game'];

  const products = (data || []).map((row: Record<string, any>) => {
    const rawName = typeof row.Name === 'string' ? row.Name.trim() : '';
    const slug = rawName ? slugify(rawName) : row.uuid;
    const price = parseNumber(row['Price (EUR)']) ?? 0;
    const categoryValue = typeof row.Category === 'string' ? row.Category.trim() : '';
    const category = (categoryOptions.includes(categoryValue as Product['category'])
      ? categoryValue
      : 'Book') as Product['category'];
    const description = typeof row.Description === 'string' ? row.Description.trim() : '';
    const additionalInfo = typeof row['Additional Info'] === 'string' ? row['Additional Info'].trim() : '';

    const titleRecord = {
      nl: rawName,
      en: rawName,
      fr: rawName,
      de: rawName,
    };

    const descriptionRecord = description
      ? {
          nl: description,
          en: description,
          fr: description,
          de: description,
        }
      : {
          nl: '',
          en: '',
          fr: '',
          de: '',
        };

    const additionalInfoRecord = additionalInfo
      ? {
          nl: additionalInfo,
          en: additionalInfo,
          fr: additionalInfo,
          de: additionalInfo,
        }
      : undefined;

    return {
      slug,
      uuid: row.uuid,
      title: titleRecord,
      category,
      price,
      description: descriptionRecord,
      additionalInfo: additionalInfoRecord,
      label: undefined,
      image: undefined,
    } satisfies Product;
  });

  return products;
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabaseServer
    .from('blog_posts')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    throw error;
  }

  const posts = (data || []).map((row: any) => ({
    slug: row.slug,
    title: {
      nl: row.title_nl,
      en: row.title_en,
      fr: row.title_fr,
      de: row.title_de,
    },
    excerpt: {
      nl: row.excerpt_nl,
      en: row.excerpt_en,
      fr: row.excerpt_fr,
      de: row.excerpt_de,
    },
    date: row.date,
  }));

  return posts;
}

export async function getPressLinks(): Promise<PressLink[]> {
  try {
    const { data, error } = await supabaseServer
      .from('press_links')
      .select('*')
      .order('sort_order');

    if (error) {
      return []; // Return empty array instead of throwing
    }

    const links = (data || []).map((row: any) => ({
      name: row.name,
      url: row.url,
      logo: row.logo,
    }));

    return links;
  } catch (err) {
    return [];
  }
}

export async function getFaqItems(): Promise<FaqItem[]> {
  try {
    const { data, error } = await supabaseServer
      .from('faq_items')
      .select('*')
      .order('sort_order');

    if (error) {
      return [];
    }

    const items = (data || []).map((row: any) => ({
      question: {
        nl: row.question_nl,
        en: row.question_en,
        fr: row.question_fr,
        de: row.question_de,
      },
      answer: {
        nl: row.answer_nl,
        en: row.answer_en,
        fr: row.answer_fr,
        de: row.answer_de,
      },
    }));

    return items;
  } catch (err) {
    return [];
  }
}
