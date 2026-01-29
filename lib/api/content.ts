import { supabaseServer } from '@/lib/supabase/server';
import type { Locale, City, Tour, Product, FaqItem, PressLink, ProductImage, TourImage, Lecture, LectureImage, LectureBooking, Press, NewsletterSubscription, Blog, BlogImage, TourTypeEntry } from '@/lib/data/types';
import { PREDEFINED_TOUR_TYPES } from '@/lib/data/types';
import { buildLocalizedRecord } from '@/lib/utils';
import { toBrusselsISO, parseBrusselsDateTime } from '@/lib/utils/timezone';

export type LocalTourBooking = {
  id: string;
  tour_id: string;
  booking_date: string; // ISO date string
  booking_time: string; // Time string (HH:mm:ss)
  is_booked: boolean;
  user_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  stripe_session_id?: string;
  booking_id?: number; // Reference to tourbooking.id (parent booking)
  status: 'available' | 'booked' | 'cancelled';
  number_of_people?: number; // Total number of people signed up for this slot (calculated)
  amnt_of_people?: number; // Number of people for this specific booking
  created_at?: string;
  updated_at?: string;
};

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

/**
 * Parse tour_types from database with fallback to legacy type field
 * Returns array of TourTypeEntry (predefined keys or custom objects)
 */
const parseTourTypes = (tourTypes: any, legacyType: string | null): TourTypeEntry[] => {
  // Try to use new tour_types field first
  if (tourTypes && Array.isArray(tourTypes) && tourTypes.length > 0) {
    return tourTypes;
  }

  // Fallback to legacy type field
  if (legacyType && typeof legacyType === 'string' && legacyType.trim()) {
    const normalizedType = legacyType.toLowerCase().trim();
    // Check if it's a predefined type
    if (PREDEFINED_TOUR_TYPES.includes(normalizedType as any)) {
      return [normalizedType];
    }
    // It's a custom type - store as multilingual object
    return [{ nl: legacyType, en: legacyType, fr: legacyType, de: legacyType }];
  }

  return [];
};


/**
 * Get all cities from the cities table, ordered by display_order.
 * IMPORTANT: This fetches from the cities table ONLY, not from tours_table_prod.
 * The order comes from cities.display_order, ensuring consistent ordering across the app.
 */
export async function getCities(): Promise<City[]> {
  // SELECT specific fields FROM cities ORDER BY cities.display_order
  // Using explicit field selection instead of * to ensure correct ordering
  // Cache is always cleared - this function always fetches fresh data from the database
  const { data, error } = await supabaseServer
    .from('cities')
    .select('id, slug, name_nl, name_en, name_fr, name_de, teaser_nl, teaser_en, teaser_fr, teaser_de, cta_text_nl, cta_text_en, cta_text_fr, cta_text_de, coming_soon_text_nl, coming_soon_text_en, coming_soon_text_fr, coming_soon_text_de, image, status, display_order')
    .neq('status', 'draft') // Filter out draft cities from public view
    .order('display_order', { ascending: true });

  if (error) {
    throw error;
  }

  // Log raw data from database to compare with SQL editor
  // This will show exactly what Supabase is returning
  console.log('[getCities] Raw data from Supabase query (ALL FIELDS):', 
    JSON.stringify((data || []).map((row: any) => ({ 
      id: row.id,
      slug: row.slug, 
      name_nl: row.name_nl,
      display_order: row.display_order,
      display_order_type: typeof row.display_order,
      created_at: row.created_at
    })), null, 2)
  );
  
  // Also log in the same format as SQL editor for easy comparison
  console.log('[getCities] Cities in query order:', 
    (data || []).map((row: any) => ({ 
      slug: row.slug, 
      name_nl: row.name_nl,
      display_order: row.display_order
    }))
  );

  const citiesFromDb = (data || []).map((row: any) => ({
    id: row.id,
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
    comingSoonText: row.coming_soon_text_nl ? {
      nl: row.coming_soon_text_nl,
      en: row.coming_soon_text_en,
      fr: row.coming_soon_text_fr,
      de: row.coming_soon_text_de,
    } : undefined,
    image: row.image,
    status: row.status,
    displayOrder: row.display_order,
  }));

  // Return cities in database query order (already sorted by display_order)
  return citiesFromDb;
}

export async function getTours(citySlug?: string): Promise<Tour[]> {
  // Fetch tours with city_id JOIN to link by ID instead of name matching
  // Order by city_id, then display_order (NULLS LAST), then created_at for consistent ordering
  const { data, error } = await supabaseServer
    .from('tours_table_prod')
    .select(`
      *,
      cities:city_id (
        id,
        slug,
        name_nl,
        name_en,
        name_fr,
        name_de
      )
    `)
    .eq('status', 'published') // Only show published tours on public site
    .order('city_id', { ascending: true, nullsFirst: false })
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });
  
  if (error) {
    throw error;
  }

  // Fetch cities table to create a map of city IDs to slugs (for filtering)
  const { data: citiesData } = await supabaseServer
    .from('cities')
    .select('id, slug');
  
  const cityIdToSlugMap: Map<string, string> = new Map();
  if (citiesData) {
    citiesData.forEach((city: any) => {
      cityIdToSlugMap.set(city.id, city.slug);
    });
  }

  // Fetch tour images to get primary images
  const tourImagesMap = await getTourImages();

  const tours = (data || []).map((row: any): Tour => {
    // Get city_id from the tour row (prefer direct column, then from JOIN)
    const cityId = row.city_id || row.cities?.id;
    const cityData = row.cities;
    
    // Determine city slug: use from JOIN if available, otherwise fallback to old logic
    let tourCitySlug: string;
    if (cityData && cityData.slug) {
      tourCitySlug = cityData.slug;
    } else if (cityId && cityIdToSlugMap.has(cityId)) {
      tourCitySlug = cityIdToSlugMap.get(cityId)!;
    } else {
      // Fallback: try to match by city name (old logic for backward compatibility)
      const matchedCitySlug = cityIdToSlugMap.get(row.city);
      if (matchedCitySlug) {
        tourCitySlug = matchedCitySlug;
      } else {
        tourCitySlug = citySlugify(row.city);
      }
    }

    // Get tour images for this tour
    const tourImages = tourImagesMap[row.id] || [];
    // Find primary image first, then fall back to first image, then undefined
    const primaryImage = tourImages.length > 0 
      ? (tourImages.find((img) => img.is_primary) || tourImages[0])
      : null;
    const imageUrl = primaryImage?.image_url || undefined;
    // Detect primary media type - default to 'image' if not specified
    const primaryMediaType = primaryImage?.media_type || 'image';

    return {
      id: row.id,
      city: tourCitySlug, // Keep city slug for backward compatibility
      cityId: cityId || undefined, // Primary way to link tours to cities
      slug: slugify(row.title),
      title: row.title,
      type: row.type, // Deprecated: kept for backward compatibility
      tour_types: parseTourTypes(row.tour_types, row.type), // New: with fallback to legacy type
      durationMinutes: row.duration_minutes,
      price: row.price ? Number(row.price) : undefined,
      startLocation: row.start_location,
      endLocation: row.end_location,
      languages: row.languages || [],
      description: row.description,
      description_en: row.description_en,
      description_fr: row.description_fr,
      description_de: row.description_de,
      notes: row.notes,
      op_maat: row.op_maat === true || row.op_maat === 'true' || row.op_maat === 1,
      local_stories: row.local_stories === true || row.local_stories === 'true' || row.local_stories === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      image: imageUrl, // Use primary image from database if available
      primaryMediaType: primaryMediaType, // Type of primary media (image or video)
      tourImages: tourImages.length > 0 ? tourImages : undefined,
      displayOrder: row.display_order ? Number(row.display_order) : undefined,
      themes: Array.isArray(row.themes) ? row.themes : undefined,
      options: row.options,
    };
  });

  // Filter by city slug if provided (convert slug to city ID for accurate matching)
  let filteredTours = tours;
  if (citySlug) {
    // Find city ID from slug
    const cityId = Array.from(cityIdToSlugMap.entries()).find(([_, slug]) => slug === citySlug)?.[0];

    // Filter by cityId (primary) OR by city slug (for tours without city_id set)
    filteredTours = tours.filter(t => {
      // Primary: match by cityId
      if (cityId && t.cityId === cityId) {
        return true;
      }
      // Fallback: match by city slug (for tours without city_id)
      if (!t.cityId && t.city === citySlug) {
        return true;
      }
      return false;
    });
  }

  return filteredTours;
}

