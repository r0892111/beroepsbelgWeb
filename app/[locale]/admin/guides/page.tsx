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
import { Home, LogOut, RefreshCw, Plus, Pencil, Trash2, Users, X, Search, Filter, Calendar, Mail, Phone, MapPin, Globe, Clock, Award, Upload, Image as ImageIcon, Cake, MessageSquare, Star, Link as LinkIcon, Copy } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface FeedbackSubmission {
  guide_rating: number;
  guide_feedback: string | null;
  tour_rating: number;
  tour_feedback: string | null;
  booking_rating?: number;
  found_us_source?: string;
  email: string | null;
  submitted_at: string;
}

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
  profile_picture: string | null;
  birthday: string | null;
  form_submissions: FeedbackSubmission[] | null;
}

interface GuideFormData {
  name: string;
  cities: string[];
  languages: string[];
  tour_types: string[];
  preferences: string[];
  tours_done: number;
  content: string;
  phonenumber: string;
  Email: string;
  profile_picture: string;
  birthday: string;
}

const CITY_OPTIONS = ['Antwerpen', 'Brussel', 'Brugge', 'Gent', 'Knokke-Heist', 'Leuven', 'Mechelen', 'Hasselt'];
const LANGUAGE_OPTIONS = ['Nederlands', 'Engels', 'Frans', 'Duits', 'Spaans', 'Italiaans'];
const TOUR_TYPE_OPTIONS = ['Walking', 'Biking', 'Bus', 'Private', 'Group'];
const PREFERENCE_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Weekend', 'Weekday'];
const STORAGE_BUCKET = 'WebshopItemsImages';
const STORAGE_FOLDER = 'Guide Photos';

