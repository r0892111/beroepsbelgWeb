import { supabaseServer } from '@/lib/supabase/server';
import type { Locale, City, Tour, Product, FaqItem, BlogPost, PressLink } from '@/lib/data/types';

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
      op_maat: row.op_maat === true || row.op_maat === 'true' || row.op_maat === 1,
      local_stories: row.local_stories === true || row.local_stories === 'true' || row.local_stories === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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
 * Aggregates multiple local_tours_bookings entries per Saturday (one-to-many relationship)
 */
export async function getLocalToursBookings(tourId: string): Promise<LocalTourBooking[]> {
  console.log('getLocalToursBookings called for tourId:', tourId);
  try {
    // Get the next 8 Saturdays
    const nextSaturdays = getNextSaturdays(8);
    console.log('getLocalToursBookings: Next Saturdays:', nextSaturdays.map(d => d.toISOString().split('T')[0]));
    
    // Fetch all local_tours_bookings entries for these dates
    const saturdayDates = nextSaturdays.map(d => d.toISOString().split('T')[0]);
    
    console.log('getLocalToursBookings: Fetching all bookings for dates:', saturdayDates);
    const { data: allBookings, error } = await supabaseServer
      .from('local_tours_bookings')
      .select('*')
      .eq('tour_id', tourId)
      .in('booking_date', saturdayDates)
      .order('booking_date', { ascending: true });
    
    console.log('getLocalToursBookings: Supabase query result:', {
      allBookingsCount: allBookings?.length || 0,
      allBookings,
      error,
    });
    
    if (error) {
      console.error('Error fetching local tours bookings:', error);
      return [];
    }
    
    // Aggregate bookings by date: sum up amnt_of_people and collect booking info
    const bookingsByDate = new Map<string, {
      totalPeople: number;
      bookingIds: string[];
      hasBookings: boolean;
      firstBooking: any; // Keep first booking for metadata
    }>();
    
    (allBookings || []).forEach((booking: any) => {
      const dateStr = booking.booking_date;
      const amntOfPeople = booking.amnt_of_people || 0;
      
      if (!bookingsByDate.has(dateStr)) {
        bookingsByDate.set(dateStr, {
          totalPeople: 0,
          bookingIds: [],
          hasBookings: false,
          firstBooking: booking,
        });
      }
      
      const dateData = bookingsByDate.get(dateStr)!;
      dateData.totalPeople += amntOfPeople;
      dateData.bookingIds.push(booking.id);
      
      // If this booking has customer info, mark as having bookings
      if (booking.customer_name || booking.customer_email) {
        dateData.hasBookings = true;
      }
      
      // Keep the first booking with customer info as the primary one
      if (!dateData.firstBooking.customer_name && booking.customer_name) {
        dateData.firstBooking = booking;
      }
    });
    
    console.log('getLocalToursBookings: Aggregated bookings by date:', Array.from(bookingsByDate.entries()));
    
    // Create one LocalTourBooking entry per Saturday with aggregated data
    const bookings: LocalTourBooking[] = nextSaturdays.map(saturday => {
      const dateStr = saturday.toISOString().split('T')[0];
      const dateData = bookingsByDate.get(dateStr);
      
      if (dateData && dateData.hasBookings) {
        // Return aggregated booking with total people count
        return {
          id: dateData.firstBooking.id, // Use first booking's ID as the primary ID
          tour_id: dateData.firstBooking.tour_id,
          booking_date: dateStr,
          booking_time: dateData.firstBooking.booking_time || '14:00:00',
          is_booked: true, // Always show as booked if there are any bookings
          user_id: dateData.firstBooking.user_id,
          customer_name: dateData.firstBooking.customer_name,
          customer_email: dateData.firstBooking.customer_email,
          customer_phone: dateData.firstBooking.customer_phone,
          stripe_session_id: dateData.firstBooking.stripe_session_id,
          booking_id: dateData.firstBooking.booking_id,
          status: 'booked',
          number_of_people: dateData.totalPeople, // Aggregated total
          amnt_of_people: dateData.firstBooking.amnt_of_people,
          created_at: dateData.firstBooking.created_at,
          updated_at: dateData.firstBooking.updated_at,
        };
      } else {
        // No bookings for this Saturday yet - return empty slot
        return {
          id: `empty-${dateStr}`, // Temporary ID for empty slots
          tour_id: tourId,
          booking_date: dateStr,
          booking_time: '14:00:00',
          is_booked: false,
          status: 'available',
          number_of_people: 0,
        };
      }
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
