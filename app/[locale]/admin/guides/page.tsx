'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Home, LogOut, RefreshCw, Plus, Pencil, Trash2, Users, X, Search, Filter, Calendar, Mail } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Guide {
  id: number;
  name: string | null;
  cities: string[] | null;
  languages: string[] | null;
  tour_types: string[] | null;
  preferences: string[] | null;
  availability: string | null;
  tours_done: number | null;
  content: string | null;
  phonenumber: string | null;
  google_calendar_id: string | null;
  Email: string | null;
}

interface GuideFormData {
  name: string;
  cities: string[];
  languages: string[];
  tour_types: string[];
  preferences: string[];
  availability: string;
  tours_done: number;
  content: string;
  phonenumber: string;
  Email: string;
}

const CITY_OPTIONS = ['Antwerpen', 'Brussel', 'Brugge', 'Gent', 'Knokke-Heist', 'Leuven', 'Mechelen', 'Hasselt'];
const LANGUAGE_OPTIONS = ['Nederlands', 'Engels', 'Frans', 'Duits', 'Spaans', 'Italiaans'];
const TOUR_TYPE_OPTIONS = ['Walking', 'Biking', 'Bus', 'Private', 'Group'];
const AVAILABILITY_OPTIONS = ['Available', 'Limited', 'Unavailable'];
const PREFERENCE_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Weekend', 'Weekday'];

