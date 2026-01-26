'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Home, LogOut, RefreshCw, Plus, Pencil, Trash2, MapPin, X, Search, Image as ImageIcon, GripVertical, ChevronDown, ChevronUp, Upload, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Image from 'next/image';
import { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Tour {
  id: string;
  city: string;
  title: string;
  type: string;
  duration_minutes: number;
  price: number | null;
  start_location: string | null;
  end_location: string | null;
  google_maps_url: string | null;
  languages: string[];
  description: string;
  notes: string | null;
  options: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
  display_order: number | null;
  themes: string[] | null;
  local_stories?: boolean;
  op_maat?: boolean;
  status?: 'draft' | 'published';
}

interface ThemeTranslation {
  nl: string;
  en?: string;
  fr?: string;
  de?: string;
}

interface OpMaatFormConfig {
  startEnd: {
    label: ThemeTranslation;
    placeholder: ThemeTranslation;
  };
  cityPart: {
    label: ThemeTranslation;
    placeholder: ThemeTranslation;
  };
  subjects: {
    label: ThemeTranslation;
    placeholder: ThemeTranslation;
  };
  specialWishes: {
    label: ThemeTranslation;
    placeholder: ThemeTranslation;
  };
}

interface TourFormData {
  city: string;
  title: string;
  type: string; // Deprecated: kept for backward compatibility
  tour_types: TourTypeEntry[]; // New: array of predefined keys or custom multilingual objects
  duration_minutes: number;
  price: number | null;
  start_location: string;
  end_location: string;
  google_maps_url: string;
  languages: string[];
  description: string;
  description_en: string;
  description_fr: string;
  description_de: string;
  notes: string;
  options: Record<string, any>;
  themes: ThemeTranslation[];
  local_stories: boolean;
  op_maat: boolean;
  op_maat_form_config?: OpMaatFormConfig;
  status: 'draft' | 'published';
}

const LANGUAGE_OPTIONS = [
  'Nederlands', 'Engels', 'Frans', 'Duits', 'Spaans', 'Italiaans', 'Portugees',
  'Chinees', 'Japans', 'Koreaans', 'Arabisch', 'Russisch', 'Pools', 'Turks',
  'Hindi', 'Grieks', 'Zweeds', 'Noors', 'Deens', 'Fins', 'Tsjechisch',
  'Hongaars', 'Roemeens', 'Hebreeuws', 'Thai'
];
// Predefined tour types with their display labels and keys
const TOUR_TYPE_OPTIONS = [
  { key: 'walking', label: 'Walking' },
  { key: 'biking', label: 'Biking' },
  { key: 'bus', label: 'Bus' },
  { key: 'private', label: 'Private' },
  { key: 'group', label: 'Group' },
  { key: 'boat', label: 'Boat' },
  { key: 'food', label: 'Food' },
] as const;

type TourTypeEntry = string | { nl: string; en?: string; fr?: string; de?: string };

// Client-side slugify function (matches server-side citySlugify logic)
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
    'antwerpen': 'antwerp',
    'antwerp': 'antwerp',
    'anvers': 'antwerp',
    'brussel': 'brussels',
    'brussels': 'brussels',
    'bruxelles': 'brussels',
    'brugge': 'bruges',
    'bruges': 'bruges',
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

interface CityData {
  id?: string;
  slug: string;
  name_nl: string | null;
  name_en: string | null;
  name_fr: string | null;
  name_de: string | null;
  teaser_nl: string | null;
  teaser_en: string | null;
  teaser_fr: string | null;
  teaser_de: string | null;
  homepage_tagline_nl: string | null;
  homepage_tagline_en: string | null;
  homepage_tagline_fr: string | null;
  homepage_tagline_de: string | null;
  homepage_description_nl: string | null;
  homepage_description_en: string | null;
  homepage_description_fr: string | null;
  homepage_description_de: string | null;
  cta_text_nl: string | null;
  cta_text_en: string | null;
  cta_text_fr: string | null;
  cta_text_de: string | null;
  coming_soon_text_nl: string | null;
  coming_soon_text_en: string | null;
  coming_soon_text_fr: string | null;
  coming_soon_text_de: string | null;
  image: string | null;
  status: 'draft' | 'live' | 'coming-soon' | null;
  display_order: number | null;
}

const STORAGE_BUCKET = 'WebshopItemsImages';
const STORAGE_FOLDER = 'City Images';

export default function AdminToursPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());

  // City management state
  const [cities, setCities] = useState<CityData[]>([]);
  const [cityDialogOpen, setCityDialogOpen] = useState(false);
  const [cityImageDialogOpen, setCityImageDialogOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [cityUploading, setCityUploading] = useState(false);
  const [cityImageDragActive, setCityImageDragActive] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // City form state
  const [cityFormData, setCityFormData] = useState<CityData>({
    id: '',
    slug: '',
    name_nl: null,
    name_en: null,
    name_fr: null,
    name_de: null,
    teaser_nl: null,
    teaser_en: null,
    teaser_fr: null,
    teaser_de: null,
    homepage_tagline_nl: null,
    homepage_tagline_en: null,
    homepage_tagline_fr: null,
    homepage_tagline_de: null,
    homepage_description_nl: null,
    homepage_description_en: null,
    homepage_description_fr: null,
    homepage_description_de: null,
    cta_text_nl: null,
    cta_text_en: null,
    cta_text_fr: null,
    cta_text_de: null,
    coming_soon_text_nl: null,
    coming_soon_text_en: null,
    coming_soon_text_fr: null,
    coming_soon_text_de: null,
    image: null,
    status: 'draft',
    display_order: null,
  });
  const [isNewCity, setIsNewCity] = useState(false);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState<string>('all'); // 'all' or city_id UUID
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // 'all', 'draft', 'published'

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Form state
  const [formData, setFormData] = useState<TourFormData>({
    city: '',
    title: '',
    type: '', // Deprecated
    tour_types: [],
    duration_minutes: 120,
    price: null,
    start_location: '',
    end_location: '',
    google_maps_url: '',
    languages: [],
    description: '',
    description_en: '',
    description_fr: '',
    description_de: '',
    notes: '',
    options: {},
    themes: [],
    local_stories: false,
    op_maat: false,
    status: 'draft',
  });

  // Custom language input state
  const [customLanguage, setCustomLanguage] = useState('');

  // Custom theme input state (multilingual)
  const [customTheme, setCustomTheme] = useState<ThemeTranslation>({ nl: '', en: '', fr: '', de: '' });

  // Custom tour type input state (multilingual)
  const [customTourType, setCustomTourType] = useState<ThemeTranslation>({ nl: '', en: '', fr: '', de: '' });

  // Show custom tour type input fields
  const [showCustomTourType, setShowCustomTourType] = useState(false);

  // Helper function to update op maat form config
  const updateOpMaatFormConfig = (field: 'startEnd' | 'cityPart' | 'subjects' | 'specialWishes', subField: 'label' | 'placeholder', lang: 'nl' | 'en' | 'fr' | 'de', value: string) => {
    const currentConfig = formData.op_maat_form_config || {
      startEnd: { label: { nl: '', en: '', fr: '', de: '' }, placeholder: { nl: '', en: '', fr: '', de: '' } },
      cityPart: { label: { nl: '', en: '', fr: '', de: '' }, placeholder: { nl: '', en: '', fr: '', de: '' } },
      subjects: { label: { nl: '', en: '', fr: '', de: '' }, placeholder: { nl: '', en: '', fr: '', de: '' } },
      specialWishes: { label: { nl: '', en: '', fr: '', de: '' }, placeholder: { nl: '', en: '', fr: '', de: '' } },
    };
    
    setFormData({
      ...formData,
      op_maat_form_config: {
        ...currentConfig,
        [field]: {
          ...currentConfig[field],
          [subField]: {
            ...currentConfig[field][subField],
            [lang]: value,
          },
        },
      },
    });
  };

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  const fetchTours = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
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
        .order('city_id', { ascending: true, nullsFirst: true })
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('Failed to fetch tours:', fetchError);
        setError('Failed to load tours');
        return;
      }

      const fetchedTours = (data as any[]) || [];
      // Map the fetched data to Tour format, using city_id from JOIN
      const mappedTours = fetchedTours.map((row: any) => ({
        ...row,
        city_id: row.city_id || row.cities?.id,
        city: row.cities?.slug || row.city, // Use slug from joined cities table for display
      })) as Tour[];
      console.log('Fetched and mapped tours with display_order:', mappedTours.map(t => ({ id: t.id, title: t.title, city_id: (t as any).city_id, display_order: t.display_order })));
      setTours(mappedTours);
      
      // Expand all cities by default - normalize to city IDs
      const cityKeys = new Set<string>();
      mappedTours.forEach(t => {
        const tourWithCityId = t as any;
        let cityId = tourWithCityId.city_id;
        
        // If no city_id, try to find city by slug and use its ID
        if (!cityId && t.city) {
          const matchedCity = cities.find(c => c.slug === t.city);
          if (matchedCity) {
            cityId = matchedCity.id;
          }
        }
        
        if (cityId) {
          cityKeys.add(cityId);
        }
      });
      setExpandedCities(cityKeys);
    } catch (err) {
      console.error('Failed to fetch tours:', err);
      setError('Failed to load tours');
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      // Add timestamp to prevent caching issues
      const { data, error: fetchError } = await supabase
        .from('cities')
        .select('*')
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('slug', { ascending: true });

      if (fetchError) {
        console.error('Failed to fetch cities:', fetchError);
        return;
      }

      console.log('Fetched cities with display_order:', (data || []).map(c => ({ id: c.id, slug: c.slug, display_order: c.display_order })));
      setCities((data || []) as CityData[]);
    } catch (err) {
      console.error('Failed to fetch cities:', err);
    }
  };

  useEffect(() => {
    if (user && (profile?.isAdmin || profile?.is_admin)) {
      void fetchTours();
      void fetchCities();
    }
  }, [user, profile]);

  const handleLogout = () => {
    signOut();
    router.push(`/${locale}`);
  };

  const openAddDialog = () => {
    setEditingTour(null);
    setFormData({
      city: '',
      title: '',
      type: '', // Deprecated
      tour_types: [],
      duration_minutes: 120,
      price: null,
      start_location: '',
      end_location: '',
      google_maps_url: '',
      languages: [],
      description: '',
      description_en: '',
      description_fr: '',
      description_de: '',
      notes: '',
      options: {},
      themes: [],
      local_stories: false,
      op_maat: false,
      status: 'draft',
    });
    setCustomLanguage('');
    setCustomTheme({ nl: '', en: '', fr: '', de: '' });
    setCustomTourType({ nl: '', en: '', fr: '', de: '' });
    setShowCustomTourType(false);
    setDialogOpen(true);
  };

  const openEditDialog = (tour: Tour) => {
    setEditingTour(tour);

    // Parse tour_types with fallback to legacy type field
    const parseTourTypesFromTour = (): TourTypeEntry[] => {
      // Try new tour_types field first (from database)
      const rawTourTypes = (tour as any).tour_types;
      if (rawTourTypes && Array.isArray(rawTourTypes) && rawTourTypes.length > 0) {
        return rawTourTypes;
      }

      // Fallback to legacy type field
      if (tour.type && typeof tour.type === 'string' && tour.type.trim()) {
        const normalizedType = tour.type.toLowerCase().trim();
        const predefinedKeys = TOUR_TYPE_OPTIONS.map(opt => opt.key);
        if (predefinedKeys.includes(normalizedType as any)) {
          return [normalizedType];
        }
        // It's a custom type
        return [{ nl: tour.type, en: tour.type, fr: tour.type, de: tour.type }];
      }

      return [];
    };

    const tourTypes = parseTourTypesFromTour();

    // Check if there are any custom types (objects, not strings)
    const customTypes = tourTypes.filter(t => typeof t === 'object');
    const hasCustomType = customTypes.length > 0;
    const firstCustomType = hasCustomType ? customTypes[0] as ThemeTranslation : { nl: '', en: '', fr: '', de: '' };

    // Find the city name from slug for the select dropdown
    const cityData = cities.find(c => c.slug === tour.city || c.name_nl === tour.city);
    const cityName = cityData?.name_nl || tour.city || '';
    setFormData({
      city: cityName,
      title: tour.title || '',
      type: tour.type || '', // Keep for backward compatibility
      tour_types: tourTypes,
      duration_minutes: tour.duration_minutes || 120,
      price: tour.price,
      start_location: tour.start_location || '',
      end_location: tour.end_location || '',
      google_maps_url: (tour as any).google_maps_url || '',
      languages: Array.isArray(tour.languages) ? tour.languages : [],
      description: tour.description || '',
      description_en: (tour as any).description_en || '',
      description_fr: (tour as any).description_fr || '',
      description_de: (tour as any).description_de || '',
      notes: tour.notes || '',
      options: tour.options || {},
      // Parse themes - handle JSON strings from database
      themes: (() => {
        let themesData = tour.themes;
        // Parse if it's a JSON string
        if (typeof themesData === 'string') {
          try { themesData = JSON.parse(themesData); } catch { themesData = []; }
        }
        if (!Array.isArray(themesData)) return [];
        return themesData.map((t: any) => {
          // Parse nested JSON strings
          let theme = t;
          while (typeof theme === 'string') {
            try { theme = JSON.parse(theme); } catch { break; }
          }
          if (typeof theme === 'string') return { nl: theme, en: '', fr: '', de: '' };
          return theme;
        });
      })(),
      local_stories: Boolean(tour.local_stories === true || (tour.local_stories as any) === 'true' || (tour.local_stories as any) === 1),
      op_maat: Boolean(tour.op_maat === true || (tour.op_maat as any) === 'true' || (tour.op_maat as any) === 1),
      op_maat_form_config: (tour.options as any)?.op_maat_form_config || undefined,
      status: tour.status || 'published', // Default to 'published' for existing tours without status
    });
    setCustomLanguage('');
    setCustomTheme({ nl: '', en: '', fr: '', de: '' });
    setCustomTourType(firstCustomType);
    setShowCustomTourType(hasCustomType);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Get city name from dropdown
      const cityName = formData.city;
      
      if (!cityName) {
        toast.error('Please select a city');
        setSubmitting(false);
        return;
      }
      
      // Find the selected city in cities table to ensure we use the correct name_nl
      const selectedCity = cities.find(c => 
        c.name_nl === cityName || 
        c.name_en === cityName || 
        c.name_fr === cityName || 
        c.name_de === cityName
      );
      
      // Use the name_nl from the selected city to ensure consistency
      const finalCityName = selectedCity?.name_nl || cityName;

      // Build tour_types array
      let finalTourTypes: TourTypeEntry[] = [...formData.tour_types];

      // If custom type is being added, add it to the array
      if (showCustomTourType && customTourType.nl.trim()) {
        // Remove any existing custom types (objects) first
        finalTourTypes = finalTourTypes.filter(t => typeof t === 'string');
        // Add the new custom type
        finalTourTypes.push({
          nl: customTourType.nl.trim(),
          en: customTourType.en?.trim() || customTourType.nl.trim(),
          fr: customTourType.fr?.trim() || customTourType.nl.trim(),
          de: customTourType.de?.trim() || customTourType.nl.trim(),
        });
      }

      // Legacy type field: use first tour type (for backward compatibility)
      let legacyType = '';
      if (finalTourTypes.length > 0) {
        const firstType = finalTourTypes[0];
        if (typeof firstType === 'string') {
          // Predefined type - capitalize for display
          legacyType = firstType.charAt(0).toUpperCase() + firstType.slice(1);
        } else {
          // Custom type - use Dutch text
          legacyType = firstType.nl;
        }
      }

      const payload = {
        city: finalCityName, // Store city name (from cities.name_nl) in tours_table_prod.city
        city_id: selectedCity?.id || null, // Link tour to city by ID for proper JOIN queries
        title: formData.title,
        type: legacyType, // Legacy field for backward compatibility
        tour_types: finalTourTypes, // New field for multi-select tour types
        duration_minutes: formData.duration_minutes,
        price: formData.price,
        start_location: formData.start_location || null,
        end_location: formData.end_location || null,
        google_maps_url: formData.google_maps_url || null,
        languages: formData.languages,
        description: formData.description,
        description_en: formData.description_en || null,
        description_fr: formData.description_fr || null,
        description_de: formData.description_de || null,
        notes: formData.notes || null,
        options: {
          ...formData.options,
          ...(formData.op_maat && formData.op_maat_form_config ? { op_maat_form_config: formData.op_maat_form_config } : {}),
        },
        themes: formData.themes || [],
        local_stories: formData.local_stories || false,
        op_maat: formData.op_maat || false,
        status: formData.status || 'draft',
        updated_at: new Date().toISOString(),
      };

      if (editingTour) {
        // Update existing tour
        const { error } = await supabase
          .from('tours_table_prod')
          .update(payload)
          .eq('id', editingTour.id);

        if (error) throw error;
        toast.success('Tour updated successfully');
      } else {
        // Create new tour
        const { error } = await supabase
          .from('tours_table_prod')
          .insert([payload]);

        if (error) throw error;
        toast.success('Tour created successfully');
      }

      setDialogOpen(false);
      void fetchTours();
    } catch (err) {
      console.error('Failed to save tour:', err);
      toast.error('Failed to save tour');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (tour: Tour) => {
    if (!confirm(`Are you sure you want to delete "${tour.title}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tours_table_prod')
        .delete()
        .eq('id', tour.id);

      if (error) {
        // Check for foreign key constraint violation
        if (error.code === '23503') {
          toast.error('Cannot delete tour: there are existing bookings for this tour. Delete or reassign the bookings first.');
          return;
        }
        throw error;
      }
      toast.success('Tour deleted successfully');
      void fetchTours();
    } catch (err) {
      console.error('Failed to delete tour:', err);
      toast.error('Failed to delete tour');
    }
  };

  // Filter and search logic
  const filteredTours = tours.filter((tour) => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const tourWithCityId = tour as any;
    const cityId = tourWithCityId.city_id;
    // Get city slug for search (from JOIN or fallback)
    const citySlug = tourWithCityId.cities?.slug || tour.city;
    
    const matchesSearch = !searchQuery || 
      tour.title?.toLowerCase().includes(searchLower) ||
      tour.description?.toLowerCase().includes(searchLower) ||
      citySlug?.toLowerCase().includes(searchLower) ||
      tour.city?.toLowerCase().includes(searchLower);

    // City filter - match by city_id
    let matchesCity = filterCity === 'all';
    if (!matchesCity) {
      // Match by city_id directly
      matchesCity = cityId === filterCity;
    }

    // Type filter
    const matchesType = filterType === 'all' || tour.type === filterType;

    // Status filter
    const matchesStatus = filterStatus === 'all' || tour.status === filterStatus;

    return matchesSearch && matchesCity && matchesType && matchesStatus;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCity('all');
    setFilterType('all');
    setFilterStatus('all');
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  // Group tours by city_id (normalize all keys to city IDs)
  const toursByCity = useMemo(() => {
    const grouped = filteredTours.reduce((acc, tour) => {
      const tourWithCityId = tour as any;
      let cityId = tourWithCityId.city_id;
      
      // If no city_id, try to find city by slug and use its ID
      if (!cityId && tour.city) {
        const matchedCity = cities.find(c => c.slug === tour.city);
        if (matchedCity) {
          cityId = matchedCity.id;
        }
      }
      
      // Only add if we have a valid city ID
      if (cityId) {
        if (!acc[cityId]) {
          acc[cityId] = [];
        }
        acc[cityId].push(tour);
      }
      return acc;
    }, {} as Record<string, Tour[]>);

    // Sort tours within each city by display_order (nulls last), then by created_at
    Object.keys(grouped).forEach(cityId => {
      grouped[cityId].sort((a, b) => {
        if (a.display_order === null && b.display_order === null) {
          return (a.created_at || '').localeCompare(b.created_at || '');
        }
        if (a.display_order === null) return 1;
        if (b.display_order === null) return -1;
        return a.display_order - b.display_order;
      });
    });

    return grouped;
  }, [filteredTours, cities]);

  // Sort cities by display_order from cities table, then alphabetically
  // Show ALL cities from cities table, even those without tours
  // Return city IDs (not slugs) for consistent identification
  const sortedCities = useMemo(() => {
    // Start with all cities from cities table (use IDs)
    const allCityIds = new Set<string>();
    cities.forEach(c => {
      if (c.id) {
        allCityIds.add(c.id);
      }
    });
    
    // Also add any tour cities that don't have a matching city entry (for backwards compatibility)
    // toursByCity now uses IDs as keys, so we can add them directly
    Object.keys(toursByCity).forEach(cityId => {
      const matchedCity = cities.find(c => c.id === cityId);
      if (!matchedCity && cityId) {
        // This is a tour city that doesn't exist in cities table yet
        // Keep it for backwards compatibility, but it won't be editable
        allCityIds.add(cityId);
      }
    });
    
    // Create a map of city IDs to their display_order
    const cityOrderMap = new Map<string, number>();
    cities.forEach(city => {
      if (city.id) {
        cityOrderMap.set(city.id, city.display_order ?? 9999);
      }
    });
    
    return Array.from(allCityIds).sort((a, b) => {
      const orderA = cityOrderMap.get(a) ?? 9999;
      const orderB = cityOrderMap.get(b) ?? 9999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // If same order, sort by city name for consistency
      const cityA = cities.find(c => c.id === a);
      const cityB = cities.find(c => c.id === b);
      const nameA = cityA?.name_nl || cityA?.slug || a;
      const nameB = cityB?.name_nl || cityB?.slug || b;
      return nameA.localeCompare(nameB);
    });
  }, [toursByCity, cities]);

  const toggleCity = (city: string) => {
    setExpandedCities(prev => {
      const next = new Set(prev);
      if (next.has(city)) {
        next.delete(city);
      } else {
        next.add(city);
      }
      return next;
    });
  };

  const handleDragEnd = async (event: DragEndEvent, cityId: string) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // Get current tours for this city_id from state, sorted by display_order
    const cityTours = tours
      .filter(t => {
        const tourWithCityId = t as any;
        return tourWithCityId.city_id === cityId;
      })
      .sort((a, b) => {
        if (a.display_order === null && b.display_order === null) {
          return (a.created_at || '').localeCompare(b.created_at || '');
        }
        if (a.display_order === null) return 1;
        if (b.display_order === null) return -1;
        return a.display_order - b.display_order;
      });
    
    const oldIndex = cityTours.findIndex(t => t.id === active.id);
    const newIndex = cityTours.findIndex(t => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Optimistically update UI with new order and display_order values
    const reorderedTours = arrayMove(cityTours, oldIndex, newIndex);
    
    // Update display_order for all reordered tours
    const reorderedToursWithOrder = reorderedTours.map((tour, index) => ({
      ...tour,
      display_order: index + 1,
    }));

    // Create a map of updated tours for quick lookup
    const updatedToursMap = new Map(reorderedToursWithOrder.map(t => [t.id, t]));

    // Update the tours state - replace all tours for this city_id with reordered ones
    // Use functional update to ensure React detects the change
    setTours(prevTours => {
      const updated = prevTours.map(tour => {
        const tourWithCityId = tour as any;
        const matchesCity = tourWithCityId.city_id === cityId;
        
        if (matchesCity) {
          const updatedTour = updatedToursMap.get(tour.id);
          return updatedTour || tour;
        }
        return tour;
      });
      console.log('Optimistically updating tours state (drag) for city', cityId, ':', updated.filter(t => (t as any).city_id === cityId).map(t => ({ id: t.id, title: t.title, display_order: t.display_order })));
      return updated;
    });

    // Update display_order in database
    try {
      // Use batch updates for better performance and atomicity
      const updatePromises = reorderedToursWithOrder.map(tour => {
        console.log(`Updating tour ${tour.id} (${tour.title}) to display_order ${tour.display_order}`);
        return supabase
          .from('tours_table_prod')
          .update({ display_order: tour.display_order })
          .eq('id', tour.id)
          .select(); // Select to verify update
      });

      const results = await Promise.all(updatePromises);
      
      // Verify all updates succeeded
      let hasErrors = false;
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const tour = reorderedToursWithOrder[i];
        if (result.error) {
          console.error(`Failed to update tour ${tour.id} (${tour.title}):`, result.error);
          hasErrors = true;
        } else if (result.data) {
          // Verify the update actually changed the value
          const updatedTour = Array.isArray(result.data) ? result.data[0] : result.data;
          if (updatedTour && updatedTour.display_order !== tour.display_order) {
            console.warn(`Tour ${tour.id} display_order mismatch: expected ${tour.display_order}, got ${updatedTour.display_order}`);
          } else {
            console.log(`✓ Tour ${tour.id} updated successfully to display_order ${tour.display_order}`);
          }
        }
      }

      if (hasErrors) {
        throw new Error('Some tour updates failed');
      }

      const cityData = cities.find(c => c.id === cityId);
      toast.success(`Tour order updated for ${cityData?.name_nl || cityId}`);
      // Refresh immediately to sync with database
      // This ensures the UI reflects the actual database state
      await fetchTours();
    } catch (err: any) {
      console.error('Failed to update tour order:', err);
      toast.error(err.message || 'Failed to update tour order');
      // Revert on error - refresh to get correct state
      await fetchTours();
    }
  };

  // Tour move up/down handlers
  const handleTourMove = async (tourId: string, cityId: string, direction: 'up' | 'down') => {
    // Get current tours for this city_id from state, sorted by display_order
    const cityTours = tours
      .filter(t => {
        const tourWithCityId = t as any;
        return tourWithCityId.city_id === cityId;
      })
      .sort((a, b) => {
        if (a.display_order === null && b.display_order === null) {
          return (a.created_at || '').localeCompare(b.created_at || '');
        }
        if (a.display_order === null) return 1;
        if (b.display_order === null) return -1;
        return a.display_order - b.display_order;
      });

    const currentIndex = cityTours.findIndex(t => t.id === tourId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= cityTours.length) return;

    // Optimistically update UI with new order and display_order values
    const reorderedTours = arrayMove(cityTours, currentIndex, newIndex);
    
    // Update display_order for all reordered tours
    const reorderedToursWithOrder = reorderedTours.map((tour, index) => ({
      ...tour,
      display_order: index + 1,
    }));

    // Create a map of updated tours for quick lookup
    const updatedToursMap = new Map(reorderedToursWithOrder.map(t => [t.id, t]));

    // Update the tours state - replace all tours for this city_id with reordered ones
    // Use functional update to ensure React detects the change
    setTours(prevTours => {
      const updated = prevTours.map(tour => {
        const tourWithCityId = tour as any;
        const matchesCity = tourWithCityId.city_id === cityId;
        
        if (matchesCity) {
          const updatedTour = updatedToursMap.get(tour.id);
          return updatedTour || tour;
        }
        return tour;
      });
      console.log('Optimistically updating tours state (move) for city', cityId, ':', updated.filter(t => (t as any).city_id === cityId).map(t => ({ id: t.id, title: t.title, display_order: t.display_order })));
      return updated;
    });

    // Update display_order in database
    try {
      // Use batch updates for better performance and atomicity
      const updatePromises = reorderedToursWithOrder.map(tour => {
        console.log(`Updating tour ${tour.id} (${tour.title}) to display_order ${tour.display_order}`);
        return supabase
          .from('tours_table_prod')
          .update({ display_order: tour.display_order })
          .eq('id', tour.id)
          .select(); // Select to verify update
      });

      const results = await Promise.all(updatePromises);
      
      // Verify all updates succeeded
      let hasErrors = false;
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const tour = reorderedToursWithOrder[i];
        if (result.error) {
          console.error(`Failed to update tour ${tour.id} (${tour.title}):`, result.error);
          hasErrors = true;
        } else if (result.data) {
          // Verify the update actually changed the value
          const updatedTour = Array.isArray(result.data) ? result.data[0] : result.data;
          if (updatedTour && updatedTour.display_order !== tour.display_order) {
            console.warn(`Tour ${tour.id} display_order mismatch: expected ${tour.display_order}, got ${updatedTour.display_order}`);
          } else {
            console.log(`✓ Tour ${tour.id} updated successfully to display_order ${tour.display_order}`);
          }
        }
      }

      if (hasErrors) {
        throw new Error('Some tour updates failed');
      }

      const cityData = cities.find(c => c.id === cityId);
      const cityDisplayName = cityData?.name_nl || cityId;
      toast.success(`Tour order updated for ${cityDisplayName}`);
      // Refresh immediately to sync with database
      // This ensures the UI reflects the actual database state
      await fetchTours();
    } catch (err: any) {
      console.error('Failed to update tour order:', err);
      toast.error(err.message || 'Failed to update tour order');
      // Revert on error - refresh to get correct state
      await fetchTours();
    }
  };

  // City drag and drop handler
  const handleCityDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // active.id and over.id are now city IDs (from sortedCities)
    const oldIndex = cities.findIndex(c => c.id === active.id);
    const newIndex = cities.findIndex(c => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Optimistically update UI
    const reorderedCities = arrayMove(cities, oldIndex, newIndex);
    const reorderedCitiesWithOrder = reorderedCities.map((city, index) => ({
      ...city,
      display_order: index + 1,
    }));

    // Use functional update to ensure React detects the change
    setCities(prevCities => {
      const updated = arrayMove(prevCities, oldIndex, newIndex).map((city, index) => ({
        ...city,
        display_order: index + 1,
      }));
      console.log('Optimistically updating cities state:', updated.map(c => ({ id: c.id, slug: c.slug, display_order: c.display_order })));
      return updated;
    });

    // Update display_order in database
    try {
      // Use batch updates for better performance and atomicity
      const updatePromises = reorderedCitiesWithOrder.map(city => {
        if (!city.id) {
          console.warn('City missing ID, skipping update:', city);
          return Promise.resolve({ data: null, error: null });
        }
        console.log(`Updating city ${city.id} (${city.name_nl || city.slug}) to display_order ${city.display_order}`);
        return supabase
          .from('cities')
          .update({ display_order: city.display_order })
          .eq('id', city.id)
          .select(); // Select to verify update
      });

      const results = await Promise.all(updatePromises);
      
      // Verify all updates succeeded
      let hasErrors = false;
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const city = reorderedCitiesWithOrder[i];
        if (result && result.error) {
          console.error(`Failed to update city ${city.id} (${city.name_nl || city.slug}):`, result.error);
          hasErrors = true;
        } else if (result && result.data) {
          // Verify the update actually changed the value
          const updatedCity = Array.isArray(result.data) ? result.data[0] : result.data;
          if (updatedCity && updatedCity.display_order !== city.display_order) {
            console.warn(`City ${city.id} display_order mismatch: expected ${city.display_order}, got ${updatedCity.display_order}`);
          } else {
            console.log(`✓ City ${city.id} updated successfully to display_order ${city.display_order}`);
          }
        }
      }

      if (hasErrors) {
        throw new Error('Some city updates failed');
      }

      toast.success('City order updated');
      // Refresh immediately to sync with database
      // This ensures the UI reflects the actual database state
      await fetchCities();
    } catch (err: any) {
      console.error('Failed to update city order:', err);
      toast.error(err.message || 'Failed to update city order');
      // Revert on error - refresh to get correct state
      await fetchCities();
    }
  };

  // City move up/down handlers
  const handleCityMove = async (cityId: string, direction: 'up' | 'down') => {
    const sortedCitiesList = [...cities].sort((a, b) => {
      if (a.display_order === null && b.display_order === null) {
        return (a.slug || '').localeCompare(b.slug || '');
      }
      if (a.display_order === null) return 1;
      if (b.display_order === null) return -1;
      return a.display_order - b.display_order;
    });

    const currentIndex = sortedCitiesList.findIndex(c => c.id === cityId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sortedCitiesList.length) return;

    // Create a fake drag event to reuse existing logic
    const fakeEvent = {
      active: { id: cityId },
      over: { id: sortedCitiesList[newIndex].id },
    } as DragEndEvent;

    await handleCityDragEnd(fakeEvent);
  };

  // City CRUD functions
  const openCityDialog = (city?: CityData) => {
    if (city) {
      // Check if city exists in cities table
      const existsInDb = cities.some(c => c.slug === city.slug);
      setSelectedCity(city);
      setIsNewCity(!existsInDb);
      setCityFormData({
        id: city.id,
        slug: city.slug,
        name_nl: city.name_nl,
        name_en: city.name_en,
        name_fr: city.name_fr,
        name_de: city.name_de,
        teaser_nl: city.teaser_nl,
        teaser_en: city.teaser_en,
        teaser_fr: city.teaser_fr,
        teaser_de: city.teaser_de,
        homepage_tagline_nl: city.homepage_tagline_nl,
        homepage_tagline_en: city.homepage_tagline_en,
        homepage_tagline_fr: city.homepage_tagline_fr,
        homepage_tagline_de: city.homepage_tagline_de,
        homepage_description_nl: city.homepage_description_nl,
        homepage_description_en: city.homepage_description_en,
        homepage_description_fr: city.homepage_description_fr,
        homepage_description_de: city.homepage_description_de,
        cta_text_nl: city.cta_text_nl,
        cta_text_en: city.cta_text_en,
        cta_text_fr: city.cta_text_fr,
        cta_text_de: city.cta_text_de,
        coming_soon_text_nl: city.coming_soon_text_nl,
        coming_soon_text_en: city.coming_soon_text_en,
        coming_soon_text_fr: city.coming_soon_text_fr,
        coming_soon_text_de: city.coming_soon_text_de,
        image: city.image,
        status: city.status || 'draft',
        display_order: city.display_order,
      });
    } else {
      setSelectedCity(null);
      setIsNewCity(true);
      setCityFormData({
        id: '',
        slug: '',
        name_nl: null,
        name_en: null,
        name_fr: null,
        name_de: null,
        teaser_nl: null,
        teaser_en: null,
        teaser_fr: null,
        teaser_de: null,
        homepage_tagline_nl: null,
        homepage_tagline_en: null,
        homepage_tagline_fr: null,
        homepage_tagline_de: null,
        homepage_description_nl: null,
        homepage_description_en: null,
        homepage_description_fr: null,
        homepage_description_de: null,
        cta_text_nl: null,
        cta_text_en: null,
        cta_text_fr: null,
        cta_text_de: null,
        coming_soon_text_nl: null,
        coming_soon_text_en: null,
        coming_soon_text_fr: null,
        coming_soon_text_de: null,
        image: null,
        status: 'draft',
        display_order: null,
      });
    }
    setCityDialogOpen(true);
  };

  const handleCitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCityUploading(true);

    try {
      const payload = {
        ...cityFormData,
        // Ensure all required fields are present
        name_nl: cityFormData.name_nl || '',
        name_en: cityFormData.name_en || '',
        name_fr: cityFormData.name_fr || '',
        name_de: cityFormData.name_de || '',
        teaser_nl: cityFormData.teaser_nl || '',
        teaser_en: cityFormData.teaser_en || '',
        teaser_fr: cityFormData.teaser_fr || '',
        teaser_de: cityFormData.teaser_de || '',
      };

      if (isNewCity) {
        // Create new city - exclude id field (let database generate it)
        const { id, ...insertPayload } = payload;
        const { error } = await supabase
          .from('cities')
          .insert([insertPayload]);

        if (error) throw error;
        toast.success('City created successfully');
      } else {
        // Update existing city
        const { error } = await supabase
          .from('cities')
          .update(payload)
          .eq('slug', selectedCity!.slug);

        if (error) throw error;
        toast.success('City updated successfully');
      }

      setCityDialogOpen(false);
      void fetchCities();
    } catch (err: any) {
      console.error('Failed to save city:', err);
      toast.error(err.message || 'Failed to save city');
    } finally {
      setCityUploading(false);
    }
  };

  const handleCityDelete = async () => {
    if (!selectedCity || !confirm(`Are you sure you want to delete city "${selectedCity.slug}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('cities')
        .delete()
        .eq('slug', selectedCity.slug);

      if (error) throw error;
      toast.success('City deleted successfully');
      setCityDialogOpen(false);
      void fetchCities();
    } catch (err: any) {
      console.error('Failed to delete city:', err);
      toast.error(err.message || 'Failed to delete city');
    }
  };

  // City image functions
  const openCityImageDialog = (city: CityData) => {
    setSelectedCity(city);

    if (city.image) {
      setPhotoPreview(city.image);
    } else {
      setPhotoPreview(null);
    }

    setPhotoFile(null);
    setCityImageDialogOpen(true);
  };

  const handleCityImageDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setCityImageDragActive(true);
    } else if (e.type === 'dragleave') {
      setCityImageDragActive(false);
    }
  }, []);

  const handleCityImageFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCityImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCityImageDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleCityImageFileSelect(file);
      } else {
        toast.error('Please drop an image file');
      }
    }
  }, []);

  const handleCityImageFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleCityImageFileSelect(e.target.files[0]);
    }
  };

  const uploadCityImageFile = async (file: File, cityId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${cityId}_${Date.now()}.${fileExt}`;
      const filePath = `${STORAGE_FOLDER}/${cityId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err) {
      console.error('Failed to upload file:', err);
      throw err;
    }
  };

  const handleCityImageSave = async () => {
    if (!selectedCity) return;

    setCityUploading(true);

    try {
      let photoUrl: string | null = null;

      if (photoFile) {
        const cityId = citySlugify(selectedCity.slug);
        photoUrl = await uploadCityImageFile(photoFile, cityId);
      } else if (photoPreview && photoPreview.startsWith('http')) {
        photoUrl = photoPreview;
      }

      // Update cities table with image
      const { error } = await supabase
        .from('cities')
        .update({
          image: photoUrl,
        })
        .eq('slug', selectedCity.slug);

      if (error) throw error;

      toast.success(`Image saved for ${selectedCity.slug}`);
      setCityImageDialogOpen(false);
      await fetchCities();
    } catch (err: any) {
      console.error('Failed to save city image:', err);
      toast.error(err.message || 'Failed to save image');
    } finally {
      setCityUploading(false);
    }
  };

  // Sortable City Item Component
  const SortableCityItem = ({ cityId, cityTours, index, totalCities }: { cityId: string; cityTours: Tour[]; index: number; totalCities: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: cityId });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const cityData = cities.find(c => c.id === cityId);
    const cityImageUrl = cityData?.image || null;
    const isExpanded = expandedCities.has(cityId);

    return (
      <Card
        ref={setNodeRef}
        style={style}
        className={`overflow-hidden ${isDragging ? 'bg-gray-100' : ''}`}
      >
        <CardHeader
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleCity(cityId)}
        >
          <div className="flex items-center gap-3">
            {/* Drag handle and up/down buttons */}
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-5 w-5 text-gray-400" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleCityMove(cityId, 'up')}
                disabled={index === 0}
                title="Move up"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleCityMove(cityId, 'down')}
                disabled={index === totalCities - 1}
                title="Move down"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
            
            {/* City image thumbnail */}
            {cityImageUrl && (
              <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden border">
                <Image
                  src={cityImageUrl}
                  alt={cityData?.name_nl || cityId}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            
            {/* City info */}
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {cityData?.name_nl || cityId}
                <Badge variant="outline" className="ml-2">
                  {cityTours.length} {cityTours.length === 1 ? 'tour' : 'tours'}
                </Badge>
                {cityData?.status === 'draft' && (
                  <Badge className="bg-amber-100 text-amber-900 border border-amber-300">Draft</Badge>
                )}
                {cityData?.status === 'live' && (
                  <Badge className="bg-green-100 text-green-900 border border-green-300">Live</Badge>
                )}
                {cityData?.status === 'coming-soon' && (
                  <Badge className="bg-blue-100 text-blue-900 border border-blue-300">Coming Soon</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Drag cities to reorder. The order will be reflected on the /tours page.
              </CardDescription>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (cityData) {
                    openCityImageDialog(cityData);
                  } else {
                    // Create a temporary city object for cities that only exist in tours
                    const tempCity: CityData = {
                      id: cityId,
                      slug: cityId,
                      name_nl: cityId,
                      name_en: null,
                      name_fr: null,
                      name_de: null,
                      teaser_nl: null,
                      teaser_en: null,
                      teaser_fr: null,
                      teaser_de: null,
                      homepage_tagline_nl: null,
                      homepage_tagline_en: null,
                      homepage_tagline_fr: null,
                      homepage_tagline_de: null,
                      homepage_description_nl: null,
                      homepage_description_en: null,
                      homepage_description_fr: null,
                      homepage_description_de: null,
                      cta_text_nl: null,
                      cta_text_en: null,
                      cta_text_fr: null,
                      cta_text_de: null,
                      coming_soon_text_nl: null,
                      coming_soon_text_en: null,
                      coming_soon_text_fr: null,
                      coming_soon_text_de: null,
                      image: null,
                      status: 'live',
                      display_order: null,
                    };
                    openCityImageDialog(tempCity);
                  }
                }}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Edit Image
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (cityData) {
                    openCityDialog(cityData);
                  } else {
                    // Create a temporary city object for cities that only exist in tours
                    const tempCity: CityData = {
                      id: cityId,
                      slug: cityId,
                      name_nl: cityId,
                      name_en: null,
                      name_fr: null,
                      name_de: null,
                      teaser_nl: null,
                      teaser_en: null,
                      teaser_fr: null,
                      teaser_de: null,
                      homepage_tagline_nl: null,
                      homepage_tagline_en: null,
                      homepage_tagline_fr: null,
                      homepage_tagline_de: null,
                      homepage_description_nl: null,
                      homepage_description_en: null,
                      homepage_description_fr: null,
                      homepage_description_de: null,
                      cta_text_nl: null,
                      cta_text_en: null,
                      cta_text_fr: null,
                      cta_text_de: null,
                      coming_soon_text_nl: null,
                      coming_soon_text_en: null,
                      coming_soon_text_fr: null,
                      coming_soon_text_de: null,
                      image: null,
                      status: 'live',
                      display_order: null,
                    };
                    openCityDialog(tempCity);
                  }
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit City
              </Button>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleDragEnd(event, cityId)}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Languages</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={cityTours.map(t => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {cityTours.map((tour, index) => (
                        <SortableTourItem
                          key={tour.id}
                          tour={tour}
                          cityId={cityId}
                          index={index}
                          totalTours={cityTours.length}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  // Sortable Tour Item Component
  const SortableTourItem = ({ tour, cityId, index, totalTours }: { tour: Tour; cityId: string; index: number; totalTours: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: tour.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <TableRow
        ref={setNodeRef}
        style={style}
        className={isDragging ? 'bg-gray-100' : ''}
      >
        <TableCell className="w-24">
          <div className="flex items-center gap-1">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => handleTourMove(tour.id, cityId, 'up')}
              disabled={index === 0}
              title="Move up"
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => handleTourMove(tour.id, cityId, 'down')}
              disabled={index === totalTours - 1}
              title="Move down"
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline">{tour.city}</Badge>
        </TableCell>
        <TableCell className="font-medium max-w-xs">
          <div className="truncate">{tour.title}</div>
        </TableCell>
        <TableCell>
          {tour.status === 'draft' ? (
            <Badge className="bg-amber-100 text-amber-900 border border-amber-300">Draft</Badge>
          ) : (
            <Badge className="bg-green-100 text-green-900 border border-green-300">Published</Badge>
          )}
        </TableCell>
        <TableCell>
          <Badge className="bg-blue-100 text-blue-900">{tour.type}</Badge>
        </TableCell>
        <TableCell>{formatDuration(tour.duration_minutes)}</TableCell>
        <TableCell>
          {tour.price ? `€${tour.price.toFixed(2)}` : 'N/A'}
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1 max-w-xs">
            {tour.languages && Array.isArray(tour.languages) && tour.languages.length > 0 ? (
              tour.languages.map((lang, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {lang}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">None</span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditDialog(tour)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(tour)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-sand">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-serif font-bold text-navy">Tours Management</h1>
          <div className="flex items-center gap-2">
            <Link href={`/${locale}/admin/dashboard`}>
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href={`/${locale}`}>
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  All Tours
                </CardTitle>
                <CardDescription>
                  Manage tours and their information
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchTours()}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Link href={`/${locale}/admin/tour-images`}>
                  <Button variant="outline" size="sm">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Tour Images
                  </Button>
                </Link>
                <Button onClick={() => openCityDialog()} className="btn-primary" variant="outline">
                  <MapPin className="h-4 w-4 mr-2" />
                  Create City
                </Button>
                <Button onClick={openAddDialog} className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tour
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 mb-4">
                {error}
              </div>
            )}

            {/* Search and Filters */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tours by title, description, or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={!searchQuery && filterCity === 'all' && filterType === 'all' && filterStatus === 'all'}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>

              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Select value={filterCity} onValueChange={setFilterCity}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Filter by city" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {cities.map((city) => (
                        <SelectItem key={city.id || city.slug} value={city.id || city.slug}>
                          {city.name_nl || city.slug}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {TOUR_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.key} value={option.label}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="draft">Draft only</SelectItem>
                      <SelectItem value="published">Published only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(searchQuery || filterCity !== 'all' || filterType !== 'all' || filterStatus !== 'all') && (
                <div className="text-sm text-muted-foreground">
                  Showing {filteredTours.length} of {tours.length} tours
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredTours.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {tours.length === 0 ? 'No tours found' : 'No tours match your filters'}
              </div>
            ) : (
              <div className="space-y-4">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleCityDragEnd}
                >
                  <SortableContext
                    items={sortedCities}
                    strategy={verticalListSortingStrategy}
                  >
                    {sortedCities.map((city, index) => {
                      const cityTours = toursByCity[city] || []; // Handle cities without tours
                      return (
                        <SortableCityItem
                          key={city}
                          cityId={city}
                          cityTours={cityTours}
                          index={index}
                          totalCities={sortedCities.length}
                        />
                      );
                    })}
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {!loading && filteredTours.length > 0 && (
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {filteredTours.length} {filteredTours.length === 1 ? 'tour' : 'tours'}
                {filteredTours.length !== tours.length && ` (filtered from ${tours.length} total)`}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTour ? 'Edit Tour' : 'Add New Tour'}</DialogTitle>
            <DialogDescription>
              {editingTour ? 'Update tour information' : 'Create a new tour'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city" className="text-navy font-semibold">City*</Label>
                <Select
                  value={formData.city}
                  onValueChange={(value) => {
                    setFormData({ ...formData, city: value });
                  }}
                  required
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city.slug} value={city.name_nl || city.slug}>
                        {city.name_nl || city.slug}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-navy font-semibold">Tour Types*</Label>
                <div className="border rounded-lg p-3 bg-white space-y-3">
                  {/* Predefined tour types as checkboxes */}
                  <div className="grid grid-cols-2 gap-2">
                    {TOUR_TYPE_OPTIONS.map((option) => {
                      const isChecked = formData.tour_types.some(t => t === option.key);
                      return (
                        <label key={option.key} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  tour_types: [...formData.tour_types, option.key],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  tour_types: formData.tour_types.filter(t => t !== option.key),
                                });
                              }
                            }}
                          />
                          <span className="text-sm">{option.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Custom type toggle */}
                  <div className="border-t pt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={showCustomTourType}
                        onCheckedChange={(checked) => {
                          setShowCustomTourType(!!checked);
                          if (!checked) {
                            setCustomTourType({ nl: '', en: '', fr: '', de: '' });
                            // Remove custom types (objects) from tour_types
                            setFormData({
                              ...formData,
                              tour_types: formData.tour_types.filter(t => typeof t === 'string'),
                            });
                          }
                        }}
                      />
                      <span className="text-sm font-medium">Add Custom Type</span>
                    </label>

                    {/* Custom type multilingual inputs */}
                    {showCustomTourType && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Dutch (NL)*</Label>
                          <Input
                            value={customTourType.nl}
                            onChange={(e) => setCustomTourType({ ...customTourType, nl: e.target.value })}
                            placeholder="e.g., Segway Tour"
                            className="bg-white mt-1 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">English (EN)</Label>
                          <Input
                            value={customTourType.en || ''}
                            onChange={(e) => setCustomTourType({ ...customTourType, en: e.target.value })}
                            placeholder="e.g., Segway Tour"
                            className="bg-white mt-1 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">French (FR)</Label>
                          <Input
                            value={customTourType.fr || ''}
                            onChange={(e) => setCustomTourType({ ...customTourType, fr: e.target.value })}
                            placeholder="e.g., Tour en Segway"
                            className="bg-white mt-1 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">German (DE)</Label>
                          <Input
                            value={customTourType.de || ''}
                            onChange={(e) => setCustomTourType({ ...customTourType, de: e.target.value })}
                            placeholder="e.g., Segway-Tour"
                            className="bg-white mt-1 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Show selected types */}
                  {(formData.tour_types.length > 0 || (showCustomTourType && customTourType.nl)) && (
                    <div className="border-t pt-2 flex flex-wrap gap-1">
                      {formData.tour_types.map((t, idx) => {
                        const label = typeof t === 'string'
                          ? TOUR_TYPE_OPTIONS.find(o => o.key === t)?.label || t
                          : t.nl;
                        return (
                          <Badge key={idx} className="bg-green-100 text-green-900 border border-green-300">
                            {label}
                          </Badge>
                        );
                      })}
                      {showCustomTourType && customTourType.nl && (
                        <Badge className="bg-blue-100 text-blue-900 border border-blue-300">
                          {customTourType.nl} (custom)
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title" className="text-navy font-semibold">Tour Title*</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="bg-white"
                  placeholder="e.g., Historic City Center Walking Tour"
                />
              </div>

              <div>
                <Label htmlFor="status" className="text-navy font-semibold">Status*</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as 'draft' | 'published' })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration" className="text-navy font-semibold">Duration (minutes)*</Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  step="15"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                  required
                  className="bg-white"
                />
              </div>

              <div>
                <Label htmlFor="price" className="text-navy font-semibold">Price (€)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : null })}
                  className="bg-white"
                  placeholder="Leave empty if variable"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_location" className="text-navy font-semibold">Start Location</Label>
                <Input
                  id="start_location"
                  value={formData.start_location}
                  onChange={(e) => setFormData({ ...formData, start_location: e.target.value })}
                  className="bg-white"
                  placeholder="e.g., Central Station"
                />
              </div>

              <div>
                <Label htmlFor="end_location" className="text-navy font-semibold">End Location</Label>
                <Input
                  id="end_location"
                  value={formData.end_location}
                  onChange={(e) => setFormData({ ...formData, end_location: e.target.value })}
                  className="bg-white"
                  placeholder="e.g., Market Square"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="google_maps_url" className="text-navy font-semibold">Google Maps URL</Label>
              <Input
                id="google_maps_url"
                value={formData.google_maps_url}
                onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
                className="bg-white"
                placeholder="e.g., https://maps.app.goo.gl/..."
              />
            </div>

            <div>
              <Label className="text-navy font-semibold">Languages*</Label>
              <div className="border rounded-lg p-3 space-y-2 bg-white">
                <div className="flex flex-wrap gap-2">
                  {formData.languages.map((lang) => (
                    <Badge key={lang} className="bg-blue-100 text-blue-900 border border-blue-300 hover:bg-blue-200 flex items-center gap-1">
                      {lang}
                      <X
                        className="h-3 w-3 cursor-pointer hover:bg-blue-300/50 rounded"
                        onClick={() => setFormData({ ...formData, languages: formData.languages.filter(l => l !== lang) })}
                      />
                    </Badge>
                  ))}
                  {formData.languages.length === 0 && (
                    <span className="text-sm text-muted-foreground">No languages selected</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (!formData.languages.includes(value)) {
                        setFormData({ ...formData, languages: [...formData.languages, value] });
                      }
                    }}
                  >
                    <SelectTrigger className="bg-white flex-1">
                      <SelectValue placeholder="Select from list..." />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.filter(lang => !formData.languages.includes(lang)).map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2 flex-1">
                    <Input
                      value={customLanguage}
                      onChange={(e) => setCustomLanguage(e.target.value)}
                      placeholder="Or type custom language..."
                      className="bg-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const lang = customLanguage.trim();
                          if (lang && !formData.languages.includes(lang)) {
                            setFormData({ ...formData, languages: [...formData.languages, lang] });
                            setCustomLanguage('');
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const lang = customLanguage.trim();
                        if (lang && !formData.languages.includes(lang)) {
                          setFormData({ ...formData, languages: [...formData.languages, lang] });
                          setCustomLanguage('');
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-navy font-semibold">Themes (Multilingual)</Label>
              <div className="border rounded-lg p-3 space-y-3 bg-white">
                {/* Existing themes */}
                <div className="flex flex-wrap gap-2">
                  {formData.themes.map((theme, index) => (
                    <Badge key={index} className="bg-purple-100 text-purple-900 border border-purple-300 hover:bg-purple-200 flex items-center gap-1 py-1">
                      <span className="font-medium">{theme.nl}</span>
                      {theme.en && <span className="text-xs opacity-70">| {theme.en}</span>}
                      <X
                        className="h-3 w-3 cursor-pointer hover:bg-purple-300/50 rounded ml-1"
                        onClick={() => setFormData({ ...formData, themes: formData.themes.filter((_, i) => i !== index) })}
                      />
                    </Badge>
                  ))}
                  {formData.themes.length === 0 && (
                    <span className="text-sm text-muted-foreground">No themes added</span>
                  )}
                </div>
                {/* Add new theme with translations */}
                <div className="border-t pt-3 space-y-2">
                  <p className="text-sm text-muted-foreground">Add a new theme (all languages required):</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Dutch (NL) *</Label>
                      <Input
                        value={customTheme.nl}
                        onChange={(e) => setCustomTheme({ ...customTheme, nl: e.target.value })}
                        placeholder="e.g., architectuur"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">English (EN) *</Label>
                      <Input
                        value={customTheme.en || ''}
                        onChange={(e) => setCustomTheme({ ...customTheme, en: e.target.value })}
                        placeholder="e.g., architecture"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">French (FR) *</Label>
                      <Input
                        value={customTheme.fr || ''}
                        onChange={(e) => setCustomTheme({ ...customTheme, fr: e.target.value })}
                        placeholder="e.g., architecture"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">German (DE) *</Label>
                      <Input
                        value={customTheme.de || ''}
                        onChange={(e) => setCustomTheme({ ...customTheme, de: e.target.value })}
                        placeholder="e.g., Architektur"
                        className="bg-white"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const nlTheme = customTheme.nl.trim();
                      const enTheme = customTheme.en?.trim() || '';
                      const frTheme = customTheme.fr?.trim() || '';
                      const deTheme = customTheme.de?.trim() || '';
                      if (nlTheme && enTheme && frTheme && deTheme) {
                        const newTheme: ThemeTranslation = {
                          nl: nlTheme,
                          en: enTheme,
                          fr: frTheme,
                          de: deTheme,
                        };
                        setFormData({ ...formData, themes: [...formData.themes, newTheme] });
                        setCustomTheme({ nl: '', en: '', fr: '', de: '' });
                      }
                    }}
                    disabled={!customTheme.nl.trim() || !customTheme.en?.trim() || !customTheme.fr?.trim() || !customTheme.de?.trim()}
                  >
                    Add Theme
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-navy font-semibold">Description (All Languages Required)*</Label>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="description" className="text-xs text-muted-foreground">Dutch (NL) *</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Gedetailleerde beschrijving van de tour..."
                    required
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="description_en" className="text-xs text-muted-foreground">English (EN) *</Label>
                  <Textarea
                    id="description_en"
                    rows={3}
                    value={formData.description_en}
                    onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                    placeholder="Detailed description of the tour..."
                    required
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="description_fr" className="text-xs text-muted-foreground">French (FR) *</Label>
                  <Textarea
                    id="description_fr"
                    rows={3}
                    value={formData.description_fr}
                    onChange={(e) => setFormData({ ...formData, description_fr: e.target.value })}
                    placeholder="Description détaillée de la visite..."
                    required
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="description_de" className="text-xs text-muted-foreground">German (DE) *</Label>
                  <Textarea
                    id="description_de"
                    rows={3}
                    value={formData.description_de}
                    onChange={(e) => setFormData({ ...formData, description_de: e.target.value })}
                    placeholder="Detaillierte Beschreibung der Tour..."
                    required
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="notes" className="text-navy font-semibold">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes or special instructions..."
                className="bg-white"
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="local_stories"
                  checked={formData.local_stories}
                  onCheckedChange={(checked) => setFormData({ ...formData, local_stories: checked === true })}
                />
                <Label htmlFor="local_stories" className="text-navy font-semibold cursor-pointer">
                  Local Stories
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="op_maat"
                  checked={formData.op_maat}
                  onCheckedChange={(checked) => setFormData({ ...formData, op_maat: checked === true })}
                />
                <Label htmlFor="op_maat" className="text-navy font-semibold cursor-pointer">
                  Op Maat (Customizable)
                </Label>
              </div>
            </div>

            {/* Op Maat Form Configuration */}
            {formData.op_maat && (
              <div className="space-y-6 border-t pt-6 mt-6">
                <div>
                  <h3 className="text-lg font-semibold text-navy mb-4">Op Maat Form Configuration</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Customize the form questions that customers will see when booking this tour.
                  </p>
                </div>

                {/* Start & End Location */}
                <div className="space-y-4 border rounded-lg p-4">
                  <h4 className="font-semibold text-navy">Start & End Location</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Label (NL)</Label>
                      <Input
                        value={formData.op_maat_form_config?.startEnd?.label?.nl || ''}
                        onChange={(e) => updateOpMaatFormConfig('startEnd', 'label', 'nl', e.target.value)}
                        placeholder="Waar wil je beginnen en eindigen?"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Placeholder (NL)</Label>
                      <Input
                        value={formData.op_maat_form_config?.startEnd?.placeholder?.nl || ''}
                        onChange={(e) => updateOpMaatFormConfig('startEnd', 'placeholder', 'nl', e.target.value)}
                        placeholder="Bijvoorbeeld: Start bij Centraal Station..."
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* City Part */}
                <div className="space-y-4 border rounded-lg p-4">
                  <h4 className="font-semibold text-navy">City Part</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Label (NL)</Label>
                      <Input
                        value={formData.op_maat_form_config?.cityPart?.label?.nl || ''}
                        onChange={(e) => updateOpMaatFormConfig('cityPart', 'label', 'nl', e.target.value)}
                        placeholder="Welk deel van de stad wil je ontdekken?"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Placeholder (NL)</Label>
                      <Input
                        value={formData.op_maat_form_config?.cityPart?.placeholder?.nl || ''}
                        onChange={(e) => updateOpMaatFormConfig('cityPart', 'placeholder', 'nl', e.target.value)}
                        placeholder="Bijvoorbeeld: De historische binnenstad..."
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Subjects */}
                <div className="space-y-4 border rounded-lg p-4">
                  <h4 className="font-semibold text-navy">Subjects</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Label (NL)</Label>
                      <Input
                        value={formData.op_maat_form_config?.subjects?.label?.nl || ''}
                        onChange={(e) => updateOpMaatFormConfig('subjects', 'label', 'nl', e.target.value)}
                        placeholder="Welke onderwerpen interesseren je?"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Placeholder (NL)</Label>
                      <Input
                        value={formData.op_maat_form_config?.subjects?.placeholder?.nl || ''}
                        onChange={(e) => updateOpMaatFormConfig('subjects', 'placeholder', 'nl', e.target.value)}
                        placeholder="Bijvoorbeeld: Architectuur, geschiedenis..."
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Special Wishes */}
                <div className="space-y-4 border rounded-lg p-4">
                  <h4 className="font-semibold text-navy">Special Wishes</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Label (NL)</Label>
                      <Input
                        value={formData.op_maat_form_config?.specialWishes?.label?.nl || ''}
                        onChange={(e) => updateOpMaatFormConfig('specialWishes', 'label', 'nl', e.target.value)}
                        placeholder="Heb je speciale wensen of opmerkingen?"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Placeholder (NL)</Label>
                      <Input
                        value={formData.op_maat_form_config?.specialWishes?.placeholder?.nl || ''}
                        onChange={(e) => updateOpMaatFormConfig('specialWishes', 'placeholder', 'nl', e.target.value)}
                        placeholder="Bijvoorbeeld: Toegankelijkheid..."
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Note: If left empty, default translations will be used. Only Dutch (NL) fields are shown here for simplicity.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Saving...' : editingTour ? 'Update Tour' : 'Create Tour'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* City CRUD Dialog */}
      <Dialog open={cityDialogOpen} onOpenChange={setCityDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNewCity ? 'Create New City' : 'Edit City'}</DialogTitle>
            <DialogDescription>
              {isNewCity ? 'Create a new city entry' : 'Update city information'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCitySubmit} className="space-y-4">
            <div>
              <Label htmlFor="city-slug" className="text-navy font-semibold">Slug*</Label>
              <Input
                id="city-slug"
                value={cityFormData.slug}
                onChange={(e) => setCityFormData({ ...cityFormData, slug: e.target.value })}
                required
                disabled={!isNewCity}
                className="bg-white"
                placeholder="e.g., antwerpen"
              />
              {!isNewCity && (
                <p className="text-xs text-muted-foreground mt-1">Slug cannot be changed for existing cities</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city-name-nl" className="text-navy font-semibold">Name (NL)*</Label>
                <Input
                  id="city-name-nl"
                  value={cityFormData.name_nl || ''}
                  onChange={(e) => setCityFormData({ ...cityFormData, name_nl: e.target.value || null })}
                  required
                  className="bg-white"
                />
              </div>
              <div>
                <Label htmlFor="city-name-en" className="text-navy font-semibold">Name (EN)*</Label>
                <Input
                  id="city-name-en"
                  value={cityFormData.name_en || ''}
                  onChange={(e) => setCityFormData({ ...cityFormData, name_en: e.target.value || null })}
                  required
                  className="bg-white"
                />
              </div>
              <div>
                <Label htmlFor="city-name-fr" className="text-navy font-semibold">Name (FR)*</Label>
                <Input
                  id="city-name-fr"
                  value={cityFormData.name_fr || ''}
                  onChange={(e) => setCityFormData({ ...cityFormData, name_fr: e.target.value || null })}
                  required
                  className="bg-white"
                />
              </div>
              <div>
                <Label htmlFor="city-name-de" className="text-navy font-semibold">Name (DE)*</Label>
                <Input
                  id="city-name-de"
                  value={cityFormData.name_de || ''}
                  onChange={(e) => setCityFormData({ ...cityFormData, name_de: e.target.value || null })}
                  required
                  className="bg-white"
                />
              </div>
            </div>

            {/* Tours Page Section */}
            <div className="border-t pt-4 mt-2">
              <h4 className="text-sm font-bold text-navy mb-3 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">TOURS PAGE</span>
                Teaser Text (shown on city cards on /tours page)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city-teaser-nl" className="text-navy font-semibold">Teaser (NL)*</Label>
                  <Textarea
                    id="city-teaser-nl"
                    value={cityFormData.teaser_nl || ''}
                    onChange={(e) => setCityFormData({ ...cityFormData, teaser_nl: e.target.value || null })}
                    required
                    rows={3}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="city-teaser-en" className="text-navy font-semibold">Teaser (EN)*</Label>
                  <Textarea
                    id="city-teaser-en"
                    value={cityFormData.teaser_en || ''}
                    onChange={(e) => setCityFormData({ ...cityFormData, teaser_en: e.target.value || null })}
                    required
                    rows={3}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="city-teaser-fr" className="text-navy font-semibold">Teaser (FR)*</Label>
                  <Textarea
                    id="city-teaser-fr"
                    value={cityFormData.teaser_fr || ''}
                    onChange={(e) => setCityFormData({ ...cityFormData, teaser_fr: e.target.value || null })}
                    required
                    rows={3}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="city-teaser-de" className="text-navy font-semibold">Teaser (DE)*</Label>
                  <Textarea
                    id="city-teaser-de"
                    value={cityFormData.teaser_de || ''}
                    onChange={(e) => setCityFormData({ ...cityFormData, teaser_de: e.target.value || null })}
                    required
                    rows={3}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Homepage Section */}
            <div className="border-t pt-4 mt-2">
              <h4 className="text-sm font-bold text-navy mb-3 flex items-center gap-2">
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">HOMEPAGE</span>
                Tagline (short text shown on homepage city wheel)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city-homepage-tagline-nl" className="text-navy font-semibold">Tagline (NL)</Label>
                  <Input
                    id="city-homepage-tagline-nl"
                    value={cityFormData.homepage_tagline_nl || ''}
                    onChange={(e) => setCityFormData({ ...cityFormData, homepage_tagline_nl: e.target.value || null })}
                    className="bg-white"
                    placeholder="e.g., De hoofdstad van België"
                  />
                </div>
                <div>
                  <Label htmlFor="city-homepage-tagline-en" className="text-navy font-semibold">Tagline (EN)</Label>
                  <Input
                    id="city-homepage-tagline-en"
                    value={cityFormData.homepage_tagline_en || ''}
                    onChange={(e) => setCityFormData({ ...cityFormData, homepage_tagline_en: e.target.value || null })}
                    className="bg-white"
                    placeholder="e.g., The capital of Belgium"
                  />
                </div>
                <div>
                  <Label htmlFor="city-homepage-tagline-fr" className="text-navy font-semibold">Tagline (FR)</Label>
                  <Input
                    id="city-homepage-tagline-fr"
                    value={cityFormData.homepage_tagline_fr || ''}
                    onChange={(e) => setCityFormData({ ...cityFormData, homepage_tagline_fr: e.target.value || null })}
                    className="bg-white"
                    placeholder="e.g., La capitale de la Belgique"
                  />
                </div>
                <div>
                  <Label htmlFor="city-homepage-tagline-de" className="text-navy font-semibold">Tagline (DE)</Label>
                  <Input
                    id="city-homepage-tagline-de"
                    value={cityFormData.homepage_tagline_de || ''}
                    onChange={(e) => setCityFormData({ ...cityFormData, homepage_tagline_de: e.target.value || null })}
                    className="bg-white"
                    placeholder="e.g., Die Hauptstadt Belgiens"
                  />
                </div>
              </div>
            </div>

            <div className="mt-2">
              <h4 className="text-sm font-bold text-navy mb-3 flex items-center gap-2">
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">HOMEPAGE</span>
                Description (longer text shown on homepage city wheel)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city-homepage-desc-nl" className="text-navy font-semibold">Description (NL)</Label>
                  <Textarea
                    id="city-homepage-desc-nl"
                    value={cityFormData.homepage_description_nl || ''}
                    onChange={(e) => setCityFormData({ ...cityFormData, homepage_description_nl: e.target.value || null })}
                    rows={3}
                    className="bg-white"
                    placeholder="Langere beschrijving voor de homepage..."
                  />
                </div>
                <div>
                  <Label htmlFor="city-homepage-desc-en" className="text-navy font-semibold">Description (EN)</Label>
                  <Textarea
                    id="city-homepage-desc-en"
                    value={cityFormData.homepage_description_en || ''}
                    onChange={(e) => setCityFormData({ ...cityFormData, homepage_description_en: e.target.value || null })}
                    rows={3}
                    className="bg-white"
                    placeholder="Longer description for the homepage..."
                  />
                </div>
                <div>
                  <Label htmlFor="city-homepage-desc-fr" className="text-navy font-semibold">Description (FR)</Label>
                  <Textarea
                    id="city-homepage-desc-fr"
                    value={cityFormData.homepage_description_fr || ''}
                    onChange={(e) => setCityFormData({ ...cityFormData, homepage_description_fr: e.target.value || null })}
                    rows={3}
                    className="bg-white"
                    placeholder="Description plus longue pour la page d'accueil..."
                  />
                </div>
                <div>
                  <Label htmlFor="city-homepage-desc-de" className="text-navy font-semibold">Description (DE)</Label>
                  <Textarea
                    id="city-homepage-desc-de"
                    value={cityFormData.homepage_description_de || ''}
                    onChange={(e) => setCityFormData({ ...cityFormData, homepage_description_de: e.target.value || null })}
                    rows={3}
                    className="bg-white"
                    placeholder="Längere Beschreibung für die Homepage..."
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city-cta-nl" className="text-navy font-semibold">CTA Text (NL)</Label>
                <Input
                  id="city-cta-nl"
                  value={cityFormData.cta_text_nl || ''}
                  onChange={(e) => setCityFormData({ ...cityFormData, cta_text_nl: e.target.value || null })}
                  className="bg-white"
                />
              </div>
              <div>
                <Label htmlFor="city-cta-en" className="text-navy font-semibold">CTA Text (EN)</Label>
                <Input
                  id="city-cta-en"
                  value={cityFormData.cta_text_en || ''}
                  onChange={(e) => setCityFormData({ ...cityFormData, cta_text_en: e.target.value || null })}
                  className="bg-white"
                />
              </div>
              <div>
                <Label htmlFor="city-cta-fr" className="text-navy font-semibold">CTA Text (FR)</Label>
                <Input
                  id="city-cta-fr"
                  value={cityFormData.cta_text_fr || ''}
                  onChange={(e) => setCityFormData({ ...cityFormData, cta_text_fr: e.target.value || null })}
                  className="bg-white"
                />
              </div>
              <div>
                <Label htmlFor="city-cta-de" className="text-navy font-semibold">CTA Text (DE)</Label>
                <Input
                  id="city-cta-de"
                  value={cityFormData.cta_text_de || ''}
                  onChange={(e) => setCityFormData({ ...cityFormData, cta_text_de: e.target.value || null })}
                  className="bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city-coming-soon-nl" className="text-navy font-semibold">Coming Soon Text (NL)</Label>
                <Input
                  id="city-coming-soon-nl"
                  value={cityFormData.coming_soon_text_nl || ''}
                  onChange={(e) => setCityFormData({ ...cityFormData, coming_soon_text_nl: e.target.value || null })}
                  className="bg-white"
                  placeholder="e.g., VERWACHT 2025"
                />
              </div>
              <div>
                <Label htmlFor="city-coming-soon-en" className="text-navy font-semibold">Coming Soon Text (EN)</Label>
                <Input
                  id="city-coming-soon-en"
                  value={cityFormData.coming_soon_text_en || ''}
                  onChange={(e) => setCityFormData({ ...cityFormData, coming_soon_text_en: e.target.value || null })}
                  className="bg-white"
                  placeholder="e.g., COMING 2025"
                />
              </div>
              <div>
                <Label htmlFor="city-coming-soon-fr" className="text-navy font-semibold">Coming Soon Text (FR)</Label>
                <Input
                  id="city-coming-soon-fr"
                  value={cityFormData.coming_soon_text_fr || ''}
                  onChange={(e) => setCityFormData({ ...cityFormData, coming_soon_text_fr: e.target.value || null })}
                  className="bg-white"
                  placeholder="e.g., PRÉVU 2025"
                />
              </div>
              <div>
                <Label htmlFor="city-coming-soon-de" className="text-navy font-semibold">Coming Soon Text (DE)</Label>
                <Input
                  id="city-coming-soon-de"
                  value={cityFormData.coming_soon_text_de || ''}
                  onChange={(e) => setCityFormData({ ...cityFormData, coming_soon_text_de: e.target.value || null })}
                  className="bg-white"
                  placeholder="e.g., ERWARTET 2025"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="city-status" className="text-navy font-semibold">Status*</Label>
              <Select
                value={cityFormData.status || 'draft'}
                onValueChange={(value) => setCityFormData({ ...cityFormData, status: value as 'draft' | 'live' | 'coming-soon' })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="coming-soon">Coming Soon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              {!isNewCity && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleCityDelete}
                  className="mr-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setCityDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={cityUploading} className="btn-primary">
                {cityUploading ? 'Saving...' : isNewCity ? 'Create City' : 'Update City'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* City Image Dialog */}
      <Dialog open={cityImageDialogOpen} onOpenChange={setCityImageDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Image for {selectedCity?.name_nl || selectedCity?.slug}</DialogTitle>
            <DialogDescription>
              Upload or update the photo image for this city
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>City Photo</Label>
              <div
                className={`relative rounded-lg border-2 border-dashed p-6 transition-colors ${
                  cityImageDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'
                }`}
                onDragEnter={handleCityImageDrag}
                onDragLeave={handleCityImageDrag}
                onDragOver={handleCityImageDrag}
                onDrop={handleCityImageDrop}
              >
                {photoPreview ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                    <Image
                      src={photoPreview}
                      alt="Photo preview"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute right-2 top-2 flex gap-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <Upload className="h-12 w-12 text-gray-400" />
                    <div className="text-center">
                      <p className="text-sm text-gray-600">
                        Drag and drop an image here, or click to select
                      </p>
                      <p className="mt-1 text-xs text-gray-500">PNG, JPG, WEBP up to 50MB</p>
                    </div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleCityImageFileInput}
                      className="hidden"
                      id="city-photo-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('city-photo-upload')?.click()}
                    >
                      Select Photo
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCityImageDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCityImageSave} disabled={cityUploading}>
              {cityUploading ? 'Uploading...' : 'Save Image'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
