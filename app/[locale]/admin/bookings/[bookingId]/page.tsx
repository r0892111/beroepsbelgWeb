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
  UserPlus
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
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
  specialRequests?: string;
  amount?: number;
  currency?: string;
  upsellProducts?: any[];
  opMaatAnswers?: {
    startEnd?: string;
    cityPart?: string;
    subjects?: string;
    specialWishes?: string;
    extraHour?: boolean;
  };
}

interface TourBooking {
  id: number;
  guide_id: number | null;
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
  ai_desc: string | null;
}

interface Tour {
  id: string;
  title: string;
  title_nl: string | null;
  title_en: string | null;
  city: string;
  price: number | null;
  duration_minutes: number | null;
  op_maat?: boolean;
  local_stories?: boolean;
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
  const [triggeringGuideAssignment, setTriggeringGuideAssignment] = useState(false);
  const [guideDialogOpen, setGuideDialogOpen] = useState(false);
  const [selectedNewGuideId, setSelectedNewGuideId] = useState<number | null>(null);
  const [submittingNewGuide, setSubmittingNewGuide] = useState(false);
  const [cancellingGuide, setCancellingGuide] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch booking
      const { data: bookingData, error: bookingError } = await supabase
        .from('tourbooking')
        .select('*')
        .eq('id', parseInt(bookingId, 10))
        .single();

      if (bookingError || !bookingData) {
        setError('Booking not found');
        return;
      }

      setBooking(bookingData as TourBooking);

      // Fetch tour if tour_id exists
      if (bookingData.tour_id) {
        const { data: tourData } = await supabase
          .from('tours_table_prod')
          .select('id, title, title_nl, title_en, city, price, duration_minutes, op_maat, local_stories')
          .eq('id', bookingData.tour_id)
          .single();

        if (tourData) {
          setTour(tourData as Tour);
        }
      }

      // Fetch guide if guide_id exists, otherwise clear guide state
      if (bookingData.guide_id) {
        const { data: guideData } = await supabase
          .from('guides_temp')
          .select('id, name, Email, phonenumber, cities, languages, tours_done')
          .eq('id', bookingData.guide_id)
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
      console.error('Error fetching booking details:', err);
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

  const triggerGuideAssignment = async () => {
    if (!booking) return;
    
    setTriggeringGuideAssignment(true);
    try {
      const response = await fetch('https://alexfinit.app.n8n.cloud/webhook/f22ab19e-bc75-475e-ac13-ca9b5c8f72fe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(booking),
      });

      if (!response.ok) {
        throw new Error('Failed to trigger guide assignment webhook');
      }

      toast.success('Guide assignment triggered successfully!');
      // Optionally refresh booking data
      void fetchBookingDetails();
    } catch (err) {
      console.error('Error triggering guide assignment:', err);
      toast.error('Failed to trigger guide assignment');
    } finally {
      setTriggeringGuideAssignment(false);
    }
  };

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
          offeredAt: new Date().toISOString(),
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
      console.error('Error selecting new guide:', err);
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

      console.log('Guide cancellation response:', data);

