export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
  isAdmin?: boolean;
  is_admin?: boolean;
  "TeamLeader UserInfo"?: Record<string, unknown> | null;
}

export interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface Product {
  id: string;
  slug: string;
  uuid_legacy: string | null;
  Name?: string; // Product name from webshop_data
  title_nl: string;
  title_en: string;
  title_fr: string;
  title_de: string;
  category: string;
  price: number;
  description_nl: string;
  description_en: string;
  description_fr: string;
  description_de: string;
  additional_info_nl: string | null;
  additional_info_en: string | null;
  additional_info_fr: string | null;
  additional_info_de: string | null;
  label: string | null;
  image: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  products?: Product;
}

export interface TourBooking {
  id: number;
  guide_id: number | null;
  deal_id: string | null;
  status: string;
  invitees: Record<string, unknown>[] | null;
  city: string | null;
  tour_datetime: string | null;
  tour_id: string | null;
  stripe_session_id: string | null;
  google_calendar_link: string | null;
}