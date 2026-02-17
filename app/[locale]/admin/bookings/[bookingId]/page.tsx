'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Home,
  ArrowLeft,
  RefreshCw,
  Calendar,
  MapPin,
  User,
  Users,
  Mail,
  Phone,
  ExternalLink,
  Clock,
  CreditCard,
  FileText,
  Image,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Globe,
  Building2,
  MessageSquare,
  Package,
  Send,
  UserPlus,
  Pencil,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Hash
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { formatBrusselsDateTime, parseBrusselsDateTime, toBrusselsLocalISO, isWeekendBrussels, getHourBrussels, nowBrussels, addMinutesBrussels } from '@/lib/utils/timezone';
import { toast } from 'sonner';

interface SelectedGuide {
  id: number;
  status?: 'offered' | 'declined' | 'accepted';
  offeredAt?: string;
  respondedAt?: string;
}

interface Invitee {
  name?: string;
  email?: string;
  phone?: string;
  numberOfPeople?: number;
  language?: string;
  contactLanguage?: string; // Language for email communications (nl, en, fr, de)
  specialRequests?: string;
  amount?: number;
  currency?: string;
  upsellProducts?: any[];
  isPaid?: boolean;
  pendingPaymentPeople?: number;
  pendingPaymentAmount?: number;
  pricePerPerson?: number; // Custom price per person (if set during booking creation)
  opMaatAnswers?: {
    startEnd?: string;
    cityPart?: string;
    subjects?: string;
    specialWishes?: string;
    extraHour?: boolean;
  };
  // Extra fees for op_maat tours
  requestTanguy?: boolean;
  hasExtraHour?: boolean;
  weekendFee?: boolean;
  eveningFee?: boolean;
  tanguyCost?: number;
  extraHourCost?: number;
  weekendFeeCost?: number;
  eveningFeeCost?: number;
  originalAmount?: number; // Original price before discount
  discountApplied?: number; // Discount amount applied
  promoCode?: string | null; // Promo code used
  promoDiscountAmount?: number; // Discount amount from promo code
  promoDiscountPercent?: number | null; // Discount percentage from promo code
  invoice_link?: string | null; // TeamLeader invoice ID for this invitee (Local Stories)
}

interface TourBooking {
  id: number;
  guide_id: number | null;
  guide_ids: number[] | null; // Array of guide IDs for multiple guides
  deal_id: string | null;
  status: string;
  invitees: Invitee[] | null;
  city: string | null;
  tour_datetime: string | null;
  tour_end: string | null;
  tour_id: string | null;
  stripe_session_id: string | null;
  google_calendar_link: string | null;
  google_drive_link: string | null;
  booking_type: string | null;
  request_tanguy: boolean;
  picturesUploaded: boolean | null;
  pictureCount: number | null;
  is_aftercare_started: boolean | null;
  isCustomerDetailsRequested: boolean | null;
  selectedGuides: (number | SelectedGuide)[] | null;
  created_at?: string;
  invoice_id: string | null;
  invoice_link: string | null;
  start_location: string | null;
  end_location: string | null;
  ai_desc: string | null;
}

interface TeamLeaderInvoice {
  id: string;
  invoice_number: string | null;
  title: string;
  status: string | null;
  total: number | null;
  currency: string;
  customer: { type: string; id: string } | null;
  createdAt: string | null;
  dueDate: string | null;
  ai_desc: string | null;
  start_location: string | null;
  end_location: string | null;
}

interface Tour {
  id: string;
  title: string;
  city: string;
  price: number | null;
  duration_minutes: number | null;
  op_maat?: boolean;
  local_stories?: boolean;
  start_location: string | null;
  end_location: string | null;
}

interface Guide {
  id: number;
  name: string | null;
  Email: string | null;
  phonenumber: string | null;
  cities: string[] | null;
  languages: string[] | null;
  tours_done: number | null;
}

interface LocalStoriesBooking {
  id: string;
  tour_id: string;
  booking_date: string;
  booking_time: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  stripe_session_id: string | null;
  booking_id: number | null;
  amnt_of_people: number | null;
  deal_id: string | null;
  invoice_id: string | null;
  created_at: string | null;
  pending_payment_people: number | null;
  pending_payment_amount: number | null;
  extra_payments_received: Array<{
    paidAt: string;
    amount: number;
    numberOfPeople: number;
    stripeSessionId: string;
    type: string;
  }> | null;
}

interface TeamLeaderDeal {
  id: string;
  title: string;
  reference: string | null;
  status: string;
  value: number | null;
  currency: string;
}