export default function AdminGuidesPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [filterAvailability, setFilterAvailability] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState<GuideFormData>({
    name: '',
    cities: [],
    languages: [],
    tour_types: [],
    preferences: [],
    availability: 'Available',
    tours_done: 0,
    content: '',
    phonenumber: '',
    Email: '',
  });

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  const fetchGuides = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('guides_temp')
        .select('*')
        .order('id', { ascending: true });

      if (fetchError) {
        console.error('Failed to fetch guides:', fetchError);
        setError('Failed to load guides');
        return;
      }

      console.log('Fetched guides:', data);
      setGuides((data as Guide[]) || []);
    } catch (err) {
      console.error('Failed to fetch guides:', err);
      setError('Failed to load guides');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (profile?.isAdmin || profile?.is_admin)) {
      void fetchGuides();
    }
  }, [user, profile]);

  const handleLogout = () => {
    signOut();
    router.push(`/${locale}`);
  };

  const openAddDialog = () => {
    setEditingGuide(null);
    setFormData({
      name: '',
      cities: [],
      languages: [],
      tour_types: [],
      preferences: [],
      availability: 'Available',
      tours_done: 0,
      content: '',
      phonenumber: '',
      Email: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (guide: Guide) => {
    setEditingGuide(guide);
    setFormData({
      name: guide.name || '',
      cities: Array.isArray(guide.cities) ? guide.cities : [],
      languages: Array.isArray(guide.languages) ? guide.languages : [],
      tour_types: Array.isArray(guide.tour_types) ? guide.tour_types : [],
      preferences: Array.isArray(guide.preferences) ? guide.preferences : [],
      availability: guide.availability || 'Available',
      tours_done: guide.tours_done || 0,
      content: guide.content || '',
      phonenumber: guide.phonenumber || '',
      Email: guide.Email || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingGuide) {
        // Update existing guide - include tours_done
        const payload = {
          name: formData.name,
          cities: formData.cities,
          languages: formData.languages,
          tour_types: formData.tour_types,
          preferences: formData.preferences,
          availability: formData.availability,
          tours_done: formData.tours_done,
          content: formData.content,
          phonenumber: formData.phonenumber,
          Email: formData.Email,
        };

        const { error } = await supabase
          .from('guides_temp')
          .update(payload)
          .eq('id', editingGuide.id);

        if (error) throw error;
        toast.success('Guide updated successfully');
      } else {
        // Create new guide - exclude tours_done so it defaults to 0 or null in DB
        const payload = {
          name: formData.name,
          cities: formData.cities,
          languages: formData.languages,
          tour_types: formData.tour_types,
          preferences: formData.preferences,
          availability: formData.availability,
          content: formData.content,
          phonenumber: formData.phonenumber,
          Email: formData.Email,
        };

        const { error } = await supabase
          .from('guides_temp')
          .insert([payload]);

        if (error) throw error;
        toast.success('Guide created successfully');
      }

      setDialogOpen(false);
      void fetchGuides();
    } catch (err) {
      console.error('Failed to save guide:', err);
      toast.error('Failed to save guide');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (guide: Guide) => {
    if (!confirm(`Are you sure you want to delete ${guide.name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('guides_temp')
        .delete()
        .eq('id', guide.id);

      if (error) throw error;
      toast.success('Guide deleted successfully');
      void fetchGuides();
    } catch (err) {
      console.error('Failed to delete guide:', err);
      toast.error('Failed to delete guide');
    }
  };

  const handleSendCalendarInvite = async (guide: Guide) => {
    if (!guide.Email) {
      toast.error('Guide has no email address');
      return;
    }

    if (!guide.name) {
      toast.error('Guide has no name');
      return;
    }

    try {
      toast.info('Creating Google Calendar for guide...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-guide-calendar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guideId: guide.id,
          guideName: guide.name,
          guideEmail: guide.Email,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create calendar');
      }

      toast.success(`Calendar "${result.calendarName}" created successfully!`);
      
      // Refresh the guides list to show updated calendar status
      void fetchGuides();
      
      // Also open email client for manual follow-up if desired
      const subject = encodeURIComponent('Google Calendar Created - Beroepsbelg');
      const body = encodeURIComponent(
        `Hi ${guide.name},\n\n` +
        `We've created a Google Calendar for you: "${result.calendarName}".\n\n` +
        `Your calendar ID: ${result.calendarId}\n\n` +
        `This calendar will be used to manage your tour bookings.\n\n` +
        `Best regards,\n` +
        `Beroepsbelg Team`
      );
      
      window.open(`mailto:${guide.Email}?subject=${subject}&body=${body}`, '_blank');
      
    } catch (err) {
      console.error('Failed to create guide calendar:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create calendar');
    }
  };

  const toggleArrayItem = (array: string[], item: string) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    }
    return [...array, item];
  };

  // Filter and search logic
  const filteredGuides = guides.filter((guide) => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      guide.name?.toLowerCase().includes(searchLower) ||
      guide.Email?.toLowerCase().includes(searchLower) ||
      guide.phonenumber?.toLowerCase().includes(searchLower);

    // City filter
    const matchesCity = filterCity === 'all' || 
      (guide.cities && Array.isArray(guide.cities) && guide.cities.includes(filterCity));

    // Language filter
    const matchesLanguage = filterLanguage === 'all' || 
      (guide.languages && Array.isArray(guide.languages) && guide.languages.includes(filterLanguage));

    // Availability filter
    const matchesAvailability = filterAvailability === 'all' || 
      guide.availability === filterAvailability;

    return matchesSearch && matchesCity && matchesLanguage && matchesAvailability;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCity('all');
    setFilterLanguage('all');
    setFilterAvailability('all');
  };

  if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-sand">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-serif font-bold text-navy">Guides Management</h1>
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
                  <Users className="h-5 w-5" />
                  All Guides
                </CardTitle>
                <CardDescription>
                  Manage tour guides and their information
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchGuides()}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button onClick={openAddDialog} className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Guide
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
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={!searchQuery && filterCity === 'all' && filterLanguage === 'all' && filterAvailability === 'all'}
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
                      {CITY_OPTIONS.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Filter by language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Languages</SelectItem>
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <Select value={filterAvailability} onValueChange={setFilterAvailability}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Filter by availability" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Availability</SelectItem>
                      {AVAILABILITY_OPTIONS.map((avail) => (
                        <SelectItem key={avail} value={avail}>
                          {avail}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(searchQuery || filterCity !== 'all' || filterLanguage !== 'all' || filterAvailability !== 'all') && (
                <div className="text-sm text-muted-foreground">
                  Showing {filteredGuides.length} of {guides.length} guides
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredGuides.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {guides.length === 0 ? 'No guides found' : 'No guides match your filters'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Cities</TableHead>
                      <TableHead>Languages</TableHead>
                      <TableHead>Tours Done</TableHead>
                      <TableHead>Availability</TableHead>
                      <TableHead>Calendar</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGuides.map((guide) => (
                      <TableRow key={guide.id}>
                        <TableCell className="font-medium">#{guide.id}</TableCell>
                        <TableCell>{guide.name || 'N/A'}</TableCell>
                        <TableCell className="text-sm">{guide.Email || 'N/A'}</TableCell>
                        <TableCell className="text-sm">{guide.phonenumber || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {guide.cities && Array.isArray(guide.cities) && guide.cities.length > 0 ? (
                              guide.cities.map((city, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {city}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {guide.languages && Array.isArray(guide.languages) && guide.languages.length > 0 ? (
                              guide.languages.map((lang, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {lang}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{guide.tours_done || 0}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              guide.availability === 'Available'
                                ? 'bg-green-100 text-green-800'
                                : guide.availability === 'Limited'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {guide.availability || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {guide.google_calendar_id ? (
                            <Badge className="bg-green-100 text-green-800 flex items-center gap-1 w-fit">
                              <Calendar className="h-3 w-3" />
                              Connected
                            </Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendCalendarInvite(guide)}
                              className="text-xs"
                              title="Send calendar integration invite"
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              Invite
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(guide)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(guide)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {!loading && filteredGuides.length > 0 && (
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {filteredGuides.length} {filteredGuides.length === 1 ? 'guide' : 'guides'}
                {filteredGuides.length !== guides.length && ` (filtered from ${guides.length} total)`}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGuide ? 'Edit Guide' : 'Add New Guide'}</DialogTitle>
            <DialogDescription>
              {editingGuide ? 'Update guide information' : 'Create a new guide profile'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-navy font-semibold">Name*</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="bg-white"
                />
              </div>
              <div>
                <Label htmlFor="Email" className="text-navy font-semibold">Email*</Label>
                <Input
                  id="Email"
                  type="email"
                  value={formData.Email}
                  onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                  required
                  className="bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phonenumber" className="text-navy font-semibold">Phone Number</Label>
                <Input
                  id="phonenumber"
                  type="tel"
                  value={formData.phonenumber}
                  onChange={(e) => setFormData({ ...formData, phonenumber: e.target.value })}
                  className="bg-white"
                />
              </div>
              <div>
                <Label htmlFor="availability" className="text-navy font-semibold">Availability*</Label>
                <Select
                  value={formData.availability}
                  onValueChange={(value) => setFormData({ ...formData, availability: value })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABILITY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="tours_done" className="text-navy font-semibold">Tours Done</Label>
              <Input
                id="tours_done"
                type="number"
                min="0"
                value={formData.tours_done}
                onChange={(e) => setFormData({ ...formData, tours_done: parseInt(e.target.value) || 0 })}
                className="bg-white"
              />
            </div>

            <div>
              <Label className="text-navy font-semibold">Cities</Label>
              <div className="border rounded-lg p-3 space-y-2 bg-white">
                <div className="flex flex-wrap gap-2">
                  {formData.cities.map((city) => (
                    <Badge key={city} className="bg-blue-100 text-blue-900 border border-blue-300 hover:bg-blue-200 flex items-center gap-1">
                      {city}
                      <X
                        className="h-3 w-3 cursor-pointer hover:bg-blue-300/50 rounded"
                        onClick={() => setFormData({ ...formData, cities: formData.cities.filter(c => c !== city) })}
                      />
                    </Badge>
                  ))}
                  {formData.cities.length === 0 && (
                    <span className="text-sm text-muted-foreground">No cities selected</span>
                  )}
                </div>
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (!formData.cities.includes(value)) {
                      setFormData({ ...formData, cities: [...formData.cities, value] });
                    }
                  }}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Add city..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CITY_OPTIONS.filter(city => !formData.cities.includes(city)).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-navy font-semibold">Languages</Label>
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
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (!formData.languages.includes(value)) {
                      setFormData({ ...formData, languages: [...formData.languages, value] });
                    }
                  }}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Add language..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.filter(lang => !formData.languages.includes(lang)).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-navy font-semibold">Tour Types</Label>
              <div className="border rounded-lg p-3 space-y-2 bg-white">
                <div className="flex flex-wrap gap-2">
                  {formData.tour_types.map((type) => (
                    <Badge key={type} className="bg-blue-100 text-blue-900 border border-blue-300 hover:bg-blue-200 flex items-center gap-1">
                      {type}
                      <X
                        className="h-3 w-3 cursor-pointer hover:bg-blue-300/50 rounded"
                        onClick={() => setFormData({ ...formData, tour_types: formData.tour_types.filter(t => t !== type) })}
                      />
                    </Badge>
                  ))}
                  {formData.tour_types.length === 0 && (
                    <span className="text-sm text-muted-foreground">No tour types selected</span>
                  )}
                </div>
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (!formData.tour_types.includes(value)) {
                      setFormData({ ...formData, tour_types: [...formData.tour_types, value] });
                    }
                  }}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Add tour type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TOUR_TYPE_OPTIONS.filter(type => !formData.tour_types.includes(type)).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-navy font-semibold">Preferences</Label>
              <div className="border rounded-lg p-3 space-y-2 bg-white">
                <div className="flex flex-wrap gap-2">
                  {formData.preferences.map((pref) => (
                    <Badge key={pref} className="bg-blue-100 text-blue-900 border border-blue-300 hover:bg-blue-200 flex items-center gap-1">
                      {pref}
                      <X
                        className="h-3 w-3 cursor-pointer hover:bg-blue-300/50 rounded"
                        onClick={() => setFormData({ ...formData, preferences: formData.preferences.filter(p => p !== pref) })}
                      />
                    </Badge>
                  ))}
                  {formData.preferences.length === 0 && (
                    <span className="text-sm text-muted-foreground">No preferences selected</span>
                  )}
                </div>
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (!formData.preferences.includes(value)) {
                      setFormData({ ...formData, preferences: [...formData.preferences, value] });
                    }
                  }}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Add preference..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PREFERENCE_OPTIONS.filter(pref => !formData.preferences.includes(pref)).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="content" className="text-navy font-semibold">Description</Label>
              <Textarea
                id="content"
                rows={4}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Brief description or bio of the guide..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Saving...' : editingGuide ? 'Update Guide' : 'Create Guide'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

