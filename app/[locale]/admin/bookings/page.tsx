'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Home, LogOut, RefreshCw, Calendar, Search, Filter, X, ExternalLink, UserPlus, Users, AlertCircle, Plus, Hash } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getBookingTypeShortLabel } from '@/lib/utils';
import { formatBrusselsDateTime } from '@/lib/utils/timezone';

interface SelectedGuide {
  id: number;
  status?: 'offered' | 'declined' | 'accepted';
  offeredAt?: string;
  respondedAt?: string;
}

interface TourBooking {
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
  booking_type: string | null;
  aftercare_sent_at: string | null;
  selectedGuides: (number | SelectedGuide)[] | null;
}

interface Tour {
  id: string;
  title: string;
  city: string;
  price?: number;
  op_maat?: boolean;
  local_stories?: boolean;
}

interface CreateBookingForm {
  tourId: string;
  date: string;
  time: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  numberOfPeople: number;
  language: string;
  specialRequests: string;
  isPaid: boolean;
  customPrice: string; // Custom price per person (empty = use tour's default price)
  dealId: string; // TeamLeader deal ID (optional)
  // Extra fees for op_maat tours
  requestTanguy: boolean;
  extraHour: boolean;
  // Weekend and evening fees (can be manually overridden)
  weekendFee: boolean;
  eveningFee: boolean;
}

interface TeamLeaderDeal {
  id: string;
  title: string;
  reference: string | null;
  status: string;
  value: number | null;
  currency: string;
}

interface Guide {
  id: number;
  name: string | null;
}

