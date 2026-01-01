'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, LogOut, RefreshCw, Plus, Pencil, Trash2, Newspaper, X, Search, Image as ImageIcon, Upload, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Image from 'next/image';
import type { Press } from '@/lib/data/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function AdminPressPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [pressItems, setPressItems] = useState<Press[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPress, setEditingPress] = useState<Press | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Form state
  const [formData, setFormData] = useState({
    article_url: '',
    display_order: '',
  });

  // Image upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const STORAGE_BUCKET = 'WebshopItemsImages';
  const STORAGE_FOLDER = 'PressImages';
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  const fetchPressItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('press')
        .select('*')
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('Failed to fetch press items:', fetchError);
        setError('Failed to load press items');
        return;
      }

      const items: Press[] = (data || []).map((row: any) => ({
        id: row.id,
        image_url: row.image_url || '',
        article_url: row.article_url || '',
        display_order: row.display_order !== null && row.display_order !== undefined ? Number(row.display_order) : undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      setPressItems(items);
    } catch (err) {
      console.error('Failed to fetch press items:', err);
      setError('Failed to load press items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (profile?.isAdmin || profile?.is_admin)) {
      void fetchPressItems();
    }
  }, [user, profile]);

  const handleLogout = () => {
    signOut();
    router.push(`/${locale}`);
  };

  const openAddDialog = () => {
    setEditingPress(null);
    setFormData({
      article_url: '',
      display_order: '',
    });
    setUploadFile(null);
    setUploadPreview(null);
    setDialogOpen(true);
  };

  const openEditDialog = (press: Press) => {
    setEditingPress(press);
    setFormData({
      article_url: press.article_url || '',
      display_order: press.display_order?.toString() || '',
    });
    setUploadFile(null);
    setUploadPreview(null);
    setDialogOpen(true);
  };

  const uploadFileToStorage = async (file: File, pressId: string): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${STORAGE_FOLDER}/${pressId}/${fileName}`;

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

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        return;
      }

      setUploadFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please drop a valid image file');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        return;
      }

      setUploadFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeUploadFile = () => {
    setUploadFile(null);
    if (uploadPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(uploadPreview);
    }
    setUploadPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate article URL
      if (!formData.article_url) {
        toast.error('Article URL is required');
        setSubmitting(false);
        return;
      }

      // Basic URL validation
      try {
        new URL(formData.article_url);
      } catch {
        toast.error('Please enter a valid URL');
        setSubmitting(false);
        return;
      }

      let pressId = editingPress?.id;
      let imageUrl = editingPress?.image_url || '';

      // If creating new press item, we need to create it first to get the ID
      if (!editingPress) {
        // For new items, image is required
        if (!uploadFile) {
          toast.error('Please upload an image');
          setSubmitting(false);
          return;
        }

        // Generate a temporary ID for the folder
        pressId = crypto.randomUUID();

        // Upload image first
        setUploadingImage(true);
        try {
          imageUrl = await uploadFileToStorage(uploadFile, pressId);
        } catch (err) {
          console.error('Failed to upload image:', err);
          toast.error('Failed to upload image');
          setSubmitting(false);
          setUploadingImage(false);
          return;
        }
        setUploadingImage(false);

        const payload: any = {
          id: pressId,
          image_url: imageUrl,
          article_url: formData.article_url,
          display_order: formData.display_order ? parseInt(formData.display_order, 10) : null,
        };

        const { data, error } = await supabase
          .from('press')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        toast.success('Press item created successfully');
      } else {
        // Updating existing press item
        let updatedImageUrl = imageUrl;

        // If a new image was uploaded, replace the old one
        if (uploadFile && pressId) {
          setUploadingImage(true);
          try {
            updatedImageUrl = await uploadFileToStorage(uploadFile, pressId);
          } catch (err) {
            console.error('Failed to upload image:', err);
            toast.error('Failed to upload image');
            setSubmitting(false);
            setUploadingImage(false);
            return;
          }
          setUploadingImage(false);
        }

        const payload: any = {
          image_url: updatedImageUrl,
          article_url: formData.article_url,
          display_order: formData.display_order ? parseInt(formData.display_order, 10) : null,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('press')
          .update(payload)
          .eq('id', pressId);

        if (error) throw error;
        toast.success('Press item updated successfully');
      }

      setDialogOpen(false);
      setUploadFile(null);
      setUploadPreview(null);
      void fetchPressItems();
    } catch (err: any) {
      console.error('Failed to save press item:', err);
      toast.error(err.message || 'Failed to save press item');
    } finally {
      setSubmitting(false);
      setUploadingImage(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this press item?')) return;

    try {
      const { error } = await supabase
        .from('press')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Press item deleted successfully');
      void fetchPressItems();
    } catch (err) {
      console.error('Failed to delete press item:', err);
      toast.error('Failed to delete press item');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = pressItems.findIndex((item) => item.id === active.id);
    const newIndex = pressItems.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Reorder items in state
    const reorderedItems = arrayMove(pressItems, oldIndex, newIndex);
    setPressItems(reorderedItems);

    // Update display_order in database sequentially
    try {
      const updates = reorderedItems.map((item, index) => ({
        id: item.id,
        display_order: index + 1,
      }));

      // Update all items in sequence
      for (const update of updates) {
        await supabase
          .from('press')
          .update({ display_order: update.display_order, updated_at: new Date().toISOString() })
          .eq('id', update.id);
      }

      toast.success('Press items reordered successfully');
    } catch (err) {
      console.error('Failed to reorder press items:', err);
      toast.error('Failed to reorder press items');
      // Revert on error
      void fetchPressItems();
    }
  };

  const filteredPressItems = useMemo(() => {
    if (!searchQuery) return pressItems;
    const searchLower = searchQuery.toLowerCase();
    return pressItems.filter((item) =>
      item.article_url.toLowerCase().includes(searchLower)
    );
  }, [pressItems, searchQuery]);

  // Sortable Press Item Component
  const SortablePressItem = ({ item }: { item: Press }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: item.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <Card
        ref={setNodeRef}
        style={style}
        className={`hover:shadow-lg transition-shadow ${isDragging ? 'bg-gray-100' : ''}`}
      >
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">Press Item</CardTitle>
            <div className="flex items-center gap-2">
              {item.display_order !== undefined && (
                <span className="text-sm text-gray-500">Order: {item.display_order}</span>
              )}
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"
              >
                <GripVertical className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            {item.image_url && (
              <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden mb-4">
                <Image
                  src={item.image_url}
                  alt="Press logo"
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <div className="text-sm">
              <p className="text-gray-600 break-all">
                <strong>URL:</strong>{' '}
                <a
                  href={item.article_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {item.article_url}
                </a>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditDialog(item)}
              className="flex-1"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(item.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading press items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-serif font-bold text-navy">Press Management</h1>
          <div className="flex items-center gap-4">
            <Link href={`/${locale}/admin/dashboard`}>
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by article URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button onClick={openAddDialog} className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Press Item
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {filteredPressItems.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Newspaper className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">
                {searchQuery ? 'No press items found matching your search.' : 'No press items yet. Add your first one!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredPressItems.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPressItems.map((item) => (
                  <SortablePressItem key={item.id} item={item} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPress ? 'Edit Press Item' : 'Add Press Item'}
            </DialogTitle>
            <DialogDescription>
              {editingPress ? 'Update the press item details.' : 'Add a new press item with an image and article URL.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Image {!editingPress && '(Required)'}</Label>
              {uploadPreview || editingPress?.image_url ? (
                <div className="relative">
                  <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                    <Image
                      src={uploadPreview || editingPress?.image_url || ''}
                      alt="Preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removeUploadFile}
                    className="mt-2"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove Image
                  </Button>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop an image here, or click to select
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    PNG, JPG, WEBP up to 50MB
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                    id="image-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              )}
            </div>

            {/* Article URL */}
            <div className="space-y-2">
              <Label htmlFor="article_url">Article URL *</Label>
              <Input
                id="article_url"
                type="url"
                value={formData.article_url}
                onChange={(e) => setFormData({ ...formData, article_url: e.target.value })}
                placeholder="https://example.com/article"
                required
              />
            </div>

            {/* Display Order */}
            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order (optional)</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                placeholder="Lower numbers appear first"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting || uploadingImage}
              >
                Cancel
              </Button>
              <Button type="submit" className="btn-primary" disabled={submitting || uploadingImage}>
                {submitting || uploadingImage ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {uploadingImage ? 'Uploading...' : 'Saving...'}
                  </>
                ) : (
                  editingPress ? 'Update' : 'Create'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

