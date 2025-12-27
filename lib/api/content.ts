import { supabaseServer } from '@/lib/supabase/server';
import type { Locale, City, Tour, Product, FaqItem, BlogPost, PressLink, ProductImage, TourImage } from '@/lib/data/types';

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

  // Fetch tour images to get primary images
  const tourImagesMap = await getTourImages();

  const tours = (data || []).map((row: any): Tour => {
    const slugifiedCity = citySlugify(row.city);

    // Get tour images for this tour
    const tourImages = tourImagesMap[row.id] || [];
    // Find primary image first, then fall back to first image, then undefined
    const primaryImage = tourImages.length > 0 
      ? (tourImages.find((img) => img.is_primary) || tourImages[0])
      : null;
    const imageUrl = primaryImage?.image_url || undefined;

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
      op_maat: row.op_maat === true || row.op_maat === 'true' || row.op_maat === 1,
      local_stories: row.local_stories === true || row.local_stories === 'true' || row.local_stories === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      image: imageUrl, // Use primary image from database if available
      tourImages: tourImages.length > 0 ? tourImages : undefined,
      options: row.options,
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

  // Fetch tour images for this specific tour
  const tourImagesMap = await getTourImages();
  const tourImages = tourImagesMap[matchingTour.id] || [];
  // Find primary image first, then fall back to first image, then undefined
  const primaryImage = tourImages.length > 0 
    ? (tourImages.find((img) => img.is_primary) || tourImages[0])
    : null;
  const imageUrl = primaryImage?.image_url || undefined;

  const localStoriesValue = matchingTour.local_stories === true || matchingTour.local_stories === 'true' || matchingTour.local_stories === 1;
  
  console.log('getTourBySlug: Raw matching tour data:', {
    id: matchingTour.id,
    title: matchingTour.title,
    local_stories_raw: matchingTour.local_stories,
    local_stories_type: typeof matchingTour.local_stories,
    local_stories_processed: localStoriesValue,
    op_maat: matchingTour.op_maat,
    allColumns: Object.keys(matchingTour),
  });

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
    op_maat: matchingTour.op_maat === true || matchingTour.op_maat === 'true' || matchingTour.op_maat === 1,
    local_stories: localStoriesValue,
    createdAt: matchingTour.created_at,
    updatedAt: matchingTour.updated_at,
    image: imageUrl, // Use primary image from database if available
    tourImages: tourImages.length > 0 ? tourImages : undefined,
    options: matchingTour.options,
  };
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabaseServer
    .from('webshop_data')
    .select('*');
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

export async function getCityImages(): Promise<Record<string, { photoUrl?: string }>> {
  try {
    const { data, error } = await supabaseServer
      .from('city_images')
      .select('city_id, photo_url');

    if (error) {
      console.error('Error fetching city images:', error);
      return {};
    }

    const imagesMap: Record<string, { photoUrl?: string }> = {};
    (data || []).forEach((row: any) => {
      if (row.photo_url) {
        imagesMap[row.city_id] = {
          photoUrl: row.photo_url,
        };
      }
    });

    return imagesMap;
  } catch (err) {
    console.error('Exception fetching city images:', err);
    return {};
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
