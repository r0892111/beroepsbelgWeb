'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Home, LogOut, RefreshCw, Calendar, MapPin, Users, Phone, CheckCircle2, Clock, XCircle, ExternalLink, Briefcase, Search, X } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import type { TourBooking } from '@/lib/supabase/types';
import { format, isPast } from 'date-fns';

interface TourBookingWithDetails extends TourBooking {
  tours_table_prod?: {
    title: string;
  };
  guides_temp?: {
    name: string;
  };
}

export default function AdminToursPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [bookings, setBookings] = useState<TourBookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('tourbooking')
        .select(`
          *,
          tours_table_prod (
            title
          ),
          guides_temp (
            name
          )
        `)
        .gte('tour_datetime', new Date().toISOString())
        .order('tour_datetime', { ascending: true });

      if (fetchError) {
        console.error('Failed to fetch bookings:', fetchError);
        setError('Failed to load tour bookings');
        return;
      }

      setBookings((data as TourBookingWithDetails[]) || []);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setError('Failed to load tour bookings');
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return 'N/A';
    try {
      return format(new Date(dateTime), 'dd/MM/yyyy HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  const getInviteeCount = (invitees: Record<string, unknown>[] | null) => {
    if (!invitees) return 0;
    return invitees.length;
  };

  const handleGoogleCalendar = (booking: TourBookingWithDetails) => {
    if (!booking.google_calendar_link) {
      alert('No Google Calendar link available for this booking');
      return;
    }
    
    window.open(booking.google_calendar_link, '_blank');
  };

  const handleTeamleaderDeal = (booking: TourBookingWithDetails) => {
    if (!booking.deal_id) {
      alert('No Teamleader deal associated with this booking');
      return;
    }
    
    // Open Teamleader deal using the correct URL format
    const teamleaderUrl = `https://focus.teamleader.eu/web/deals/${booking.deal_id}`;
    window.open(teamleaderUrl, '_blank');
  };

  // Filter and search logic
  const filteredBookings = bookings.filter((booking) => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      booking.id.toString().includes(searchLower) ||
      booking.tours_table_prod?.title?.toLowerCase().includes(searchLower) ||
      booking.city?.toLowerCase().includes(searchLower) ||
      booking.guides_temp?.name?.toLowerCase().includes(searchLower);

    // Status filter
    const matchesStatus = filterStatus === 'all' || 
      booking.status.toLowerCase() === filterStatus.toLowerCase();

    // City filter
    const matchesCity = filterCity === 'all' || 
      booking.city === filterCity;

    return matchesSearch && matchesStatus && matchesCity;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterCity('all');
  };

  // Get unique cities from bookings
  const uniqueCities = Array.from(new Set(bookings.map(b => b.city).filter(Boolean)));
  const statusOptions = ['pending', 'confirmed', 'cancelled'];

  if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-sand">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-serif font-bold text-navy">Active Tours</h1>
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
                  Upcoming Tour Bookings
                </CardTitle>
                <CardDescription>
                  All scheduled tours that haven't happened yet
                </CardDescription>
              </div>
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
                    placeholder="Search by ID, tour name, city, or guide..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={!searchQuery && filterStatus === 'all' && filterCity === 'all'}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>

              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <Select value={filterCity} onValueChange={setFilterCity}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Filter by city" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {uniqueCities.map((city) => (
                        <SelectItem key={city} value={city!}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(searchQuery || filterStatus !== 'all' || filterCity !== 'all') && (
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
                {bookings.length === 0 ? 'No upcoming tour bookings found' : 'No bookings match your filters'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Tour</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Guide</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">#{booking.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{formatDateTime(booking.tour_datetime)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {booking.tours_table_prod?.title || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{booking.city || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {booking.guides_temp?.name || 'Not assigned'}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(booking.status)} flex items-center gap-1 w-fit`}>
                            {getStatusIcon(booking.status)}
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGoogleCalendar(booking)}
                              disabled={!booking.google_calendar_link}
                              title={booking.google_calendar_link ? "Open Google Calendar" : "No calendar link"}
                            >
                              <Calendar className="h-4 w-4 mr-1" />
                              Calendar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTeamleaderDeal(booking)}
                              disabled={!booking.deal_id}
                              title={booking.deal_id ? "View Teamleader Deal" : "No deal linked"}
                            >
                              <Briefcase className="h-4 w-4 mr-1" />
                              Deal
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {!loading && filteredBookings.length > 0 && (
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {filteredBookings.length} upcoming {filteredBookings.length === 1 ? 'booking' : 'bookings'}
                {filteredBookings.length !== bookings.length && ` (filtered from ${bookings.length} total)`}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

