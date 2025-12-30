import { supabaseServer } from '@/lib/supabase/server';
import type { Locale, City, Tour, Product, FaqItem, BlogPost, PressLink, ProductImage, TourImage, Lecture, LectureImage, LectureBooking } from '@/lib/data/types';

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
      type: row.type,
      durationMinutes: row.duration_minutes,
      price: row.price ? Number(row.price) : undefined,
      startLocation: row.start_location,
      endLocation: row.end_location,
      languages: row.languages || [],
      description: row.description,
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
    if (cityId) {
      // Filter by cityId (primary method)
      filteredTours = tours.filter(t => t.cityId === cityId);
    } else {
      // Fallback to slug matching (for backward compatibility)
      filteredTours = tours.filter(t => t.city === citySlug);
    }
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
    `);

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
    type: matchingTour.type,
    durationMinutes: matchingTour.duration_minutes,
    price: matchingTour.price ? Number(matchingTour.price) : undefined,
    startLocation: matchingTour.start_location,
    endLocation: matchingTour.end_location,
    languages: matchingTour.languages || [],
    description: matchingTour.description,
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
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('category_display_order', { ascending: true, nullsFirst: false })
    .order('Name', { ascending: true });
  if (error) {
    throw error;
  }

  // Fetch product images to get primary images
  const productImagesMap = await getProductImages();

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

    // Get primary image from product_images if available
    const productImages = productImagesMap[row.uuid] || [];
    // Find primary image first, then fall back to first image, then undefined
    const primaryImage = productImages.length > 0 
      ? (productImages.find((img) => img.is_primary) || productImages[0])
      : null;
    const imageUrl = primaryImage?.image_url || undefined;

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
      displayOrder: typeof row.display_order === 'number' ? row.display_order : undefined,
      categoryDisplayOrder: typeof row.category_display_order === 'number' ? row.category_display_order : undefined,
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
        imagesMap[productUuid] = imagesJson.map((img: any, index: number) => ({
          id: img.id || `${productUuid}-${index}`, // Generate ID if not present
          product_uuid: productUuid,
          image_url: img.url || img.image_url,
          is_primary: img.is_primary || false,
          sort_order: img.sort_order !== undefined ? img.sort_order : index,
          storage_folder_name: img.storage_folder_name || undefined,
          created_at: img.created_at,
          updated_at: img.updated_at,
        })).sort((a, b) => a.sort_order - b.sort_order);
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
 * Local stories tours happen every Saturday at 2 PM
 */
function getNextSaturdays(count: number = 8): Date[] {
  const saturdays: Date[] = [];
  const today = new Date();
  
  // Find the next Saturday
  const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + daysUntilSaturday);
  nextSaturday.setHours(14, 0, 0, 0); // 2 PM
  
  for (let i = 0; i < count; i++) {
    const saturday = new Date(nextSaturday);
    saturday.setDate(nextSaturday.getDate() + (i * 7));
    saturdays.push(saturday);
  }
  
  return saturdays;
}

/**
 * Get local tours bookings for a specific tour
 * Returns availability for the next 8 Saturdays
 * Automatically creates bookings for upcoming Saturdays if they don't exist (with 0 people, status 'booked')
 */
export async function getLocalToursBookings(tourId: string): Promise<LocalTourBooking[]> {
  console.log('getLocalToursBookings called for tourId:', tourId);
  try {
    // Get the next 8 Saturdays
    const nextSaturdays = getNextSaturdays(8);
    console.log('getLocalToursBookings: Next Saturdays:', nextSaturdays.map(d => d.toISOString().split('T')[0]));
    
    // Fetch existing bookings for these dates
    const saturdayDates = nextSaturdays.map(d => d.toISOString().split('T')[0]);
    
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
    
    // Fetch tourbooking entries to count number of people per date
    // Query all bookings for this tour and filter by date in JavaScript
    // since tour_datetime is a timestamp and we need to match by date
    const { data: tourBookings, error: tourBookingsError } = await supabaseServer
      .from('tourbooking')
      .select('tour_datetime, invitees')
      .eq('tour_id', tourId);
    
    console.log('getLocalToursBookings: Tour bookings query result:', {
      tourBookingsCount: tourBookings?.length || 0,
      tourBookings,
      tourBookingsError,
    });
    
    // Calculate number of people per date from tourbooking
    const peopleCountByDate = new Map<string, number>();
    const saturdayDateStrings = saturdayDates; // Already formatted as YYYY-MM-DD
    
    (tourBookings || []).forEach((booking: any) => {
      if (booking.tour_datetime && booking.invitees) {
        const bookingDate = new Date(booking.tour_datetime);
        const dateStr = bookingDate.toISOString().split('T')[0];
        
        // Only count bookings that match our Saturday dates
        if (!saturdayDateStrings.includes(dateStr)) {
          return;
        }
        
        // Sum up numberOfPeople from all invitees
        let totalPeople = 0;
        if (Array.isArray(booking.invitees)) {
          booking.invitees.forEach((invitee: any) => {
            if (invitee && typeof invitee.numberOfPeople === 'number') {
              totalPeople += invitee.numberOfPeople;
            }
          });
        }
        
        const currentCount = peopleCountByDate.get(dateStr) || 0;
        peopleCountByDate.set(dateStr, currentCount + totalPeople);
      }
    });
    
    console.log('getLocalToursBookings: People count by date:', Array.from(peopleCountByDate.entries()));
    
    // Create a map of existing bookings by date
    const bookingsMap = new Map<string, LocalTourBooking>();
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
    
    // Create missing bookings for upcoming Saturdays (with 0 people, status 'booked')
    const bookingsToCreate: any[] = [];
    const bookings: LocalTourBooking[] = nextSaturdays.map(saturday => {
      const dateStr = saturday.toISOString().split('T')[0];
      const existing = bookingsMap.get(dateStr);
      
      if (existing) {
        return existing;
      }
      
      // Get number of people for this date
      const numberOfPeople = peopleCountByDate.get(dateStr) || 0;
      
      // Prepare booking to create (status 'booked' but no customer info yet)
      const newBooking = {
        tour_id: tourId,
        booking_date: dateStr,
        booking_time: '14:00:00',
        is_booked: true, // Always show as booked
        status: 'booked', // Status is booked even without customer info
        customer_name: null,
        customer_email: null,
        customer_phone: null,
        stripe_session_id: null,
      };
      
      bookingsToCreate.push(newBooking);
      
      // Return placeholder that will be replaced after creation
      return {
        id: `temp-${dateStr}`,
        tour_id: tourId,
        booking_date: dateStr,
        booking_time: '14:00:00',
        is_booked: true,
        status: 'booked',
        number_of_people: numberOfPeople,
      };
    });
    
    // Create missing bookings in the database
    if (bookingsToCreate.length > 0) {
      console.log('getLocalToursBookings: Creating missing bookings:', {
        count: bookingsToCreate.length,
        bookingsToCreate,
      });
      const { data: createdBookings, error: createError } = await supabaseServer
        .from('local_tours_bookings')
        .insert(bookingsToCreate)
        .select();
      
      console.log('getLocalToursBookings: Create result:', {
        createdBookingsCount: createdBookings?.length || 0,
        createdBookings,
        createError,
      });
      
      if (createError) {
        console.error('Error creating local tours bookings:', createError);
      } else if (createdBookings) {
        // Update the bookings array with the created booking IDs
        createdBookings.forEach((created: any) => {
          const index = bookings.findIndex(b => b.booking_date === created.booking_date && b.id?.startsWith('temp-'));
          if (index !== -1) {
            const dateStr = created.booking_date;
            const numberOfPeople = peopleCountByDate.get(dateStr) || 0;
            
            bookings[index] = {
              id: created.id,
              tour_id: created.tour_id,
              booking_date: dateStr,
              booking_time: created.booking_time || '14:00:00',
              is_booked: true,
              status: 'booked',
              number_of_people: numberOfPeople,
              created_at: created.created_at,
              updated_at: created.updated_at,
            };
          }
        });
      }
    }
    
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