export async function getTourBySlug(citySlug: string, slug: string): Promise<Tour | null> {
  // First, find the city ID from the city slug
  const { data: cityData } = await supabaseServer
    .from('cities')
    .select('id, slug')
    .eq('slug', citySlug)
    .single();

  // Fetch tours with city_id JOIN to link by ID
  const { data, error } = await supabaseServer
    .from('tours_table_prod')
    .select(`
      *,
      cities:city_id (
        id,
        slug
      )
    `)
    .eq('status', 'published'); // Only show published tours on public site

  if (error) {
    console.error('[getTourBySlug] Database error:', error);
    throw error;
  }

  // Find matching tour by city_id (if city found) or city slug, and generated slug
  const matchingTour = (data || []).find((row: any) => {
    const rowSlug = slugify(row.title);
    const slugMatches = rowSlug === slug;
    
    if (!slugMatches) return false;
    
    // If we found the city by slug, match by city_id (primary method)
    if (cityData && row.city_id === cityData.id) {
      return true;
    }
    
    // Fallback: match by city slug from JOIN or from old city field
    const tourCitySlug = row.cities?.slug || citySlugify(row.city);
    return tourCitySlug === citySlug;
  });

  if (!matchingTour) {
    console.warn('[getTourBySlug] No matching tour found:', {
      citySlug,
      slug,
      cityId: cityData?.id,
    });
    return null;
  }

  // Fetch tour images for this specific tour
  const tourImagesMap = await getTourImages();
  const tourImages = tourImagesMap[matchingTour.id] || [];
  // Find primary image first, then fall back to first image, then undefined
  const primaryImage = tourImages.length > 0 
    ? (tourImages.find((img) => img.is_primary) || tourImages[0])
    : null;
  const imageUrl = primaryImage?.image_url || undefined;
  // Detect primary media type - default to 'image' if not specified
  const primaryMediaType = primaryImage?.media_type || 'image';

  const localStoriesValue = matchingTour.local_stories === true || matchingTour.local_stories === 'true' || matchingTour.local_stories === 1;
  
  console.log('getTourBySlug: Raw matching tour data:', {
    id: matchingTour.id,
    title: matchingTour.title,
    city_id: matchingTour.city_id,
    local_stories_raw: matchingTour.local_stories,
    local_stories_type: typeof matchingTour.local_stories,
    local_stories_processed: localStoriesValue,
    op_maat: matchingTour.op_maat,
    allColumns: Object.keys(matchingTour),
  });

  // Determine the correct city slug for the return value
  const finalCitySlug = matchingTour.cities?.slug || citySlugify(matchingTour.city);

  return {
    id: matchingTour.id,
    city: finalCitySlug,
    cityId: matchingTour.city_id || undefined,
    slug: slugify(matchingTour.title),
    title: matchingTour.title,
    type: matchingTour.type, // Deprecated: kept for backward compatibility
    tour_types: parseTourTypes(matchingTour.tour_types, matchingTour.type), // New: with fallback to legacy type
    durationMinutes: matchingTour.duration_minutes,
    price: matchingTour.price ? Number(matchingTour.price) : undefined,
    startLocation: matchingTour.start_location,
    endLocation: matchingTour.end_location,
    languages: matchingTour.languages || [],
    description: matchingTour.description,
    description_en: matchingTour.description_en,
    description_fr: matchingTour.description_fr,
    description_de: matchingTour.description_de,
    notes: matchingTour.notes,
    op_maat: matchingTour.op_maat === true || matchingTour.op_maat === 'true' || matchingTour.op_maat === 1,
    local_stories: localStoriesValue,
    createdAt: matchingTour.created_at,
    updatedAt: matchingTour.updated_at,
    image: imageUrl, // Use primary image from database if available
    primaryMediaType: primaryMediaType, // Type of primary media (image or video)
    tourImages: tourImages.length > 0 ? tourImages : undefined,
    themes: Array.isArray(matchingTour.themes) ? matchingTour.themes : undefined,
    options: matchingTour.options,
  };
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabaseServer
    .from('webshop_data')
    .select('*')
    .eq('status', 'published')
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('category_display_order', { ascending: true, nullsFirst: false })
    .order('Name', { ascending: true });
  if (error) {
    throw error;
  }

  // Fetch product images to get primary images
  const productImagesMap = await getProductImages();

  const categoryOptions: Product['category'][] = ['Book', 'Merchandise', 'Game', 'GiftCard'];

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
    const stripeProductId = typeof row.stripe_product_id === 'string' ? row.stripe_product_id : undefined;
    const isGiftcard = row.is_giftcard === true;

    // Build localized records with fallback logic (NL->NL, EN->EN/NL, FR->FR/EN/NL, DE->DE/EN/NL)
    const titleRecord = buildLocalizedRecord({
      nl: rawName,
      en: row.name_en,
      fr: row.name_fr,
      de: row.name_de,
    });

    const descriptionRecord = buildLocalizedRecord({
      nl: description,
      en: row.description_en,
      fr: row.description_fr,
      de: row.description_de,
    });

    const additionalInfoRecord = additionalInfo || row.additional_info_en || row.additional_info_fr || row.additional_info_de
      ? buildLocalizedRecord({
          nl: additionalInfo,
          en: row.additional_info_en,
          fr: row.additional_info_fr,
          de: row.additional_info_de,
        })
      : undefined;

    // Get primary image from product_images if available
    const productImages = productImagesMap[row.uuid] || [];
    // Find primary image first, then fall back to first image, then undefined
    const primaryImage = productImages.length > 0
      ? (productImages.find((img) => img.is_primary) || productImages[0])
      : null;
    const imageUrl = primaryImage?.image_url || undefined;
    const primaryMediaType = primaryImage?.media_type || 'image';

    return {
      slug,
      uuid: row.uuid,
      title: titleRecord,
      category,
      price,
      description: descriptionRecord,
      additionalInfo: additionalInfoRecord,
      label: undefined,
      image: imageUrl, // Use primary image from database if available
      primaryMediaType, // Type of primary media (image or video)
      displayOrder: typeof row.display_order === 'number' ? row.display_order : undefined,
      categoryDisplayOrder: typeof row.category_display_order === 'number' ? row.category_display_order : undefined,
      stripe_product_id: stripeProductId,
      is_giftcard: isGiftcard,
    } satisfies Product;
  });

  return products;
}

