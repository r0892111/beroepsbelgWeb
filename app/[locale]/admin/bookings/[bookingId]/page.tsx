'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  MessageSquare
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

      // Fetch guide if guide_id exists
      if (bookingData.guide_id) {
        const { data: guideData } = await supabase
          .from('guides_temp')
          .select('id, name, Email, phonenumber, cities, languages, tours_done')
          .eq('id', bookingData.guide_id)
          .single();

        if (guideData) {
          setGuide(guideData as Guide);
        }
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

  const normalizeGuide = (item: number | SelectedGuide): SelectedGuide => {
    if (typeof item === 'number') {
      return { id: item };
    }
    return item;
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

  return (
    <div className="min-h-screen bg-sand">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/${locale}/admin/bookings`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-serif font-bold text-navy">Booking #{booking.id}</h1>
              <Badge className={`mt-1 ${getStatusColor(booking.status)}`}>
                {booking.status}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchBookingDetails()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Link href={`/${locale}/admin/dashboard`}>
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tour Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Tour Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tour ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Tour Name</p>
                    <p className="font-medium">{tour.title_nl || tour.title || 'Unnamed Tour'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">City</p>
                      <p className="font-medium flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {booking.city || tour.city || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <div className="flex gap-1">
                        <Badge variant="outline">
                          {booking.booking_type || 'B2C'}
                        </Badge>
                        {tour.op_maat && <Badge variant="secondary">Op Maat</Badge>}
                        {tour.local_stories && <Badge variant="secondary">Local Stories</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="font-medium">€{tour.price || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">{tour.duration_minutes ? `${tour.duration_minutes} min` : 'N/A'}</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Tour information not available</p>
              )}
              
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">Tour Date & Time</p>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDateTime(booking.tour_datetime)}
                </p>
              </div>

              {booking.request_tanguy && (
                <div className="pt-2">
                  <Badge className="bg-amber-100 text-amber-800">
                    Tanguy Requested (+€125)
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {invitee ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{invitee.name || 'N/A'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium flex items-center gap-1 text-sm">
                        <Mail className="h-4 w-4" />
                        {invitee.email || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium flex items-center gap-1 text-sm">
                        <Phone className="h-4 w-4" />
                        {invitee.phone || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Number of People</p>
                      <p className="font-medium flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {invitee.numberOfPeople || 1}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Language</p>
                      <p className="font-medium flex items-center gap-1">
                        <Globe className="h-4 w-4" />
                        {invitee.language?.toUpperCase() || 'NL'}
                      </p>
                    </div>
                  </div>
                  {invitee.specialRequests && (
                    <div>
                      <p className="text-sm text-muted-foreground">Special Requests</p>
                      <p className="font-medium flex items-start gap-1">
                        <MessageSquare className="h-4 w-4 mt-0.5" />
                        {invitee.specialRequests}
                      </p>
                    </div>
                  )}
                  {invitee.amount && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Amount Paid</p>
                      <p className="font-medium text-lg">
                        €{invitee.amount} {invitee.currency?.toUpperCase() || 'EUR'}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Customer information not available</p>
              )}
            </CardContent>
          </Card>

          {/* Guide Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Guide Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {guide ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-lg">{guide.name}</p>
                      <p className="text-sm text-muted-foreground">Assigned Guide</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-sm">{guide.Email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="text-sm">{guide.phonenumber || 'N/A'}</p>
                    </div>
                  </div>
                  {guide.tours_done && (
                    <div>
                      <p className="text-sm text-muted-foreground">Experience</p>
                      <p className="text-sm">{guide.tours_done} tours completed</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium">No guide assigned</p>
                    <p className="text-sm text-muted-foreground">Waiting for guide confirmation</p>
                  </div>
                </div>
              )}

              {/* Selected Guides Status */}
              {booking.selectedGuides && booking.selectedGuides.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Guide Offers</p>
                  <div className="space-y-2">
                    {booking.selectedGuides.map((sg) => {
                      const guideInfo = normalizeGuide(sg);
                      const guideData = allGuides.get(guideInfo.id);
                      return (
                        <div key={guideInfo.id} className="flex items-center justify-between text-sm p-2 rounded bg-gray-50">
                          <span>{guideData?.name || `Guide #${guideInfo.id}`}</span>
                          {guideInfo.status === 'declined' && (
                            <Badge variant="destructive" className="text-xs">Declined</Badge>
                          )}
                          {guideInfo.status === 'offered' && (
                            <Badge className="bg-yellow-500 text-xs">Waiting</Badge>
                          )}
                          {guideInfo.status === 'accepted' && (
                            <Badge className="bg-green-500 text-xs">Accepted</Badge>
                          )}
                          {!guideInfo.status && (
                            <Badge variant="outline" className="text-xs">Available</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Trigger Guide Assignment Button */}
              {!booking.guide_id && (
                <div className="pt-4">
                  <Button 
                    className="w-full" 
                    onClick={triggerGuideAssignment}
                    disabled={triggeringGuideAssignment}
                  >
                    {triggeringGuideAssignment ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Users className="h-4 w-4 mr-2" />
                    )}
                    {triggeringGuideAssignment ? 'Triggering...' : 'Trigger Guide Assignment'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Links & Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Links & Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* External Links */}
              <div className="space-y-2">
                {booking.deal_id && (
                  <a
                    href={`https://focus.teamleader.eu/web/deals/${booking.deal_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 text-sm"
                  >
                    <Building2 className="h-4 w-4" />
                    <span>TeamLeader Deal</span>
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                )}
                {booking.google_calendar_link && (
                  <a
                    href={booking.google_calendar_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 text-sm"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Google Calendar Event</span>
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                )}
                {booking.google_drive_link && (
                  <a
                    href={booking.google_drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 text-sm"
                  >
                    <Image className="h-4 w-4" />
                    <span>Tour Photos (Google Drive)</span>
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                )}
                {booking.stripe_session_id && (
                  <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span className="truncate">Stripe: {booking.stripe_session_id.slice(0, 20)}...</span>
                  </div>
                )}
                {booking.invoice_id && (
                  <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Invoice: {booking.invoice_id}</span>
                  </div>
                )}
              </div>

              {/* Status Indicators */}
              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-medium mb-2">Status Flags</p>
                <div className="flex flex-wrap gap-2">
                  {booking.picturesUploaded && (
                    <Badge variant="outline" className="bg-green-50">
                      <Image className="h-3 w-3 mr-1" />
                      Photos Uploaded {booking.pictureCount ? `(${booking.pictureCount})` : ''}
                    </Badge>
                  )}
                  {booking.is_aftercare_started && (
                    <Badge variant="outline" className="bg-blue-50">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Aftercare Started
                    </Badge>
                  )}
                  {booking.isCustomerDetailsRequested && (
                    <Badge variant="outline" className="bg-purple-50">
                      <Mail className="h-3 w-3 mr-1" />
                      Details Requested
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Op Maat Tour Details
              </CardTitle>
              <CardDescription>Custom tour preferences provided by the customer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {invitee.opMaatAnswers.startEnd && (
                  <div>
                    <p className="text-sm text-muted-foreground">Start/End Location</p>
                    <p className="font-medium">{invitee.opMaatAnswers.startEnd}</p>
                  </div>
                )}
                {invitee.opMaatAnswers.cityPart && (
                  <div>
                    <p className="text-sm text-muted-foreground">City Area</p>
                    <p className="font-medium">{invitee.opMaatAnswers.cityPart}</p>
                  </div>
                )}
                {invitee.opMaatAnswers.subjects && (
                  <div>
                    <p className="text-sm text-muted-foreground">Subjects of Interest</p>
                    <p className="font-medium">{invitee.opMaatAnswers.subjects}</p>
                  </div>
                )}
                {invitee.opMaatAnswers.specialWishes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Special Wishes</p>
                    <p className="font-medium">{invitee.opMaatAnswers.specialWishes}</p>
                  </div>
                )}
                {invitee.opMaatAnswers.extraHour && (
                  <div>
                    <Badge className="bg-amber-100 text-amber-800">
                      Extra Hour Selected (+€150)
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upsell Products */}
        {invitee?.upsellProducts && invitee.upsellProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Upsell Products
              </CardTitle>
              <CardDescription>Additional products ordered with this booking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {invitee.upsellProducts.map((product: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded bg-gray-50">
                    <span>{product.n || product.title || 'Product'}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        x{product.q || product.quantity || 1}
                      </span>
                      <span className="font-medium">
                        €{product.p || product.price || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Description */}
        {booking.ai_desc && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                AI Generated Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{booking.ai_desc}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