      toast.success('Guide removed. A new guide will be assigned.');
      setCancelDialogOpen(false);
      // Wait a moment for the database to propagate changes
      await new Promise(resolve => setTimeout(resolve, 500));
      void fetchBookingDetails();
    } catch (err) {
      console.error('Error cancelling guide:', err);
      toast.error('Failed to cancel guide assignment');
    } finally {
      setCancellingGuide(false);
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
    if (!dateStr) return 'Not set';
    try {
      return format(new Date(dateStr), 'dd MMMM yyyy, HH:mm');
    } catch {
      return dateStr;
    }
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
                  {tour?.title_nl || tour?.title || 'Tour booking details'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
        {(!booking.guide_id || booking.deal_id || booking.google_calendar_link) && (
          <Card className="border-dashed">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-3">
                {!booking.guide_id && (
                  <Button 
                    onClick={triggerGuideAssignment}
                    disabled={triggeringGuideAssignment}
                    size="sm"
                    className="gap-2"
                  >
                    {triggeringGuideAssignment ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {triggeringGuideAssignment ? 'Sending...' : 'Send to Guide Assignment'}
                  </Button>
                )}
                {booking.deal_id && (
                  <Button variant="outline" size="sm" asChild className="gap-2">
                    <a
                      href={`https://focus.teamleader.eu/web/deals/${booking.deal_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Building2 className="h-4 w-4" />
                      TeamLeader
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
              </div>
            </CardContent>
          </Card>
        )}

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
                    <p className="font-medium">{tour.title_nl || tour.title || 'Unnamed Tour'}</p>
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
                      <p className="font-medium">{tour.duration_minutes ? `${tour.duration_minutes} min` : 'N/A'}</p>
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
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                {isLocalStories ? `Customers (${allInvitees.length})` : 'Customer'}
              </CardTitle>
              {isLocalStories && (
                <CardDescription>
                  Total people: {allInvitees.reduce((sum, inv) => sum + (inv.numberOfPeople || 1), 0)}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {isLocalStories ? (
                /* Local Stories - All Invitees */
                <div className="space-y-4">
                  {allInvitees.map((inv, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${index > 0 ? 'bg-muted/30' : 'bg-muted/50'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-medium text-sm">{inv.name || `Customer ${index + 1}`}</p>
                        <Badge variant="outline" className="text-xs">
                          {inv.numberOfPeople || 1} {(inv.numberOfPeople || 1) === 1 ? 'person' : 'people'}
                        </Badge>
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
                      {inv.amount && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs text-muted-foreground">Amount</p>
                          <p className="font-medium">€{inv.amount}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Total amount */}
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Amount</p>
                    <p className="text-lg font-semibold">
                      €{allInvitees.reduce((sum, inv) => sum + (inv.amount || 0), 0)}
                    </p>
                  </div>
                </div>
              ) : invitee ? (
                /* Single Customer (Regular tours) */
                <>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Name</p>
                    <p className="font-medium">{invitee.name || 'N/A'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                      <p className="text-sm truncate">{invitee.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                      <p className="text-sm">{invitee.phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Group Size</p>
                      <p className="font-medium">{invitee.numberOfPeople || 1} {(invitee.numberOfPeople || 1) === 1 ? 'person' : 'people'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Language</p>
                      <p className="font-medium">{invitee.language?.toUpperCase() || 'NL'}</p>
                    </div>
                  </div>
                  {invitee.specialRequests && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Special Requests</p>
                      <p className="text-sm">{invitee.specialRequests}</p>
                    </div>
                  )}
                  {invitee.amount && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Amount Paid</p>
                      <p className="text-lg font-semibold">€{invitee.amount}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Customer information not available</p>
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
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-medium">No guide assigned</p>
                    <p className="text-xs text-muted-foreground">Awaiting assignment</p>
                  </div>
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
              {!booking.guide_id && allGuidesDeclined() && (
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

          {/* Status & References */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                References
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                {booking.stripe_session_id && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Stripe Session</p>
                    <p className="font-mono text-xs truncate">{booking.stripe_session_id}</p>
                  </div>
                )}
                {booking.invoice_id && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Invoice ID</p>
                    <p className="font-mono text-xs">{booking.invoice_id}</p>
                  </div>
                )}
                {booking.deal_id && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">TeamLeader Deal</p>
                    <p className="font-mono text-xs truncate">{booking.deal_id}</p>
                  </div>
                )}
              </div>

              {/* Status Flags */}
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Status</p>
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

        {/* Additional Products */}
        {invitee?.upsellProducts && invitee.upsellProducts.length > 0 && (
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
              All previously offered guides have declined. Select a new guide from the list below.
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
    </div>
  );
}
