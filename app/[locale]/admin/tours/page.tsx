'use client';

import { useEffect, useState } from 'react';
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
import { Home, LogOut, RefreshCw, Plus, Pencil, Trash2, MapPin, X, Search } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

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
}

const CITY_OPTIONS = ['Antwerpen', 'Brussel', 'Brugge', 'Gent', 'Knokke-Heist', 'Leuven', 'Mechelen', 'Hasselt'];
const LANGUAGE_OPTIONS = ['Nederlands', 'Engels', 'Frans', 'Duits', 'Spaans', 'Italiaans'];
const TOUR_TYPE_OPTIONS = ['Walking', 'Biking', 'Bus', 'Private', 'Group', 'Boat', 'Food', 'Custom'];

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

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

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
  });

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
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Failed to fetch tours:', fetchError);
        setError('Failed to load tours');
        return;
      }

      console.log('Fetched tours:', data);
      setTours((data as Tour[]) || []);
    } catch (err) {
      console.error('Failed to fetch tours:', err);
      setError('Failed to load tours');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (profile?.isAdmin || profile?.is_admin)) {
      void fetchTours();
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
    });
    setDialogOpen(true);
  };

  const openEditDialog = (tour: Tour) => {
    setEditingTour(tour);
    setFormData({
      city: tour.city || '',
      title: tour.title || '',
      type: tour.type || '',
      duration_minutes: tour.duration_minutes || 120,
      price: tour.price,
      start_location: tour.start_location || '',
      end_location: tour.end_location || '',
      languages: Array.isArray(tour.languages) ? tour.languages : [],
      description: tour.description || '',
      notes: tour.notes || '',
      options: tour.options || {},
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        city: formData.city,
        title: formData.title,
        type: formData.type,
        duration_minutes: formData.duration_minutes,
        price: formData.price,
        start_location: formData.start_location || null,
        end_location: formData.end_location || null,
        languages: formData.languages,
        description: formData.description,
        notes: formData.notes || null,
        options: formData.options || {},
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
    const matchesSearch = !searchQuery || 
      tour.title?.toLowerCase().includes(searchLower) ||
      tour.description?.toLowerCase().includes(searchLower) ||
      tour.city?.toLowerCase().includes(searchLower);

    // City filter
    const matchesCity = filterCity === 'all' || tour.city === filterCity;

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
                      {CITY_OPTIONS.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                    {filteredTours.map((tour) => (
                      <TableRow key={tour.id}>
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
                    ))}
                  </TableBody>
                </Table>
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
                  onValueChange={(value) => setFormData({ ...formData, city: value })}
                  required
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITY_OPTIONS.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="type" className="text-navy font-semibold">Tour Type*</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  required
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
    </div>
  );
}
