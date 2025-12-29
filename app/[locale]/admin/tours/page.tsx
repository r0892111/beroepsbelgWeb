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
import { Home, LogOut, RefreshCw, Plus, Pencil, Trash2, MapPin, X, Search, Image as ImageIcon, GripVertical, ChevronDown, ChevronUp, Upload } from 'lucide-react';
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
}

interface TourFormData {
  city: string;
  title: string;
  type: string;
  duration_minutes: number;
  price: number | null;
  start_location: string;
  end_location: string;
  languages: string[];
  description: string;
  notes: string;
  options: Record<string, any>;
  themes: string[];
  local_stories: boolean;
  op_maat: boolean;
}

const LANGUAGE_OPTIONS = ['Nederlands', 'Engels', 'Frans', 'Duits', 'Spaans', 'Italiaans'];
const TOUR_TYPE_OPTIONS = ['Walking', 'Biking', 'Bus', 'Private', 'Group', 'Boat', 'Food', 'Custom'];

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
  slug: string;
  name_nl: string | null;
  name_en: string | null;
  name_fr: string | null;
  name_de: string | null;
  teaser_nl: string | null;
  teaser_en: string | null;
  teaser_fr: string | null;
  teaser_de: string | null;
  cta_text_nl: string | null;
  cta_text_en: string | null;
  cta_text_fr: string | null;
  cta_text_de: string | null;
  coming_soon_text_nl: string | null;
  coming_soon_text_en: string | null;
  coming_soon_text_fr: string | null;
  coming_soon_text_de: string | null;
  image: string | null;
  status: 'live' | 'coming-soon' | null;
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
    slug: '',
    name_nl: null,
    name_en: null,
    name_fr: null,
    name_de: null,
    teaser_nl: null,
    teaser_en: null,
    teaser_fr: null,
    teaser_de: null,
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
  });
  const [isNewCity, setIsNewCity] = useState(false);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

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
    type: '',
    duration_minutes: 120,
    price: null,
    start_location: '',
    end_location: '',
    languages: [],
    description: '',
    notes: '',
    options: {},
    themes: [],
    local_stories: false,
    op_maat: false,
  });
  
  // Custom language input state
  const [customLanguage, setCustomLanguage] = useState('');
  
  // Custom theme input state
  const [customTheme, setCustomTheme] = useState('');
  
  // Custom tour type input state
  const [customTourType, setCustomTourType] = useState('');

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
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('Failed to fetch tours:', fetchError);
        setError('Failed to load tours');
        return;
      }

      console.log('Fetched tours:', data);
      const fetchedTours = (data as Tour[]) || [];
      setTours(fetchedTours);
      
      // Expand all cities by default
      const cities = new Set(fetchedTours.map(t => t.city));
      setExpandedCities(cities);
    } catch (err) {
      console.error('Failed to fetch tours:', err);
      setError('Failed to load tours');
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('cities')
        .select('*')
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('slug', { ascending: true });

      if (fetchError) {
        console.error('Failed to fetch cities:', fetchError);
        return;
      }

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
      type: '',
      duration_minutes: 120,
      price: null,
      start_location: '',
      end_location: '',
      languages: [],
      description: '',
      notes: '',
      options: {},
      themes: [],
      local_stories: false,
      op_maat: false,
    });
    setCustomLanguage('');
    setCustomTheme('');
    setCustomTourType('');
    setDialogOpen(true);
  };

  const openEditDialog = (tour: Tour) => {
    setEditingTour(tour);
    // Check if tour type is in the predefined options
    const isCustomType = tour.type && !TOUR_TYPE_OPTIONS.includes(tour.type);
    setFormData({
      city: tour.city || '',
      title: tour.title || '',
      type: isCustomType ? 'Custom' : (tour.type || ''),
      duration_minutes: tour.duration_minutes || 120,
      price: tour.price,
      start_location: tour.start_location || '',
      end_location: tour.end_location || '',
      languages: Array.isArray(tour.languages) ? tour.languages : [],
      description: tour.description || '',
      notes: tour.notes || '',
      options: tour.options || {},
      themes: Array.isArray(tour.themes) ? tour.themes : [],
      local_stories: Boolean(tour.local_stories === true || (tour.local_stories as any) === 'true' || (tour.local_stories as any) === 1),
      op_maat: Boolean(tour.op_maat === true || (tour.op_maat as any) === 'true' || (tour.op_maat as any) === 1),
    });
    setCustomLanguage('');
    setCustomTheme('');
    setCustomTourType(isCustomType ? tour.type : '');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Get city ID from dropdown (formData.city now contains city ID)
      const cityId = formData.city;
      
      if (!cityId) {
        toast.error('Please select a city');
        setSubmitting(false);
        return;
      }
      
      // Find the selected city to get name_nl for backward compatibility
      const selectedCity = cities.find(c => c.id === cityId);
      
      const payload = {
        city_id: cityId, // Store city_id foreign key
        city: selectedCity?.name_nl || '', // Keep city name for backward compatibility
        title: formData.title,
        type: customTourType.trim() || formData.type,
        duration_minutes: formData.duration_minutes,
        price: formData.price,
        start_location: formData.start_location || null,
        end_location: formData.end_location || null,
        languages: formData.languages,
        description: formData.description,
        notes: formData.notes || null,
        options: formData.options || {},
        themes: formData.themes || [],
        local_stories: formData.local_stories || false,
        op_maat: formData.op_maat || false,
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

      if (error) throw error;
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
    const citySlug = cityId ? cities.find(c => c.id === cityId)?.slug : tour.city;
    
    const matchesSearch = !searchQuery || 
      tour.title?.toLowerCase().includes(searchLower) ||
      tour.description?.toLowerCase().includes(searchLower) ||
      citySlug?.toLowerCase().includes(searchLower) ||
      tour.city?.toLowerCase().includes(searchLower);

    // City filter - match by city_id or city slug
    let matchesCity = filterCity === 'all';
    if (!matchesCity) {
      if (cityId) {
        // Find city by ID and match slug
        const tourCity = cities.find(c => c.id === cityId);
        matchesCity = tourCity?.slug === filterCity;
      } else {
        // Fallback: match by city name/slug
        matchesCity = tour.city === filterCity;
      }
    }

    // Type filter
    const matchesType = filterType === 'all' || tour.type === filterType;

    return matchesSearch && matchesCity && matchesType;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCity('all');
    setFilterType('all');
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  // Group tours by city_id (using city slug as key for display)
  const toursByCity = useMemo(() => {
    const grouped = filteredTours.reduce((acc, tour) => {
      // Use city_id to find the city, fallback to city slug/name matching
      const tourWithCityId = tour as any;
      const cityId = tourWithCityId.city_id;
      let cityKey: string;
      
      if (cityId) {
        // Find city by ID
        const matchedCity = cities.find(c => c.id === cityId);
        cityKey = matchedCity?.slug || cityId;
      } else {
        // Fallback: try to match by city name/slug (for backwards compatibility)
        const matchedCity = cities.find(c => 
          c.name_nl === tour.city || 
          c.name_en === tour.city || 
          c.name_fr === tour.city || 
          c.name_de === tour.city ||
          c.slug === tour.city
        );
        cityKey = matchedCity?.slug || citySlugify(tour.city);
      }
      
      if (!acc[cityKey]) {
        acc[cityKey] = [];
      }
      acc[cityKey].push(tour);
      return acc;
    }, {} as Record<string, Tour[]>);

    // Sort tours within each city by display_order (nulls last), then by created_at
    Object.keys(grouped).forEach(city => {
      grouped[city].sort((a, b) => {
        if (a.display_order === null && b.display_order === null) {
          return (a.created_at || '').localeCompare(b.created_at || '');
        }
        if (a.display_order === null) return 1;
        if (b.display_order === null) return -1;
        return a.display_order - b.display_order;
      });
    });

    return grouped;
  }, [filteredTours, matchTourCityToCity]);

  // Sort cities by display_order from cities table, then alphabetically
  // Show ALL cities from cities table, even those without tours
  const sortedCities = useMemo(() => {
    // Start with all cities from cities table
    const allCitySlugs = new Set<string>();
    cities.forEach(c => allCitySlugs.add(c.slug));
    
    // Also add any tour cities that don't have a matching city entry (for backwards compatibility)
    Object.keys(toursByCity).forEach(tourCityKey => {
      const matchedCity = cities.find(c => c.slug === tourCityKey);
      if (!matchedCity) {
        // This is a tour city that doesn't exist in cities table yet
        allCitySlugs.add(tourCityKey);
      }
    });
    
    // Create a map of city slugs to their display_order
    const cityOrderMap = new Map<string, number>();
    cities.forEach(city => {
      cityOrderMap.set(city.slug, city.display_order ?? 9999);
    });
    
    return Array.from(allCitySlugs).sort((a, b) => {
      const orderA = cityOrderMap.get(a) ?? 9999;
      const orderB = cityOrderMap.get(b) ?? 9999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.localeCompare(b);
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

  const handleDragEnd = async (event: DragEndEvent, city: string) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // Get current tours for this city from state, sorted by display_order
    const cityTours = tours
      .filter(t => t.city === city)
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

    // Update the tours state - replace all tours for this city with reordered ones
    const updatedTours = tours.map(tour => {
      // Match by city_id or city slug
      const tourWithCityId = tour as any;
      const cityId = tourWithCityId.city_id;
      const matchesCity = cityId 
        ? cities.find(c => c.id === cityId)?.slug === city
        : tour.city === city;
      
      if (matchesCity) {
        const updatedTour = updatedToursMap.get(tour.id);
        return updatedTour || tour;
      }
      return tour;
    });
    
    // Set state immediately to update UI
    setTours(updatedTours);

    // Update display_order in database
    try {
      // Update all tours in this city with their new display_order
      for (const tour of reorderedToursWithOrder) {
        const { error } = await supabase
          .from('tours_table_prod')
          .update({ display_order: tour.display_order })
          .eq('id', tour.id);

        if (error) {
          console.error('Failed to update display_order:', error);
          throw error;
        }
      }

      toast.success(`Tour order updated for ${city}`);
    } catch (err) {
      console.error('Failed to update tour order:', err);
      toast.error('Failed to update tour order');
      // Revert on error
      void fetchTours();
    }
  };

  // City drag and drop handler
  const handleCityDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = cities.findIndex(c => c.slug === active.id);
    const newIndex = cities.findIndex(c => c.slug === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Optimistically update UI
    const reorderedCities = arrayMove(cities, oldIndex, newIndex);
    const reorderedCitiesWithOrder = reorderedCities.map((city, index) => ({
      ...city,
      display_order: index + 1,
    }));

    setCities(reorderedCitiesWithOrder);

    // Update display_order in database
    try {
      for (const city of reorderedCitiesWithOrder) {
        const { error } = await supabase
          .from('cities')
          .update({ display_order: city.display_order })
          .eq('slug', city.slug);

        if (error) {
          console.error('Failed to update city display_order:', error);
          throw error;
        }
      }

      toast.success('City order updated');
    } catch (err) {
      console.error('Failed to update city order:', err);
      toast.error('Failed to update city order');
      // Revert on error
      void fetchCities();
    }
  };

  // City CRUD functions
  const openCityDialog = (city?: CityData) => {
    if (city) {
      // Check if city exists in cities table
      const existsInDb = cities.some(c => c.slug === city.slug);
      setSelectedCity(city);
      setIsNewCity(!existsInDb);
      setCityFormData({
        slug: city.slug,
        name_nl: city.name_nl,
        name_en: city.name_en,
        name_fr: city.name_fr,
        name_de: city.name_de,
        teaser_nl: city.teaser_nl,
        teaser_en: city.teaser_en,
        teaser_fr: city.teaser_fr,
        teaser_de: city.teaser_de,
        cta_text_nl: city.cta_text_nl,
        cta_text_en: city.cta_text_en,
        cta_text_fr: city.cta_text_fr,
        cta_text_de: city.cta_text_de,
        coming_soon_text_nl: city.coming_soon_text_nl,
        coming_soon_text_en: city.coming_soon_text_en,
        coming_soon_text_fr: city.coming_soon_text_fr,
        coming_soon_text_de: city.coming_soon_text_de,
        image: city.image,
        status: city.status || 'live',
        display_order: city.display_order,
      });
    } else {
      setSelectedCity(null);
      setIsNewCity(true);
      setCityFormData({
        slug: '',
        name_nl: null,
        name_en: null,
        name_fr: null,
        name_de: null,
        teaser_nl: null,
        teaser_en: null,
        teaser_fr: null,
        teaser_de: null,
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
        // Create new city
        const { error } = await supabase
          .from('cities')
          .insert([payload]);

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

      // Update cities table directly
      const { error } = await supabase
        .from('cities')
        .update({ image: photoUrl })
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
  const SortableCityItem = ({ citySlug, cityTours }: { citySlug: string; cityTours: Tour[] }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: citySlug });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const cityData = cities.find(c => c.slug === citySlug);
    const cityImageUrl = cityData?.image || null;
    const isExpanded = expandedCities.has(citySlug);

    return (
      <Card
        ref={setNodeRef}
        style={style}
        className={`overflow-hidden ${isDragging ? 'bg-gray-100' : ''}`}
      >
        <CardHeader
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleCity(citySlug)}
        >
          <div className="flex items-center gap-3">
            {/* Drag handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-5 w-5 text-gray-400" />
            </div>
            
            {/* City image thumbnail */}
            {cityImageUrl && (
              <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden border">
                <Image
                  src={cityImageUrl}
                  alt={citySlug}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            
            {/* City info */}
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {cityData?.name_nl || citySlug}
                <Badge variant="outline" className="ml-2">
                  {cityTours.length} {cityTours.length === 1 ? 'tour' : 'tours'}
                </Badge>
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
                      slug: citySlug,
                      name_nl: citySlug,
                      name_en: null,
                      name_fr: null,
                      name_de: null,
                      teaser_nl: null,
                      teaser_en: null,
                      teaser_fr: null,
                      teaser_de: null,
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
                      slug: citySlug,
                      name_nl: citySlug,
                      name_en: null,
                      name_fr: null,
                      name_de: null,
                      teaser_nl: null,
                      teaser_en: null,
                      teaser_fr: null,
                      teaser_de: null,
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
                onDragEnd={(event) => handleDragEnd(event, citySlug)}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Title</TableHead>
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
                      {cityTours.map((tour) => (
                        <SortableTourItem
                          key={tour.id}
                          tour={tour}
                          city={citySlug}
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
  const SortableTourItem = ({ tour, city }: { tour: Tour; city: string }) => {
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
        <TableCell className="w-8">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline">{tour.city}</Badge>
        </TableCell>
        <TableCell className="font-medium max-w-xs">
          <div className="truncate">{tour.title}</div>
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
                  disabled={!searchQuery && filterCity === 'all' && filterType === 'all'}
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
                      <SelectItem key={city.id} value={city.id}>
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
                      {TOUR_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(searchQuery || filterCity !== 'all' || filterType !== 'all') && (
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
                    {sortedCities.map((city) => {
                      const cityTours = toursByCity[city] || []; // Handle cities without tours
                      return (
                        <SortableCityItem
                          key={city}
                          citySlug={city}
                          cityTours={cityTours}
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
                      <SelectItem key={city.id} value={city.id}>
                        {city.name_nl || city.slug}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="type" className="text-navy font-semibold">Tour Type*</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => {
                    setFormData({ ...formData, type: value });
                    if (value !== 'Custom') {
                      setCustomTourType(''); // Clear custom type when selecting from dropdown
                    }
                  }}
                  required={!customTourType.trim()}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOUR_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.type === 'Custom' && (
                  <div className="mt-2">
                    <Label htmlFor="customTourType" className="text-sm text-muted-foreground">Custom Tour Type*</Label>
                    <Input
                      id="customTourType"
                      value={customTourType}
                      onChange={(e) => {
                        setCustomTourType(e.target.value);
                        if (e.target.value.trim()) {
                          setFormData({ ...formData, type: '' }); // Clear dropdown selection when typing custom
                        }
                      }}
                      placeholder="e.g., Segway, Helicopter, Train..."
                      className="bg-white mt-1"
                      required
                    />
                  </div>
                )}
              </div>
            </div>

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
              <Label className="text-navy font-semibold">Themes</Label>
              <div className="border rounded-lg p-3 space-y-2 bg-white">
                <div className="flex flex-wrap gap-2">
                  {formData.themes.map((theme) => (
                    <Badge key={theme} className="bg-purple-100 text-purple-900 border border-purple-300 hover:bg-purple-200 flex items-center gap-1">
                      {theme}
                      <X
                        className="h-3 w-3 cursor-pointer hover:bg-purple-300/50 rounded"
                        onClick={() => setFormData({ ...formData, themes: formData.themes.filter(t => t !== theme) })}
                      />
                    </Badge>
                  ))}
                  {formData.themes.length === 0 && (
                    <span className="text-sm text-muted-foreground">No themes added</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customTheme}
                    onChange={(e) => setCustomTheme(e.target.value)}
                    placeholder="Type theme (e.g., architecture, fashion, history)..."
                    className="bg-white flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const theme = customTheme.trim();
                        if (theme && !formData.themes.includes(theme)) {
                          setFormData({ ...formData, themes: [...formData.themes, theme] });
                          setCustomTheme('');
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const theme = customTheme.trim();
                      if (theme && !formData.themes.includes(theme)) {
                        setFormData({ ...formData, themes: [...formData.themes, theme] });
                        setCustomTheme('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-navy font-semibold">Description*</Label>
              <Textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of the tour..."
                required
                className="bg-white"
              />
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
                value={cityFormData.status || 'live'}
                onValueChange={(value) => setCityFormData({ ...cityFormData, status: value as 'live' | 'coming-soon' })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
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
