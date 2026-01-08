'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Home, LogOut, RefreshCw, Calendar, Search, Filter, X, ExternalLink, UserPlus, Users, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getBookingTypeShortLabel } from '@/lib/utils';

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
  op_maat?: boolean;
  local_stories?: boolean;
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

  const CITY_OPTIONS = ['Antwerpen', 'Brussel', 'Brugge', 'Gent', 'Knokke-Heist', 'Leuven', 'Mechelen', 'Hasselt'];
  const STATUS_OPTIONS = ['pending', 'payment_completed', 'pending_jotform_confirmation', 'pending_guide_confirmation', 'confirmed', 'completed', 'cancelled'];

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
        .select('id, title, city, op_maat, local_stories');

      if (toursData) {
        const toursMap = new Map<string, Tour>();
        toursData.forEach((tour: any) => {
          toursMap.set(tour.id, tour);
        });
        setTours(toursMap);
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
    const matchesSearch = !searchQuery || 
      booking.id.toString().includes(searchLower) ||
      booking.city?.toLowerCase().includes(searchLower) ||
      booking.deal_id?.toLowerCase().includes(searchLower);

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

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy HH:mm');
    } catch {
      return dateStr;
    }
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
                    placeholder="Search by booking ID, city, or deal ID..."
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
                      <TableHead>TeamLeader Deal</TableHead>
                      <TableHead>Calendar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">#{booking.id}</TableCell>
                        <TableCell className="max-w-xs">
                          {booking.tour_id && tours.get(booking.tour_id) ? (
                            <div className="space-y-1">
                              <div className="font-medium text-sm truncate">
                                {tours.get(booking.tour_id)!.title}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ID: {booking.tour_id.slice(0, 8)}...
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {booking.tour_id ? `ID: ${booking.tour_id.slice(0, 8)}...` : 'N/A'}
                            </span>
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
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {guides.get(booking.guide_id)!.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ID: #{booking.guide_id}
                              </div>
                            </div>
                          ) : booking.guide_id ? (
                            <span className="text-sm text-muted-foreground">
                              #{booking.guide_id}
                            </span>
                          ) : needsNewGuide(booking) ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-amber-600 text-xs">
                                <AlertCircle className="h-3 w-3" />
                                All guides declined
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenGuideDialog(booking)}
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
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-mono">
                                {booking.deal_id}
                              </span>
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
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  <span className="text-xs font-medium">
                                    Open Deal
                                  </span>
                                </a>
                              </Button>
                            </div>
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
                              >
                                <Calendar className="h-4 w-4 mr-1" />
                                <span className="text-xs">View</span>
                              </a>
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
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
                                ({format(new Date(og.respondedAt), 'dd/MM HH:mm')})
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
    </div>
  );
}