export default function AdminGuidesPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState<GuideFormData>({
    name: '',
    cities: [],
    languages: [],
    tour_types: [],
    preferences: [],
    tours_done: 0,
    content: '',
    phonenumber: '',
    Email: '',
    profile_picture: '',
    birthday: '',
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

  const uploadProfilePicture = async (file: File, guideId: number): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `guide_${guideId}_${Date.now()}.${fileExt}`;
      const filePath = `${STORAGE_FOLDER}/${guideId}/${fileName}`;

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

  const handleProfilePictureSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setProfilePictureFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicturePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const openAddDialog = () => {
    setEditingGuide(null);
    setFormData({
      name: '',
      cities: [],
      languages: [],
      tour_types: [],
      preferences: [],
      tours_done: 0,
      content: '',
      phonenumber: '',
      Email: '',
      profile_picture: '',
      birthday: '',
    });
    setProfilePictureFile(null);
    setProfilePicturePreview(null);
    setDialogOpen(true);
  };

  const openProfileDialog = (guide: Guide) => {
    setSelectedGuide(guide);
    setProfileDialogOpen(true);
  };

  const openFeedbackDialog = (guide: Guide) => {
    setSelectedGuide(guide);
    setFeedbackDialogOpen(true);
  };

  const generateSlug = (name: string | null) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  };

  const copyFeedbackLink = (guide: Guide) => {
    const slug = generateSlug(guide.name);
    const url = `${window.location.origin}/${locale}/form/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Feedback link copied to clipboard!');
  };

  const openEditDialog = (guide: Guide) => {
    setEditingGuide(guide);
    setFormData({
      name: guide.name || '',
      cities: Array.isArray(guide.cities) ? guide.cities : [],
      languages: Array.isArray(guide.languages) ? guide.languages : [],
      tour_types: Array.isArray(guide.tour_types) ? guide.tour_types : [],
      preferences: Array.isArray(guide.preferences) ? guide.preferences : [],
      tours_done: guide.tours_done || 0,
      content: guide.content || '',
      phonenumber: guide.phonenumber || '',
      Email: guide.Email || '',
      profile_picture: guide.profile_picture || '',
      birthday: guide.birthday || '',
    });
    setProfilePictureFile(null);
    setProfilePicturePreview(guide.profile_picture || null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setUploading(true);

    try {
      let profilePictureUrl: string | null = formData.profile_picture || null;

      // Upload profile picture if a new file is selected
      if (profilePictureFile) {
        if (editingGuide) {
          profilePictureUrl = await uploadProfilePicture(profilePictureFile, editingGuide.id);
        } else {
          // For new guides, we need to create the guide first, then upload the picture
          // We'll handle this after insertion
        }
      }

      if (editingGuide) {
        // Update existing guide - include tours_done
        // Note: availability is not editable through the admin panel
        const payload: any = {
          name: formData.name,
          cities: formData.cities,
          languages: formData.languages,
          tour_types: formData.tour_types,
          preferences: formData.preferences,
          tours_done: formData.tours_done,
          content: formData.content,
          phonenumber: formData.phonenumber,
          Email: formData.Email,
          birthday: formData.birthday || null,
        };

        // Only update profile_picture if we have a new URL or existing one
        if (profilePictureUrl) {
          payload.profile_picture = profilePictureUrl;
        }

        const { error } = await supabase
          .from('guides_temp')
          .update(payload)
          .eq('id', editingGuide.id);

        if (error) throw error;
        toast.success('Guide updated successfully');
      } else {
        // Create new guide - exclude tours_done so it defaults to 0 or null in DB
        // Note: availability is not editable through the admin panel, will use database default
        const payload: any = {
          name: formData.name,
          cities: formData.cities,
          languages: formData.languages,
          tour_types: formData.tour_types,
          preferences: formData.preferences,
          content: formData.content,
          phonenumber: formData.phonenumber,
          Email: formData.Email,
          birthday: formData.birthday || null,
        };

        const { data: newGuide, error: insertError } = await supabase
          .from('guides_temp')
          .insert([payload])
          .select()
          .single();

        if (insertError) throw insertError;

        // Upload profile picture for new guide if provided
        if (profilePictureFile && newGuide) {
          profilePictureUrl = await uploadProfilePicture(profilePictureFile, newGuide.id);
          
          // Update the guide with the profile picture URL
          if (profilePictureUrl) {
            const { error: updateError } = await supabase
              .from('guides_temp')
              .update({ profile_picture: profilePictureUrl })
              .eq('id', newGuide.id);

            if (updateError) throw updateError;
          }
        }

        toast.success('Guide created successfully');
      }

      setDialogOpen(false);
      setProfilePictureFile(null);
      setProfilePicturePreview(null);
      void fetchGuides();
    } catch (err) {
      console.error('Failed to save guide:', err);
      toast.error('Failed to save guide');
    } finally {
      setSubmitting(false);
      setUploading(false);
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

      if (result.calendarShared) {
        toast.success(`Calendar "${result.calendarName}" created and shared with ${guide.Email}! They will receive a Google Calendar invitation.`);
      } else {
        toast.success(`Calendar "${result.calendarName}" created! (Note: Could not share with guide email)`);
      }
      
      // Refresh the guides list to show updated calendar status
      void fetchGuides();
      
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

    return matchesSearch && matchesCity && matchesLanguage;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCity('all');
    setFilterLanguage('all');
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
                  disabled={!searchQuery && filterCity === 'all' && filterLanguage === 'all'}
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

              </div>

              {(searchQuery || filterCity !== 'all' || filterLanguage !== 'all') && (
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
                      <TableHead>Calendar</TableHead>
                      <TableHead>Feedback</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGuides.map((guide) => (
                      <TableRow key={guide.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openProfileDialog(guide)}>
                        <TableCell className="font-medium">#{guide.id}</TableCell>
                        <TableCell className="font-medium hover:text-primary transition-colors">
                          <div className="flex items-center gap-2">
                            {guide.profile_picture ? (
                              <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                <Image
                                  src={guide.profile_picture}
                                  alt={guide.name || 'Guide'}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                <Users className="h-4 w-4 text-gray-500" />
                              </div>
                            )}
                            <span>{guide.name || 'N/A'}</span>
                          </div>
                        </TableCell>
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
                        <TableCell onClick={(e) => e.stopPropagation()}>
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
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openFeedbackDialog(guide)}
                              className="text-xs"
                              title="View feedback"
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              {guide.form_submissions?.length || 0}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyFeedbackLink(guide)}
                              title="Copy feedback form link"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                <Label htmlFor="birthday" className="text-navy font-semibold flex items-center gap-2">
                  <Cake className="h-4 w-4" />
                  Birthday
                </Label>
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                  className="bg-white"
                />
              </div>
            </div>


            <div>
              <Label className="text-navy font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Profile Picture
              </Label>
              <div className="space-y-2">
                {(profilePicturePreview || formData.profile_picture) && (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                    <img
                      src={profilePicturePreview || formData.profile_picture}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1"
                      onClick={() => {
                        setProfilePictureFile(null);
                        setProfilePicturePreview(null);
                        setFormData({ ...formData, profile_picture: '' });
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleProfilePictureSelect(e.target.files[0]);
                      }
                    }}
                    className="bg-white"
                  />
                  {uploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
                </div>
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

      {/* Guide Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedGuide && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-navy flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  {selectedGuide.name || 'Guide Profile'}
                </DialogTitle>
                <DialogDescription>
                  Complete guide profile and information
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Profile Picture and Basic Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-4">
                      {selectedGuide.profile_picture ? (
                        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                          <img
                            src={selectedGuide.profile_picture}
                            alt={selectedGuide.name || 'Guide'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <Users className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-semibold text-muted-foreground">Guide ID</Label>
                          <p className="text-lg font-medium">#{selectedGuide.id}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-muted-foreground">Tours Completed</Label>
                          <p className="text-lg font-medium flex items-center gap-2">
                            <Award className="h-4 w-4" />
                            {selectedGuide.tours_done || 0}
                          </p>
                        </div>
                        {selectedGuide.birthday && (
                          <div>
                            <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                              <Cake className="h-4 w-4" />
                              Birthday
                            </Label>
                            <p className="text-base">
                              {new Date(selectedGuide.birthday).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                      <p className="text-base">{selectedGuide.Email || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </Label>
                      <p className="text-base">{selectedGuide.phonenumber || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Cities */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Cities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedGuide.cities && Array.isArray(selectedGuide.cities) && selectedGuide.cities.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedGuide.cities.map((city, idx) => (
                          <Badge key={idx} variant="outline" className="text-sm">
                            {city}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No cities assigned</p>
                    )}
                  </CardContent>
                </Card>

                {/* Languages */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Languages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedGuide.languages && Array.isArray(selectedGuide.languages) && selectedGuide.languages.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedGuide.languages.map((lang, idx) => (
                          <Badge key={idx} variant="outline" className="text-sm">
                            {lang}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No languages specified</p>
                    )}
                  </CardContent>
                </Card>

                {/* Tour Types */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Tour Types
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedGuide.tour_types && Array.isArray(selectedGuide.tour_types) && selectedGuide.tour_types.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedGuide.tour_types.map((type, idx) => (
                          <Badge key={idx} variant="outline" className="text-sm">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No tour types specified</p>
                    )}
                  </CardContent>
                </Card>

                {/* Preferences */}
                {selectedGuide.preferences && Array.isArray(selectedGuide.preferences) && selectedGuide.preferences.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Preferences</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedGuide.preferences.map((pref, idx) => (
                          <Badge key={idx} variant="outline" className="text-sm">
                            {pref}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Description/Bio */}
                {selectedGuide.content && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{selectedGuide.content}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Calendar Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Calendar Integration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedGuide.google_calendar_id ? (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Connected
                        </Badge>
                        <p className="text-sm text-muted-foreground">Calendar ID: {selectedGuide.google_calendar_id}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Not Connected</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setProfileDialogOpen(false);
                            handleSendCalendarInvite(selectedGuide);
                          }}
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          Send Invite
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setProfileDialogOpen(false);
                    openEditDialog(selectedGuide);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Guide
                </Button>
                <Button onClick={() => setProfileDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedGuide && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-navy flex items-center gap-2">
                  <MessageSquare className="h-6 w-6" />
                  Feedback for {selectedGuide.name}
                </DialogTitle>
                <DialogDescription>
                  View all feedback submissions for this guide
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Feedback Form Link */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <LinkIcon className="h-5 w-5" />
                      Feedback Form Link
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/${locale}/form/${generateSlug(selectedGuide.name)}`}
                        className="bg-gray-50 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyFeedbackLink(selectedGuide)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Submissions List */}
                {selectedGuide.form_submissions && selectedGuide.form_submissions.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-navy">
                      {selectedGuide.form_submissions.length} Submission{selectedGuide.form_submissions.length !== 1 ? 's' : ''}
                    </h4>
                    {selectedGuide.form_submissions
                      .slice()
                      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
                      .map((submission, idx) => (
                      <Card key={idx} className="border-l-4 border-l-brass">
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>
                              {new Date(submission.submitted_at).toLocaleDateString('nl-BE', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {submission.email && (
                              <span className="flex items-center gap-1 text-navy font-medium">
                                <Mail className="h-3 w-3" />
                                {submission.email}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-semibold text-muted-foreground">Guide Rating</Label>
                              <div className="flex items-center gap-1 mt-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-5 w-5 ${
                                      star <= submission.guide_rating
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm font-semibold text-muted-foreground">Tour Rating</Label>
                              <div className="flex items-center gap-1 mt-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-5 w-5 ${
                                      star <= submission.tour_rating
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          {submission.booking_rating && (
                            <div>
                              <Label className="text-sm font-semibold text-muted-foreground">Booking Experience</Label>
                              <div className="flex items-center gap-1 mt-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-5 w-5 ${
                                      star <= submission.booking_rating!
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {submission.found_us_source && (
                            <div>
                              <Label className="text-sm font-semibold text-muted-foreground">Found Us Via</Label>
                              <p className="text-sm mt-1 bg-blue-50 text-blue-800 px-2 py-1 rounded inline-block capitalize">
                                {submission.found_us_source}
                              </p>
                            </div>
                          )}

                          {submission.guide_feedback && (
                            <div>
                              <Label className="text-sm font-semibold text-muted-foreground">Guide Feedback</Label>
                              <p className="text-sm mt-1 bg-gray-50 p-2 rounded">{submission.guide_feedback}</p>
                            </div>
                          )}

                          {submission.tour_feedback && (
                            <div>
                              <Label className="text-sm font-semibold text-muted-foreground">Tour Feedback</Label>
                              <p className="text-sm mt-1 bg-gray-50 p-2 rounded">{submission.tour_feedback}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No feedback submissions yet</p>
                    <p className="text-sm mt-2">Share the feedback form link with customers after their tour</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button onClick={() => setFeedbackDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