export default function BookingDetailPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<TourBooking | null>(null);
  const [tour, setTour] = useState<Tour | null>(null);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [allGuides, setAllGuides] = useState<Map<number, Guide>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guideDialogOpen, setGuideDialogOpen] = useState(false);
  const [selectedNewGuideId, setSelectedNewGuideId] = useState<number | null>(null);
  const [submittingNewGuide, setSubmittingNewGuide] = useState(false);
  const [cancellingGuide, setCancellingGuide] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [localStoriesBookings, setLocalStoriesBookings] = useState<LocalStoriesBooking[]>([]);

  // Edit booking state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [savingBooking, setSavingBooking] = useState(false);
  const [editForm, setEditForm] = useState({
    date: '',
    time: '',
    endTime: '',
    status: '',
    start_location: '',
    end_location: '',
    invoiceId: '',
  });

  // TeamLeader invoices state
  const [teamleaderInvoices, setTeamleaderInvoices] = useState<TeamLeaderInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);

  // Add invitee state (for Local Stories)
  const [addInviteeDialogOpen, setAddInviteeDialogOpen] = useState(false);
  const [addingInvitee, setAddingInvitee] = useState(false);
  const [newInvitee, setNewInvitee] = useState({
    name: '',
    email: '',
    phone: '',
    numberOfPeople: 1,
    language: 'nl',
    specialRequests: '',
    isPaid: false,
  });

  // Add people state
  const [addPeopleDialogOpen, setAddPeopleDialogOpen] = useState(false);
  const [addingPeople, setAddingPeople] = useState(false);
  const [addPeopleTarget, setAddPeopleTarget] = useState<{
    inviteeIndex?: number; // For normal/custom tours - index in invitees array
    localBookingId?: string; // For local stories - the local_tours_booking id
    customerName: string;
    customerEmail: string;
    currentPeople: number;
  } | null>(null);
  const [additionalPeople, setAdditionalPeople] = useState(1);
  const [additionalPeoplePrice, setAdditionalPeoplePrice] = useState('');
  const [addPeopleFees, setAddPeopleFees] = useState({
    requestTanguy: false,
    hasExtraHour: false,
    weekendFee: false,
    eveningFee: false,
  });
  const [idsDialogOpen, setIdsDialogOpen] = useState(false);

  // Send info dialogs
  const [sendInfoToClientOpen, setSendInfoToClientOpen] = useState(false);
  const [sendInfoToGuideOpen, setSendInfoToGuideOpen] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [sendingInfo, setSendingInfo] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'email'>('email');

  // Reassign guide state
  const [reassignGuideDialogOpen, setReassignGuideDialogOpen] = useState(false);
  const [selectedReassignGuide, setSelectedReassignGuide] = useState<number | null>(null);
  const [reassignMessage, setReassignMessage] = useState('');
  const [reassigningGuide, setReassigningGuide] = useState(false);

  // Edit invitee state
  const [editInviteeDialogOpen, setEditInviteeDialogOpen] = useState(false);
  const [editingInvitee, setEditingInvitee] = useState(false);
  const [editInviteeTarget, setEditInviteeTarget] = useState<{
    index?: number; // For normal/custom - index in invitees array
    localBookingId?: string; // For local stories
    isLocalStories: boolean;
  } | null>(null);
  const [editInviteeForm, setEditInviteeForm] = useState({
    name: '',
    email: '',
    phone: '',
    numberOfPeople: 1,
    language: 'nl',
    contactLanguage: 'nl', // Language for email communications
    specialRequests: '',
    dealId: '',
    invoiceId: '',
    // Fee toggles for op_maat tours
    requestTanguy: false,
    hasExtraHour: false,
    weekendFee: false,
    eveningFee: false,
  });
  const [editCustomLanguage, setEditCustomLanguage] = useState('');

  // TeamLeader deals state
  const [teamleaderDeals, setTeamleaderDeals] = useState<TeamLeaderDeal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [dealsError, setDealsError] = useState<string | null>(null);

  // TeamLeader invoices state (for edit invitee)
  const [editInviteeInvoices, setEditInviteeInvoices] = useState<TeamLeaderInvoice[]>([]);
  const [loadingEditInviteeInvoices, setLoadingEditInviteeInvoices] = useState(false);
  const [editInviteeInvoicesError, setEditInviteeInvoicesError] = useState<string | null>(null);

  // Delete invitee state
  const [deleteInviteeDialogOpen, setDeleteInviteeDialogOpen] = useState(false);
  const [deletingInvitee, setDeletingInvitee] = useState(false);
  const [deleteInviteeTarget, setDeleteInviteeTarget] = useState<{
    index?: number;
    localBookingId?: string;
    isLocalStories: boolean;
    name: string;
  } | null>(null);

  // Delete booking state
  const [deleteBookingDialogOpen, setDeleteBookingDialogOpen] = useState(false);
  const [deletingBooking, setDeletingBooking] = useState(false);

  const STATUS_OPTIONS = ['pending', 'payment_completed', 'pending_guide_confirmation', 'confirmed', 'completed', 'cancelled'];
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
      // Error fetching TeamLeader deals
      setDealsError(err instanceof Error ? err.message : 'Failed to load deals');
    } finally {
      setLoadingDeals(false);
    }
  };

  const fetchBookingDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch booking with all fields including invitees
      const { data: bookingData, error: bookingError } = await supabase
        .from('tourbooking')
        .select('*')
        .eq('id', parseInt(bookingId, 10))
        .single();
      
      // Ensure invitees is always an array (even if null/undefined)
      // Also log for debugging
      if (bookingData) {
        if (!bookingData.invitees || !Array.isArray(bookingData.invitees)) {
          console.warn(`[Booking Detail] Booking ${bookingId} has no invitees array, setting to empty array. Original value:`, bookingData.invitees);
          bookingData.invitees = [];
        } else {
          console.log(`[Booking Detail] Booking ${bookingId} has ${bookingData.invitees.length} invitee(s)`);
        }
      }

      if (bookingError || !bookingData) {
        setError('Booking not found');
        return;
      }

      setBooking(bookingData as TourBooking);

      // Fetch tour if tour_id exists
      let tourData: Tour | null = null;
      if (bookingData.tour_id) {
        const { data: fetchedTourData } = await supabase
          .from('tours_table_prod')
          .select('id, title, city, price, duration_minutes, op_maat, local_stories, start_location, end_location')
          .eq('id', bookingData.tour_id)
          .single();

        if (fetchedTourData) {
          tourData = fetchedTourData as Tour;
          setTour(tourData);
        }
      }

      // Fetch local_tours_bookings if this is a Local Stories tour
      if (tourData?.local_stories) {
        const { data: localBookingsData, error: localBookingsError } = await supabase
          .from('local_tours_bookings')
          .select('*')
          .eq('booking_id', bookingData.id)
          .order('created_at', { ascending: true });

        if (localBookingsError) {
          // Error fetching local tours bookings
          console.error('Error fetching local_tours_bookings:', localBookingsError);
        } else if (localBookingsData) {
          // Deduplicate by id to prevent double-counting
          const uniqueBookings = new Map();
          localBookingsData.forEach((b: any) => {
            if (!uniqueBookings.has(b.id)) {
              uniqueBookings.set(b.id, b);
            }
          });
          const deduplicatedBookings = Array.from(uniqueBookings.values()) as LocalStoriesBooking[];
          
          // Log for debugging
          console.log('Local stories bookings:', {
            totalFetched: localBookingsData.length,
            uniqueCount: deduplicatedBookings.length,
            totalPeople: deduplicatedBookings.reduce((sum, b) => sum + (b.amnt_of_people || 0), 0),
            bookings: deduplicatedBookings.map(b => ({
              id: b.id,
              customer: b.customer_name,
              people: b.amnt_of_people,
            })),
          });
          
          setLocalStoriesBookings(deduplicatedBookings);
        }
      } else {
        setLocalStoriesBookings([]);
      }

      // Fetch guides from guide_ids array or fall back to guide_id
      const guideIds = bookingData.guide_ids && bookingData.guide_ids.length > 0 
        ? bookingData.guide_ids 
        : bookingData.guide_id 
          ? [bookingData.guide_id] 
          : [];
      
      if (guideIds.length > 0) {
        // Fetch first guide (for backward compatibility with single guide display)
        const { data: guideData } = await supabase
          .from('guides_temp')
          .select('id, name, Email, phonenumber, cities, languages, tours_done')
          .eq('id', guideIds[0])
          .single();

        if (guideData) {
          setGuide(guideData as Guide);
        } else {
          setGuide(null);
        }
      } else {
        // Clear guide state when no guide is assigned
        setGuide(null);
      }

      // Fetch all guides for selectedGuides display
      const { data: guidesData } = await supabase
        .from('guides_temp')
        .select('id, name, Email, phonenumber, cities, languages, tours_done');

      if (guidesData) {
        const guidesMap = new Map<number, Guide>();
        guidesData.forEach((g: any) => guidesMap.set(g.id, g));
        setAllGuides(guidesMap);
      }
    } catch (err) {
      // Error fetching booking details
      setError('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (profile?.isAdmin || profile?.is_admin) && bookingId) {
      void fetchBookingDetails();
    }
  }, [user, profile, bookingId]);


  // Check if all guides in selectedGuides have declined
  const allGuidesDeclined = (): boolean => {
    if (!booking?.selectedGuides || booking.selectedGuides.length === 0) {
      return false;
    }
    
    const normalizedGuides = booking.selectedGuides.map(normalizeGuide);
    // All guides must have status 'declined' and none should be 'offered' or 'accepted'
    const hasDeclinedGuides = normalizedGuides.some(g => g.status === 'declined');
    const hasPendingOrAccepted = normalizedGuides.some(g => g.status === 'offered' || g.status === 'accepted' || !g.status);
    
    return hasDeclinedGuides && !hasPendingOrAccepted;
  };

  // Get guides that are not already in selectedGuides (haven't been offered yet)
  const getAvailableGuides = (): Guide[] => {
    if (!booking?.selectedGuides) {
      return Array.from(allGuides.values());
    }
    
    const usedGuideIds = new Set(
      booking.selectedGuides.map(sg => normalizeGuide(sg).id)
    );
    
    return Array.from(allGuides.values()).filter(g => !usedGuideIds.has(g.id));
  };

  // Submit new guide selection - updates selectedGuides and triggers webhook
  const submitNewGuideSelection = async () => {
    if (!booking || !selectedNewGuideId) return;
    
    setSubmittingNewGuide(true);
    try {
      // Add new guide to selectedGuides array with 'offered' status
      const updatedSelectedGuides = [
        ...(booking.selectedGuides || []).map(normalizeGuide),
        {
          id: selectedNewGuideId,
          status: 'offered' as const,
          offeredAt: nowBrussels(),
        }
      ];

      // Update the booking in the database
      const { error: updateError } = await supabase
        .from('tourbooking')
        .update({ selectedGuides: updatedSelectedGuides })
        .eq('id', booking.id);

      if (updateError) {
        throw new Error('Failed to update booking');
      }

      // Trigger the webhook with the updated booking
      const updatedBooking = { ...booking, selectedGuides: updatedSelectedGuides };
      const response = await fetch('https://alexfinit.app.n8n.cloud/webhook/f22ab19e-bc75-475e-ac13-ca9b5c8f72fe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedBooking),
      });

      if (!response.ok) {
        throw new Error('Failed to trigger webhook');
      }

      toast.success('New guide selected and notified!');
      setGuideDialogOpen(false);
      setSelectedNewGuideId(null);
      void fetchBookingDetails();
    } catch (err) {
      // Error selecting new guide
      toast.error('Failed to select new guide');
    } finally {
      setSubmittingNewGuide(false);
    }
  };

  // Handle guide cancellation - removes guide and triggers reassignment
  const handleGuideCancellation = async () => {
    if (!booking || !guide) return;

    setCancellingGuide(true);
    try {
      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      // Call server-side API to cancel guide (bypasses RLS)
      const response = await fetch(`/api/cancel-guide/${booking.id}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ guideId: guide.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel guide');
      }

      // Guide cancellation response

      toast.success('Guide removed. A new guide will be assigned.');
      setCancelDialogOpen(false);
      // Wait a moment for the database to propagate changes
      await new Promise(resolve => setTimeout(resolve, 500));
      void fetchBookingDetails();
    } catch (err) {
      // Error cancelling guide
      toast.error('Failed to cancel guide assignment');
    } finally {
      setCancellingGuide(false);
    }
  };

  // Open edit dialog with current values
  const openEditDialog = () => {
    if (!booking) return;
    if (booking.tour_datetime) {
      // Parse the datetime string (stored as Brussels timezone ISO string)
      // Extract date and time components from the Brussels timezone string
      // Format: "2025-01-25T14:00:00+01:00" or "2025-01-25T14:00:00Z"
      const datetimeStr = booking.tour_datetime;
      
      // Extract date part (YYYY-MM-DD)
      const dateStr = datetimeStr.split('T')[0];
      
      // Extract time part and handle timezone offset
      // The time component in the ISO string represents Brussels local time
      const timePart = datetimeStr.split('T')[1];
      let timeStr = '14:00';
      
      if (timePart) {
        // Remove timezone offset, milliseconds, and seconds if present
        // Examples: "14:00:00+01:00" -> "14:00", "14:00:00.123Z" -> "14:00", "14:00:00Z" -> "14:00"
        let timeWithoutOffset = timePart.split(/[+-]/)[0].split('Z')[0];
        // Remove milliseconds if present (e.g., "14:00:00.123" -> "14:00:00")
        timeWithoutOffset = timeWithoutOffset.split('.')[0];
        // Extract HH:mm (ignore seconds)
        const timeParts = timeWithoutOffset.split(':');
        if (timeParts.length >= 2) {
          timeStr = `${timeParts[0]}:${timeParts[1]}`;
        }
      }

      // Extract end time from tour_end
      let endTimeStr = '';
      if (booking.tour_end) {
        const endTimePart = booking.tour_end.split('T')[1];
        if (endTimePart) {
          let endTimeWithoutOffset = endTimePart.split(/[+-]/)[0].split('Z')[0];
          endTimeWithoutOffset = endTimeWithoutOffset.split('.')[0];
          const endTimeParts = endTimeWithoutOffset.split(':');
          if (endTimeParts.length >= 2) {
            endTimeStr = `${endTimeParts[0]}:${endTimeParts[1]}`;
          }
        }
      }
      
      setEditForm({
        date: dateStr,
        time: timeStr,
        endTime: endTimeStr,
        status: booking.status,
        start_location: booking.start_location || '',
        end_location: booking.end_location || '',
        invoiceId: booking.invoice_link || '',
      });
    } else {
      // Use current Brussels time
      const now = new Date();
      const brusselsDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Brussels' }));
      setEditForm({
        date: brusselsDate.toISOString().split('T')[0],
        time: brusselsDate.toTimeString().slice(0, 5),
        endTime: '',
        status: booking.status,
        start_location: booking.start_location || '',
        end_location: booking.end_location || '',
        invoiceId: booking.invoice_link || '',
      });
    }
    // Fetch TeamLeader invoices when dialog opens
    void fetchTeamleaderInvoices();
    setEditDialogOpen(true);
  };

  // Fetch TeamLeader invoices
  const fetchTeamleaderInvoices = async () => {
    setLoadingInvoices(true);
    setInvoicesError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setInvoicesError('Not authenticated');
        return;
      }

      const response = await fetch('/api/admin/teamleader-invoices', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch invoices');
      }

      const data = await response.json();
      setTeamleaderInvoices(data.invoices || []);
    } catch (err) {
      // Error fetching TeamLeader invoices
      setInvoicesError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Save booking edits
  const handleSaveBooking = async () => {
    if (!booking) return;
    setSavingBooking(true);
    try {
      // Parse the date/time as Brussels time and convert to ISO string
      const parsedDate = parseBrusselsDateTime(editForm.date, editForm.time);
      const tourDatetime = toBrusselsLocalISO(parsedDate);
      
      // Use manually entered end time if provided, otherwise calculate based on tour duration
      let tourEndDatetime: string;
      let durationMinutes: number;
      
      if (editForm.endTime && editForm.endTime.trim()) {
        // Parse the end date/time as Brussels time
        const parsedEndDate = parseBrusselsDateTime(editForm.date, editForm.endTime);
        tourEndDatetime = toBrusselsLocalISO(parsedEndDate);
        
        // Calculate duration in minutes from start and end times
        const startDate = parseBrusselsDateTime(editForm.date, editForm.time);
        const durationMs = parsedEndDate.getTime() - startDate.getTime();
        durationMinutes = Math.round(durationMs / (1000 * 60));
      } else {
        // Calculate tour_end based on tour duration (fallback)
        // Get duration from tour or use existing booking's duration, default to 120 minutes
        const firstInvitee = booking.invitees?.[0] as any;
        durationMinutes = tour?.duration_minutes || 
                         firstInvitee?.durationMinutes || 
                         120;
        tourEndDatetime = addMinutesBrussels(parsedDate, durationMinutes);
      }
      
      // Update invitees array to ensure tourStartDatetime matches tour_datetime exactly
      const updatedInvitees = booking.invitees?.map((invitee: any) => ({
        ...invitee,
        tourStartDatetime: tourDatetime, // Match tour_datetime exactly
        tourEndDatetime: tourEndDatetime, // Match tour_end exactly
        durationMinutes: durationMinutes,
      })) || [];

      const { error: updateError } = await supabase
        .from('tourbooking')
        .update({
          tour_datetime: tourDatetime,
          tour_end: tourEndDatetime,
          status: editForm.status,
          start_location: editForm.start_location || null,
          end_location: editForm.end_location || null,
          invoice_link: editForm.invoiceId || null,
          invitees: updatedInvitees, // Update invitees with matching tourStartDatetime
        })
        .eq('id', booking.id);

      if (updateError) {
        throw new Error('Failed to update booking');
      }

      toast.success('Booking updated successfully!');
      setEditDialogOpen(false);
      void fetchBookingDetails();
    } catch (err) {
      // Error updating booking
      toast.error('Failed to update booking');
    } finally {
      setSavingBooking(false);
    }
  };

  // Reset new invitee form
  const resetNewInvitee = () => {
    setNewInvitee({
      name: '',
      email: '',
      phone: '',
      numberOfPeople: 1,
      language: 'nl',
      specialRequests: '',
      isPaid: false,
    });
  };

  // Add new invitee (for Local Stories)
  const handleAddInvitee = async () => {
    if (!booking || !tour) return;
    if (!newInvitee.name || !newInvitee.email) {
      toast.error('Please fill in name and email');
      return;
    }

    setAddingInvitee(true);
    try {
      // Create invitee object
      const inviteeData: Record<string, unknown> = {
        name: newInvitee.name,
        email: newInvitee.email,
        phone: newInvitee.phone,
        numberOfPeople: newInvitee.numberOfPeople,
        language: newInvitee.language,
        specialRequests: newInvitee.specialRequests,
        currency: 'eur',
        isContacted: false,
        isPaid: newInvitee.isPaid,
      };

      // Only set amount if customer has already paid
      if (newInvitee.isPaid) {
        inviteeData.amount = (tour.price || 0) * newInvitee.numberOfPeople;
      }

      // Append to existing invitees
      const updatedInvitees = [...(booking.invitees || []), inviteeData];

      // Update tourbooking
      const { error: updateError } = await supabase
        .from('tourbooking')
        .update({ invitees: updatedInvitees })
        .eq('id', booking.id);

      if (updateError) {
        throw new Error('Failed to update booking invitees');
      }

      // Create local_tours_bookings entry
      // Extract date and time from Brussels datetime string
      const bookingDate = booking.tour_datetime ? booking.tour_datetime.split('T')[0] : '';
      const bookingTime = booking.tour_datetime
        ? booking.tour_datetime.split('T')[1]?.split('.')[0] || '14:00:00'
        : '14:00:00';

      const { error: localError } = await supabase
        .from('local_tours_bookings')
        .insert({
          tour_id: booking.tour_id,
          booking_date: bookingDate,
          booking_time: bookingTime,
          is_booked: true,
          status: 'booked',
          customer_name: newInvitee.name,
          customer_email: newInvitee.email,
          customer_phone: newInvitee.phone,
          booking_id: booking.id,
          amnt_of_people: newInvitee.numberOfPeople,
        });

      if (localError) {
        // Error creating local tours booking
        // Don't fail - main booking was updated
      }

      toast.success('Invitee added successfully!');
      setAddInviteeDialogOpen(false);
      resetNewInvitee();
      void fetchBookingDetails();
    } catch (err) {
      // Error adding invitee
      toast.error('Failed to add invitee');
    } finally {
      setAddingInvitee(false);
    }
  };


  // Open add people dialog
  const openAddPeopleDialog = (
    customerName: string,
    customerEmail: string,
    currentPeople: number,
    inviteeIndex?: number,
    localBookingId?: string
  ) => {
    setAddPeopleTarget({
      inviteeIndex,
      localBookingId,
      customerName,
      customerEmail,
      currentPeople,
    });
    setAdditionalPeople(1);
    // Initialize price - use tour price if available, otherwise default to 35 for Local Stories
    const basePrice = tour?.price || (tour?.local_stories ? 35 : 0);
    setAdditionalPeoplePrice(basePrice.toString());
    // Reset fees - auto-detect weekend based on booking date (Brussels timezone)
    const isWeekend = booking?.tour_datetime ? isWeekendBrussels(booking.tour_datetime) : false;
    const isEvening = booking?.tour_datetime ? (() => {
      const hour = getHourBrussels(booking.tour_datetime);
      return hour >= 17;
    })() : false;
    setAddPeopleFees({
      requestTanguy: false,
      hasExtraHour: false,
      weekendFee: isWeekend,
      eveningFee: tour?.op_maat ? isEvening : false,
    });
    setAddPeopleDialogOpen(true);
  };

  // Handle adding people
  const handleAddPeople = async () => {
    if (!addPeopleTarget || !booking) return;

    setAddingPeople(true);
    try {
      const pricePerPerson = parseFloat(additionalPeoplePrice) || 0;
      const baseAmount = pricePerPerson * additionalPeople;
      // Calculate fee costs (admin can set any fee for any tour)
      const feeCosts = {
        tanguyCost: addPeopleFees.requestTanguy ? TANGUY_COST : 0,
        extraHourCost: addPeopleFees.hasExtraHour ? EXTRA_HOUR_COST : 0,
        weekendFeeCost: addPeopleFees.weekendFee ? WEEKEND_FEE_COST : 0,
        eveningFeeCost: addPeopleFees.eveningFee ? EVENING_FEE_COST : 0,
      };
      const totalFees = feeCosts.tanguyCost + feeCosts.extraHourCost + feeCosts.weekendFeeCost + feeCosts.eveningFeeCost;
      const totalAmount = baseAmount + totalFees;

      if (addPeopleTarget.localBookingId) {
        // Local Stories: Update local_tours_bookings entry directly
        // Find current local booking to accumulate pending payment
        const currentLocalBooking = localStoriesBookings.find(lb => lb.id === addPeopleTarget.localBookingId);
        const currentPendingPeople = currentLocalBooking?.pending_payment_people || 0;
        const currentPendingAmount = currentLocalBooking?.pending_payment_amount || 0;

        const updateData: Record<string, unknown> = {
          amnt_of_people: addPeopleTarget.currentPeople + additionalPeople,
        };

        // Track pending payment directly on local_tours_bookings
        if (totalAmount > 0) {
          updateData.pending_payment_people = currentPendingPeople + additionalPeople;
          updateData.pending_payment_amount = currentPendingAmount + totalAmount;
        }

        const { error: localError } = await supabase
          .from('local_tours_bookings')
          .update(updateData)
          .eq('id', addPeopleTarget.localBookingId);

        if (localError) throw new Error('Failed to update local booking');

      } else if (addPeopleTarget.inviteeIndex !== undefined) {
        // Normal/Custom: Update invitees array
        const updatedInvitees = [...(booking.invitees || [])];
        const existingInvitee = updatedInvitees[addPeopleTarget.inviteeIndex];
        if (existingInvitee) {
          const updateData: Record<string, unknown> = {
            ...existingInvitee,
            numberOfPeople: (existingInvitee.numberOfPeople || 0) + additionalPeople,
          };

          // Track pending payment (accumulate with existing)
          if (totalAmount > 0) {
            updateData.pendingPaymentPeople = ((existingInvitee.pendingPaymentPeople as number) || 0) + additionalPeople;
            updateData.pendingPaymentAmount = ((existingInvitee.pendingPaymentAmount as number) || 0) + totalAmount;
          }

          updatedInvitees[addPeopleTarget.inviteeIndex] = updateData;
        }

        const { error: updateError } = await supabase
          .from('tourbooking')
          .update({ invitees: updatedInvitees })
          .eq('id', booking.id);

        if (updateError) throw new Error('Failed to update booking');
      }

      toast.success(`Added ${additionalPeople} people to the booking`);

      setAddPeopleDialogOpen(false);
      setAddPeopleTarget(null);
      void fetchBookingDetails();
    } catch (err) {
      // Error adding people
      toast.error(err instanceof Error ? err.message : 'Failed to add people');
    } finally {
      setAddingPeople(false);
    }
  };

  // Open edit invitee dialog
  const openEditInviteeDialog = (
    invitee: Invitee | LocalStoriesBooking,
    index?: number,
    localBookingId?: string,
    isLocalStories = false
  ) => {
    setEditInviteeTarget({
      index,
      localBookingId,
      isLocalStories,
    });
    const inv = invitee as Invitee & LocalStoriesBooking;
    const invLanguage = inv.language || 'nl';
    // Check if language is a known option or a custom one
    const isKnownLanguage = LANGUAGE_OPTIONS.some(opt => opt.value === invLanguage);
    setEditInviteeForm({
      name: inv.name || inv.customer_name || '',
      email: inv.email || inv.customer_email || '',
      phone: inv.phone || inv.customer_phone || '',
      numberOfPeople: inv.numberOfPeople || inv.amnt_of_people || 1,
      language: isKnownLanguage ? invLanguage : 'other',
      contactLanguage: (inv as any).contactLanguage || 'nl', // Language for email communications
      specialRequests: inv.specialRequests || '',
      dealId: inv.deal_id || (isLocalStories ? '' : booking?.deal_id || ''),
      invoiceId: (inv as any).invoice_link || '',
      // Load existing fee values from invitee
      requestTanguy: inv.requestTanguy || false,
      hasExtraHour: inv.hasExtraHour || false,
      weekendFee: inv.weekendFee || false,
      eveningFee: inv.eveningFee || false,
    });
    setEditCustomLanguage(isKnownLanguage ? '' : invLanguage);
    // Fetch deals and invoices when opening the dialog
    void fetchTeamleaderDeals();
    void fetchEditInviteeInvoices();
    setEditInviteeDialogOpen(true);
  };

  // Fetch TeamLeader invoices for edit invitee
  const fetchEditInviteeInvoices = async () => {
    setLoadingEditInviteeInvoices(true);
    setEditInviteeInvoicesError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setEditInviteeInvoicesError('Not authenticated');
        return;
      }

      const response = await fetch('/api/admin/teamleader-invoices', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch invoices');
      }

      const data = await response.json();
      setEditInviteeInvoices(data.invoices || []);
    } catch (err) {
      // Error fetching TeamLeader invoices
      setEditInviteeInvoicesError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoadingEditInviteeInvoices(false);
    }
  };

  // Handle edit invitee
  const handleEditInvitee = async () => {
    if (!editInviteeTarget || !booking) return;

    // Use custom language if "other" is selected
    const finalLanguage = editInviteeForm.language === 'other' ? editCustomLanguage : editInviteeForm.language;

    setEditingInvitee(true);
    try {
      if (editInviteeTarget.isLocalStories && editInviteeTarget.localBookingId) {
        // Update local_tours_bookings entry (including deal_id for Local Stories)
        const localUpdateData: Record<string, unknown> = {
          customer_name: editInviteeForm.name,
          customer_email: editInviteeForm.email,
          customer_phone: editInviteeForm.phone,
          amnt_of_people: editInviteeForm.numberOfPeople,
        };

        // Add deal_id (or set to null if cleared)
        localUpdateData.deal_id = editInviteeForm.dealId || null;

        const { error: localError } = await supabase
          .from('local_tours_bookings')
          .update(localUpdateData)
          .eq('id', editInviteeTarget.localBookingId);

        if (localError) throw new Error('Failed to update local booking');

        // Also update invitees array if this email exists there
        const oldLocalBooking = localStoriesBookings.find(lb => lb.id === editInviteeTarget.localBookingId);
        if (oldLocalBooking) {
          const updatedInvitees = (booking.invitees || []).map((inv) => {
            if (inv.email === oldLocalBooking.customer_email) {
              return {
                ...inv,
                name: editInviteeForm.name,
                email: editInviteeForm.email,
                phone: editInviteeForm.phone,
                numberOfPeople: editInviteeForm.numberOfPeople,
                language: finalLanguage,
                contactLanguage: editInviteeForm.contactLanguage, // Language for email communications
                specialRequests: editInviteeForm.specialRequests,
                invoice_link: editInviteeForm.invoiceId || null,
              };
            }
            return inv;
          });

          await supabase
            .from('tourbooking')
            .update({ invitees: updatedInvitees })
            .eq('id', booking.id);
        }
      } else if (editInviteeTarget.index !== undefined) {
        // Update invitees array for Normal/Custom tours
        const updatedInvitees = [...(booking.invitees || [])];
        const existingInvitee = updatedInvitees[editInviteeTarget.index];
        if (existingInvitee) {
          // Calculate fee costs based on toggles (admin can set any fee for any tour)
          const tanguyCost = editInviteeForm.requestTanguy ? TANGUY_COST : 0;
          const extraHourCost = editInviteeForm.hasExtraHour ? EXTRA_HOUR_COST : 0;
          const weekendFeeCost = editInviteeForm.weekendFee ? WEEKEND_FEE_COST : 0;
          const eveningFeeCost = editInviteeForm.eveningFee ? EVENING_FEE_COST : 0;

          updatedInvitees[editInviteeTarget.index] = {
            ...existingInvitee,
            name: editInviteeForm.name,
            email: editInviteeForm.email,
            phone: editInviteeForm.phone,
            numberOfPeople: editInviteeForm.numberOfPeople,
            language: finalLanguage,
            contactLanguage: editInviteeForm.contactLanguage, // Language for email communications
            specialRequests: editInviteeForm.specialRequests,
            invoice_link: editInviteeForm.invoiceId || null,
            // Store fee toggles and calculated costs
            requestTanguy: editInviteeForm.requestTanguy,
            hasExtraHour: editInviteeForm.hasExtraHour,
            weekendFee: editInviteeForm.weekendFee,
            eveningFee: editInviteeForm.eveningFee,
            tanguyCost,
            extraHourCost,
            weekendFeeCost,
            eveningFeeCost,
          };
        }

        // Update invitees array and deal_id (for regular bookings, deal_id is at booking level)
        const updateData: Record<string, unknown> = { invitees: updatedInvitees };

        // Update deal_id for regular bookings (not Local Stories)
        if (!tour?.local_stories) {
          updateData.deal_id = editInviteeForm.dealId || null;
        }

        const { error: updateError } = await supabase
          .from('tourbooking')
          .update(updateData)
          .eq('id', booking.id);

        if (updateError) throw new Error('Failed to update booking');
      }

      toast.success('Invitee updated successfully');
      setEditInviteeDialogOpen(false);
      setEditInviteeTarget(null);
      void fetchBookingDetails();
    } catch (err) {
      // Error updating invitee
      toast.error(err instanceof Error ? err.message : 'Failed to update invitee');
    } finally {
      setEditingInvitee(false);
    }
  };

  // Open delete invitee dialog
  const openDeleteInviteeDialog = (
    name: string,
    index?: number,
    localBookingId?: string,
    isLocalStories = false
  ) => {
    setDeleteInviteeTarget({
      index,
      localBookingId,
      isLocalStories,
      name,
    });
    setDeleteInviteeDialogOpen(true);
  };

  // Handle delete invitee
  const handleDeleteInvitee = async () => {
    if (!deleteInviteeTarget || !booking) return;

    setDeletingInvitee(true);
    try {
      if (deleteInviteeTarget.isLocalStories && deleteInviteeTarget.localBookingId) {
        // Get the local booking before deleting to find matching invitee
        const localBooking = localStoriesBookings.find(lb => lb.id === deleteInviteeTarget.localBookingId);

        // Delete from local_tours_bookings
        const { error: deleteError } = await supabase
          .from('local_tours_bookings')
          .delete()
          .eq('id', deleteInviteeTarget.localBookingId);

        if (deleteError) throw new Error('Failed to delete local booking');

        // Also remove from invitees array if email matches
        if (localBooking?.customer_email) {
          const updatedInvitees = (booking.invitees || []).filter(
            (inv) => inv.email !== localBooking.customer_email
          );

          await supabase
            .from('tourbooking')
            .update({ invitees: updatedInvitees })
            .eq('id', booking.id);
        }
      } else if (deleteInviteeTarget.index !== undefined) {
        // Remove from invitees array for Normal/Custom tours
        const updatedInvitees = [...(booking.invitees || [])];
        updatedInvitees.splice(deleteInviteeTarget.index, 1);

        const { error: updateError } = await supabase
          .from('tourbooking')
          .update({ invitees: updatedInvitees })
          .eq('id', booking.id);

        if (updateError) throw new Error('Failed to delete invitee');
      }

      toast.success('Invitee deleted successfully');
      setDeleteInviteeDialogOpen(false);
      setDeleteInviteeTarget(null);
      void fetchBookingDetails();
    } catch (err) {
      // Error deleting invitee
      toast.error(err instanceof Error ? err.message : 'Failed to delete invitee');
    } finally {
      setDeletingInvitee(false);
    }
  };

  // Handle delete entire booking
  const handleReprocessBooking = async () => {
    if (!booking || !booking.stripe_session_id) {
      toast.error('No Stripe session ID found for this booking');
      return;
    }

    try {
      const response = await fetch('/api/admin/reprocess-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: booking.stripe_session_id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to reprocess booking');
        return;
      }

      toast.success('Booking reprocessed successfully');
      
      // Refresh booking data
      fetchBookingDetails();
    } catch (error: any) {
      // Error reprocessing booking
      toast.error(error.message || 'Failed to reprocess booking');
    }
  };

  const handleDeleteBooking = async () => {
    if (!booking) return;

    setDeletingBooking(true);
    try {
      // If Local Stories, first delete all local_tours_bookings entries
      if (tour?.local_stories) {
        const { error: localError } = await supabase
          .from('local_tours_bookings')
          .delete()
          .eq('booking_id', booking.id);

        if (localError) {
          // Error deleting local tours bookings
          // Continue anyway - we still want to delete the main booking
        }
      }

      // Delete the main booking
      const { error: deleteError } = await supabase
        .from('tourbooking')
        .delete()
        .eq('id', booking.id);

      if (deleteError) throw new Error('Failed to delete booking');

      toast.success('Booking deleted successfully');
      // Navigate back to bookings list
      router.push(`/${locale}/admin/bookings`);
    } catch (err) {
      // Error deleting booking
      toast.error(err instanceof Error ? err.message : 'Failed to delete booking');
    } finally {
      setDeletingBooking(false);
      setDeleteBookingDialogOpen(false);
    }
  };

  // Send extra info to client(s)
  const handleSendInfoToClient = async () => {
    if (!booking || !infoMessage.trim()) return;

    setSendingInfo(true);
    try {
      // Get auth token for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Collect all client data with payment information
      let clientData: Array<{
        name: string;
        email: string;
        phone?: string;
        numberOfPeople: number;
        amount: number;
        paymentUrl?: string;
        isPaid: boolean;
        localBookingId?: string;
        fees?: {
          requestTanguy: boolean;
          hasExtraHour: boolean;
          weekendFee: boolean;
          eveningFee: boolean;
          tanguyCost: number;
          extraHourCost: number;
          weekendFeeCost: number;
          eveningFeeCost: number;
        };
      }> = [];

      if (tour?.local_stories && localStoriesBookings.length > 0) {
        // For Local Stories: get all bookings with payment info
        for (const lb of localStoriesBookings) {
          if (!lb.customer_email || !lb.customer_name) continue;

          const matchingInvitee = (booking.invitees || []).find(
            (inv: Invitee) => inv.email === lb.customer_email
          );

          const numberOfPeople = lb.amnt_of_people || 1;
          const baseAmount = matchingInvitee?.amount || (tour.price || 0) * numberOfPeople;
          const isPaid = !!(lb.deal_id || lb.stripe_session_id || matchingInvitee?.isPaid);

          // Calculate fees if present
          const fees = matchingInvitee ? {
            requestTanguy: matchingInvitee.requestTanguy || false,
            hasExtraHour: matchingInvitee.hasExtraHour || false,
            weekendFee: matchingInvitee.weekendFee || false,
            eveningFee: matchingInvitee.eveningFee || false,
            tanguyCost: matchingInvitee.tanguyCost || 0,
            extraHourCost: matchingInvitee.extraHourCost || 0,
            weekendFeeCost: matchingInvitee.weekendFeeCost || 0,
            eveningFeeCost: matchingInvitee.eveningFeeCost || 0,
          } : undefined;

          let paymentUrl: string | undefined;
          
          // Create payment link if not paid
          if (!isPaid && baseAmount > 0) {
            try {
              const paymentResponse = await fetch('/api/admin/send-payment-link', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  bookingId: booking.id,
                  customerName: lb.customer_name,
                  customerEmail: lb.customer_email,
                  tourName: tour.title || 'Tour',
                  tourId: tour.id,
                  numberOfPeople,
                  amount: baseAmount,
                  localBookingId: lb.id,
                  city: booking.city || tour.city,
                  tourDatetime: booking.tour_datetime,
                  fees: fees ? {
                    requestTanguy: fees.requestTanguy,
                    hasExtraHour: fees.hasExtraHour,
                    weekendFee: fees.weekendFee,
                    eveningFee: fees.eveningFee,
                    tanguyCost: fees.tanguyCost,
                    extraHourCost: fees.extraHourCost,
                    weekendFeeCost: fees.weekendFeeCost,
                    eveningFeeCost: fees.eveningFeeCost,
                  } : undefined,
                }),
              });

              if (paymentResponse.ok) {
                const paymentData = await paymentResponse.json();
                paymentUrl = paymentData.paymentUrl;
              }
            } catch (paymentErr) {
              // Continue even if payment link creation fails
            }
          }

          clientData.push({
            name: lb.customer_name,
            email: lb.customer_email,
            phone: lb.customer_phone || undefined,
            numberOfPeople,
            amount: baseAmount,
            paymentUrl,
            isPaid,
            localBookingId: lb.id,
            fees,
          });
        }
      } else {
        // For Normal/Custom: get from invitees
        const invitees = booking.invitees || [];
        for (const inv of invitees) {
          if (!inv.email || !inv.name) continue;

          const numberOfPeople = inv.numberOfPeople || 1;
          const baseAmount = inv.amount || (tour?.price || 0) * numberOfPeople;
          const isPaid = inv.isPaid || false;

          // Calculate fees if present
          const fees = {
            requestTanguy: inv.requestTanguy || false,
            hasExtraHour: inv.hasExtraHour || false,
            weekendFee: inv.weekendFee || false,
            eveningFee: inv.eveningFee || false,
            tanguyCost: inv.tanguyCost || 0,
            extraHourCost: inv.extraHourCost || 0,
            weekendFeeCost: inv.weekendFeeCost || 0,
            eveningFeeCost: inv.eveningFeeCost || 0,
          };

          let paymentUrl: string | undefined;
          
          // Create payment link if not paid
          if (!isPaid && baseAmount > 0) {
            try {
              const paymentResponse = await fetch('/api/admin/send-payment-link', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  bookingId: booking.id,
                  customerName: inv.name,
                  customerEmail: inv.email,
                  tourName: tour?.title || 'Tour',
                  tourId: tour?.id,
                  numberOfPeople,
                  amount: baseAmount,
                  city: booking.city || tour?.city,
                  tourDatetime: booking.tour_datetime,
                  fees: {
                    requestTanguy: fees.requestTanguy,
                    hasExtraHour: fees.hasExtraHour,
                    weekendFee: fees.weekendFee,
                    eveningFee: fees.eveningFee,
                    tanguyCost: fees.tanguyCost,
                    extraHourCost: fees.extraHourCost,
                    weekendFeeCost: fees.weekendFeeCost,
                    eveningFeeCost: fees.eveningFeeCost,
                  },
                }),
              });

              if (paymentResponse.ok) {
                const paymentData = await paymentResponse.json();
                paymentUrl = paymentData.paymentUrl;
              }
            } catch (paymentErr) {
              // Continue even if payment link creation fails
            }
          }

          clientData.push({
            name: inv.name,
            email: inv.email,
            phone: inv.phone || undefined,
            numberOfPeople,
            amount: baseAmount,
            paymentUrl,
            isPaid,
            fees,
          });
        }
      }

      // Prepare tour information
      const tourInfo = {
        tourId: tour?.id || null,
        tourName: tour?.title || 'Tour',
        tourCity: booking.city || tour?.city || null,
        tourDuration: tour?.duration_minutes || null,
        tourPrice: tour?.price || null,
        tourStartLocation: booking.start_location || tour?.start_location || null,
        tourEndLocation: booking.end_location || tour?.end_location || null,
        tourDate: booking.tour_datetime || null,
        tourEndDate: booking.tour_end || null,
        isOpMaat: tour?.op_maat || false,
        isLocalStories: tour?.local_stories || false,
      };

      const response = await fetch('https://alexfinit.app.n8n.cloud/webhook/44bd866d-a0f7-4ed0-935f-415f74ed14ac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          message: infoMessage.trim(),
          tourInfo,
          clients: clientData,
          deliveryMethod: deliveryMethod,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send info to client');
      }

      toast.success('Extra information sent to client(s)');
      setSendInfoToClientOpen(false);
      setInfoMessage('');
    } catch (err) {
      // Error sending info to client
      toast.error('Failed to send info to client');
    } finally {
      setSendingInfo(false);
    }
  };

  // Send payment link to a specific invitee
  const handleSendPaymentLinkToInvitee = async (
    invitee: Invitee,
    inviteeIndex?: number,
    localBookingId?: string
  ) => {
    if (!booking || !tour) return;

    if (!invitee.email || !invitee.name) {
      toast.error('Invitee must have email and name to send payment link');
      return;
    }

    const numberOfPeople = invitee.numberOfPeople || 1;
    const baseAmount = invitee.amount || (tour.price || 0) * numberOfPeople;
    
    // Check payment status - for Local Stories, also check local booking
    let isPaid = invitee.isPaid || false;
    if (localBookingId) {
      const localBooking = localStoriesBookings.find(lb => lb.id === localBookingId);
      if (localBooking) {
        isPaid = !!(localBooking.deal_id || localBooking.stripe_session_id || invitee.isPaid);
      }
    }

    if (isPaid) {
      toast.info('This invitee has already paid');
      return;
    }

    if (baseAmount <= 0) {
      toast.error('Cannot send payment link: amount is 0 or invalid');
      return;
    }

    try {
      // Get auth token for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const fees = {
        requestTanguy: invitee.requestTanguy || false,
        hasExtraHour: invitee.hasExtraHour || false,
        weekendFee: invitee.weekendFee || false,
        eveningFee: invitee.eveningFee || false,
        tanguyCost: invitee.tanguyCost || 0,
        extraHourCost: invitee.extraHourCost || 0,
        weekendFeeCost: invitee.weekendFeeCost || 0,
        eveningFeeCost: invitee.eveningFeeCost || 0,
      };

      const paymentResponse = await fetch('/api/admin/send-payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          bookingId: booking.id,
          customerName: invitee.name,
          customerEmail: invitee.email,
          tourName: tour.title || 'Tour',
          tourId: tour.id,
          numberOfPeople,
          amount: baseAmount,
          localBookingId: localBookingId,
          city: booking.city || tour.city,
          tourDatetime: booking.tour_datetime,
          fees: fees,
          isExtraInvitees: false,
        }),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.error || 'Failed to create payment link');
      }

      const paymentData = await paymentResponse.json();
      toast.success(`Payment link sent to ${invitee.name} (${invitee.email})`);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to send payment link';
      toast.error(error);
    }
  };

  // Call invoice webhook
  const handleCallInvoiceWebhook = async (invoiceId: string, price: number) => {
    try {
      const response = await fetch('https://alexfinit.app.n8n.cloud/webhook/8a7a6159-5cdb-4853-b6ff-b92307739f22', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoice_id: invoiceId,
          price: price,
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook call failed: ${response.statusText}`);
      }

      toast.success('Webhook called successfully');
    } catch (err) {
      // Error calling invoice webhook
      toast.error('Failed to call webhook');
    }
  };

  // Helper function to get guide IDs from booking (guide_ids array or fall back to guide_id)
  const getGuideIds = (booking: TourBooking): number[] => {
    return booking.guide_ids && booking.guide_ids.length > 0 
      ? booking.guide_ids 
      : booking.guide_id 
        ? [booking.guide_id] 
        : [];
  };

  // Send extra info to guide
  const handleSendInfoToGuide = async () => {
    if (!booking || !infoMessage.trim()) return;

    setSendingInfo(true);
    try {
      // Get guide info - use first guide from guide_ids array or fall back to guide_id
      const guideIds = getGuideIds(booking);
      const guideInfo = guideIds.length > 0 ? allGuides.get(guideIds[0]) : null;

      // Collect all client phones for the guide
      let clientPhones: string[] = [];
      let clientNames: string[] = [];

      if (tour?.local_stories && localStoriesBookings.length > 0) {
        clientPhones = localStoriesBookings
          .map(lb => lb.customer_phone)
          .filter((phone): phone is string => !!phone);
        clientNames = localStoriesBookings
          .map(lb => lb.customer_name)
          .filter((name): name is string => !!name);
      } else {
        const invitees = booking.invitees || [];
        clientPhones = invitees
          .map((inv) => inv.phone)
          .filter((phone): phone is string => !!phone);
        clientNames = invitees
          .map((inv) => inv.name)
          .filter((name): name is string => !!name);
      }

      const response = await fetch('https://alexfinit.app.n8n.cloud/webhook/477d2b32-75aa-491e-ad52-6bfd76a3b150', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          tourName: tour?.title || 'Tour',
          tourDate: booking.tour_datetime,
          message: infoMessage.trim(),
          guideId: guideIds.length > 0 ? guideIds[0] : null,
          guideName: guideInfo?.name || null,
          guideEmail: guideInfo?.Email || null,
          clientPhones,
          clientNames,
          isLocalStories: tour?.local_stories || false,
          deliveryMethod: deliveryMethod,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send info to guide');
      }

      toast.success('Extra information sent to guide');
      setSendInfoToGuideOpen(false);
      setInfoMessage('');
    } catch (err) {
      // Error sending info to guide
      toast.error('Failed to send info to guide');
    } finally {
      setSendingInfo(false);
    }
  };

  // Get guides filtered by booking city
  const getGuidesByCity = (): Guide[] => {
    if (!booking?.city) return Array.from(allGuides.values());
    return Array.from(allGuides.values()).filter(guide => {
      if (!guide.cities) return false;
      return guide.cities.some(city =>
        city.toLowerCase() === booking.city?.toLowerCase()
      );
    });
  };

  // Handle guide reassignment
  const handleReassignGuide = async () => {
    if (!booking || !selectedReassignGuide) return;

    setReassigningGuide(true);
    try {
      const newGuide = allGuides.get(selectedReassignGuide);
      if (!newGuide) throw new Error('Guide not found');

      // Update the booking with the new guide - add to guide_ids array
      const currentGuideIds = getGuideIds(booking);
      const updatedGuideIds = currentGuideIds.includes(selectedReassignGuide)
        ? currentGuideIds
        : [...currentGuideIds, selectedReassignGuide];
      
      const { error: updateError } = await supabase
        .from('tourbooking')
        .update({ 
          guide_ids: updatedGuideIds,
          guide_id: selectedReassignGuide // Keep guide_id for backward compatibility
        })
        .eq('id', booking.id);

      if (updateError) throw new Error('Failed to update booking');

      // Call the guide reassignment webhook
      await fetch('https://alexfinit.app.n8n.cloud/webhook/guide-reassignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          newGuideId: selectedReassignGuide,
          guideName: newGuide.name,
          guideEmail: newGuide.Email,
          guidePhone: newGuide.phonenumber,
          message: reassignMessage.trim(),
          tourName: tour?.title || 'Tour',
          tourDate: booking.tour_datetime,
          city: booking.city,
        }),
      });

      toast.success('Guide reassigned successfully!');
      setReassignGuideDialogOpen(false);
      setSelectedReassignGuide(null);
      setReassignMessage('');
      void fetchBookingDetails();
    } catch (err) {
      // Error reassigning guide
      toast.error(err instanceof Error ? err.message : 'Failed to reassign guide');
    } finally {
      setReassigningGuide(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'payment_completed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'pending_jotform_confirmation':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'pending_guide_confirmation':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'quote_pending':
      case 'quote_sent':
      case 'quote_accepted':
      case 'quote_paid':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    return formatBrusselsDateTime(dateStr, 'dd MMMM yyyy, HH:mm');
  };

  // Normalize guide objects - can be full guide objects or simplified {id, status} objects
  const normalizeGuide = (item: any): SelectedGuide => {
    if (typeof item === 'number') {
      return { id: item };
    }
    if (typeof item === 'string') {
      return { id: parseInt(item, 10) };
    }
    if (typeof item === 'object' && item !== null && 'id' in item) {
      // Extract the relevant fields, ensuring id is a number
      return {
        id: typeof item.id === 'number' ? item.id : parseInt(String(item.id), 10),
        status: item.status, // 'offered', 'declined', 'accepted', or undefined
        offeredAt: item.offeredAt,
        respondedAt: item.respondedAt,
      };
    }
    // Fallback
    return { id: 0 };
  };

  if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-sand">
        <div className="border-b bg-white">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Link href={`/${locale}/admin/bookings`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Bookings
              </Button>
            </Link>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">{error || 'Booking not found'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const invitee = booking.invitees?.[0];
  const allInvitees = booking.invitees || [];
  const isLocalStories = tour?.local_stories === true;

  return (
    <div className="min-h-screen bg-sand">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href={`/${locale}/admin/bookings`}>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-gray-900">Booking #{booking.id}</h1>
                  <Badge className={getStatusColor(booking.status)}>
                    {booking.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {tour?.title || 'Tour booking details'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={openEditDialog}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchBookingDetails()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Link href={`/${locale}/admin/dashboard`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions Bar */}
        <Card className="border-dashed">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Send to Guide Assignment - redirects to guide choosing page */}
              {getGuideIds(booking).length === 0 && (
                <Button
                  onClick={() => router.push(`/${locale}/choose-guide/${booking.id}`)}
                  size="sm"
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  Choose Guide
                </Button>
              )}
              {booking.deal_id && !isLocalStories && (
                <Button variant="outline" size="sm" asChild className="gap-2">
                  <a
                    href={`https://focus.teamleader.eu/web/deals/${booking.deal_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Building2 className="h-4 w-4" />
                    TeamLeader Deal
                  </a>
                </Button>
              )}
              {booking.google_calendar_link && (
                <Button variant="outline" size="sm" asChild className="gap-2">
                  <a
                    href={booking.google_calendar_link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Calendar className="h-4 w-4" />
                    Calendar
                  </a>
                </Button>
              )}
              {booking.google_drive_link && (
                <Button variant="outline" size="sm" asChild className="gap-2">
                  <a
                    href={booking.google_drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Image className="h-4 w-4" />
                    Photos
                  </a>
                </Button>
              )}
              {/* Send Info Buttons */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                onClick={() => {
                  setInfoMessage('');
                  setSendInfoToClientOpen(true);
                }}
              >
                <Mail className="h-4 w-4" />
                Send Info to Client
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                onClick={() => {
                  setInfoMessage('');
                  setSendInfoToGuideOpen(true);
                }}
                disabled={getGuideIds(booking).length === 0}
                title={getGuideIds(booking).length === 0 ? 'No guide assigned yet' : undefined}
              >
                <User className="h-4 w-4" />
                Send Info to Guide
              </Button>
              {/* Delete Booking Button */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-red-50 border-red-200 text-red-700 hover:bg-red-100 ml-auto"
                onClick={() => setDeleteBookingDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete Booking
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tour Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Tour Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tour ? (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Tour</p>
                    <p className="font-medium">{tour.title || 'Unnamed Tour'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">City</p>
                      <p className="font-medium">{booking.city || tour.city || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Start Time</p>
                      <p className="font-medium">{formatDateTime(booking.tour_datetime)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">End Time</p>
                      <p className="font-medium">{booking.tour_end ? formatDateTime(booking.tour_end) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Price</p>
                      <p className="font-medium">€{tour.price || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Duration</p>
                      <p className="font-medium">
                        {(() => {
                          // Always use durationMinutes from invitee first (this is the source of truth)
                          const firstInvitee = booking.invitees?.[0] as any;
                          if (firstInvitee?.durationMinutes) {
                            return `${firstInvitee.durationMinutes} min`;
                          }
                          // Fall back to tour's base duration
                          return tour.duration_minutes ? `${tour.duration_minutes} min` : 'N/A';
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Start Location</p>
                      <p className="font-medium text-sm">
                        {booking.start_location || tour.start_location || 'Not set'}
                        {booking.start_location && (
                          <Badge variant="outline" className="ml-2 text-xs">Custom</Badge>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">End Location</p>
                      <p className="font-medium text-sm">
                        {booking.end_location || tour.end_location || 'Not set'}
                        {booking.end_location && (
                          <Badge variant="outline" className="ml-2 text-xs">Custom</Badge>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary" className="text-xs">
                      {booking.booking_type || 'B2C'}
                    </Badge>
                    {tour.op_maat && <Badge variant="outline" className="text-xs">Op Maat</Badge>}
                    {tour.local_stories && <Badge variant="outline" className="text-xs">Local Stories</Badge>}
                    {booking.request_tanguy && <Badge variant="outline" className="text-xs bg-amber-50">Tanguy Requested</Badge>}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Tour information not available</p>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {isLocalStories
                      ? `Bookings (${localStoriesBookings.length})`
                      : allInvitees.length > 1 ? `Customers (${allInvitees.length})` : 'Customer'
                    }
                  </CardTitle>
                  <CardDescription>
                    {isLocalStories ? (
                      <>Total people signed up: {(() => {
                        // Calculate total people, ensuring we don't double-count
                        const uniqueBookings = new Map();
                        localStoriesBookings.forEach(b => {
                          if (!uniqueBookings.has(b.id)) {
                            uniqueBookings.set(b.id, b);
                          }
                        });
                        return Array.from(uniqueBookings.values()).reduce((sum, b) => sum + (b.amnt_of_people || 0), 0);
                      })()}</>
                    ) : (
                      <>Total people: {allInvitees.reduce((sum, inv) => sum + (inv.numberOfPeople || 1), 0)}</>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIdsDialogOpen(true)}
                    className="gap-1 text-muted-foreground"
                  >
                    <Hash className="h-4 w-4" />
                    IDs
                  </Button>
                  {isLocalStories && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAddInviteeDialogOpen(true)}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Add Invitee
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLocalStories ? (
                /* Local Stories: Show individual bookings from local_tours_bookings */
                localStoriesBookings.length > 0 ? (
                  <div className="space-y-4">
                    {localStoriesBookings.map((lb, index) => (
                      <div key={lb.id} className={`p-4 rounded-lg border ${index > 0 ? 'bg-muted/30' : 'bg-muted/50'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-medium text-sm">{lb.customer_name || `Customer ${index + 1}`}</p>
                          <Badge variant="outline" className="text-xs">
                            {lb.amnt_of_people || 1} {(lb.amnt_of_people || 1) === 1 ? 'person' : 'people'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            <p className="truncate">{lb.customer_email || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <p>{lb.customer_phone || 'N/A'}</p>
                          </div>
                        </div>
                        {/* Check for pending payment directly on local_tours_bookings */}
                        {lb.pending_payment_people && lb.pending_payment_people > 0 && (
                          <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                            <p className="text-xs text-amber-700">
                              <span className="font-medium">{lb.pending_payment_people} {lb.pending_payment_people === 1 ? 'person was' : 'people were'} added</span> (€{(lb.pending_payment_amount || 0).toFixed(2)})
                            </p>
                          </div>
                        )}
                        {/* Extra payments received log (for additional people) */}
                        {lb.extra_payments_received && lb.extra_payments_received.length > 0 && (
                          <div className="mt-2 p-2 rounded-lg bg-green-50 border border-green-200">
                            <p className="text-xs text-green-700 font-medium mb-1">Extra payments received:</p>
                            <div className="space-y-1">
                              {lb.extra_payments_received.map((payment, paymentIndex) => (
                                <p key={paymentIndex} className="text-xs text-green-600">
                                  • {formatBrusselsDateTime(payment.paidAt, 'dd/MM/yyyy HH:mm')} - {payment.numberOfPeople} {payment.numberOfPeople === 1 ? 'person' : 'people'} for €{payment.amount.toFixed(2)}
                                  {payment.type === 'extra_people' && ' (extra people)'}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Price Breakdown for Local Stories */}
                        {(() => {
                          const matchingInvitee = allInvitees.find(inv => 
                            (inv.email || '').toLowerCase().trim() === (lb.customer_email || '').toLowerCase().trim()
                          );
                          
                          // Calculate total paid amount
                          // 1. Initial payment from matching invitee
                          const initialPaidAmount = matchingInvitee?.amount || 0;
                          
                          // 2. Extra payments received
                          const extraPaymentsTotal = lb.extra_payments_received?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
                          
                          // 3. Total paid amount
                          const totalPaidAmount = initialPaidAmount + extraPaymentsTotal;
                          
                          // Show breakdown if there's any payment info
                          if (totalPaidAmount > 0 || matchingInvitee?.pricePerPerson !== undefined || matchingInvitee?.amount !== undefined) {
                            return (
                              <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                                <p className="text-xs font-semibold text-blue-900 mb-2">Price Breakdown</p>
                                <div className="space-y-1 text-xs">
                                  {matchingInvitee?.pricePerPerson !== undefined && lb.amnt_of_people !== undefined && (
                                    <div className="flex justify-between">
                                      <span className="text-blue-700">Base Price ({lb.amnt_of_people} {lb.amnt_of_people === 1 ? 'person' : 'people'} × €{matchingInvitee.pricePerPerson.toFixed(2)})</span>
                                      <span className="font-medium text-blue-900">€{((matchingInvitee.pricePerPerson || 0) * (lb.amnt_of_people || 1)).toFixed(2)}</span>
                                    </div>
                                  )}
                                  {/* Show original amount if discount was applied */}
                                  {(matchingInvitee?.originalAmount !== undefined && matchingInvitee.originalAmount > 0 && (matchingInvitee?.discountApplied !== undefined && matchingInvitee.discountApplied > 0 || matchingInvitee?.promoDiscountAmount !== undefined && matchingInvitee.promoDiscountAmount > 0)) && (
                                    <div className="flex justify-between pt-1 mt-1 border-t border-blue-300">
                                      <span className="text-blue-700">Subtotal</span>
                                      <span className="font-medium text-blue-900">€{matchingInvitee.originalAmount.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {/* Show discount applied */}
                                  {(matchingInvitee?.discountApplied !== undefined && matchingInvitee.discountApplied > 0) && (
                                    <div className="flex justify-between">
                                      <span className="text-green-700">Discount</span>
                                      <span className="font-medium text-green-700">-€{matchingInvitee.discountApplied.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {/* Show promo code discount */}
                                  {(matchingInvitee?.promoDiscountAmount !== undefined && matchingInvitee.promoDiscountAmount > 0) && (
                                    <div className="flex justify-between">
                                      <span className="text-green-700">
                                        Promo Code {matchingInvitee.promoCode && `(${matchingInvitee.promoCode})`}
                                        {matchingInvitee.promoDiscountPercent && ` - ${matchingInvitee.promoDiscountPercent}%`}
                                      </span>
                                      <span className="font-medium text-green-700">-€{matchingInvitee.promoDiscountAmount.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {initialPaidAmount > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-blue-700">Initial Payment</span>
                                      <span className="font-medium text-blue-900">€{initialPaidAmount.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {extraPaymentsTotal > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-blue-700">Extra Payments ({lb.extra_payments_received?.length || 0} {lb.extra_payments_received?.length === 1 ? 'payment' : 'payments'})</span>
                                      <span className="font-medium text-blue-900">€{extraPaymentsTotal.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {totalPaidAmount > 0 && (
                                    <div className="flex justify-between pt-1 mt-1 border-t border-blue-300">
                                      <span className="font-semibold text-blue-900">Total Paid</span>
                                      <span className="font-bold text-blue-900">€{totalPaidAmount.toFixed(2)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t">
                          {(() => {
                            // Check if this customer has paid (via deal_id, stripe_session_id, or invitee.isPaid/amount)
                            const matchingInvitee = allInvitees.find(inv => 
                              (inv.email || '').toLowerCase().trim() === (lb.customer_email || '').toLowerCase().trim()
                            );
                            
                            // Calculate total paid amount
                            const initialPaidAmount = matchingInvitee?.amount || 0;
                            const extraPaymentsTotal = lb.extra_payments_received?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
                            const totalPaidAmount = initialPaidAmount + extraPaymentsTotal;
                            const isPaid = lb.deal_id || lb.stripe_session_id || matchingInvitee?.isPaid || totalPaidAmount > 0;

                            if (lb.deal_id) {
                              // Has TeamLeader deal - show link to it
                              return (
                                <>
                                  <Button variant="outline" size="sm" asChild className="h-7 gap-1.5">
                                    <a
                                      href={`https://focus.teamleader.eu/web/deals/${lb.deal_id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Building2 className="h-3 w-3" />
                                      <span className="text-xs">TeamLeader Deal</span>
                                    </a>
                                  </Button>
                                  {totalPaidAmount > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      Paid: €{totalPaidAmount.toFixed(2)}
                                    </Badge>
                                  )}
                                </>
                              );
                            } else if (isPaid) {
                              // Paid but no deal yet - show paid badge with total amount
                              return (
                                <Badge variant="secondary" className="text-xs">
                                  Paid: €{totalPaidAmount.toFixed(2)}
                                </Badge>
                              );
                            }
                          })()}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5"
                            onClick={() => openAddPeopleDialog(
                              lb.customer_name || '',
                              lb.customer_email || '',
                              lb.amnt_of_people || 1,
                              undefined,
                              lb.id
                            )}
                          >
                            <UserPlus className="h-3 w-3" />
                            <span className="text-xs">Add People</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5"
                            onClick={() => openEditInviteeDialog(lb, undefined, lb.id, true)}
                          >
                            <Pencil className="h-3 w-3" />
                            <span className="text-xs">Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => openDeleteInviteeDialog(lb.customer_name || 'Customer', undefined, lb.id, true)}
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="text-xs">Delete</span>
                          </Button>
                          {(() => {
                            const matchingInvitee = allInvitees.find(inv =>
                              (inv.email || '').toLowerCase().trim() === (lb.customer_email || '').toLowerCase().trim()
                            );
                            
                            // Calculate amount - use invitee amount or calculate from tour price
                            const amount = matchingInvitee?.amount || (tour?.price || 0) * (lb.amnt_of_people || 1);
                            
                            // Create synthetic invitee if no matching invitee exists
                            const inviteeToUse = matchingInvitee || {
                              name: lb.customer_name || '',
                              email: lb.customer_email || '',
                              phone: lb.customer_phone || undefined,
                              numberOfPeople: lb.amnt_of_people || 1,
                              amount: amount,
                            };
                            
                            // Show button if we have email, name, and amount > 0
                            // The function will check payment status and show appropriate message
                            if (lb.customer_email && lb.customer_name && amount > 0) {
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                                  onClick={() => handleSendPaymentLinkToInvitee(inviteeToUse, undefined, lb.id)}
                                >
                                  <CreditCard className="h-3 w-3" />
                                  <span className="text-xs">Send Payment Link</span>
                                </Button>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        {/* Upsell products for this customer */}
                        {(() => {
                          const matchingInvitee = allInvitees.find(inv =>
                            (inv.email || '').toLowerCase().trim() === (lb.customer_email || '').toLowerCase().trim()
                          );
                          if (matchingInvitee?.upsellProducts && matchingInvitee.upsellProducts.length > 0) {
                            return (
                              <div className="mt-2 p-2 rounded-lg bg-purple-50 border border-purple-200">
                                <p className="text-xs text-purple-700 font-medium mb-1">
                                  <Package className="h-3 w-3 inline mr-1" />
                                  Purchased Items:
                                </p>
                                <div className="space-y-1">
                                  {matchingInvitee.upsellProducts.map((product: any, productIdx: number) => (
                                    <p key={productIdx} className="text-xs text-purple-600">
                                      • {product.n || product.title || 'Product'} (x{product.q || product.quantity || 1}) - €{product.p || product.price || 0}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        {lb.created_at && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Booked: {formatBrusselsDateTime(lb.created_at, 'dd/MM/yyyy HH:mm')}
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Total people summary */}
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Signed Up</p>
                      <p className="text-lg font-semibold">
                        {(() => {
                          // Calculate total people, ensuring we don't double-count
                          // Use Set to track unique booking IDs to avoid duplicates
                          const uniqueBookings = new Map();
                          localStoriesBookings.forEach(b => {
                            // Use id as unique key to prevent double-counting
                            if (!uniqueBookings.has(b.id)) {
                              uniqueBookings.set(b.id, b);
                            }
                          });
                          const totalPeople = Array.from(uniqueBookings.values()).reduce((sum, b) => sum + (b.amnt_of_people || 0), 0);
                          return totalPeople;
                        })()} people
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No bookings yet for this Local Stories tour</p>
                )
              ) : (
                /* Normal/Custom Tours: Show invitees from tourbooking */
                allInvitees.length > 0 ? (
                  <div className="space-y-4">
                    {allInvitees.map((inv, index) => (
                      <div key={index} className={`p-4 rounded-lg border ${index > 0 ? 'bg-muted/30' : 'bg-muted/50'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-medium text-sm">{inv.name || `Customer ${index + 1}`}</p>
                          <div className="flex items-center gap-2">
                            {inv.language && (
                              <Badge variant="secondary" className="text-xs">
                                {inv.language.toUpperCase()}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {inv.numberOfPeople || 1} {(inv.numberOfPeople || 1) === 1 ? 'person' : 'people'}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            <p className="truncate">{inv.email || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <p>{inv.phone || 'N/A'}</p>
                          </div>
                        </div>
                        {inv.specialRequests && (
                          <div className="mt-2 text-sm">
                            <p className="text-xs text-muted-foreground">Special Requests</p>
                            <p>{inv.specialRequests}</p>
                          </div>
                        )}
                        {/* Price Breakdown */}
                        {(inv.pricePerPerson !== undefined || inv.amount !== undefined || inv.tanguyCost !== undefined || inv.extraHourCost !== undefined || inv.weekendFeeCost !== undefined || inv.eveningFeeCost !== undefined || inv.discountApplied !== undefined || inv.promoDiscountAmount !== undefined) && (
                          <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                            <p className="text-xs font-semibold text-blue-900 mb-2">Price Breakdown</p>
                            <div className="space-y-1 text-xs">
                              {inv.pricePerPerson !== undefined && inv.numberOfPeople !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-blue-700">Base Price ({inv.numberOfPeople} {inv.numberOfPeople === 1 ? 'person' : 'people'} × €{inv.pricePerPerson.toFixed(2)})</span>
                                  <span className="font-medium text-blue-900">€{((inv.pricePerPerson || 0) * (inv.numberOfPeople || 1)).toFixed(2)}</span>
                                </div>
                              )}
                              {inv.tanguyCost !== undefined && inv.tanguyCost > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-blue-700">Tanguy Cost</span>
                                  <span className="font-medium text-blue-900">€{inv.tanguyCost.toFixed(2)}</span>
                                </div>
                              )}
                              {inv.extraHourCost !== undefined && inv.extraHourCost > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-blue-700">Extra Hour</span>
                                  <span className="font-medium text-blue-900">€{inv.extraHourCost.toFixed(2)}</span>
                                </div>
                              )}
                              {inv.weekendFeeCost !== undefined && inv.weekendFeeCost > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-blue-700">Weekend Fee</span>
                                  <span className="font-medium text-blue-900">€{inv.weekendFeeCost.toFixed(2)}</span>
                                </div>
                              )}
                              {inv.eveningFeeCost !== undefined && inv.eveningFeeCost > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-blue-700">Evening Fee</span>
                                  <span className="font-medium text-blue-900">€{inv.eveningFeeCost.toFixed(2)}</span>
                                </div>
                              )}
                              {/* Show original amount if discount was applied */}
                              {(inv.originalAmount !== undefined && inv.originalAmount > 0 && (inv.discountApplied !== undefined && inv.discountApplied > 0 || inv.promoDiscountAmount !== undefined && inv.promoDiscountAmount > 0)) && (
                                <div className="flex justify-between pt-1 mt-1 border-t border-blue-300">
                                  <span className="text-blue-700">Subtotal</span>
                                  <span className="font-medium text-blue-900">€{inv.originalAmount.toFixed(2)}</span>
                                </div>
                              )}
                              {/* Show discount applied */}
                              {(inv.discountApplied !== undefined && inv.discountApplied > 0) && (
                                <div className="flex justify-between">
                                  <span className="text-green-700">Discount</span>
                                  <span className="font-medium text-green-700">-€{inv.discountApplied.toFixed(2)}</span>
                                </div>
                              )}
                              {/* Show promo code discount */}
                              {(inv.promoDiscountAmount !== undefined && inv.promoDiscountAmount > 0) && (
                                <div className="flex justify-between">
                                  <span className="text-green-700">
                                    Promo Code {inv.promoCode && `(${inv.promoCode})`}
                                    {inv.promoDiscountPercent && ` - ${inv.promoDiscountPercent}%`}
                                  </span>
                                  <span className="font-medium text-green-700">-€{inv.promoDiscountAmount.toFixed(2)}</span>
                                </div>
                              )}
                              {(inv.amount !== undefined || inv.pricePerPerson !== undefined) && (
                                <div className="flex justify-between pt-1 mt-1 border-t border-blue-300">
                                  <span className="font-semibold text-blue-900">Total</span>
                                  <span className="font-bold text-blue-900">
                                    €{inv.amount !== undefined && inv.amount !== null 
                                      ? inv.amount.toFixed(2) 
                                      : (
                                          ((inv.pricePerPerson || 0) * (inv.numberOfPeople || 1)) +
                                          (inv.tanguyCost || 0) +
                                          (inv.extraHourCost || 0) +
                                          (inv.weekendFeeCost || 0) +
                                          (inv.eveningFeeCost || 0) -
                                          (inv.discountApplied || 0) -
                                          (inv.promoDiscountAmount || 0)
                                        ).toFixed(2)
                                    }
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Pending payment alert */}
                        {inv.pendingPaymentPeople && (
                          <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                            <p className="text-xs text-amber-700">
                              <span className="font-medium">{inv.pendingPaymentPeople} {inv.pendingPaymentPeople === 1 ? 'person was' : 'people were'} added</span> (€{(inv.pendingPaymentAmount || 0).toFixed(2)})
                            </p>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t">
                          {inv.amount && (
                            <Badge variant="secondary" className="text-xs">
                              Paid: €{inv.amount.toFixed(2)}
                            </Badge>
                          )}
                          {booking.invoice_link && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1.5 text-green-600 border-green-200 hover:bg-green-50"
                              asChild
                            >
                              <Link 
                                href={
                                  booking.status && ['quote_pending', 'quote_sent', 'quote_accepted', 'quote_paid'].includes(booking.status)
                                    ? `https://focus.teamleader.eu/quotations/${booking.invoice_link}`
                                    : `https://focus.teamleader.eu/invoice_detail.php?id=${booking.invoice_link}`
                                } 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                <FileText className="h-3 w-3" />
                                <span className="text-xs">
                                  {booking.status && ['quote_pending', 'quote_sent', 'quote_accepted', 'quote_paid'].includes(booking.status)
                                    ? 'View Quote'
                                    : 'View Invoice'}
                                </span>
                                <ExternalLink className="h-3 w-3 ml-0.5" />
                              </Link>
                            </Button>
                          )}
                          {booking.invoice_link && 
                           inv.amount !== undefined && 
                           inv.amount !== null &&
                           booking.status &&
                           !['quote_pending', 'quote_sent', 'quote_accepted', 'quote_paid'].includes(booking.status) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50"
                              onClick={() => handleCallInvoiceWebhook(booking.invoice_link!, inv.amount!)}
                            >
                              <Send className="h-3 w-3" />
                              <span className="text-xs">Set Invoice as Paid</span>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5"
                            onClick={() => openAddPeopleDialog(
                              inv.name || '',
                              inv.email || '',
                              inv.numberOfPeople || 1,
                              index,
                              undefined
                            )}
                          >
                            <UserPlus className="h-3 w-3" />
                            <span className="text-xs">Add People</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5"
                            onClick={() => openEditInviteeDialog(inv, index, undefined, false)}
                          >
                            <Pencil className="h-3 w-3" />
                            <span className="text-xs">Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => openDeleteInviteeDialog(inv.name || 'Customer', index, undefined, false)}
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="text-xs">Delete</span>
                          </Button>
                          {(() => {
                            // Calculate amount if not directly set
                            const calculatedAmount = inv.amount !== undefined && inv.amount !== null 
                              ? inv.amount 
                              : (inv.pricePerPerson !== undefined && inv.numberOfPeople !== undefined
                                  ? (inv.pricePerPerson * inv.numberOfPeople) +
                                    (inv.tanguyCost || 0) +
                                    (inv.extraHourCost || 0) +
                                    (inv.weekendFeeCost || 0) +
                                    (inv.eveningFeeCost || 0) -
                                    (inv.discountApplied || 0) -
                                    (inv.promoDiscountAmount || 0)
                                  : (tour?.price || 0) * (inv.numberOfPeople || 1));
                            
                            // Show button if we have email, name, and amount > 0
                            // The function will check payment status and show appropriate message
                            if (inv.email && inv.name && calculatedAmount > 0) {
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                                  onClick={() => handleSendPaymentLinkToInvitee(inv, index)}
                                >
                                  <CreditCard className="h-3 w-3" />
                                  <span className="text-xs">Send Payment Link</span>
                                </Button>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        {/* Upsell products for this invitee */}
                        {inv.upsellProducts && inv.upsellProducts.length > 0 && (
                          <div className="mt-2 p-2 rounded-lg bg-purple-50 border border-purple-200">
                            <p className="text-xs text-purple-700 font-medium mb-1">
                              <Package className="h-3 w-3 inline mr-1" />
                              Purchased Items:
                            </p>
                            <div className="space-y-1">
                              {inv.upsellProducts.map((product: any, productIdx: number) => (
                                <p key={productIdx} className="text-xs text-purple-600">
                                  • {product.n || product.title || 'Product'} (x{product.q || product.quantity || 1}) - €{product.p || product.price || 0}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Total amount */}
                    {allInvitees.length > 1 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Amount</p>
                        <p className="text-lg font-semibold">
                          €{allInvitees.reduce((sum, inv) => sum + (inv.amount || 0), 0).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Customer information not available</p>
                )
              )}
            </CardContent>
          </Card>

          {/* Guide Assignment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {guide ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{guide.name}</p>
                        <p className="text-xs text-muted-foreground">Confirmed Guide</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {/* COMMENTED OUT: Reassign button - keeping code for future use
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReassignGuideDialogOpen(true)}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        {guide ? 'Reassign' : 'Assign'}
                      </Button>
                      */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setCancelDialogOpen(true)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                      <p className="truncate">{guide.Email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                      <p>{guide.phonenumber || 'N/A'}</p>
                    </div>
                  </div>
                  {guide.tours_done !== null && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Experience</p>
                      <p className="text-sm">{guide.tours_done} tours completed</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium">No guide assigned</p>
                      <p className="text-xs text-muted-foreground">Awaiting assignment</p>
                    </div>
                  </div>
                  {/* COMMENTED OUT: Assign button - keeping code for future use
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReassignGuideDialogOpen(true)}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Assign
                  </Button>
                  */}
                </div>
              )}

              {/* Add Another Guide Button - shown when guide(s) already selected */}
              {getGuideIds(booking).length > 0 && (
                <div className="pt-3 border-t">
                  <Button 
                    onClick={() => router.push(`/${locale}/choose-guide/${booking.id}`)}
                    variant="outline"
                    className="w-full gap-2 mb-3"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Another Guide
                  </Button>
                </div>
              )}

              {/* Selected Guides Status */}
              {booking.selectedGuides && booking.selectedGuides.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Offer History</p>
                  <div className="space-y-1.5">
                    {booking.selectedGuides.map((sg) => {
                      const guideInfo = normalizeGuide(sg);
                      const guideData = allGuides.get(guideInfo.id);
                      return (
                        <div key={guideInfo.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/50">
                          <span className="text-sm">{guideData?.name || `Guide #${guideInfo.id}`}</span>
                          {guideInfo.status === 'declined' && (
                            <span className="text-xs text-red-600">Declined</span>
                          )}
                          {guideInfo.status === 'offered' && (
                            <span className="text-xs text-amber-600">Pending</span>
                          )}
                          {guideInfo.status === 'accepted' && (
                            <span className="text-xs text-green-600">Accepted</span>
                          )}
                          {!guideInfo.status && (
                            <span className="text-xs text-muted-foreground">Available</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Select New Guide Button - shown when all guides declined */}
              {getGuideIds(booking).length === 0 && allGuidesDeclined() && (
                <div className="pt-3 border-t">
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 mb-3">
                    <p className="text-sm text-red-800">
                      All offered guides have declined. Select a new guide from the remaining list.
                    </p>
                  </div>
                  <Button 
                    onClick={() => setGuideDialogOpen(true)}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    Select New Guide
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status & References - Hide for Local Stories since each booking has its own refs */}
          {!isLocalStories && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status Flags */}
                <div>
                  <div className="flex flex-wrap gap-2">
                    {booking.picturesUploaded ? (
                      <Badge variant="outline" className="text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        Photos {booking.pictureCount ? `(${booking.pictureCount})` : ''}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                        <XCircle className="h-3 w-3" />
                        No photos
                      </Badge>
                    )}
                    {booking.is_aftercare_started && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        Aftercare
                      </Badge>
                    )}
                    {booking.isCustomerDetailsRequested && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Mail className="h-3 w-3" />
                        Details requested
                      </Badge>
                    )}
                  </div>
                </div>

              </CardContent>
            </Card>
          )}
        </div>

        {/* Op Maat Answers */}
        {invitee?.opMaatAnswers && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Custom Tour Preferences
              </CardTitle>
              <CardDescription>Details provided by the customer for their op maat tour</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {invitee.opMaatAnswers.startEnd && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Start/End Location</p>
                    <p className="text-sm">{invitee.opMaatAnswers.startEnd}</p>
                  </div>
                )}
                {invitee.opMaatAnswers.cityPart && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">City Area</p>
                    <p className="text-sm">{invitee.opMaatAnswers.cityPart}</p>
                  </div>
                )}
                {invitee.opMaatAnswers.subjects && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Subjects of Interest</p>
                    <p className="text-sm">{invitee.opMaatAnswers.subjects}</p>
                  </div>
                )}
                {invitee.opMaatAnswers.specialWishes && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Special Wishes</p>
                    <p className="text-sm">{invitee.opMaatAnswers.specialWishes}</p>
                  </div>
                )}
                {invitee.opMaatAnswers.extraHour && (
                  <div className="sm:col-span-2">
                    <Badge variant="outline" className="text-xs">Extra Hour (+€150)</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Products - only show for non-local-stories tours (local stories show products per invitee) */}
        {!tour?.local_stories && invitee?.upsellProducts && invitee.upsellProducts.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Additional Items
              </CardTitle>
              <CardDescription>Products added to this booking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {invitee.upsellProducts.map((product: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{product.n || product.title || 'Product'}</p>
                      <p className="text-xs text-muted-foreground">Qty: {product.q || product.quantity || 1}</p>
                    </div>
                    <p className="text-sm font-medium">€{product.p || product.price || 0}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Description */}
        {booking.ai_desc && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                AI Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{booking.ai_desc}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Guide Selection Dialog */}
      <Dialog open={guideDialogOpen} onOpenChange={setGuideDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Select New Guide
            </DialogTitle>
            <DialogDescription>
              {booking && getGuideIds(booking).length > 0 
                ? 'Select an additional guide to add to this booking.'
                : 'All previously offered guides have declined. Select a new guide from the list below.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Show declined guides */}
            {booking.selectedGuides && booking.selectedGuides.length > 0 && (
              <div className="rounded-lg border border-muted bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Previously declined:</p>
                <div className="space-y-1">
                  {booking.selectedGuides.map(normalizeGuide).filter(g => g.status === 'declined').map((g) => {
                    const guideData = allGuides.get(g.id);
                    return (
                      <div key={g.id} className="text-sm flex items-center gap-2">
                        <XCircle className="h-3 w-3 text-red-500" />
                        <span>{guideData?.name || `Guide #${g.id}`}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Guide selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select a guide:</label>
              <Select 
                value={selectedNewGuideId?.toString() || ''} 
                onValueChange={(val: string) => setSelectedNewGuideId(parseInt(val, 10))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a guide..." />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableGuides().length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No more guides available
                    </div>
                  ) : (
                    getAvailableGuides().map((g) => (
                      <SelectItem key={g.id} value={g.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{g.name || `Guide #${g.id}`}</span>
                          {g.tours_done !== null && (
                            <span className="text-xs text-muted-foreground">
                              ({g.tours_done} tours)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setGuideDialogOpen(false);
                setSelectedNewGuideId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={submitNewGuideSelection}
              disabled={!selectedNewGuideId || submittingNewGuide}
              className="gap-2"
            >
              {submittingNewGuide ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submittingNewGuide ? 'Sending...' : 'Send Offer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guide Cancellation Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Cancel Guide Assignment
            </DialogTitle>
            <DialogDescription>
              This will remove the current guide from this booking and trigger the process to find a new guide.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 mb-1">
                    You are about to remove:
                  </p>
                  <p className="text-amber-700">
                    <strong>{guide?.name}</strong> from booking #{booking.id}
                  </p>
                  <p className="text-amber-600 mt-2 text-xs">
                    This will mark the guide as cancelled and increment their cancellation count. The booking will be sent back to the guide assignment workflow.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancellingGuide}
            >
              Keep Guide
            </Button>
            <Button
              variant="destructive"
              onClick={handleGuideCancellation}
              disabled={cancellingGuide}
              className="gap-2"
            >
              {cancellingGuide ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {cancellingGuide ? 'Cancelling...' : 'Yes, Cancel Guide'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Booking Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (open) {
          // Fetch TeamLeader invoices when dialog opens
          void fetchTeamleaderInvoices();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Booking
            </DialogTitle>
            <DialogDescription>
              Update booking details for #{booking.id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editDate" className="text-xs text-muted-foreground uppercase tracking-wide">Date</Label>
              <Input
                id="editDate"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                className="bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editTime" className="text-xs text-muted-foreground uppercase tracking-wide">Start Time</Label>
                <Input
                  id="editTime"
                  type="time"
                  value={editForm.time}
                  onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEndTime" className="text-xs text-muted-foreground uppercase tracking-wide">End Time</Label>
                <Input
                  id="editEndTime"
                  type="time"
                  value={editForm.endTime}
                  onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                  className="bg-white"
                  placeholder="Auto-calculated"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to auto-calculate from tour duration
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editStatus" className="text-xs text-muted-foreground uppercase tracking-wide">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* TeamLeader Invoice Selection */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label htmlFor="editInvoiceId">
                  Link to TeamLeader Invoice (optional)
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void fetchTeamleaderInvoices()}
                  disabled={loadingInvoices}
                  className="h-6 text-xs gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingInvoices ? 'animate-spin' : ''}`} />
                  {loadingInvoices ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
              <Select
                value={editForm.invoiceId || 'none'}
                onValueChange={(value) => setEditForm({ ...editForm, invoiceId: value === 'none' ? '' : value })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder={loadingInvoices ? 'Loading invoices...' : teamleaderInvoices.length === 0 ? 'No invoices found - click Refresh' : 'Select an invoice (optional)'} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none">No invoice linked</SelectItem>
                  {teamleaderInvoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      <div className="flex items-center gap-2">
                        <span>{invoice.title}</span>
                        {invoice.invoice_number && (
                          <span className="text-xs text-muted-foreground">({invoice.invoice_number})</span>
                        )}
                        {invoice.total && (
                          <span className="text-xs text-muted-foreground">€{invoice.total.toFixed(2)}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {invoicesError && (
                <p className="text-xs text-red-500">{invoicesError}</p>
              )}
              {teamleaderInvoices.length === 0 && !loadingInvoices && !invoicesError && (
                <p className="text-xs text-amber-600">No invoices loaded yet. Click Refresh to load invoices from TeamLeader.</p>
              )}
              <p className="text-xs text-muted-foreground">
                Link this booking to an existing TeamLeader invoice.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="editStartLocation" className="text-xs text-muted-foreground uppercase tracking-wide">Start Location</Label>
                <Input
                  id="editStartLocation"
                  value={editForm.start_location}
                  onChange={(e) => setEditForm({ ...editForm, start_location: e.target.value })}
                  className="bg-white"
                  placeholder={tour?.start_location || 'e.g., Central Station'}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use tour default: {tour?.start_location || 'Not set'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEndLocation" className="text-xs text-muted-foreground uppercase tracking-wide">End Location</Label>
                <Input
                  id="editEndLocation"
                  value={editForm.end_location}
                  onChange={(e) => setEditForm({ ...editForm, end_location: e.target.value })}
                  className="bg-white"
                  placeholder={tour?.end_location || 'e.g., Market Square'}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use tour default: {tour?.end_location || 'Not set'}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={savingBooking}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveBooking}
              disabled={savingBooking}
            >
              {savingBooking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Invitee Dialog (Local Stories) */}
      <Dialog open={addInviteeDialogOpen} onOpenChange={(open) => {
        setAddInviteeDialogOpen(open);
        if (!open) resetNewInvitee();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add Invitee
            </DialogTitle>
            <DialogDescription>
              Add a new customer to this Local Stories booking
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inviteeName" className="text-xs text-muted-foreground uppercase tracking-wide">Name *</Label>
                <Input
                  id="inviteeName"
                  value={newInvitee.name}
                  onChange={(e) => setNewInvitee({ ...newInvitee, name: e.target.value })}
                  placeholder="Customer name"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteeEmail" className="text-xs text-muted-foreground uppercase tracking-wide">Email *</Label>
                <Input
                  id="inviteeEmail"
                  type="email"
                  value={newInvitee.email}
                  onChange={(e) => setNewInvitee({ ...newInvitee, email: e.target.value })}
                  placeholder="customer@email.com"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteePhone" className="text-xs text-muted-foreground uppercase tracking-wide">Phone</Label>
                <Input
                  id="inviteePhone"
                  value={newInvitee.phone}
                  onChange={(e) => setNewInvitee({ ...newInvitee, phone: e.target.value })}
                  placeholder="+32..."
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteePeople" className="text-xs text-muted-foreground uppercase tracking-wide">Number of People</Label>
                <Input
                  id="inviteePeople"
                  type="number"
                  min={1}
                  value={newInvitee.numberOfPeople}
                  onChange={(e) => setNewInvitee({ ...newInvitee, numberOfPeople: parseInt(e.target.value) || 1 })}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteeLanguage" className="text-xs text-muted-foreground uppercase tracking-wide">Language</Label>
                <Select
                  value={newInvitee.language}
                  onValueChange={(value) => setNewInvitee({ ...newInvitee, language: value })}
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
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inviteeRequests" className="text-xs text-muted-foreground uppercase tracking-wide">Special Requests</Label>
              <Textarea
                id="inviteeRequests"
                value={newInvitee.specialRequests}
                onChange={(e) => setNewInvitee({ ...newInvitee, specialRequests: e.target.value })}
                placeholder="Any special requests..."
                className="bg-white"
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="inviteePaid"
                checked={newInvitee.isPaid}
                onChange={(e) => setNewInvitee({ ...newInvitee, isPaid: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="inviteePaid" className="text-sm cursor-pointer">
                Customer has already paid
              </Label>
            </div>

            {tour && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Price estimate</p>
                <p className="font-medium">
                  €{(tour.price || 0) * newInvitee.numberOfPeople} ({newInvitee.numberOfPeople} × €{tour.price || 0})
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddInviteeDialogOpen(false);
                resetNewInvitee();
              }}
              disabled={addingInvitee}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddInvitee}
              disabled={addingInvitee || !newInvitee.name || !newInvitee.email}
            >
              {addingInvitee ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Invitee
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add People Dialog */}
      <Dialog open={addPeopleDialogOpen} onOpenChange={(open) => {
        setAddPeopleDialogOpen(open);
        if (!open) setAddPeopleTarget(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add More People
            </DialogTitle>
            <DialogDescription>
              Add additional people to this booking
            </DialogDescription>
          </DialogHeader>

          {addPeopleTarget && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-medium">{addPeopleTarget.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current people in booking</p>
                  <p className="text-sm">{addPeopleTarget.currentPeople}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="additionalPeople">Additional people</Label>
                  <Input
                    id="additionalPeople"
                    type="number"
                    min={1}
                    value={additionalPeople}
                    onChange={(e) => setAdditionalPeople(parseInt(e.target.value) || 1)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricePerPerson">Price per person (€)</Label>
                  <Input
                    id="pricePerPerson"
                    type="text"
                    inputMode="decimal"
                    value={additionalPeoplePrice}
                    onChange={(e) => setAdditionalPeoplePrice(e.target.value)}
                    placeholder="0.00"
                    className="bg-white"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                New total: {addPeopleTarget.currentPeople + additionalPeople} people
              </p>

              {/* Extra Options & Fees Section */}
              <div className="space-y-3 border rounded-lg p-3">
                <Label className="text-sm font-medium">Extra Options & Fees</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="addPeopleTanguy"
                      checked={addPeopleFees.requestTanguy}
                      onCheckedChange={(checked) => setAddPeopleFees({ ...addPeopleFees, requestTanguy: checked === true })}
                    />
                    <Label htmlFor="addPeopleTanguy" className="text-sm cursor-pointer">
                      Request Tanguy (+€{TANGUY_COST})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="addPeopleExtraHour"
                      checked={addPeopleFees.hasExtraHour}
                      onCheckedChange={(checked) => setAddPeopleFees({ ...addPeopleFees, hasExtraHour: checked === true })}
                    />
                    <Label htmlFor="addPeopleExtraHour" className="text-sm cursor-pointer">
                      Extra Hour (+€{EXTRA_HOUR_COST})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="addPeopleWeekendFee"
                      checked={addPeopleFees.weekendFee}
                      onCheckedChange={(checked) => setAddPeopleFees({ ...addPeopleFees, weekendFee: checked === true })}
                    />
                    <Label htmlFor="addPeopleWeekendFee" className="text-sm cursor-pointer">
                      Weekend Fee (+€{WEEKEND_FEE_COST})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="addPeopleEveningFee"
                      checked={addPeopleFees.eveningFee}
                      onCheckedChange={(checked) => setAddPeopleFees({ ...addPeopleFees, eveningFee: checked === true })}
                    />
                    <Label htmlFor="addPeopleEveningFee" className="text-sm cursor-pointer">
                      Evening Fee (+€{EVENING_FEE_COST})
                    </Label>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="text-xs text-muted-foreground mb-1">Price summary</p>
                <div className="flex justify-between text-sm">
                  <span>Base ({additionalPeople} × €{parseFloat(additionalPeoplePrice) || 0})</span>
                  <span>€{((parseFloat(additionalPeoplePrice) || 0) * additionalPeople).toFixed(2)}</span>
                </div>
                {addPeopleFees.requestTanguy && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tanguy</span>
                    <span>€{TANGUY_COST.toFixed(2)}</span>
                  </div>
                )}
                {addPeopleFees.hasExtraHour && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Extra Hour</span>
                    <span>€{EXTRA_HOUR_COST.toFixed(2)}</span>
                  </div>
                )}
                {addPeopleFees.weekendFee && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Weekend Fee</span>
                    <span>€{WEEKEND_FEE_COST.toFixed(2)}</span>
                  </div>
                )}
                {addPeopleFees.eveningFee && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Evening Fee</span>
                    <span>€{EVENING_FEE_COST.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium pt-1 border-t">
                  <span>Total</span>
                  <span>€{(
                    (parseFloat(additionalPeoplePrice) || 0) * additionalPeople +
                    (addPeopleFees.requestTanguy ? TANGUY_COST : 0) +
                    (addPeopleFees.hasExtraHour ? EXTRA_HOUR_COST : 0) +
                    (addPeopleFees.weekendFee ? WEEKEND_FEE_COST : 0) +
                    (addPeopleFees.eveningFee ? EVENING_FEE_COST : 0)
                  ).toFixed(2)}</span>
                </div>
              </div>

            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddPeopleDialogOpen(false);
                setAddPeopleTarget(null);
              }}
              disabled={addingPeople}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPeople}
              disabled={addingPeople || !addPeopleTarget || additionalPeople < 1}
            >
              {addingPeople ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add {additionalPeople} {additionalPeople === 1 ? 'Person' : 'People'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Invitee Dialog */}
      <Dialog open={editInviteeDialogOpen} onOpenChange={(open) => {
        setEditInviteeDialogOpen(open);
        if (open) {
          // Fetch TeamLeader invoices when dialog opens
          void fetchEditInviteeInvoices();
        }
        if (!open) setEditInviteeTarget(null);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit {editInviteeTarget?.isLocalStories ? 'Booking' : 'Invitee'}
            </DialogTitle>
            <DialogDescription>
              Update customer details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editName" className="text-xs text-muted-foreground uppercase tracking-wide">Name</Label>
                <Input
                  id="editName"
                  value={editInviteeForm.name}
                  onChange={(e) => setEditInviteeForm({ ...editInviteeForm, name: e.target.value })}
                  placeholder="Customer name"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail" className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editInviteeForm.email}
                  onChange={(e) => setEditInviteeForm({ ...editInviteeForm, email: e.target.value })}
                  placeholder="customer@email.com"
                  className="bg-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editPhone" className="text-xs text-muted-foreground uppercase tracking-wide">Phone</Label>
                <Input
                  id="editPhone"
                  type="tel"
                  value={editInviteeForm.phone}
                  onChange={(e) => setEditInviteeForm({ ...editInviteeForm, phone: e.target.value })}
                  placeholder="+32 XXX XX XX XX"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPeople" className="text-xs text-muted-foreground uppercase tracking-wide">Number of People</Label>
                <Input
                  id="editPeople"
                  type="number"
                  min={1}
                  value={editInviteeForm.numberOfPeople}
                  onChange={(e) => setEditInviteeForm({ ...editInviteeForm, numberOfPeople: parseInt(e.target.value) || 1 })}
                  className="bg-white"
                />
              </div>
            </div>
            {/* Email Language - shown for ALL booking types */}
            <div className="space-y-2">
              <Label htmlFor="editContactLanguageAll" className="text-xs text-muted-foreground uppercase tracking-wide">Email Language</Label>
              <Select
                value={editInviteeForm.contactLanguage}
                onValueChange={(value) => setEditInviteeForm({ ...editInviteeForm, contactLanguage: value })}
              >
                <SelectTrigger id="editContactLanguageAll" className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nl">Nederlands</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Language for email communications</p>
            </div>
            {!editInviteeTarget?.isLocalStories && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="editLanguage" className="text-xs text-muted-foreground uppercase tracking-wide">Tour Language</Label>
                  <Select
                    value={editInviteeForm.language}
                    onValueChange={(value) => {
                      setEditInviteeForm({ ...editInviteeForm, language: value });
                      if (value !== 'other') setEditCustomLanguage('');
                    }}
                  >
                    <SelectTrigger id="editLanguage" className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {LANGUAGE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editInviteeForm.language === 'other' && (
                    <Input
                      placeholder="Enter custom language..."
                      value={editCustomLanguage}
                      onChange={(e) => setEditCustomLanguage(e.target.value)}
                      className="bg-white mt-2"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editRequests" className="text-xs text-muted-foreground uppercase tracking-wide">Special Requests</Label>
                  <Textarea
                    id="editRequests"
                    value={editInviteeForm.specialRequests}
                    onChange={(e) => setEditInviteeForm({ ...editInviteeForm, specialRequests: e.target.value })}
                    placeholder="Any special requests..."
                    className="bg-white"
                  />
                </div>
              </>
            )}
            {/* Extra Fees Section */}
            {!editInviteeTarget?.isLocalStories && (
              <div className="space-y-3 border-t pt-4 mt-4">
                <Label className="text-sm font-medium">Extra Options & Fees</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="editRequestTanguy"
                      checked={editInviteeForm.requestTanguy}
                      onCheckedChange={(checked) => setEditInviteeForm({ ...editInviteeForm, requestTanguy: checked === true })}
                    />
                    <Label htmlFor="editRequestTanguy" className="text-sm cursor-pointer">
                      Request Tanguy (+€{TANGUY_COST})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="editExtraHour"
                      checked={editInviteeForm.hasExtraHour}
                      onCheckedChange={(checked) => setEditInviteeForm({ ...editInviteeForm, hasExtraHour: checked === true })}
                    />
                    <Label htmlFor="editExtraHour" className="text-sm cursor-pointer">
                      Extra Hour (+€{EXTRA_HOUR_COST})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="editWeekendFee"
                      checked={editInviteeForm.weekendFee}
                      onCheckedChange={(checked) => setEditInviteeForm({ ...editInviteeForm, weekendFee: checked === true })}
                    />
                    <Label htmlFor="editWeekendFee" className="text-sm cursor-pointer">
                      Weekend Fee (+€{WEEKEND_FEE_COST})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="editEveningFee"
                      checked={editInviteeForm.eveningFee}
                      onCheckedChange={(checked) => setEditInviteeForm({ ...editInviteeForm, eveningFee: checked === true })}
                    />
                    <Label htmlFor="editEveningFee" className="text-sm cursor-pointer">
                      Evening Fee (+€{EVENING_FEE_COST})
                    </Label>
                  </div>
                </div>
                {(editInviteeForm.requestTanguy || editInviteeForm.hasExtraHour || editInviteeForm.weekendFee || editInviteeForm.eveningFee) && (
                  <div className="bg-muted/50 rounded-lg p-2 text-sm">
                    <span className="text-muted-foreground">Total fees: </span>
                    <span className="font-medium">
                      €{(
                        (editInviteeForm.requestTanguy ? TANGUY_COST : 0) +
                        (editInviteeForm.hasExtraHour ? EXTRA_HOUR_COST : 0) +
                        (editInviteeForm.weekendFee ? WEEKEND_FEE_COST : 0) +
                        (editInviteeForm.eveningFee ? EVENING_FEE_COST : 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
            {/* TeamLeader Deal Selection - shown for both Local Stories and regular bookings */}
            <div className="space-y-2 border-t pt-4 mt-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="editDealId">
                  TeamLeader Deal
                  {editInviteeTarget?.isLocalStories && (
                    <span className="text-xs text-muted-foreground ml-1">- for this invitee</span>
                  )}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void fetchTeamleaderDeals()}
                  disabled={loadingDeals}
                  className="h-6 text-xs"
                >
                  {loadingDeals ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                </Button>
              </div>
              {/* Display current deal if present */}
              {editInviteeForm.dealId && teamleaderDeals.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Current deal:</span>
                    {(() => {
                      const currentDeal = teamleaderDeals.find(d => d.id === editInviteeForm.dealId);
                      return currentDeal ? (
                        <span>
                          {currentDeal.title}
                          {currentDeal.reference && (
                            <span className="text-xs text-muted-foreground ml-1">({currentDeal.reference})</span>
                          )}
                          {currentDeal.value && (
                            <span className="text-xs text-muted-foreground ml-1">€{currentDeal.value.toFixed(2)}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Deal ID: {editInviteeForm.dealId}</span>
                      );
                    })()}
                  </div>
                </div>
              )}
              <Select
                value={editInviteeForm.dealId || 'none'}
                onValueChange={(value) => setEditInviteeForm({ ...editInviteeForm, dealId: value === 'none' ? '' : value })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder={loadingDeals ? 'Loading deals...' : 'Select a deal (optional)'} />
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
              <p className="text-xs text-muted-foreground">
                {editInviteeTarget?.isLocalStories
                  ? 'Link this invitee to a TeamLeader CRM deal.'
                  : 'Link this booking to a TeamLeader CRM deal.'
                }
              </p>
            </div>

            {/* TeamLeader Invoice Selection */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label htmlFor="editInviteeInvoiceId">
                  Link to TeamLeader Invoice (optional)
                  {editInviteeTarget?.isLocalStories && (
                    <span className="text-xs text-muted-foreground ml-1">- for this invitee</span>
                  )}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void fetchEditInviteeInvoices()}
                  disabled={loadingEditInviteeInvoices}
                  className="h-6 text-xs gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingEditInviteeInvoices ? 'animate-spin' : ''}`} />
                  {loadingEditInviteeInvoices ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
              {/* Display current invoice if present */}
              {editInviteeForm.invoiceId && editInviteeInvoices.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Current invoice:</span>
                    {(() => {
                      const currentInvoice = editInviteeInvoices.find(i => i.id === editInviteeForm.invoiceId);
                      return currentInvoice ? (
                        <span>
                          {currentInvoice.title}
                          {currentInvoice.invoice_number && (
                            <span className="text-xs text-muted-foreground ml-1">({currentInvoice.invoice_number})</span>
                          )}
                          {currentInvoice.total && (
                            <span className="text-xs text-muted-foreground ml-1">€{currentInvoice.total.toFixed(2)}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Invoice ID: {editInviteeForm.invoiceId}</span>
                      );
                    })()}
                  </div>
                </div>
              )}
              <Select
                value={editInviteeForm.invoiceId || 'none'}
                onValueChange={(value) => setEditInviteeForm({ ...editInviteeForm, invoiceId: value === 'none' ? '' : value })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder={loadingEditInviteeInvoices ? 'Loading invoices...' : editInviteeInvoices.length === 0 ? 'No invoices found - click Refresh' : 'Select an invoice (optional)'} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none">No invoice linked</SelectItem>
                  {editInviteeInvoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      <div className="flex items-center gap-2">
                        <span>{invoice.title}</span>
                        {invoice.invoice_number && (
                          <span className="text-xs text-muted-foreground">({invoice.invoice_number})</span>
                        )}
                        {invoice.total && (
                          <span className="text-xs text-muted-foreground">€{invoice.total.toFixed(2)}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editInviteeInvoicesError && (
                <p className="text-xs text-red-500">{editInviteeInvoicesError}</p>
              )}
              {editInviteeInvoices.length === 0 && !loadingEditInviteeInvoices && !editInviteeInvoicesError && (
                <p className="text-xs text-amber-600">No invoices loaded yet. Click Refresh to load invoices from TeamLeader.</p>
              )}
              <p className="text-xs text-muted-foreground">
                {editInviteeTarget?.isLocalStories
                  ? 'Link this invitee to a TeamLeader invoice. Additional invitees can have different invoices.'
                  : 'Link this invitee to a TeamLeader invoice.'
                }
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditInviteeDialogOpen(false);
                setEditInviteeTarget(null);
              }}
              disabled={editingInvitee}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditInvitee}
              disabled={editingInvitee || !editInviteeForm.name || !editInviteeForm.email}
            >
              {editingInvitee ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Invitee Dialog */}
      <Dialog open={deleteInviteeDialogOpen} onOpenChange={(open) => {
        setDeleteInviteeDialogOpen(open);
        if (!open) setDeleteInviteeTarget(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete {deleteInviteeTarget?.isLocalStories ? 'Booking' : 'Invitee'}
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm">
              Are you sure you want to delete <span className="font-medium">{deleteInviteeTarget?.name}</span> from this booking?
            </p>
            {deleteInviteeTarget?.isLocalStories && (
              <p className="text-sm text-muted-foreground mt-2">
                This will remove their Local Stories booking entry.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteInviteeDialogOpen(false);
                setDeleteInviteeTarget(null);
              }}
              disabled={deletingInvitee}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteInvitee}
              disabled={deletingInvitee}
            >
              {deletingInvitee ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Booking Dialog */}
      <Dialog open={deleteBookingDialogOpen} onOpenChange={setDeleteBookingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Entire Booking
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800 font-medium">
                Warning: This will permanently delete:
              </p>
              <ul className="text-sm text-red-700 mt-2 list-disc list-inside space-y-1">
                <li>The booking record</li>
                {tour?.local_stories && <li>All associated Local Stories invitees</li>}
                <li>All invitee information</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you absolutely sure you want to delete booking #{booking.id}?
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteBookingDialogOpen(false)}
              disabled={deletingBooking}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBooking}
              disabled={deletingBooking}
            >
              {deletingBooking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Booking
                </>
              )}
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
              Technical reference IDs for booking #{booking.id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isLocalStories ? (
              /* Local Stories: Show IDs per booking */
              localStoriesBookings.length > 0 ? (
                <div className="space-y-4">
                  {localStoriesBookings.map((lb, index) => (
                    <div key={lb.id} className="p-3 rounded-lg border bg-muted/30">
                      <p className="font-medium text-sm mb-2">{lb.customer_name || `Customer ${index + 1}`}</p>
                      <div className="space-y-1.5 text-xs">
                        {lb.deal_id && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Deal ID:</span>
                            <span className="font-mono">{lb.deal_id}</span>
                          </div>
                        )}
                        {lb.invoice_id && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Invoice ID:</span>
                            <span className="font-mono">{lb.invoice_id}</span>
                          </div>
                        )}
                        {lb.stripe_session_id && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Stripe:</span>
                            <span className="font-mono truncate max-w-[180px]">{lb.stripe_session_id}</span>
                          </div>
                        )}
                        {!lb.deal_id && !lb.invoice_id && !lb.stripe_session_id && (
                          <p className="text-muted-foreground italic">No IDs yet</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No bookings yet</p>
              )
            ) : (
              /* Normal/Custom: Show main booking IDs */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Booking ID:</span>
                  <span className="font-mono font-medium">{booking.id}</span>
                </div>
                {booking.deal_id && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Deal ID:</span>
                    <span className="font-mono">{booking.deal_id}</span>
                  </div>
                )}
                {booking.invoice_id && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Invoice ID:</span>
                    <span className="font-mono">{booking.invoice_id}</span>
                  </div>
                )}
                {booking.stripe_session_id && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Stripe Session:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs truncate max-w-[180px]">{booking.stripe_session_id}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleReprocessBooking}
                        className="h-7 text-xs"
                        title="Reprocess this booking"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Reprocess
                      </Button>
                    </div>
                  </div>
                )}
                {booking.tour_id && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tour ID:</span>
                    <span className="font-mono text-xs truncate max-w-[180px]">{booking.tour_id}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIdsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Info to Client Dialog */}
      <Dialog open={sendInfoToClientOpen} onOpenChange={setSendInfoToClientOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Send Info to Client
            </DialogTitle>
            <DialogDescription>
              Send extra information to {tour?.local_stories ? 'all booked clients' : 'the client'} via email
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientMessage">Message</Label>
              <Textarea
                id="clientMessage"
                value={infoMessage}
                onChange={(e) => setInfoMessage(e.target.value)}
                placeholder="Enter the information you want to send to the client(s)..."
                className="min-h-[120px] bg-white"
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-xs text-muted-foreground mb-2">Will be sent via email to:</p>
              {tour?.local_stories ? (
                localStoriesBookings.length > 0 ? (
                  <div className="space-y-1">
                    {localStoriesBookings.map((lb, idx) => (
                      <p key={idx} className="text-xs">
                        {lb.customer_name || 'Customer'}: {lb.customer_email || 'No email'}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No clients booked yet</p>
                )
              ) : (
                <div className="space-y-1">
                  {(booking.invitees || []).map((inv, idx) => (
                    <p key={idx} className="text-xs">
                      {inv.name || 'Customer'}: {inv.email || 'No email'}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSendInfoToClientOpen(false);
                setInfoMessage('');
                setDeliveryMethod('email');
              }}
              disabled={sendingInfo}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInfoToClient}
              disabled={sendingInfo || !infoMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sendingInfo ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send to Client
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Info to Guide Dialog */}
      <Dialog open={sendInfoToGuideOpen} onOpenChange={setSendInfoToGuideOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-amber-600" />
              Send Info to Guide
            </DialogTitle>
            <DialogDescription>
              Send extra information to the assigned guide
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="guideMessage">Message</Label>
              <Textarea
                id="guideMessage"
                value={infoMessage}
                onChange={(e) => setInfoMessage(e.target.value)}
                placeholder="Enter the information you want to send to the guide..."
                className="min-h-[120px] bg-white"
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-xs text-muted-foreground mb-2">Will be sent via email to:</p>
              {(() => {
                const guideIds = getGuideIds(booking);
                if (guideIds.length > 0) {
                  const firstGuide = allGuides.get(guideIds[0]);
                  if (firstGuide) {
                    return (
                      <div className="space-y-1">
                        {guideIds.map((guideId) => {
                          const guide = allGuides.get(guideId);
                          return guide ? (
                            <p key={guideId} className="text-sm font-medium">
                              {guide.name}
                              {guide.Email && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({guide.Email})
                                </span>
                              )}
                            </p>
                          ) : null;
                        })}
                      </div>
                    );
                  }
                }
                return <p className="text-xs text-muted-foreground">No guide assigned</p>;
              })()}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSendInfoToGuideOpen(false);
                setInfoMessage('');
                setDeliveryMethod('email');
              }}
              disabled={sendingInfo}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInfoToGuide}
              disabled={sendingInfo || !infoMessage.trim() || getGuideIds(booking).length === 0}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {sendingInfo ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send to Guide
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* COMMENTED OUT: Reassign Guide Dialog - keeping code for future use
      <Dialog open={reassignGuideDialogOpen} onOpenChange={setReassignGuideDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {guide ? 'Assign Different Guide' : 'Assign Guide'}
            </DialogTitle>
            <DialogDescription>
              Select a new guide for this booking and add a message to notify them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Guide {booking?.city && `(${booking.city})`}</Label>
              <Select
                value={selectedReassignGuide?.toString() || ''}
                onValueChange={(v) => setSelectedReassignGuide(parseInt(v))}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Choose a guide..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {getGuidesByCity().map((g) => (
                    <SelectItem key={g.id} value={g.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{g.name || `Guide #${g.id}`}</span>
                        {g.tours_done !== null && (
                          <span className="text-xs text-muted-foreground">
                            ({g.tours_done} tours)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Message to Guide (optional)</Label>
              <Textarea
                value={reassignMessage}
                onChange={(e) => setReassignMessage(e.target.value)}
                placeholder="Add any notes or context for the new guide..."
                className="min-h-[100px] bg-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReassignGuideDialogOpen(false);
                setSelectedReassignGuide(null);
                setReassignMessage('');
              }}
              disabled={reassigningGuide}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReassignGuide}
              disabled={reassigningGuide || !selectedReassignGuide}
            >
              {reassigningGuide ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Guide'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      */}
    </div>
  );
}
