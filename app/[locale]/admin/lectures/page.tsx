'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Home, LogOut, RefreshCw, Plus, Pencil, Trash2, BookOpen, X, Search, ArrowUp, ArrowDown, Image as ImageIcon, Upload, Trash2 as TrashIcon, Calendar as CalendarIcon, Mail, Phone, Users, MapPin, Building, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Image from 'next/image';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Lecture, LectureImage, LectureBooking } from '@/lib/data/types';

export default function AdminLecturesPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Bookings state
  const [bookings, setBookings] = useState<LectureBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<LectureBooking | null>(null);
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');
  const [bookingFilterStatus, setBookingFilterStatus] = useState<string>('all');


  // Form state
  const [formData, setFormData] = useState({
    title: '',
    title_en: '',
    date: '',
    date_en: '',
    location: '',
    location_en: '',
    group_size: '',
    group_size_en: '',
    description1: '',
    description1_en: '',
    description2: '',
    description2_en: '',
    description: '',
    description_en: '',
    display_order: '',
  });

  // Image upload state
  const [lectureImages, setLectureImages] = useState<LectureImage[]>([]);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const STORAGE_BUCKET = 'airbnb-images'; // Use airbnb-images bucket
  const STORAGE_FOLDER = 'Lecture Images'; // Folder within the bucket
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  const fetchLectures = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('lectures')
        .select('*')
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('Failed to fetch lectures:', fetchError);
        setError('Failed to load lectures');
        return;
      }

      // Parse lecture_images JSONB column and map to Lecture type
      const lectures: Lecture[] = (data || []).map((row: any) => {
        // Parse lecture_images JSONB column
        let lectureImages: LectureImage[] = [];
        if (row.lecture_images && Array.isArray(row.lecture_images)) {
          lectureImages = row.lecture_images.map((img: any, index: number) => ({
            id: img.id || `${row.id}-${index}`,
            lecture_id: row.id,
            image_url: img.image_url || img.url || '',
            is_primary: img.is_primary || false,
            sort_order: img.sort_order !== undefined ? img.sort_order : index,
            storage_folder_name: img.storage_folder_name || undefined,
            created_at: img.created_at,
            updated_at: img.updated_at,
          })).sort((a: LectureImage, b: LectureImage) => a.sort_order - b.sort_order);
        }

        return {
          id: row.id,
          title: row.title || '',
          title_en: row.title_en || undefined,
          date: row.date || undefined,
          date_en: row.date_en || undefined,
          location: row.location || undefined,
          location_en: row.location_en || undefined,
          group_size: row.group_size || undefined,
          group_size_en: row.group_size_en || undefined,
          description1: row.description1 || undefined,
          description1_en: row.description1_en || undefined,
          description2: row.description2 || undefined,
          description2_en: row.description2_en || undefined,
          description: row.description || undefined,
          description_en: row.description_en || undefined,
          image: row.image_url || undefined,
          lectureImages: lectureImages.length > 0 ? lectureImages : undefined,
          display_order: row.display_order !== null && row.display_order !== undefined ? Number(row.display_order) : undefined,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      });

      setLectures(lectures);
    } catch (err) {
      console.error('Failed to fetch lectures:', err);
      setError('Failed to load lectures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (profile?.isAdmin || profile?.is_admin)) {
      void fetchLectures();
      void fetchBookings();
    }
  }, [user, profile]);

  const fetchBookings = async () => {
    setBookingsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('lecture_bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Failed to fetch bookings:', fetchError);
        return;
      }

      setBookings((data as LectureBooking[]) || []);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setBookingsLoading(false);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: number, newStatus: 'pending' | 'confirmed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('lecture_bookings')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) throw error;
      toast.success('Booking status updated');
      void fetchBookings();
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, status: newStatus });
      }
    } catch (err) {
      console.error('Failed to update booking status:', err);
      toast.error('Failed to update booking status');
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const searchLower = bookingSearchQuery.toLowerCase();
      const matchesSearch =
        !bookingSearchQuery ||
        booking.name.toLowerCase().includes(searchLower) ||
        (booking.email && booking.email.toLowerCase().includes(searchLower)) ||
        (booking.phone && booking.phone.toLowerCase().includes(searchLower)) ||
        (booking.location_description && booking.location_description.toLowerCase().includes(searchLower));

      const matchesStatus = bookingFilterStatus === 'all' || booking.status === bookingFilterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [bookings, bookingSearchQuery, bookingFilterStatus]);

  const handleLogout = () => {
    signOut();
    router.push(`/${locale}`);
  };

  const openAddDialog = () => {
    setEditingLecture(null);
    setFormData({
      title: '',
      title_en: '',
      date: '',
      date_en: '',
      location: '',
      location_en: '',
      group_size: '',
      group_size_en: '',
      description1: '',
      description1_en: '',
      description2: '',
      description2_en: '',
      description: '',
      description_en: '',
      display_order: '',
    });
    setLectureImages([]);
    setUploadFiles([]);
    setUploadPreviews([]);
    setDialogOpen(true);
  };

  const openEditDialog = (lecture: Lecture) => {
    setEditingLecture(lecture);
    setFormData({
      title: lecture.title || '',
      title_en: lecture.title_en || '',
      date: lecture.date || '',
      date_en: lecture.date_en || '',
      location: lecture.location || '',
      location_en: lecture.location_en || '',
      group_size: lecture.group_size || '',
      group_size_en: lecture.group_size_en || '',
      description1: lecture.description1 || '',
      description1_en: lecture.description1_en || '',
      description2: lecture.description2 || '',
      description2_en: lecture.description2_en || '',
      description: lecture.description || '',
      description_en: lecture.description_en || '',
      display_order: lecture.display_order?.toString() || '',
    });
    setLectureImages(lecture.lectureImages || []);
    setUploadFiles([]);
    setUploadPreviews([]);
    setDialogOpen(true);
  };

  const uploadFilesToStorage = async (files: File[], lectureId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${STORAGE_FOLDER}/${lectureId}/${fileName}`;

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

        uploadedUrls.push(data.publicUrl);
      } catch (err) {
        console.error('Failed to upload file:', err);
        throw err;
      }
    }

    return uploadedUrls;
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(file =>
        file.type.startsWith('image/') && file.size <= MAX_FILE_SIZE
      );

      if (files.length === 0) {
        toast.error('Please select valid image files (max 50MB each)');
        return;
      }

      setUploadFiles(prev => [...prev, ...files]);

      // Create previews
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setUploadPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeUploadFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
    setUploadPreviews(prev => {
      const newPreviews = prev.filter((_, i) => i !== index);
      // Revoke object URL if it's a blob URL
      if (prev[index]?.startsWith('blob:')) {
        URL.revokeObjectURL(prev[index]);
      }
      return newPreviews;
    });
  };

  const handleSetPrimaryImage = async (imageId: string) => {
    if (!editingLecture) return;

    const updatedImages = lectureImages.map(img => ({
      ...img,
      is_primary: img.id === imageId,
    }));

    setLectureImages(updatedImages);

    // Update image_url column in lectures table with primary image URL
    const primaryImage = updatedImages.find(img => img.is_primary);
    if (primaryImage && editingLecture.id) {
      try {
        const { error } = await supabase
          .from('lectures')
          .update({ image_url: primaryImage.image_url, updated_at: new Date().toISOString() })
          .eq('id', editingLecture.id);

        if (error) {
          console.error('Failed to update image_url:', error);
          toast.error('Failed to update primary image URL');
        }
      } catch (err) {
        console.error('Failed to update image_url:', err);
      }
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!editingLecture || !confirm('Are you sure you want to delete this image?')) return;

    const updatedImages = lectureImages.filter(img => img.id !== imageId);
    setLectureImages(updatedImages);
  };

  const handleReorderImage = async (imageId: string, direction: 'up' | 'down') => {
    const currentIndex = lectureImages.findIndex(img => img.id === imageId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= lectureImages.length) return;

    const updatedImages = [...lectureImages];
    [updatedImages[currentIndex], updatedImages[newIndex]] = [updatedImages[newIndex], updatedImages[currentIndex]];

    // Update sort_order
    updatedImages.forEach((img, idx) => {
      img.sort_order = idx;
    });

    setLectureImages(updatedImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let lectureId = editingLecture?.id;

      // If creating new lecture, we need to create it first to get the ID
      if (!editingLecture) {
        const payload: any = {
          title: formData.title,
          title_en: formData.title_en || null,
          date: formData.date || null,
          date_en: formData.date_en || null,
          location: formData.location || null,
          location_en: formData.location_en || null,
          group_size: formData.group_size || null,
          group_size_en: formData.group_size_en || null,
          description1: formData.description1 || null,
          description1_en: formData.description1_en || null,
          description2: formData.description2 || null,
          description2_en: formData.description2_en || null,
          description: formData.description || null,
          description_en: formData.description_en || null,
          display_order: formData.display_order ? parseInt(formData.display_order, 10) : null,
          lecture_images: [],
        };

        const { data, error } = await supabase
          .from('lectures')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        lectureId = data.id;
        toast.success('Lecture created successfully');
      }

      // Upload new images if any
      let allImages = [...lectureImages]; // Start with existing images

      if (uploadFiles.length > 0 && lectureId) {
        setUploadingImages(true);
        try {
          // TypeScript: validate lectureId before using it
          if (!lectureId) {
            throw new Error('lectureId is required to upload lecture images');
          }

          // Assign to const to ensure TypeScript narrows the type
          const validLectureId: string = lectureId;
          const uploadedUrls = await uploadFilesToStorage(uploadFiles, validLectureId);

          const newImages: LectureImage[] = uploadedUrls.map((url, index) => ({
            id: `${validLectureId}-new-${Date.now()}-${index}`,
            lecture_id: validLectureId, // now guaranteed to be string
            image_url: url,
            is_primary: allImages.length === 0 && index === 0, // First image is primary if no existing images
            sort_order: allImages.length + index,
            storage_folder_name: `${STORAGE_FOLDER}/${validLectureId}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

          // Combine existing images with new images
          allImages = [...allImages, ...newImages];
          setLectureImages(allImages);

          setUploadFiles([]);
          setUploadPreviews([]);
        } catch (err) {
          console.error('Failed to upload images:', err);
          toast.error('Failed to upload some images');
          setUploadingImages(false);
          setSubmitting(false);
          return; // Exit early if image upload fails
        } finally {
          setUploadingImages(false);
        }
      }

      // Ensure at least one image is marked as primary if images exist
      if (allImages.length > 0) {
        const hasPrimary = allImages.some(img => img.is_primary);
        if (!hasPrimary) {
          allImages[0].is_primary = true;
        }
      }

      // Get primary image URL for image_url column
      const primaryImage = allImages.find(img => img.is_primary) || allImages[0];
      const primaryImageUrl = primaryImage?.image_url || null;

      // Update lecture with all data including images
      const payload: any = {
        title: formData.title,
        title_en: formData.title_en || null,
        date: formData.date || null,
        date_en: formData.date_en || null,
        location: formData.location || null,
        location_en: formData.location_en || null,
        group_size: formData.group_size || null,
        group_size_en: formData.group_size_en || null,
        description1: formData.description1 || null,
        description1_en: formData.description1_en || null,
        description2: formData.description2 || null,
        description2_en: formData.description2_en || null,
        description: formData.description || null,
        description_en: formData.description_en || null,
        display_order: formData.display_order ? parseInt(formData.display_order, 10) : null,
        image_url: primaryImageUrl, // Store primary image URL in image_url column
        lecture_images: allImages.length > 0 ? allImages.map((img, idx) => ({
          id: img.id,
          image_url: img.image_url,
          is_primary: img.is_primary,
          sort_order: img.sort_order !== undefined ? img.sort_order : idx,
          storage_folder_name: img.storage_folder_name,
          created_at: img.created_at,
          updated_at: img.updated_at,
        })) : [],
        updated_at: new Date().toISOString(),
      };

      if (editingLecture && lectureId) {
        const { error } = await supabase
          .from('lectures')
          .update(payload)
          .eq('id', lectureId);

        if (error) throw error;
        toast.success('Lecture updated successfully');

        // Update local state to reflect saved images
        setLectureImages(allImages);
      }

      setDialogOpen(false);
      void fetchLectures();
    } catch (err) {
      console.error('Failed to save lecture:', err);
      toast.error('Failed to save lecture');
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  const handleDelete = async (lecture: Lecture) => {
    if (!confirm(`Are you sure you want to delete "${lecture.title}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('lectures')
        .delete()
        .eq('id', lecture.id);

      if (error) throw error;
      toast.success('Lecture deleted successfully');
      void fetchLectures();
    } catch (err) {
      console.error('Failed to delete lecture:', err);
      toast.error('Failed to delete lecture');
    }
  };

  const handleReorder = async (lectureId: string, direction: 'up' | 'down') => {
    const currentIndex = lectures.findIndex((l) => l.id === lectureId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= lectures.length) return;

    try {
      // Get current display orders
      const current = lectures[currentIndex];
      const target = lectures[newIndex];

      // Swap display orders
      const currentOrder = current.display_order ?? currentIndex;
      const targetOrder = target.display_order ?? newIndex;

      // Update both lectures
      const { error: error1 } = await supabase
        .from('lectures')
        .update({ display_order: targetOrder, updated_at: new Date().toISOString() })
        .eq('id', current.id);

      if (error1) throw error1;

      const { error: error2 } = await supabase
        .from('lectures')
        .update({ display_order: currentOrder, updated_at: new Date().toISOString() })
        .eq('id', target.id);

      if (error2) throw error2;

      toast.success('Lecture order updated');
      void fetchLectures();
    } catch (err) {
      console.error('Failed to reorder lecture:', err);
      toast.error('Failed to reorder lecture');
    }
  };

  // Filter lectures by search query
  const filteredLectures = useMemo(() => {
    if (!searchQuery) return lectures;
    const query = searchQuery.toLowerCase();
    return lectures.filter(
      (lecture) =>
        lecture.title.toLowerCase().includes(query) ||
        lecture.location?.toLowerCase().includes(query) ||
        lecture.description?.toLowerCase().includes(query)
    );
  }, [lectures, searchQuery]);


  if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-sand">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-serif font-bold text-navy">Lectures Management</h1>
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
                  <BookOpen className="h-5 w-5" />
                  All Lectures
                </CardTitle>
                <CardDescription>
                  Manage lectures. Content supports Dutch and English.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchLectures()}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button onClick={openAddDialog} className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lecture
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

            {/* Search */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search lectures by title, location, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>
                {searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>

              {searchQuery && (
                <div className="text-sm text-muted-foreground">
                  Showing {filteredLectures.length} of {lectures.length} lectures
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredLectures.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {lectures.length === 0 ? 'No lectures found' : 'No lectures match your search'}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLectures.map((lecture, index) => (
                  <Card key={lecture.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-navy">{lecture.title}</h3>
                            {lecture.display_order !== null && lecture.display_order !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                Order: {lecture.display_order}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {lecture.date && (
                              <div>
                                <span className="font-medium">Date: </span>
                                {lecture.date}
                              </div>
                            )}
                            {lecture.location && (
                              <div>
                                <span className="font-medium">Location: </span>
                                {lecture.location}
                              </div>
                            )}
                            {lecture.group_size && (
                              <div>
                                <span className="font-medium">Group Size: </span>
                                {lecture.group_size}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReorder(lecture.id, 'up')}
                            disabled={index === 0}
                            title="Move up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReorder(lecture.id, 'down')}
                            disabled={index === filteredLectures.length - 1}
                            title="Move down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(lecture)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(lecture)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit/Create Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLecture ? 'Edit Lecture' : 'Create New Lecture'}</DialogTitle>
              <DialogDescription>
                Fill in Dutch and English content. Leave fields empty if not applicable.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                {/* Title - Dutch and English */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="title">
                      Title (Dutch) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="title_en">Title (English)</Label>
                    <Input
                      id="title_en"
                      value={formData.title_en}
                      onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Date - Dutch and English */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="date">Date (Dutch)</Label>
                    <Input
                      id="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      placeholder="e.g., Op aanvraag"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date_en">Date (English)</Label>
                    <Input
                      id="date_en"
                      value={formData.date_en}
                      onChange={(e) => setFormData({ ...formData, date_en: e.target.value })}
                      placeholder="e.g., On request"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Location - Dutch and English */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="location">Location (Dutch)</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Antwerpen"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location_en">Location (English)</Label>
                    <Input
                      id="location_en"
                      value={formData.location_en}
                      onChange={(e) => setFormData({ ...formData, location_en: e.target.value })}
                      placeholder="e.g., Antwerp"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Group Size - Dutch and English */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="group_size">Group Size (Dutch)</Label>
                    <Input
                      id="group_size"
                      value={formData.group_size}
                      onChange={(e) => setFormData({ ...formData, group_size: e.target.value })}
                      placeholder="e.g., 10-50 personen"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="group_size_en">Group Size (English)</Label>
                    <Input
                      id="group_size_en"
                      value={formData.group_size_en}
                      onChange={(e) => setFormData({ ...formData, group_size_en: e.target.value })}
                      placeholder="e.g., 10-50 people"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Description 1 - Dutch and English */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="description1">Description 1 (Dutch)</Label>
                    <Textarea
                      id="description1"
                      value={formData.description1}
                      onChange={(e) => setFormData({ ...formData, description1: e.target.value })}
                      rows={4}
                      className="mt-1"
                      placeholder="First description paragraph"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description1_en">Description 1 (English)</Label>
                    <Textarea
                      id="description1_en"
                      value={formData.description1_en}
                      onChange={(e) => setFormData({ ...formData, description1_en: e.target.value })}
                      rows={4}
                      className="mt-1"
                      placeholder="First description paragraph"
                    />
                  </div>
                </div>

                {/* Description 2 - Dutch and English */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="description2">Description 2 (Dutch)</Label>
                    <Textarea
                      id="description2"
                      value={formData.description2}
                      onChange={(e) => setFormData({ ...formData, description2: e.target.value })}
                      rows={4}
                      className="mt-1"
                      placeholder="Second description paragraph"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description2_en">Description 2 (English)</Label>
                    <Textarea
                      id="description2_en"
                      value={formData.description2_en}
                      onChange={(e) => setFormData({ ...formData, description2_en: e.target.value })}
                      rows={4}
                      className="mt-1"
                      placeholder="Second description paragraph"
                    />
                  </div>
                </div>

                {/* Full Description - Dutch and English */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="description">Full Description (Dutch)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={6}
                      className="mt-1"
                      placeholder="Full description (for expanded view)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description_en">Full Description (English)</Label>
                    <Textarea
                      id="description_en"
                      value={formData.description_en}
                      onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                      rows={6}
                      className="mt-1"
                      placeholder="Full description (for expanded view)"
                    />
                  </div>
                </div>

                {/* Display Order */}
                <div>
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                    placeholder="Lower numbers appear first (leave empty for default)"
                    className="mt-1"
                  />
                </div>

                {/* Image Upload Section */}
                <div className="border-t pt-4">
                  <Label className="text-base font-semibold">Images</Label>

                  {/* Upload Area */}
                  <div className="mt-2">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 50MB</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleFileInput}
                      />
                    </label>
                  </div>

                  {/* Upload Previews */}
                  {uploadPreviews.length > 0 && (
                    <div className="mt-4">
                      <Label>New Images to Upload</Label>
                      <div className="grid grid-cols-4 gap-4 mt-2">
                        {uploadPreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            <div className="aspect-square relative rounded-lg overflow-hidden border">
                              <Image
                                src={preview}
                                alt={`Preview ${index + 1}`}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                              onClick={() => removeUploadFile(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Existing Images */}
                  {lectureImages.length > 0 && (
                    <div className="mt-4">
                      <Label>Existing Images</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                        {lectureImages.map((image, index) => (
                          <div key={image.id} className="space-y-2">
                            <div className="relative aspect-square rounded-lg overflow-hidden border-2" style={{ borderColor: image.is_primary ? '#1BDD95' : '#e5e7eb' }}>
                              <Image
                                src={image.image_url}
                                alt={`Image ${index + 1}`}
                                fill
                                className="object-cover"
                              />
                              {image.is_primary && (
                                <div className="absolute top-2 left-2 bg-[#1BDD95] text-white text-xs px-2 py-1 rounded font-semibold">
                                  Primary
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 justify-center">
                              <Button
                                type="button"
                                variant={image.is_primary ? "default" : "secondary"}
                                size="sm"
                                className="text-xs h-7 px-2"
                                onClick={() => handleSetPrimaryImage(image.id)}
                                disabled={image.is_primary}
                                title="Set as primary image"
                              >
                                {image.is_primary ? 'Primary' : 'Set Primary'}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 px-2"
                                onClick={() => handleReorderImage(image.id, 'up')}
                                disabled={index === 0}
                                title="Move up"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 px-2"
                                onClick={() => handleReorderImage(image.id, 'down')}
                                disabled={index === lectureImages.length - 1}
                                title="Move down"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="text-xs h-7 px-2"
                                onClick={() => handleDeleteImage(image.id)}
                                title="Delete image"
                              >
                                <TrashIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Saving...' : editingLecture ? 'Update Lecture' : 'Create Lecture'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bookings Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Lecture Bookings
                </CardTitle>
                <CardDescription>
                  View and manage all lecture booking submissions
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchBookings()}
                  disabled={bookingsLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${bookingsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, phone, or location..."
                    value={bookingSearchQuery}
                    onChange={(e) => setBookingSearchQuery(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <Select value={bookingFilterStatus} onValueChange={setBookingFilterStatus}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(bookingSearchQuery || bookingFilterStatus !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBookingSearchQuery('');
                      setBookingFilterStatus('all');
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>

              {(bookingSearchQuery || bookingFilterStatus !== 'all') && (
                <div className="text-sm text-muted-foreground">
                  Showing {filteredBookings.length} of {bookings.length} bookings
                </div>
              )}
            </div>

            {bookingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {bookings.length === 0 ? 'No bookings found' : 'No bookings match your filters'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 bg-white border rounded-lg hover:bg-gray-50 hover:border-primary transition-colors"
                  >
                    <div
                      onClick={() => {
                        setSelectedBooking(booking);
                        setBookingDetailOpen(true);
                      }}
                      className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="font-medium text-lg truncate">{booking.name}</div>
                      <div className="text-sm text-muted-foreground truncate hidden sm:block">
                        {booking.email || booking.phone || '-'}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs flex-shrink-0 ${
                          booking.status === 'confirmed'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : booking.status === 'cancelled'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}
                      >
                        {booking.status}
                      </Badge>
                      {booking.preferred_date && (
                        <div className="text-xs text-muted-foreground flex-shrink-0 hidden md:block">
                          {format(new Date(booking.preferred_date), 'MMM d, yyyy')}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                        {booking.created_at && format(new Date(booking.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking Detail Dialog */}
        <Dialog open={bookingDetailOpen} onOpenChange={setBookingDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Booking Details - {selectedBooking?.name}</DialogTitle>
              <DialogDescription>
                Complete booking information
              </DialogDescription>
            </DialogHeader>

            {selectedBooking && (
              <div className="space-y-6 mt-4">
                {/* Status Update */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Status</label>
                    <div className="mt-2">
                      <Badge
                        variant="outline"
                        className={`text-sm ${
                          selectedBooking.status === 'confirmed'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : selectedBooking.status === 'cancelled'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}
                      >
                        {selectedBooking.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={selectedBooking.status === 'pending' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleUpdateBookingStatus(selectedBooking.id!, 'pending')}
                    >
                      Pending
                    </Button>
                    <Button
                      variant={selectedBooking.status === 'confirmed' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleUpdateBookingStatus(selectedBooking.id!, 'confirmed')}
                    >
                      Confirm
                    </Button>
                    <Button
                      variant={selectedBooking.status === 'cancelled' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleUpdateBookingStatus(selectedBooking.id!, 'cancelled')}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Name
                    </label>
                    <p className="text-base font-medium mt-1">{selectedBooking.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </label>
                    <p className="text-base mt-1">{selectedBooking.email || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone
                    </label>
                    <p className="text-base mt-1">{selectedBooking.phone || '-'}</p>
                  </div>
                  {selectedBooking.preferred_date && (
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        Preferred Date
                      </label>
                      <p className="text-base mt-1">{format(new Date(selectedBooking.preferred_date), 'MMMM d, yyyy')}</p>
                    </div>
                  )}
                  {selectedBooking.number_of_people && (
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Number of People
                      </label>
                      <p className="text-base mt-1">{selectedBooking.number_of_people}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Needs Room Provided
                    </label>
                    <p className="text-base mt-1">
                      {selectedBooking.needs_room_provided ? 'Yes' : 'No'}
                    </p>
                  </div>
                  {selectedBooking.lecture_language && (
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Lecture Language
                      </label>
                      <p className="text-base mt-1">
                        {selectedBooking.lecture_language === 'nl' ? 'Nederlands' : 'English'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Location Description */}
                {selectedBooking.location_description && (
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4" />
                      Location Description
                    </label>
                    <div className="rounded-lg border p-4 bg-gray-50">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {selectedBooking.location_description}
                      </p>
                    </div>
                  </div>
                )}


                {/* Timestamps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Created At</label>
                    <p className="text-sm mt-1">
                      {selectedBooking.created_at && format(new Date(selectedBooking.created_at), 'MMMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Updated At</label>
                    <p className="text-sm mt-1">
                      {selectedBooking.updated_at && format(new Date(selectedBooking.updated_at), 'MMMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