export default function AdminBookingsPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [bookings, setBookings] = useState<TourBooking[]>([]);
  const [tours, setTours] = useState<Map<string, Tour>>(new Map());
  const [guides, setGuides] = useState<Map<number, Guide>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterBookingType, setFilterBookingType] = useState<string>('all');

  // Guide selection dialog state
  const [guideDialogOpen, setGuideDialogOpen] = useState(false);
  const [selectedBookingForGuide, setSelectedBookingForGuide] = useState<TourBooking | null>(null);
  const [allGuides, setAllGuides] = useState<Guide[]>([]);
  const [selectedNewGuideId, setSelectedNewGuideId] = useState<number | null>(null);
  const [sendingGuideOffer, setSendingGuideOffer] = useState(false);

  // Create booking dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [allTours, setAllTours] = useState<Tour[]>([]);
  const [createForm, setCreateForm] = useState<CreateBookingForm>({
    tourId: '',
    date: '',
    time: '14:00',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    numberOfPeople: 1,
    customPrice: '',
    language: 'nl',
    specialRequests: '',
    isPaid: false,
    dealId: '',
    requestTanguy: false,
    extraHour: false,
    weekendFee: false,
    eveningFee: false,
  });
  const [customLanguage, setCustomLanguage] = useState('');

  // TeamLeader deals state
  const [teamleaderDeals, setTeamleaderDeals] = useState<TeamLeaderDeal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [dealsError, setDealsError] = useState<string | null>(null);

  // IDs dialog state
  const [idsDialogOpen, setIdsDialogOpen] = useState(false);
  const [selectedBookingForIds, setSelectedBookingForIds] = useState<TourBooking | null>(null);

  // Duplicate booking warning dialog state
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [existingDuplicateBooking, setExistingDuplicateBooking] = useState<TourBooking | null>(null);

  const CITY_OPTIONS = ['Antwerpen', 'Brussel', 'Brugge', 'Gent', 'Knokke-Heist', 'Leuven', 'Mechelen', 'Hasselt'];
  const STATUS_OPTIONS = ['pending', 'payment_completed', 'pending_jotform_confirmation', 'pending_guide_confirmation', 'confirmed', 'completed', 'cancelled'];
  const LANGUAGE_OPTIONS = [
    { value: 'nl', label: 'Dutch (NL)' },
    { value: 'en', label: 'English (EN)' },
    { value: 'fr', label: 'French (FR)' },
    { value: 'de', label: 'German (DE)' },
    { value: 'es', label: 'Spanish (ES)' },
    { value: 'it', label: 'Italian (IT)' },
    { value: 'pt', label: 'Portuguese (PT)' },
    { value: 'zh', label: 'Chinese (ZH)' },
    { value: 'ja', label: 'Japanese (JA)' },
    { value: 'ko', label: 'Korean (KO)' },
    { value: 'ar', label: 'Arabic (AR)' },
    { value: 'ru', label: 'Russian (RU)' },
    { value: 'pl', label: 'Polish (PL)' },
    { value: 'tr', label: 'Turkish (TR)' },
    { value: 'hi', label: 'Hindi (HI)' },
    { value: 'el', label: 'Greek (EL)' },
    { value: 'sv', label: 'Swedish (SV)' },
    { value: 'no', label: 'Norwegian (NO)' },
    { value: 'da', label: 'Danish (DA)' },
    { value: 'fi', label: 'Finnish (FI)' },
    { value: 'cs', label: 'Czech (CS)' },
    { value: 'hu', label: 'Hungarian (HU)' },
    { value: 'ro', label: 'Romanian (RO)' },
    { value: 'he', label: 'Hebrew (HE)' },
    { value: 'th', label: 'Thai (TH)' },
    { value: 'other', label: 'Other (Custom)' },
  ];

  // Fee cost constants (same as used in create-checkout-session)
  const TANGUY_COST = 125;
  const EXTRA_HOUR_COST = 150;
  const WEEKEND_FEE_COST = 25;
  const EVENING_FEE_COST = 25;

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch bookings
      const { data: bookingsData, error: fetchError } = await supabase
        .from('tourbooking')
        .select('*')
        .order('id', { ascending: false });

      if (fetchError) {
        console.error('Failed to fetch bookings:', fetchError);
        setError('Failed to load bookings');
        return;
      }

      console.log('Fetched bookings:', bookingsData);
      setBookings((bookingsData as TourBooking[]) || []);

      // Fetch tours
      const { data: toursData } = await supabase
        .from('tours_table_prod')
        .select('id, title, city, price, op_maat, local_stories')
        .order('title', { ascending: true });

      if (toursData) {
        const toursMap = new Map<string, Tour>();
        toursData.forEach((tour: any) => {
          toursMap.set(tour.id, tour);
        });
        setTours(toursMap);
        setAllTours(toursData as Tour[]);
      }

      // Fetch guides
      const { data: guidesData } = await supabase
        .from('guides_temp')
        .select('id, name');

      if (guidesData) {
        const guidesMap = new Map<number, Guide>();
        const guidesList: Guide[] = [];
        guidesData.forEach((guide: any) => {
          guidesMap.set(guide.id, guide);
          guidesList.push(guide);
        });
        setGuides(guidesMap);
        setAllGuides(guidesList);
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (profile?.isAdmin || profile?.is_admin)) {
      void fetchBookings();
    }
  }, [user, profile]);

  const handleLogout = () => {
    signOut();
    router.push(`/${locale}`);
  };

  // Filter logic
  const filteredBookings = bookings.filter((booking) => {
    const searchLower = searchQuery.toLowerCase();
    // Get customer name from first invitee
    const customerName = (booking.invitees?.[0] as any)?.name?.toLowerCase() || '';
    const customerEmail = (booking.invitees?.[0] as any)?.email?.toLowerCase() || '';
    const matchesSearch = !searchQuery ||
      booking.id.toString().includes(searchLower) ||
      booking.city?.toLowerCase().includes(searchLower) ||
      booking.deal_id?.toLowerCase().includes(searchLower) ||
      customerName.includes(searchLower) ||
      customerEmail.includes(searchLower);

    const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;
    const matchesCity = filterCity === 'all' || booking.city === filterCity;
    const matchesBookingType = filterBookingType === 'all' || booking.booking_type === filterBookingType;

    return matchesSearch && matchesStatus && matchesCity && matchesBookingType;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterCity('all');
    setFilterBookingType('all');
  };

  // Helper to normalize selectedGuides entries to objects
  const normalizeGuide = (item: number | SelectedGuide): SelectedGuide => {
    if (typeof item === 'number') {
      return { id: item };
    }
    return item;
  };

  // Check if all originally offered guides have declined (and no guide is assigned)
  const needsNewGuide = (booking: TourBooking): boolean => {
    // Already has a guide assigned
    if (booking.guide_id) return false;
    
    // Must be in a status where a guide is needed
    const needsGuideStatuses = ['payment_completed', 'pending_guide_confirmation', 'quote_paid'];
    if (!needsGuideStatuses.includes(booking.status)) return false;
    
    const selectedGuides = (booking.selectedGuides || []).map(normalizeGuide);
    if (selectedGuides.length === 0) return false; // No guides in list
    
    // Check if there are guides that haven't been offered yet (no status or status undefined)
    const availableGuides = selectedGuides.filter(g => !g.status);
    if (availableGuides.length > 0) return false; // Still have guides to offer
    
    // Check if there are guides waiting for response
    const pendingGuides = selectedGuides.filter(g => g.status === 'offered');
    if (pendingGuides.length > 0) return false; // Still waiting for responses
    
    // All guides must have declined (no accepted, since guide_id would be set)
    const allDeclined = selectedGuides.every(g => g.status === 'declined');
    return allDeclined;
  };

  // Get guides that can be offered (exclude already in selectedGuides)
  const getAvailableGuides = (booking: TourBooking): Guide[] => {
    const selectedGuideIds = (booking.selectedGuides || []).map(item => {
      const g = normalizeGuide(item);
      return g.id;
    });
    return allGuides.filter(guide => !selectedGuideIds.includes(guide.id));
  };

  // Open guide selection dialog
  const handleOpenGuideDialog = (booking: TourBooking) => {
    setSelectedBookingForGuide(booking);
    setSelectedNewGuideId(null);
    setGuideDialogOpen(true);
  };

  // Send guide offer
  const handleSendGuideOffer = async () => {
    if (!selectedBookingForGuide || !selectedNewGuideId) return;
    
    setSendingGuideOffer(true);
    try {
      const accessToken = (await supabase.auth.getSession()).data.session?.access_token;
      if (!accessToken) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`/api/choose-guide/${selectedBookingForGuide.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ guideId: selectedNewGuideId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send guide offer');
      }

      toast.success('Guide offer sent successfully!');
      setGuideDialogOpen(false);
      setSelectedBookingForGuide(null);
      setSelectedNewGuideId(null);
      
      // Refresh bookings
      void fetchBookings();
    } catch (error) {
      console.error('Error sending guide offer:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send guide offer');
    } finally {
      setSendingGuideOffer(false);
    }
  };

  // Reset create form
  const resetCreateForm = () => {
    setCreateForm({
      tourId: '',
      date: '',
      time: '14:00',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      numberOfPeople: 1,
      customPrice: '',
      language: 'nl',
      specialRequests: '',
      isPaid: false,
      dealId: '',
      requestTanguy: false,
      extraHour: false,
      weekendFee: false,
      eveningFee: false,
    });
  };

  // Fetch TeamLeader deals
  const fetchTeamleaderDeals = async () => {
    setLoadingDeals(true);
    setDealsError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setDealsError('Not authenticated');
        return;
      }

      const response = await fetch('/api/admin/teamleader-deals', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch deals');
      }

      const data = await response.json();
      setTeamleaderDeals(data.deals || []);
    } catch (err) {
      console.error('Error fetching TeamLeader deals:', err);
      setDealsError(err instanceof Error ? err.message : 'Failed to load deals');
    } finally {
      setLoadingDeals(false);
    }
  };

  // Get selected tour info
  const selectedTour = createForm.tourId ? tours.get(createForm.tourId) : null;

  // Calculate fees based on selected options and date/time
  const isWeekend = (() => {
    if (!createForm.date) return false;
    const date = new Date(createForm.date);
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  })();

  const isEvening = (() => {
    if (!createForm.time) return false;
    const hour = parseInt(createForm.time.split(':')[0], 10);
    return hour >= 17;
  })();

  // Calculate fee amounts (admin can set any fee for any tour)
  const tanguyCost = createForm.requestTanguy ? TANGUY_COST : 0;
  const extraHourCost = createForm.extraHour ? EXTRA_HOUR_COST : 0;
  const weekendFeeCost = createForm.weekendFee ? WEEKEND_FEE_COST : 0;
  const eveningFeeCost = createForm.eveningFee ? EVENING_FEE_COST : 0;

  // Check for duplicate bookings before creating
  const checkForDuplicateBooking = async (): Promise<TourBooking | null> => {
    if (!createForm.tourId || !createForm.date) return null;

    const tourDatetime = `${createForm.date}T${createForm.time}:00`;

    // Check for existing booking with same tour and datetime
    const { data: existingBookings } = await supabase
      .from('tourbooking')
      .select('*')
      .eq('tour_id', createForm.tourId)
      .gte('tour_datetime', `${createForm.date}T00:00:00`)
      .lt('tour_datetime', `${createForm.date}T23:59:59`);

    if (existingBookings && existingBookings.length > 0) {
      return existingBookings[0] as TourBooking;
    }

    return null;
  };

  // Handle create booking submission
  const handleCreateBooking = async (skipDuplicateCheck = false) => {
    if (!createForm.tourId || !createForm.date || !createForm.customerName || !createForm.customerEmail) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check for duplicates first (unless we're skipping because user confirmed)
    if (!skipDuplicateCheck) {
      const existingBooking = await checkForDuplicateBooking();
      if (existingBooking) {
        setExistingDuplicateBooking(existingBooking);
        setDuplicateWarningOpen(true);
        return;
      }
    }

    setCreatingBooking(true);
    try {
      const tour = tours.get(createForm.tourId);
      if (!tour) {
        toast.error('Selected tour not found');
        return;
      }

      // Build tour datetime
      const tourDatetime = `${createForm.date}T${createForm.time}:00`;

      // Create invitee object
      // Use custom price if provided, otherwise use tour's default price
      const pricePerPerson = createForm.customPrice ? parseFloat(createForm.customPrice) : (tour.price || 0);
      const baseTourPrice = Math.round(pricePerPerson * createForm.numberOfPeople * 100) / 100; // Round to nearest cent

      // Calculate fees for this booking (admin can set any fee for any tour)
      const feeTanguyCost = createForm.requestTanguy ? TANGUY_COST : 0;
      const feeExtraHourCost = createForm.extraHour ? EXTRA_HOUR_COST : 0;
      const feeWeekendCost = createForm.weekendFee ? WEEKEND_FEE_COST : 0;
      const feeEveningCost = createForm.eveningFee ? EVENING_FEE_COST : 0;

      // Total amount includes base price + all fees
      const totalAmount = baseTourPrice + feeTanguyCost + feeExtraHourCost + feeWeekendCost + feeEveningCost;

      // Use custom language if "other" is selected
      const finalLanguage = createForm.language === 'other' ? customLanguage : createForm.language;
      const invitee: Record<string, unknown> = {
        name: createForm.customerName,
        email: createForm.customerEmail,
        phone: createForm.customerPhone,
        numberOfPeople: createForm.numberOfPeople,
        language: finalLanguage,
        specialRequests: createForm.specialRequests,
        currency: 'eur',
        isContacted: false,
        isPaid: createForm.isPaid,
        pricePerPerson: Math.round(pricePerPerson * 100) / 100, // Store the price per person (custom or default) for payment links
        // Store fee information
        requestTanguy: createForm.requestTanguy,
        hasExtraHour: createForm.extraHour,
        weekendFee: createForm.weekendFee,
        eveningFee: createForm.eveningFee,
        tanguyCost: feeTanguyCost,
        extraHourCost: feeExtraHourCost,
        weekendFeeCost: feeWeekendCost,
        eveningFeeCost: feeEveningCost,
      };

      // Only set amount if customer has already paid
      // Don't set pendingPaymentPeople here - that's only for when adding extra people later
      if (createForm.isPaid) {
        invitee.amount = totalAmount; // Total includes all fees
      }
      // If not paid, pricePerPerson is used to calculate the amount when sending payment link

      // Create tourbooking entry
      // For non-Local Stories tours, include deal_id directly in tourbooking
      const tourbookingData: Record<string, unknown> = {
        tour_id: createForm.tourId,
        tour_datetime: tourDatetime,
        city: tour.city,
        status: createForm.isPaid ? 'payment_completed' : 'pending',
        invitees: [invitee],
        booking_type: 'B2C',
      };

      // Add deal_id for regular bookings (not Local Stories)
      if (createForm.dealId && !tour.local_stories) {
        tourbookingData.deal_id = createForm.dealId;
      }

      const { data: newBooking, error: bookingError } = await supabase
        .from('tourbooking')
        .insert(tourbookingData)
        .select('id')
        .single();

      if (bookingError) {
        console.error('Error creating booking:', bookingError);
        toast.error('Failed to create booking');
        return;
      }

      // If Local Stories tour, also create local_tours_bookings entry
      if (tour.local_stories && newBooking) {
        const localBookingData: Record<string, unknown> = {
          tour_id: createForm.tourId,
          booking_date: createForm.date,
          booking_time: `${createForm.time}:00`,
          is_booked: true,
          status: 'booked',
          customer_name: createForm.customerName,
          customer_email: createForm.customerEmail,
          customer_phone: createForm.customerPhone,
          booking_id: newBooking.id,
          amnt_of_people: createForm.numberOfPeople,
        };

        // Add deal_id for Local Stories (per-invitee)
        if (createForm.dealId) {
          localBookingData.deal_id = createForm.dealId;
        }

        const { error: localError } = await supabase
          .from('local_tours_bookings')
          .insert(localBookingData);

        if (localError) {
          console.error('Error creating local tours booking:', localError);
          // Don't fail the whole operation, the main booking was created
        }
      }

      toast.success('Booking created successfully!');
      setCreateDialogOpen(false);
      resetCreateForm();
      void fetchBookings();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Failed to create booking');
    } finally {
      setCreatingBooking(false);
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    return formatBrusselsDateTime(dateStr, 'dd/MM/yyyy HH:mm');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'payment_completed':
        return 'bg-blue-100 text-blue-800';
      case 'pending_jotform_confirmation':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'pending_guide_confirmation':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-sand">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-serif font-bold text-navy">Tour Bookings</h1>
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
                  <Calendar className="h-5 w-5" />
                  All Tour Bookings
                </CardTitle>
                <CardDescription>
                  View and manage tour bookings
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setCreateDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Booking
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchBookings()}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
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
                    placeholder="Search by booking ID, city, deal ID, client name, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={!searchQuery && filterStatus === 'all' && filterCity === 'all' && filterBookingType === 'all'}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>

              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[150px]">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[150px]">
                  <Select value={filterCity} onValueChange={setFilterCity}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Filter by city" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {CITY_OPTIONS.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[150px]">
                  <Select value={filterBookingType} onValueChange={setFilterBookingType}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="B2C">B2C (Consumer)</SelectItem>
                      <SelectItem value="B2B">B2B (Business)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(searchQuery || filterStatus !== 'all' || filterCity !== 'all' || filterBookingType !== 'all') && (
                <div className="text-sm text-muted-foreground">
                  Showing {filteredBookings.length} of {bookings.length} bookings
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {bookings.length === 0 ? 'No bookings found' : 'No bookings match your filters'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tour</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Tour Date</TableHead>
                      <TableHead>Guide</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Deal</TableHead>
                      <TableHead>Calendar</TableHead>
                      <TableHead>IDs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow
                        key={booking.id}
                        className="cursor-pointer hover:bg-green-50 hover:ring-2 hover:ring-inset hover:ring-green-300 transition-all"
                        onClick={() => router.push(`/${locale}/admin/bookings/${booking.id}`)}
                      >
                        <TableCell className="font-medium">
                          #{booking.id}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {booking.tour_id && tours.get(booking.tour_id) ? (
                            <div className="font-medium text-sm truncate">
                              {tours.get(booking.tour_id)!.title}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{booking.city || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateTime(booking.tour_datetime)}
                        </TableCell>
                        <TableCell>
                          {booking.guide_id && guides.get(booking.guide_id) ? (
                            <div className="text-sm font-medium">
                              {guides.get(booking.guide_id)!.name}
                            </div>
                          ) : booking.guide_id ? (
                            <span className="text-sm text-muted-foreground">Assigned</span>
                          ) : needsNewGuide(booking) ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-amber-600 text-xs">
                                <AlertCircle className="h-3 w-3" />
                                All guides declined
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenGuideDialog(booking);
                                }}
                                className="h-7 text-xs"
                              >
                                <UserPlus className="h-3 w-3 mr-1" />
                                Select New Guide
                              </Button>
                            </div>
                          ) : (() => {
                            const selectedGuides = (booking.selectedGuides || []).map(normalizeGuide);
                            const pendingCount = selectedGuides.filter(g => g.status === 'offered').length;
                            if (pendingCount > 0) {
                              return (
                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">
                                    Waiting for {pendingCount} guide(s)
                                  </div>
                                </div>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">-</span>;
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {(() => {
                              const tour = booking.tour_id ? tours.get(booking.tour_id) : null;
                              return getBookingTypeShortLabel(tour, booking.booking_type);
                            })()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {booking.deal_id ? (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="h-auto py-1 px-2"
                            >
                              <a
                                href={`https://focus.teamleader.eu/web/deals/${booking.deal_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open deal in TeamLeader"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                <span className="text-xs font-medium">
                                  TeamLeader Deal
                                </span>
                              </a>
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {booking.google_calendar_link ? (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="h-auto py-1 px-2"
                            >
                              <a
                                href={booking.google_calendar_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open in Google Calendar"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Calendar className="h-4 w-4 mr-1" />
                                <span className="text-xs">View</span>
                              </a>
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto py-1 px-2 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBookingForIds(booking);
                              setIdsDialogOpen(true);
                            }}
                          >
                            <Hash className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {!loading && filteredBookings.length > 0 && (
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {filteredBookings.length} {filteredBookings.length === 1 ? 'booking' : 'bookings'}
                {filteredBookings.length !== bookings.length && ` (filtered from ${bookings.length} total)`}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Guide Selection Dialog */}
      <Dialog open={guideDialogOpen} onOpenChange={setGuideDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select New Guide
            </DialogTitle>
            <DialogDescription>
              All originally suggested guides have declined this booking. 
              Select a guide from the list below to send them an offer.
              {selectedBookingForGuide && (
                <span className="block mt-2 font-medium text-foreground">
                  Booking #{selectedBookingForGuide.id} - {selectedBookingForGuide.city || 'Unknown city'}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedBookingForGuide && (
            <div className="space-y-4 py-4">
              {/* Show declined guides info */}
              {(() => {
                const declinedGuides = (selectedBookingForGuide.selectedGuides || [])
                  .map(normalizeGuide)
                  .filter(g => g.status === 'declined');
                
                if (declinedGuides.length === 0) return null;
                
                return (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="text-sm font-medium text-amber-800 mb-2">Previously declined by:</div>
                    <div className="space-y-1">
                      {declinedGuides.map((og: SelectedGuide) => {
                        const guide = guides.get(og.id);
                        return (
                          <div key={og.id} className="text-xs text-amber-700 flex items-center gap-2">
                            <X className="h-3 w-3" />
                            {guide?.name || `Guide #${og.id}`}
                            {og.respondedAt && (
                              <span className="text-amber-600">
                                ({formatBrusselsDateTime(og.respondedAt, 'dd/MM HH:mm')})
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Guide selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select a guide:</label>
                <Select 
                  value={selectedNewGuideId?.toString() || ''} 
                  onValueChange={(val) => setSelectedNewGuideId(parseInt(val, 10))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Choose a guide..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableGuides(selectedBookingForGuide).map((guide) => (
                      <SelectItem key={guide.id} value={guide.id.toString()}>
                        {guide.name || `Guide #${guide.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getAvailableGuides(selectedBookingForGuide).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No available guides remaining. All guides have been offered this booking.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setGuideDialogOpen(false);
                setSelectedBookingForGuide(null);
                setSelectedNewGuideId(null);
              }}
              disabled={sendingGuideOffer}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendGuideOffer}
              disabled={!selectedNewGuideId || sendingGuideOffer}
              className="btn-primary"
            >
              {sendingGuideOffer ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Offer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Booking Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (open) {
          // Fetch TeamLeader deals when dialog opens
          void fetchTeamleaderDeals();
        } else {
          resetCreateForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Booking
            </DialogTitle>
            <DialogDescription>
              Manually create a tour booking for a customer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Tour Selection */}
            <div className="space-y-2">
              <Label htmlFor="tour">Tour *</Label>
              <Select
                value={createForm.tourId}
                onValueChange={(value) => setCreateForm({ ...createForm, tourId: value })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select a tour..." />
                </SelectTrigger>
                <SelectContent>
                  {allTours.map((tour) => (
                    <SelectItem key={tour.id} value={tour.id}>
                      <div className="flex items-center gap-2">
                        <span>{tour.title}</span>
                        <span className="text-xs text-muted-foreground">({tour.city})</span>
                        {tour.local_stories && <Badge variant="outline" className="text-xs">Local Stories</Badge>}
                        {tour.op_maat && <Badge variant="outline" className="text-xs">Op Maat</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTour && (
                <p className="text-xs text-muted-foreground">
                  Default price: €{(selectedTour.price || 0).toFixed(2)} per person
                  {selectedTour.local_stories && ' • This is a Local Stories tour'}
                  {selectedTour.op_maat && ' • This is a Custom (Op Maat) tour'}
                </p>
              )}
            </div>

            {/* Custom Price Override */}
            {selectedTour && (
              <div className="space-y-2">
                <Label htmlFor="customPrice">Custom Price per Person (optional)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">€</span>
                  <Input
                    id="customPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={createForm.customPrice}
                    onChange={(e) => setCreateForm({ ...createForm, customPrice: e.target.value })}
                    placeholder={(selectedTour.price || 0).toFixed(2)}
                    className="bg-white w-32"
                  />
                  <span className="text-sm text-muted-foreground">per person</span>
                  {createForm.customPrice && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCreateForm({ ...createForm, customPrice: '' })}
                      className="text-xs"
                    >
                      Reset to default
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty to use the tour&apos;s default price. Enter a custom price to override.
                </p>
              </div>
            )}

            {/* TeamLeader Deal Selection */}
            {selectedTour && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="dealId">
                    Link to TeamLeader Deal (optional)
                    {selectedTour.local_stories && (
                      <span className="text-xs text-muted-foreground ml-1">- for this invitee</span>
                    )}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void fetchTeamleaderDeals()}
                    disabled={loadingDeals}
                    className="h-6 text-xs gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingDeals ? 'animate-spin' : ''}`} />
                    {loadingDeals ? 'Loading...' : 'Refresh'}
                  </Button>
                </div>
                <Select
                  value={createForm.dealId}
                  onValueChange={(value) => setCreateForm({ ...createForm, dealId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder={loadingDeals ? 'Loading deals...' : teamleaderDeals.length === 0 ? 'No deals found - click Refresh' : 'Select a deal (optional)'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="none">No deal linked</SelectItem>
                    {teamleaderDeals.map((deal) => (
                      <SelectItem key={deal.id} value={deal.id}>
                        <div className="flex items-center gap-2">
                          <span>{deal.title}</span>
                          {deal.reference && (
                            <span className="text-xs text-muted-foreground">({deal.reference})</span>
                          )}
                          {deal.value && (
                            <span className="text-xs text-muted-foreground">€{deal.value.toFixed(2)}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {dealsError && (
                  <p className="text-xs text-red-500">{dealsError}</p>
                )}
                {teamleaderDeals.length === 0 && !loadingDeals && !dealsError && (
                  <p className="text-xs text-amber-600">No deals loaded yet. Click Refresh to load deals from TeamLeader.</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {selectedTour.local_stories
                    ? 'Link this invitee to a TeamLeader CRM deal. Additional invitees can have different deals.'
                    : 'Link this booking to an existing TeamLeader CRM deal.'
                  }
                </p>
              </div>
            )}

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={createForm.date}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    // Auto-set weekend fee when date changes to a weekend
                    const date = new Date(newDate);
                    const day = date.getDay();
                    const isWeekendDay = day === 0 || day === 6;
                    setCreateForm({ ...createForm, date: newDate, weekendFee: isWeekendDay });
                  }}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={createForm.time}
                  onChange={(e) => {
                    const newTime = e.target.value;
                    // Auto-set evening fee when time changes to evening (17:00+)
                    const hour = parseInt(newTime.split(':')[0], 10);
                    const isEveningTime = hour >= 17;
                    setCreateForm({ ...createForm, time: newTime, eveningFee: isEveningTime });
                  }}
                  className="bg-white"
                />
              </div>
            </div>

            {/* Extra Options and Fees */}
            {selectedTour && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">Extra Options & Fees</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="requestTanguy"
                      checked={createForm.requestTanguy}
                      onCheckedChange={(checked) => setCreateForm({ ...createForm, requestTanguy: checked === true })}
                    />
                    <Label htmlFor="requestTanguy" className="text-sm cursor-pointer">
                      Request Tanguy (+€{TANGUY_COST})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="extraHour"
                      checked={createForm.extraHour}
                      onCheckedChange={(checked) => setCreateForm({ ...createForm, extraHour: checked === true })}
                    />
                    <Label htmlFor="extraHour" className="text-sm cursor-pointer">
                      Extra Hour (+€{EXTRA_HOUR_COST})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="weekendFee"
                      checked={createForm.weekendFee}
                      onCheckedChange={(checked) => setCreateForm({ ...createForm, weekendFee: checked === true })}
                    />
                    <Label htmlFor="weekendFee" className="text-sm cursor-pointer">
                      Weekend Fee (+€{WEEKEND_FEE_COST})
                    </Label>
                    {isWeekend && !createForm.weekendFee && (
                      <span className="text-xs text-amber-600 ml-2">(auto-detected weekend)</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="eveningFee"
                      checked={createForm.eveningFee}
                      onCheckedChange={(checked) => setCreateForm({ ...createForm, eveningFee: checked === true })}
                    />
                    <Label htmlFor="eveningFee" className="text-sm cursor-pointer">
                      Evening Fee (+€{EVENING_FEE_COST})
                    </Label>
                    {isEvening && !createForm.eveningFee && (
                      <span className="text-xs text-amber-600 ml-2">(auto-detected evening)</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Customer Details */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Customer Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Name *</Label>
                  <Input
                    id="customerName"
                    value={createForm.customerName}
                    onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })}
                    placeholder="Customer name"
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={createForm.customerEmail}
                    onChange={(e) => setCreateForm({ ...createForm, customerEmail: e.target.value })}
                    placeholder="customer@email.com"
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={createForm.customerPhone}
                    onChange={(e) => setCreateForm({ ...createForm, customerPhone: e.target.value })}
                    placeholder="+32..."
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numberOfPeople">Number of People *</Label>
                  <Input
                    id="numberOfPeople"
                    type="number"
                    min={1}
                    value={createForm.numberOfPeople}
                    onChange={(e) => setCreateForm({ ...createForm, numberOfPeople: parseInt(e.target.value) || 1 })}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={createForm.language}
                    onValueChange={(value) => {
                      setCreateForm({ ...createForm, language: value });
                      if (value !== 'other') setCustomLanguage('');
                    }}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {LANGUAGE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {createForm.language === 'other' && (
                    <Input
                      placeholder="Enter custom language..."
                      value={customLanguage}
                      onChange={(e) => setCustomLanguage(e.target.value)}
                      className="bg-white mt-2"
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="specialRequests">Special Requests</Label>
                <Textarea
                  id="specialRequests"
                  value={createForm.specialRequests}
                  onChange={(e) => setCreateForm({ ...createForm, specialRequests: e.target.value })}
                  placeholder="Any special requests or notes..."
                  className="bg-white"
                  rows={2}
                />
              </div>
            </div>

            {/* Payment Status */}
            <div className="border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPaid"
                  checked={createForm.isPaid}
                  onCheckedChange={(checked) => setCreateForm({ ...createForm, isPaid: checked === true })}
                />
                <Label htmlFor="isPaid" className="text-sm font-medium cursor-pointer">
                  Customer has already paid
                </Label>
              </div>
              {!createForm.isPaid && (
                <p className="text-xs text-muted-foreground mt-1">
                  Booking will be created with status &quot;pending&quot;. You can send a payment link later.
                </p>
              )}
            </div>

            {/* Price Summary */}
            {selectedTour && (() => {
              const pricePerPerson = createForm.customPrice ? parseFloat(createForm.customPrice) : (selectedTour.price || 0);
              const baseTourPrice = Math.round(pricePerPerson * createForm.numberOfPeople * 100) / 100;
              const isCustomPrice = !!createForm.customPrice;
              const totalFees = tanguyCost + extraHourCost + weekendFeeCost + eveningFeeCost;
              const grandTotal = baseTourPrice + totalFees;
              return (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Price Summary</h4>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>
                        {isCustomPrice ? 'Custom price' : 'Base price'} (€{pricePerPerson.toFixed(2)}) × {createForm.numberOfPeople} {createForm.numberOfPeople === 1 ? 'person' : 'people'}
                      </span>
                      <span>€{baseTourPrice.toFixed(2)}</span>
                    </div>
                    {tanguyCost > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Tanguy</span>
                        <span>€{tanguyCost.toFixed(2)}</span>
                      </div>
                    )}
                    {extraHourCost > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Extra Hour</span>
                        <span>€{extraHourCost.toFixed(2)}</span>
                      </div>
                    )}
                    {weekendFeeCost > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Weekend Fee</span>
                        <span>€{weekendFeeCost.toFixed(2)}</span>
                      </div>
                    )}
                    {eveningFeeCost > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Evening Fee</span>
                        <span>€{eveningFeeCost.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium pt-1 border-t">
                      <span>Total</span>
                      <span>€{grandTotal.toFixed(2)}</span>
                    </div>
                    {isCustomPrice && (
                      <p className="text-xs text-amber-600 mt-1">
                        Using custom price instead of default (€{(selectedTour.price || 0).toFixed(2)})
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                resetCreateForm();
              }}
              disabled={creatingBooking}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleCreateBooking()}
              disabled={creatingBooking || !createForm.tourId || !createForm.date || !createForm.customerName || !createForm.customerEmail}
            >
              {creatingBooking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Booking
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Booking Warning Dialog */}
      <Dialog open={duplicateWarningOpen} onOpenChange={setDuplicateWarningOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Existing Booking Found
            </DialogTitle>
            <DialogDescription>
              A booking already exists for this tour on the selected date.
            </DialogDescription>
          </DialogHeader>

          {existingDuplicateBooking && (
            <div className="py-4 space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-800 mb-2">Existing booking details:</p>
                <div className="space-y-1 text-sm text-amber-700">
                  <p><span className="font-medium">Tour:</span> {tours.get(existingDuplicateBooking.tour_id || '')?.title || 'Unknown'}</p>
                  <p><span className="font-medium">Date:</span> {formatBrusselsDateTime(existingDuplicateBooking.tour_datetime, 'dd/MM/yyyy HH:mm')}</p>
                  <p><span className="font-medium">Status:</span> {existingDuplicateBooking.status}</p>
                  <p><span className="font-medium">Booking ID:</span> #{existingDuplicateBooking.id}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Do you want to create a new booking anyway, or would you prefer to add people to the existing booking?
              </p>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDuplicateWarningOpen(false);
                setExistingDuplicateBooking(null);
              }}
            >
              Cancel
            </Button>
            {existingDuplicateBooking && (
              <Button
                variant="outline"
                onClick={() => {
                  setDuplicateWarningOpen(false);
                  setCreateDialogOpen(false);
                  setExistingDuplicateBooking(null);
                  resetCreateForm();
                  // Navigate to the existing booking
                  router.push(`/${locale}/admin/bookings/${existingDuplicateBooking.id}`);
                }}
              >
                View Existing Booking
              </Button>
            )}
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => {
                setDuplicateWarningOpen(false);
                setExistingDuplicateBooking(null);
                handleCreateBooking(true); // Skip duplicate check
              }}
            >
              Create Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IDs Dialog */}
      <Dialog open={idsDialogOpen} onOpenChange={setIdsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Booking IDs
            </DialogTitle>
            <DialogDescription>
              Technical reference IDs for booking #{selectedBookingForIds?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedBookingForIds && (
            <div className="space-y-3 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Booking ID:</span>
                <span className="font-mono font-medium">{selectedBookingForIds.id}</span>
              </div>
              {selectedBookingForIds.tour_id && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tour ID:</span>
                  <span className="font-mono text-xs">{selectedBookingForIds.tour_id}</span>
                </div>
              )}
              {selectedBookingForIds.deal_id && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Deal ID:</span>
                  <span className="font-mono">{selectedBookingForIds.deal_id}</span>
                </div>
              )}
              {selectedBookingForIds.stripe_session_id && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Stripe Session:</span>
                  <span className="font-mono text-xs truncate max-w-[200px]">{selectedBookingForIds.stripe_session_id}</span>
                </div>
              )}
              {selectedBookingForIds.guide_id && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Guide ID:</span>
                  <span className="font-mono">{selectedBookingForIds.guide_id}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIdsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