export async function getProductById(uuid: string): Promise<Product | null> {
  const { data, error } = await supabaseServer
    .from('webshop_data')
    .select('*')
    .eq('uuid', uuid)
    .eq('status', 'published')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('[getProductById] Database error:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  // Fetch product images to get primary images
  const productImagesMap = await getProductImages();

  const categoryOptions: Product['category'][] = ['Book', 'Merchandise', 'Game', 'GiftCard'];

  const row = data;
  const rawName = typeof row.Name === 'string' ? row.Name.trim() : '';
  const productSlug = rawName ? slugify(rawName) : row.uuid;
  const price = parseNumber(row['Price (EUR)']) ?? 0;
  const categoryValue = typeof row.Category === 'string' ? row.Category.trim() : '';
  const category = (categoryOptions.includes(categoryValue as Product['category'])
    ? categoryValue
    : 'Book') as Product['category'];
  const description = typeof row.Description === 'string' ? row.Description.trim() : '';
  const additionalInfo = typeof row['Additional Info'] === 'string' ? row['Additional Info'].trim() : '';
  const stripeProductId = typeof row.stripe_product_id === 'string' ? row.stripe_product_id : undefined;
  const isGiftcard = row.is_giftcard === true;

  // Build localized records with fallback logic (NL->NL, EN->EN/NL, FR->FR/EN/NL, DE->DE/EN/NL)
  const titleRecord = buildLocalizedRecord({
    nl: rawName,
    en: row.name_en,
    fr: row.name_fr,
    de: row.name_de,
  });

  const descriptionRecord = buildLocalizedRecord({
    nl: description,
    en: row.description_en,
    fr: row.description_fr,
    de: row.description_de,
  });

  const additionalInfoRecord = additionalInfo || row.additional_info_en || row.additional_info_fr || row.additional_info_de
    ? buildLocalizedRecord({
        nl: additionalInfo,
        en: row.additional_info_en,
        fr: row.additional_info_fr,
        de: row.additional_info_de,
      })
    : undefined;

  // Get primary image from product_images if available
  const productImages = productImagesMap[row.uuid] || [];
  // Find primary image first, then fall back to first image, then undefined
  const primaryImage = productImages.length > 0
    ? (productImages.find((img) => img.is_primary) || productImages[0])
    : null;
  const imageUrl = primaryImage?.image_url || undefined;
  const primaryMediaType = primaryImage?.media_type || 'image';

  return {
    slug: productSlug,
    uuid: row.uuid,
    title: titleRecord,
    category,
    price,
    description: descriptionRecord,
    additionalInfo: additionalInfoRecord,
    label: undefined,
    image: imageUrl,
    primaryMediaType, // Type of primary media (image or video)
    displayOrder: typeof row.display_order === 'number' ? row.display_order : undefined,
    categoryDisplayOrder: typeof row.category_display_order === 'number' ? row.category_display_order : undefined,
    stripe_product_id: stripeProductId,
    is_giftcard: isGiftcard,
  } satisfies Product;
}

// Legacy function - kept for backward compatibility but not used
// Use getBlogs() instead for the new blogs table
// export async function getBlogPosts(): Promise<BlogPost[]> {
//   const { data, error } = await supabaseServer
//     .from('blog_posts')
//     .select('*')
//     .order('date', { ascending: false });
//
//   if (error) {
//     throw error;
//   }
//
//   const posts = (data || []).map((row: any) => ({
//     slug: row.slug,
//     title: {
//       nl: row.title_nl,
//       en: row.title_en,
//       fr: row.title_fr,
//       de: row.title_de,
//     },
//     excerpt: {
//       nl: row.excerpt_nl,
//       en: row.excerpt_en,
//       fr: row.excerpt_fr,
//       de: row.excerpt_de,
//     },
//     date: row.date,
//   }));
//
//   return posts;
// }

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

export async function getProductImages(): Promise<Record<string, ProductImage[]>> {
  try {
    // Fetch from webshop_data table, extracting product_images JSONB column
    const { data, error } = await supabaseServer
      .from('webshop_data')
      .select('uuid, product_images');

    if (error) {
      // If column doesn't exist, return empty map (graceful degradation)
      if (error.message?.includes('does not exist') || 
          error.message?.includes('column') ||
          error.code === '42703') {
        console.warn('product_images column does not exist in webshop_data. Please add it via migration.');
        return {};
      }
      console.error('Error fetching product images:', error);
      return {};
    }

    const imagesMap: Record<string, ProductImage[]> = {};
    (data || []).forEach((row: any) => {
      const productUuid = row.uuid;
      const imagesJson = row.product_images;

      if (imagesJson && Array.isArray(imagesJson)) {
        imagesMap[productUuid] = imagesJson
          .map((img: any, index: number) => {
            // Get URL from either field name
            const rawUrl = img.url || img.image_url;
            // Validate URL - filter out invalid values like "undefined", "null", empty strings
            const imageUrl = rawUrl && typeof rawUrl === 'string' && rawUrl.trim() !== '' && rawUrl !== 'undefined' && rawUrl !== 'null'
              ? rawUrl.trim()
              : null;

            return {
              id: img.id || `${productUuid}-${index}`,
              product_uuid: productUuid,
              image_url: imageUrl,
              is_primary: img.is_primary || false,
              sort_order: img.sort_order !== undefined ? img.sort_order : index,
              media_type: img.media_type || 'image', // Default to 'image' for backward compatibility
              storage_folder_name: img.storage_folder_name || undefined,
              created_at: img.created_at,
              updated_at: img.updated_at,
            };
          })
          // Filter out images with invalid URLs and narrow the type
          .filter((img): img is typeof img & { image_url: string } => img.image_url !== null)
          .sort((a, b) => a.sort_order - b.sort_order);
      } else {
        imagesMap[productUuid] = [];
      }
    });

    return imagesMap;
  } catch (err) {
    console.error('Exception fetching product images:', err);
    return {};
  }
}

export async function getTourImages(): Promise<Record<string, TourImage[]>> {
  try {
    // Fetch from tours_table_prod table, extracting tour_images JSONB column
    const { data, error } = await supabaseServer
      .from('tours_table_prod')
      .select('id, tour_images');

    if (error) {
      // If column doesn't exist, return empty map (graceful degradation)
      if (error.message?.includes('does not exist') || 
          error.message?.includes('column') ||
          error.code === '42703') {
        console.warn('tour_images column does not exist in tours_table_prod. Please add it via migration.');
        return {};
      }
      console.error('Error fetching tour images:', error);
      return {};
    }

    const imagesMap: Record<string, TourImage[]> = {};
    (data || []).forEach((row: any) => {
      const tourId = row.id;
      const imagesJson = row.tour_images;
      
      if (imagesJson && Array.isArray(imagesJson)) {
        imagesMap[tourId] = imagesJson.map((img: any, index: number) => ({
          id: img.id || `${tourId}-${index}`, // Generate ID if not present
          tour_id: tourId,
          image_url: img.url || img.image_url,
          is_primary: img.is_primary || false,
          sort_order: img.sort_order !== undefined ? img.sort_order : index,
          media_type: img.media_type || 'image', // Default to 'image' for backward compatibility
          storage_folder_name: img.storage_folder_name || undefined,
          created_at: img.created_at,
          updated_at: img.updated_at,
        })).sort((a, b) => a.sort_order - b.sort_order);
      } else {
        imagesMap[tourId] = [];
      }
    });

    return imagesMap;
  } catch (err) {
    console.error('Exception fetching tour images:', err);
    return {};
  }
}


export async function getLectures(): Promise<Lecture[]> {
  try {
    const { data, error } = await supabaseServer
      .from('lectures')
      .select('*')
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      // If table doesn't exist, return empty array (graceful degradation)
      if (error.message?.includes('does not exist') || 
          error.message?.includes('column') ||
          error.code === '42703' || error.code === '42P01') {
        console.warn('lectures table does not exist. Please run migration to create lectures table.');
        return [];
      }
      console.error('Error fetching lectures:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const lectures: Lecture[] = (data || []).map((row: any) => {
      // Parse lecture_images JSONB column
      let lectureImages: LectureImage[] = [];
      if (row.lecture_images && Array.isArray(row.lecture_images)) {
        lectureImages = row.lecture_images.map((img: any, index: number) => ({
          id: img.id || `${row.id}-${index}`,
          lecture_id: row.id,
          image_url: img.image_url || img.url || '',
          is_primary: img.is_primary || false,
          sort_order: img.sort_order !== undefined ? img.sort_order : index,
          storage_folder_name: img.storage_folder_name || undefined,
          created_at: img.created_at,
          updated_at: img.updated_at,
        })).sort((a: LectureImage, b: LectureImage) => a.sort_order - b.sort_order);
      }

      return {
        id: row.id,
        title: row.title || '',
        title_en: row.title_en || undefined,
        date: row.date || undefined,
        date_en: row.date_en || undefined,
        location: row.location || undefined,
        location_en: row.location_en || undefined,
        group_size: row.group_size || undefined,
        group_size_en: row.group_size_en || undefined,
        description1: row.description1 || undefined,
        description1_en: row.description1_en || undefined,
        description2: row.description2 || undefined,
        description2_en: row.description2_en || undefined,
        description: row.description || undefined,
        description_en: row.description_en || undefined,
        image: row.image_url || undefined, // Primary image URL from image_url column
        lectureImages: lectureImages.length > 0 ? lectureImages : undefined,
        display_order: row.display_order !== null && row.display_order !== undefined ? Number(row.display_order) : undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    return lectures;
  } catch (err) {
    console.error('Exception fetching lectures:', err);
    return [];
  }
}

export async function getPressItems(): Promise<Press[]> {
  try {
    const { data, error } = await supabaseServer
      .from('press')
      .select('*')
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      // If table doesn't exist, return empty array (graceful degradation)
      if (error.message?.includes('does not exist') || 
          error.message?.includes('column') ||
          error.code === '42703' || error.code === '42P01') {
        console.warn('press table does not exist. Please run migration to create press table.');
        return [];
      }
      console.error('Error fetching press items:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const pressItems: Press[] = (data || []).map((row: any) => ({
      id: row.id,
      image_url: row.image_url || '',
      article_url: row.article_url || '',
      display_order: row.display_order !== null && row.display_order !== undefined ? Number(row.display_order) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return pressItems;
  } catch (err) {
    console.error('Exception fetching press items:', err);
    return [];
  }
}

export async function createNewsletterSubscription(
  subscription: Omit<NewsletterSubscription, 'id' | 'created_at' | 'updated_at'>
): Promise<NewsletterSubscription> {
  try {
    // Validate email format
    if (!subscription.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subscription.email)) {
      throw new Error('Invalid email format');
    }

    // Validate consent is given
    if (!subscription.consent_given) {
      throw new Error('Consent must be given to subscribe');
    }

    // Check if email already exists
    const { data: existing } = await supabaseServer
      .from('newsletter_subscriptions')
      .select('id')
      .eq('email', subscription.email.toLowerCase().trim())
      .single();

    if (existing) {
      throw new Error('This email is already subscribed');
    }

    const { data, error } = await supabaseServer
      .from('newsletter_subscriptions')
      .insert([{
        email: subscription.email.toLowerCase().trim(),
        first_name: subscription.first_name || null,
        last_name: subscription.last_name || null,
        consent_given: subscription.consent_given,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating newsletter subscription:', error);
      // Handle unique constraint violation
      if (error.code === '23505') {
        throw new Error('This email is already subscribed');
      }
      throw error;
    }

    return {
      id: data.id,
      email: data.email,
      first_name: data.first_name || undefined,
      last_name: data.last_name || undefined,
      consent_given: data.consent_given,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (err) {
    console.error('Exception creating newsletter subscription:', err);
    throw err;
  }
}

export async function createLectureBooking(booking: Omit<LectureBooking, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<LectureBooking> {
  try {
    // Validate that at least one of phone or email is provided
    if (!booking.phone && !booking.email) {
      throw new Error('At least one of phone or email must be provided');
    }

    // Validate email format if provided
    if (booking.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.email)) {
      throw new Error('Invalid email format');
    }

    const { data, error } = await supabaseServer
      .from('lecture_bookings')
      .insert([{
        lecture_id: booking.lecture_id || null,
        name: booking.name,
        phone: booking.phone || null,
        email: booking.email || null,
        preferred_date: booking.preferred_date || null,
        number_of_people: booking.number_of_people || null,
        location_description: booking.location_description || null,
        needs_room_provided: booking.needs_room_provided || false,
        lecture_language: (booking as any).lecture_language || null,
        status: 'pending',
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating lecture booking:', error);
      throw error;
    }

    return {
      id: data.id,
      lecture_id: data.lecture_id || undefined,
      name: data.name,
      phone: data.phone || undefined,
      email: data.email || undefined,
      preferred_date: data.preferred_date || undefined,
      number_of_people: data.number_of_people || undefined,
      location_description: data.location_description || undefined,
      needs_room_provided: data.needs_room_provided,
      lecture_language: data.lecture_language || undefined,
      status: data.status as 'pending' | 'confirmed' | 'cancelled',
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (err) {
    console.error('Exception creating lecture booking:', err);
    throw err;
  }
}

export async function getFaqItems(): Promise<FaqItem[]> {
  try {
    // Try both table name variations (case-insensitive in PostgreSQL, but be explicit)
    let { data, error } = await supabaseServer
      .from('faq_items')
      .select('*')
      .order('sort_order', { ascending: true, nullsFirst: false });

    // If faq_items doesn't work, try FAQ_ITEMS
    if (error && error.message?.includes('does not exist')) {
      const result = await supabaseServer
        .from('FAQ_ITEMS')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false });
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error fetching FAQ items:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn('No FAQ items found in database');
      return [];
    }

    const items = (data || []).map((row: any) => ({
      question: {
        nl: row.question_nl || row.question_NL || '',
        en: row.question_en || row.question_EN || row.question_nl || row.question_NL || '',
        fr: row.question_fr || row.question_FR || row.question_nl || row.question_NL || '',
        de: row.question_de || row.question_DE || row.question_nl || row.question_NL || '',
      },
      answer: {
        nl: row.answer_nl || row.answer_NL || '',
        en: row.answer_en || row.answer_EN || row.answer_nl || row.answer_NL || '',
        fr: row.answer_fr || row.answer_FR || row.answer_nl || row.answer_NL || '',
        de: row.answer_de || row.answer_DE || row.answer_nl || row.answer_NL || '',
      },
    })).filter(item => item.question.nl || item.question.en); // Filter out empty items

    return items;
  } catch (err) {
    console.error('Exception fetching FAQ items:', err);
    return [];
  }
}

/**
 * Get the next available Saturdays for local tours bookings
 * Local stories tours happen every Saturday at 2 PM Brussels time
 */
function getNextSaturdays(count: number = 8): Date[] {
  const saturdays: Date[] = [];
  const today = new Date();

  // Find the next Saturday (in Brussels timezone)
  const brusselsFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
    weekday: 'short',
  });
  const brusselsDay = brusselsFormatter.format(today);
  const dayMap: { [key: string]: number } = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const currentDayNum = dayMap[brusselsDay] ?? today.getDay();

  const daysUntilSaturday = (6 - currentDayNum + 7) % 7 || 7;

  for (let i = 0; i < count; i++) {
    // Calculate the date for this Saturday
    const saturdayDate = new Date(today);
    saturdayDate.setDate(today.getDate() + daysUntilSaturday + (i * 7));

    // Get the date string in Brussels timezone
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Brussels',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const dateStr = dateFormatter.format(saturdayDate);

    // Create a Date for Saturday at 14:00 Brussels time
    const saturday = parseBrusselsDateTime(dateStr, '14:00');
    saturdays.push(saturday);
  }

  return saturdays;
}

/**
 * Get local tours bookings for a specific tour
 * Returns availability for the next 9 months of Saturdays
 * Automatically creates bookings for upcoming Saturdays if they don't exist (with 0 people, status 'booked')
 */
export async function getLocalToursBookings(tourId: string): Promise<LocalTourBooking[]> {
  console.log('getLocalToursBookings called for tourId:', tourId);
  try {
    // Get the next 9 months of Saturdays (matching frontend)
    // Calculate how many Saturdays are in 9 months (~40 Saturdays)
    const saturdayDateObjects = getNextSaturdays(40);
    
    // Extract date strings in YYYY-MM-DD format from Brussels timezone
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Brussels',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const nextSaturdays: Date[] = [];
    const saturdayDates: string[] = [];
    
    // Calculate 9 months from now
    const today = new Date();
    const nineMonthsFromNow = new Date(today);
    nineMonthsFromNow.setMonth(today.getMonth() + 9);
    
    for (const saturdayDate of saturdayDateObjects) {
      // Check if we've exceeded 9 months
      if (saturdayDate > nineMonthsFromNow) {
        break;
      }
      
      // Get the date string in Brussels timezone (YYYY-MM-DD format)
      const dateStr = dateFormatter.format(saturdayDate);
      
      nextSaturdays.push(saturdayDate);
      saturdayDates.push(dateStr);
    }
    
    console.log('getLocalToursBookings: Next Saturdays (9 months):', saturdayDates);
    
    // Fetch existing bookings for these dates
    
    console.log('getLocalToursBookings: Fetching existing bookings for dates:', saturdayDates);
    const { data: existingBookings, error } = await supabaseServer
      .from('local_tours_bookings')
      .select('*')
      .eq('tour_id', tourId)
      .in('booking_date', saturdayDates)
      .order('booking_date', { ascending: true });
    
    console.log('getLocalToursBookings: Supabase query result:', {
      existingBookingsCount: existingBookings?.length || 0,
      existingBookings,
      error,
    });
    
    if (error) {
      console.error('Error fetching local tours bookings:', error);
      return [];
    }
    
    // Also fetch tourbookings for this tour to get accurate people counts from invitees
    // Query all completed bookings for this tour and filter by date in JavaScript
    const { data: tourBookings, error: tourBookingsError } = await supabaseServer
      .from('tourbooking')
      .select('id, tour_datetime, invitees')
      .eq('tour_id', tourId)
      .eq('status', 'payment_completed');
    
    console.log('getLocalToursBookings: Tourbookings query result:', {
      tourBookingsCount: tourBookings?.length || 0,
      tourBookings,
      error: tourBookingsError,
    });
    
    // Calculate number of people per date from local_tours_bookings (sum amnt_of_people for all rows per date)
    const peopleCountByDate = new Map<string, number>();

    (existingBookings || []).forEach((booking: any) => {
      const dateStr = booking.booking_date;
      const amntOfPeople = booking.amnt_of_people || 0;
      const currentCount = peopleCountByDate.get(dateStr) || 0;
      peopleCountByDate.set(dateStr, currentCount + amntOfPeople);
    });
    
    // Also calculate from tourbooking invitees as fallback/verification
    // This ensures we get accurate counts even if local_tours_bookings is missing data
    if (tourBookings && !tourBookingsError) {
      tourBookings.forEach((tb: any) => {
        const tourDatetime = tb.tour_datetime;
        if (tourDatetime && typeof tourDatetime === 'string') {
          // Extract date from tour_datetime (handle various formats: YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss, YYYY-MM-DDTHH:mm:ss+HH:mm)
          const dateMatch = tourDatetime.match(/^(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            const dateStr = dateMatch[1];
            if (saturdayDates.includes(dateStr)) {
              // Sum numberOfPeople from all invitees
              const invitees = Array.isArray(tb.invitees) ? tb.invitees : [];
              const totalPeople = invitees.reduce((sum: number, invitee: any) => {
                return sum + (invitee.numberOfPeople || 0);
              }, 0);
              
              // Use the higher count (either from local_tours_bookings or tourbooking)
              // This handles cases where local_tours_bookings might be missing or have incorrect data
              const currentCount = peopleCountByDate.get(dateStr) || 0;
              if (totalPeople > currentCount) {
                peopleCountByDate.set(dateStr, totalPeople);
                console.log(`getLocalToursBookings: Updated count for ${dateStr} from tourbooking invitees: ${totalPeople} (was ${currentCount})`);
              }
            }
          }
        }
      });
    }

    console.log('getLocalToursBookings: People count by date (from local_tours_bookings + tourbooking):', Array.from(peopleCountByDate.entries()));
    
    // Create a map of existing bookings by date
    const bookingsMap = new Map<string, LocalTourBooking>();
    
    // First, add entries from local_tours_bookings
    (existingBookings || []).forEach((booking: any) => {
      const dateStr = booking.booking_date;
      const numberOfPeople = peopleCountByDate.get(dateStr) || 0;
      
      // If multiple bookings exist for the same date, prioritize one with booking_id
      const existing = bookingsMap.get(dateStr);
      if (existing && !existing.booking_id && booking.booking_id) {
        // Replace existing entry with one that has booking_id
        bookingsMap.set(dateStr, {
          id: booking.id,
          tour_id: booking.tour_id,
          booking_date: dateStr,
          booking_time: booking.booking_time || '14:00:00',
          is_booked: booking.is_booked !== undefined ? booking.is_booked : true,
          user_id: booking.user_id,
          customer_name: booking.customer_name,
          customer_email: booking.customer_email,
          customer_phone: booking.customer_phone,
          stripe_session_id: booking.stripe_session_id,
          booking_id: booking.booking_id || undefined, // Reference to tourbooking.id
          status: booking.status || 'booked',
          number_of_people: numberOfPeople,
          created_at: booking.created_at,
          updated_at: booking.updated_at,
        });
      } else if (!existing) {
        // First booking for this date
        bookingsMap.set(dateStr, {
          id: booking.id,
          tour_id: booking.tour_id,
          booking_date: dateStr,
          booking_time: booking.booking_time || '14:00:00',
          is_booked: booking.is_booked !== undefined ? booking.is_booked : true, // Default to booked
          user_id: booking.user_id,
          customer_name: booking.customer_name,
          customer_email: booking.customer_email,
          customer_phone: booking.customer_phone,
          stripe_session_id: booking.stripe_session_id,
          booking_id: booking.booking_id || undefined, // Reference to tourbooking.id
          status: booking.status || 'booked', // Default to booked
          number_of_people: numberOfPeople,
          created_at: booking.created_at,
          updated_at: booking.updated_at,
        });
      }
      // If existing already has booking_id, keep it (don't replace)
    });
    
    // Also create entries from tourbookings if they don't exist in local_tours_bookings
    // This handles cases where local_tours_bookings entries weren't created
    // Also handles cases where dates might be off by a day due to timezone issues
    if (tourBookings && !tourBookingsError) {
      tourBookings.forEach((tb: any) => {
        const tourDatetime = tb.tour_datetime;
        if (tourDatetime && typeof tourDatetime === 'string') {
          const dateMatch = tourDatetime.match(/^(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            let dateStr = dateMatch[1];
            
            // If date is not in saturdayDates, try to find the nearest Saturday
            if (!saturdayDates.includes(dateStr)) {
              const [year, month, day] = dateStr.split('-').map(Number);
              const date = new Date(year, month - 1, day);
              const dayOfWeek = date.getDay();
              
              // If it's Friday (5), it might be a timezone issue - try Saturday
              if (dayOfWeek === 5) {
                const saturdayDate = new Date(date);
                saturdayDate.setDate(date.getDate() + 1);
                const satYear = saturdayDate.getFullYear();
                const satMonth = String(saturdayDate.getMonth() + 1).padStart(2, '0');
                const satDay = String(saturdayDate.getDate()).padStart(2, '0');
                const saturdayStr = `${satYear}-${satMonth}-${satDay}`;
                
                if (saturdayDates.includes(saturdayStr)) {
                  console.log(`getLocalToursBookings: Mapping Friday ${dateStr} to Saturday ${saturdayStr}`);
                  dateStr = saturdayStr;
                }
              }
              // If it's Sunday (0), try previous Saturday
              else if (dayOfWeek === 0) {
                const saturdayDate = new Date(date);
                saturdayDate.setDate(date.getDate() - 1);
                const satYear = saturdayDate.getFullYear();
                const satMonth = String(saturdayDate.getMonth() + 1).padStart(2, '0');
                const satDay = String(saturdayDate.getDate()).padStart(2, '0');
                const saturdayStr = `${satYear}-${satMonth}-${satDay}`;
                
                if (saturdayDates.includes(saturdayStr)) {
                  console.log(`getLocalToursBookings: Mapping Sunday ${dateStr} to Saturday ${saturdayStr}`);
                  dateStr = saturdayStr;
                }
              }
            }
            
            // Add if it's now a Saturday date and doesn't already exist
            if (saturdayDates.includes(dateStr) && !bookingsMap.has(dateStr)) {
              const invitees = Array.isArray(tb.invitees) ? tb.invitees : [];
              const totalPeople = invitees.reduce((sum: number, invitee: any) => {
                return sum + (invitee.numberOfPeople || 0);
              }, 0);
              
              // Extract time from tour_datetime (default to 14:00:00)
              let bookingTime = '14:00:00';
              const timeMatch = tourDatetime.match(/T(\d{2}:\d{2})/);
              if (timeMatch) {
                bookingTime = timeMatch[1] + ':00';
              }
              
              // Get first invitee for customer info
              const firstInvitee = invitees[0] || {};
              
              bookingsMap.set(dateStr, {
                id: `tourbooking-${tb.id}`,
                tour_id: tourId,
                booking_date: dateStr,
                booking_time: bookingTime,
                is_booked: true,
                status: 'booked' as const,
                user_id: undefined,
                customer_name: firstInvitee.name || undefined,
                customer_email: firstInvitee.email || undefined,
                customer_phone: firstInvitee.phone || undefined,
                stripe_session_id: undefined,
                booking_id: tb.id,
                number_of_people: totalPeople,
                amnt_of_people: totalPeople,
              });
              
              console.log(`getLocalToursBookings: Created booking entry from tourbooking ${tb.id} for date ${dateStr} with ${totalPeople} people`);
            }
          }
        }
      });
    }
    
    // Build bookings array - use existing entries or create virtual placeholders for display
    // NOTE: We no longer create placeholder entries in the database - they're only virtual for the UI
    // Real entries are created by the webhook when someone actually books
    const bookings: LocalTourBooking[] = saturdayDates.map(dateStr => {
      const existing = bookingsMap.get(dateStr);

      if (existing) {
        return existing;
      }

      // Get number of people for this date (from tourbooking invitees)
      const numberOfPeople = peopleCountByDate.get(dateStr) || 0;

      // Return virtual placeholder for display (not stored in database)
      return {
        id: `virtual-${dateStr}`,
        tour_id: tourId,
        booking_date: dateStr,
        booking_time: '14:00:00',
        is_booked: true, // Always show as bookable
        status: 'booked' as const,
        number_of_people: numberOfPeople,
      };
    });
    
    console.log('getLocalToursBookings: Final bookings to return:', {
      bookingsCount: bookings.length,
      bookings,
    });
    
    return bookings;
  } catch (err) {
    console.error('Error in getLocalToursBookings:', err);
    return [];
  }
}

/**
 * Get the parent booking (tourbooking) for a local tours booking slot
 * @param bookingId - The booking_id from local_tours_bookings
 * @returns The tourbooking entry or null if not found
 */
export async function getParentBooking(bookingId: number) {
  try {
    const { data, error } = await supabaseServer
      .from('tourbooking')
      .select('*')
      .eq('id', bookingId)
      .single();
    
    if (error) {
      console.error('Error fetching parent booking:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Error in getParentBooking:', err);
    return null;
  }
}

export async function getAirBNBListings() {
  try {
    const { data, error } = await supabaseServer
      .from('airbnb')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching AirBNB listings:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      url: row.url,
      price: row.price ? Number(row.price) : null,
      title: row.title,
      image_url: row.image_url,
      city: row.city,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (err) {
    console.error('Exception fetching AirBNB listings:', err);
    return [];
  }
}

/**
 * Auto-generate SEO fields for a blog post
 */
function generateSEOFields(blog: Partial<Blog>): { meta_title: string; meta_description: string; og_image_url?: string } {
  const meta_title = blog.meta_title || (blog.title ? `${blog.title} | Beroepsbelg` : '');
  
  let meta_description = blog.meta_description || '';
  if (!meta_description) {
    if (blog.excerpt) {
      meta_description = blog.excerpt.length > 160 ? blog.excerpt.substring(0, 157) + '...' : blog.excerpt;
    } else if (blog.content) {
      // Remove markdown syntax and get first 160 chars
      const plainText = blog.content.replace(/[#*`\[\]()]/g, '').replace(/\n/g, ' ').trim();
      meta_description = plainText.length > 160 ? plainText.substring(0, 157) + '...' : plainText;
    }
  }
  
  const og_image_url = blog.og_image_url || blog.thumbnail_url || undefined;
  
  return { meta_title, meta_description, og_image_url };
}

/**
 * Generate slug from title
 */
function generateSlug(title: string): string {
  return slugify(title);
}

/**
 * Get all published blogs (public)
 */
export async function getBlogs(locale: Locale = 'nl', limit?: number): Promise<Blog[]> {
  try {
    let query = supabaseServer
      .from('blogs')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.warn('blogs table does not exist. Please run migration.');
        return [];
      }
      console.error('Error fetching blogs:', error);
      return [];
    }

    const blogs: Blog[] = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title || '',
      slug: row.slug || '',
      excerpt: row.excerpt || undefined,
      content: row.content || '',
      thumbnail_url: row.thumbnail_url || undefined,
      title_en: row.title_en || undefined,
      excerpt_en: row.excerpt_en || undefined,
      content_en: row.content_en || undefined,
      title_fr: row.title_fr || undefined,
      excerpt_fr: row.excerpt_fr || undefined,
      content_fr: row.content_fr || undefined,
      title_de: row.title_de || undefined,
      excerpt_de: row.excerpt_de || undefined,
      content_de: row.content_de || undefined,
      author: row.author || undefined,
      published_at: row.published_at || undefined,
      status: (row.status as 'draft' | 'published') || 'draft',
      featured: row.featured || false,
      category: row.category || undefined,
      meta_title: row.meta_title || undefined,
      meta_description: row.meta_description || undefined,
      og_image_url: row.og_image_url || undefined,
      display_order: row.display_order !== null && row.display_order !== undefined ? Number(row.display_order) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return blogs;
  } catch (err) {
    console.error('Exception fetching blogs:', err);
    return [];
  }
}

/**
 * Get a single blog by slug with locale fallback
 */
export async function getBlogBySlug(slug: string, locale: Locale = 'nl'): Promise<Blog | null> {
  try {
    const { data, error } = await supabaseServer
      .from('blogs')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching blog:', error);
      return null;
    }

    if (!data) return null;

    // Fetch blog images
    const { data: imagesData } = await supabaseServer
      .from('blog_images')
      .select('*')
      .eq('blog_id', data.id)
      .order('position_in_content', { ascending: true, nullsFirst: true });

    const blog: Blog = {
      id: data.id,
      title: data.title || '',
      slug: data.slug || '',
      excerpt: data.excerpt || undefined,
      content: data.content || '',
      thumbnail_url: data.thumbnail_url || undefined,
      title_en: data.title_en || undefined,
      excerpt_en: data.excerpt_en || undefined,
      content_en: data.content_en || undefined,
      title_fr: data.title_fr || undefined,
      excerpt_fr: data.excerpt_fr || undefined,
      content_fr: data.content_fr || undefined,
      title_de: data.title_de || undefined,
      excerpt_de: data.excerpt_de || undefined,
      content_de: data.content_de || undefined,
      author: data.author || undefined,
      published_at: data.published_at || undefined,
      status: (data.status as 'draft' | 'published') || 'draft',
      featured: data.featured || false,
      category: data.category || undefined,
      meta_title: data.meta_title || undefined,
      meta_description: data.meta_description || undefined,
      og_image_url: data.og_image_url || undefined,
      display_order: data.display_order !== null && data.display_order !== undefined ? Number(data.display_order) : undefined,
      created_at: data.created_at,
      updated_at: data.updated_at,
      blogImages: (imagesData || []).map((img: any) => ({
        id: img.id,
        blog_id: img.blog_id,
        image_url: img.image_url,
        storage_path: img.storage_path,
        alt_text: img.alt_text || undefined,
        width_percentage: img.width_percentage || 100,
        position_in_content: img.position_in_content || undefined,
        created_at: img.created_at,
      })),
    };

    return blog;
  } catch (err) {
    console.error('Exception fetching blog:', err);
    return null;
  }
}

/**
 * Get all blogs (admin - including drafts)
 */
export async function getAllBlogs(): Promise<Blog[]> {
  try {
    const { data, error } = await supabaseServer
      .from('blogs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.warn('blogs table does not exist. Please run migration.');
        return [];
      }
      console.error('Error fetching all blogs:', error);
      return [];
    }

    const blogs: Blog[] = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title || '',
      slug: row.slug || '',
      excerpt: row.excerpt || undefined,
      content: row.content || '',
      thumbnail_url: row.thumbnail_url || undefined,
      title_en: row.title_en || undefined,
      excerpt_en: row.excerpt_en || undefined,
      content_en: row.content_en || undefined,
      title_fr: row.title_fr || undefined,
      excerpt_fr: row.excerpt_fr || undefined,
      content_fr: row.content_fr || undefined,
      title_de: row.title_de || undefined,
      excerpt_de: row.excerpt_de || undefined,
      content_de: row.content_de || undefined,
      author: row.author || undefined,
      published_at: row.published_at || undefined,
      status: (row.status as 'draft' | 'published') || 'draft',
      featured: row.featured || false,
      category: row.category || undefined,
      meta_title: row.meta_title || undefined,
      meta_description: row.meta_description || undefined,
      og_image_url: row.og_image_url || undefined,
      display_order: row.display_order !== null && row.display_order !== undefined ? Number(row.display_order) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return blogs;
  } catch (err) {
    console.error('Exception fetching all blogs:', err);
    return [];
  }
}

/**
 * Create a new blog post (admin)
 */
export async function createBlog(blogData: Omit<Blog, 'id' | 'created_at' | 'updated_at' | 'blogImages'>): Promise<Blog | null> {
  try {
    // Generate slug if not provided
    const slug = blogData.slug || generateSlug(blogData.title);
    
    // Generate SEO fields
    const seoFields = generateSEOFields(blogData);
    
    const { data, error } = await supabaseServer
      .from('blogs')
      .insert([{
        title: blogData.title,
        slug,
        excerpt: blogData.excerpt || null,
        content: blogData.content,
        thumbnail_url: blogData.thumbnail_url || null,
        video_url: blogData.video_url || null,
        title_en: blogData.title_en || null,
        excerpt_en: blogData.excerpt_en || null,
        content_en: blogData.content_en || null,
        title_fr: blogData.title_fr || null,
        excerpt_fr: blogData.excerpt_fr || null,
        content_fr: blogData.content_fr || null,
        title_de: blogData.title_de || null,
        excerpt_de: blogData.excerpt_de || null,
        content_de: blogData.content_de || null,
        author: blogData.author || null,
        published_at: blogData.published_at || null,
        status: blogData.status || 'draft',
        featured: blogData.featured || false,
        category: blogData.category || null,
        meta_title: blogData.meta_title || seoFields.meta_title,
        meta_description: blogData.meta_description || seoFields.meta_description,
        og_image_url: blogData.og_image_url || seoFields.og_image_url || null,
        display_order: blogData.display_order || null,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating blog:', error);
      throw error;
    }

    return data as Blog;
  } catch (err) {
    console.error('Exception creating blog:', err);
    throw err;
  }
}

/**
 * Update a blog post (admin)
 */
export async function updateBlog(id: string, blogData: Partial<Omit<Blog, 'id' | 'created_at' | 'updated_at' | 'blogImages'>>): Promise<Blog | null> {
  try {
    // Generate slug if title changed and slug not provided
    let slug = blogData.slug;
    if (blogData.title && !slug) {
      slug = generateSlug(blogData.title);
    }
    
    // Generate SEO fields if needed
    const seoFields = generateSEOFields(blogData);
    
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (blogData.title !== undefined) updateData.title = blogData.title;
    if (slug !== undefined) updateData.slug = slug;
    if (blogData.excerpt !== undefined) updateData.excerpt = blogData.excerpt || null;
    if (blogData.content !== undefined) updateData.content = blogData.content;
    if (blogData.thumbnail_url !== undefined) updateData.thumbnail_url = blogData.thumbnail_url || null;
    if (blogData.video_url !== undefined) updateData.video_url = blogData.video_url || null;
    if (blogData.title_en !== undefined) updateData.title_en = blogData.title_en || null;
    if (blogData.excerpt_en !== undefined) updateData.excerpt_en = blogData.excerpt_en || null;
    if (blogData.content_en !== undefined) updateData.content_en = blogData.content_en || null;
    if (blogData.title_fr !== undefined) updateData.title_fr = blogData.title_fr || null;
    if (blogData.excerpt_fr !== undefined) updateData.excerpt_fr = blogData.excerpt_fr || null;
    if (blogData.content_fr !== undefined) updateData.content_fr = blogData.content_fr || null;
    if (blogData.title_de !== undefined) updateData.title_de = blogData.title_de || null;
    if (blogData.excerpt_de !== undefined) updateData.excerpt_de = blogData.excerpt_de || null;
    if (blogData.content_de !== undefined) updateData.content_de = blogData.content_de || null;
    if (blogData.author !== undefined) updateData.author = blogData.author || null;
    if (blogData.published_at !== undefined) updateData.published_at = blogData.published_at || null;
    if (blogData.status !== undefined) updateData.status = blogData.status;
    if (blogData.featured !== undefined) updateData.featured = blogData.featured;
    if (blogData.category !== undefined) updateData.category = blogData.category || null;
    if (blogData.display_order !== undefined) updateData.display_order = blogData.display_order || null;
    
    // Auto-fill SEO fields if empty
    if (blogData.meta_title === undefined || !blogData.meta_title) {
      updateData.meta_title = seoFields.meta_title;
    } else {
      updateData.meta_title = blogData.meta_title;
    }
    
    if (blogData.meta_description === undefined || !blogData.meta_description) {
      updateData.meta_description = seoFields.meta_description;
    } else {
      updateData.meta_description = blogData.meta_description;
    }
    
    if (blogData.og_image_url === undefined || !blogData.og_image_url) {
      updateData.og_image_url = seoFields.og_image_url || null;
    } else {
      updateData.og_image_url = blogData.og_image_url;
    }

    const { data, error } = await supabaseServer
      .from('blogs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating blog:', error);
      throw error;
    }

    return data as Blog;
  } catch (err) {
    console.error('Exception updating blog:', err);
    throw err;
  }
}

/**
 * Delete a blog post (admin)
 */
export async function deleteBlog(id: string): Promise<boolean> {
  try {
    // Delete associated images first
    await supabaseServer
      .from('blog_images')
      .delete()
      .eq('blog_id', id);

    const { error } = await supabaseServer
      .from('blogs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting blog:', error);
      throw error;
    }

    return true;
  } catch (err) {
    console.error('Exception deleting blog:', err);
    throw err;
  }
}

/**
 * Upload blog image to Supabase storage
 */
export async function uploadBlogImage(file: File, blogId: string): Promise<string> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${blogId}/${Date.now()}.${fileExt}`;
    const filePath = `blog-images/${fileName}`;

    const { error: uploadError } = await supabaseServer.storage
      .from('airbnb-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading blog image:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabaseServer.storage
      .from('airbnb-images')
      .getPublicUrl(filePath);

    // Store image metadata in blog_images table
    await supabaseServer
      .from('blog_images')
      .insert([{
        blog_id: blogId,
        image_url: publicUrl,
        storage_path: filePath,
        width_percentage: 100,
      }]);

    return publicUrl;
  } catch (err) {
    console.error('Exception uploading blog image:', err);
    throw err;
  }
}
