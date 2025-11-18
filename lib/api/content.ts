import { supabase } from '@/lib/supabase/client';
import type { Locale, City, Tour, Product, FaqItem, BlogPost, PressLink } from '@/lib/data/types';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

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
  console.log('[Supabase API] Fetching cities...');
  const startTime = performance.now();

  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .order('slug');

  if (error) {
    console.error('[Supabase API] ❌ Error fetching cities:', error);
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

  const endTime = performance.now();
  console.log(`[Supabase API] ✓ Fetched ${cities.length} cities in ${(endTime - startTime).toFixed(2)}ms`);
  console.log('[Supabase API] Cities data:', cities.map(c => ({ slug: c.slug, status: c.status })));

  return cities;
}

export async function getTours(citySlug?: string): Promise<Tour[]> {
  console.log(`[Supabase API] Fetching tours${citySlug ? ` for city: ${citySlug}` : ' (all cities)'}...`);
  const startTime = performance.now();

  let query = supabase.from('tours').select('*');

  if (citySlug) {
    query = query.eq('city_slug', citySlug);
  }

  const { data, error } = await query.order('slug');

  if (error) {
    console.error('[Supabase API] ❌ Error fetching tours:', error);
    throw error;
  }

  const tours = (data || []).map((row: any) => ({
    id: row.id,
    citySlug: row.city_slug,
    slug: row.slug,
    title: {
      nl: row.title_nl,
      en: row.title_en,
      fr: row.title_fr,
      de: row.title_de,
    },
    price: row.price,
    badge: row.badge,
    shortDescription: {
      nl: row.short_description_nl,
      en: row.short_description_en,
      fr: row.short_description_fr,
      de: row.short_description_de,
    },
    description: row.description_nl ? {
      nl: row.description_nl,
      en: row.description_en,
      fr: row.description_fr,
      de: row.description_de,
    } : undefined,
    thumbnail: row.thumbnail,
    images: row.images || [],
    details: row.details,
  }));

  const endTime = performance.now();
  console.log(`[Supabase API] ✓ Fetched ${tours.length} tours in ${(endTime - startTime).toFixed(2)}ms`);
  if (citySlug) {
    console.log(`[Supabase API] Tours for ${citySlug}:`, tours.map(t => t.slug));
  }

  return tours;
}

export async function getTourBySlug(citySlug: string, slug: string): Promise<Tour | null> {
  console.log(`[Supabase API] Fetching tour: ${citySlug}/${slug}`);
  const startTime = performance.now();

  const { data, error } = await supabase
    .from('tours')
    .select('*')
    .eq('city_slug', citySlug)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('[Supabase API] ❌ Error fetching tour:', error);
    throw error;
  }

  if (!data) {
    console.warn(`[Supabase API] ⚠ Tour not found: ${citySlug}/${slug}`);
    return null;
  }

  const endTime = performance.now();
  console.log(`[Supabase API] ✓ Fetched tour in ${(endTime - startTime).toFixed(2)}ms`);

  return {
    id: data.id,
    citySlug: data.city_slug,
    slug: data.slug,
    title: {
      nl: data.title_nl,
      en: data.title_en,
      fr: data.title_fr,
      de: data.title_de,
    },
    price: data.price,
    badge: data.badge,
    shortDescription: {
      nl: data.short_description_nl,
      en: data.short_description_en,
      fr: data.short_description_fr,
      de: data.short_description_de,
    },
    description: data.description_nl ? {
      nl: data.description_nl,
      en: data.description_en,
      fr: data.description_fr,
      de: data.description_de,
    } : undefined,
    thumbnail: data.thumbnail,
    images: data.images || [],
    details: data.details,
  };
}

export async function getProducts(): Promise<Product[]> {
  console.log('[Supabase API] Fetching products...');
  const startTime = performance.now();

  const { data, error } = await supabase
    .from('webshop_data')
    .select('*');
  if (error) {
    console.error('[Supabase API] ❌ Error fetching products:', error);
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

  const endTime = performance.now();
  console.log(`[Supabase API] ✓ Fetched ${products.length} products in ${(endTime - startTime).toFixed(2)}ms`);
  console.log('[Supabase API] Products by category:', products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>));

  return products;
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  console.log('[Supabase API] Fetching blog posts...');
  const startTime = performance.now();

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('[Supabase API] ❌ Error fetching blog posts:', error);
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

  const endTime = performance.now();
  console.log(`[Supabase API] ✓ Fetched ${posts.length} blog posts in ${(endTime - startTime).toFixed(2)}ms`);

  return posts;
}

export async function getPressLinks(): Promise<PressLink[]> {
  console.log('[Supabase API] Fetching press links...');
  const startTime = performance.now();

  const { data, error } = await supabase
    .from('press_links')
    .select('*')
    .order('sort_order');

  if (error) {
    console.error('[Supabase API] ❌ Error fetching press links:', error);
    throw error;
  }

  const links = (data || []).map((row: any) => ({
    name: row.name,
    url: row.url,
    logo: row.logo,
  }));

  const endTime = performance.now();
  console.log(`[Supabase API] ✓ Fetched ${links.length} press links in ${(endTime - startTime).toFixed(2)}ms`);

  return links;
}

export async function getFaqItems(): Promise<FaqItem[]> {
  console.log('[Supabase API] Fetching FAQ items...');
  const startTime = performance.now();

  const { data, error } = await supabase
    .from('faq_items')
    .select('*')
    .order('sort_order');

  if (error) {
    console.error('[Supabase API] ❌ Error fetching FAQ items:', error);
    throw error;
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

  const endTime = performance.now();
  console.log(`[Supabase API] ✓ Fetched ${items.length} FAQ items in ${(endTime - startTime).toFixed(2)}ms`);

  return items;
}
