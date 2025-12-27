'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, LogOut, RefreshCw, Upload, X, Image as ImageIcon, MapPin } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Image from 'next/image';

interface CityImage {
  id: string;
  city_id: string;
  photo_url: string | null;
  created_at?: string;
  updated_at?: string;
}

interface City {
  id: string;
  name: string;
  currentPhotoUrl?: string;
  currentSketchUrl?: string;
}

const CITIES: City[] = [
  { id: 'antwerp', name: 'Antwerp' },
  { id: 'gent', name: 'Gent' },
  { id: 'bruges', name: 'Bruges' },
  { id: 'brussels', name: 'Brussels' },
  { id: 'leuven', name: 'Leuven' },
  { id: 'knokke-heist', name: 'Knokke-Heist' },
  { id: 'mechelen', name: 'Mechelen' },
  { id: 'hasselt', name: 'Hasselt' },
  { id: 'spa', name: 'Spa' },
];

const STORAGE_BUCKET = 'WebshopItemsImages';
const STORAGE_FOLDER = 'City Images';

export default function AdminCityImagesPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [cityImages, setCityImages] = useState<Record<string, CityImage>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // File states
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  const fetchCityImages = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('city_images')
        .select('*');

      if (fetchError) {
        console.error('Failed to fetch city images:', fetchError);
        setError('Failed to load city images');
        toast.error('Failed to load city images');
        return;
      }

      const imagesMap: Record<string, CityImage> = {};
      (data || []).forEach((img: CityImage) => {
        imagesMap[img.city_id] = img;
      });

      setCityImages(imagesMap);
    } catch (err) {
      console.error('Failed to fetch city images:', err);
      setError('Failed to load city images');
      toast.error('Failed to load city images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (profile?.isAdmin || profile?.is_admin)) {
      void fetchCityImages();
    }
  }, [user, profile]);

  const handleLogout = () => {
    signOut();
    router.push(`/${locale}`);
  };

  const openDialog = (city: City) => {
    setSelectedCity(city);
    const existingImage = cityImages[city.id];
    
    // Set preview from existing URL
    if (existingImage?.photo_url) {
      setPhotoPreview(existingImage.photo_url);
    } else {
      setPhotoPreview(null);
    }
    
    setPhotoFile(null);
    setDialogOpen(true);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleFileSelect(file);
      } else {
        toast.error('Please drop an image file');
      }
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadFile = async (file: File, cityId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${cityId}_${Date.now()}.${fileExt}`;
      const filePath = `${STORAGE_FOLDER}/${cityId}/${fileName}`;

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

  const handleSave = async () => {
    if (!selectedCity) return;

    setUploading(true);

    try {
      let photoUrl: string | null = null;

      // Upload photo if new file selected
      if (photoFile) {
        photoUrl = await uploadFile(photoFile, selectedCity.id);
      } else if (photoPreview && photoPreview.startsWith('http')) {
        // Keep existing URL if no new file
        photoUrl = photoPreview;
      }

      // Check if record exists
      const existingImage = cityImages[selectedCity.id];

      if (existingImage) {
        // Update existing record
        const { error } = await supabase
          .from('city_images')
          .update({ photo_url: photoUrl })
          .eq('id', existingImage.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('city_images')
          .insert({
            city_id: selectedCity.id,
            photo_url: photoUrl,
          });

        if (error) throw error;
      }

      toast.success(`Image saved for ${selectedCity.name}`);
      setDialogOpen(false);
      await fetchCityImages();
    } catch (err: any) {
      console.error('Failed to save city image:', err);
      toast.error(err.message || 'Failed to save image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (cityId: string) => {
    if (!confirm('Are you sure you want to remove the image?')) {
      return;
    }

    try {
      const existingImage = cityImages[cityId];
      if (!existingImage) return;

      const { error } = await supabase
        .from('city_images')
        .update({ photo_url: null })
        .eq('id', existingImage.id);

      if (error) throw error;

      toast.success('Image removed');
      await fetchCityImages();
    } catch (err: any) {
      console.error('Failed to remove image:', err);
      toast.error('Failed to remove image');
    }
  };

  if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">City Images Management</h1>
            <p className="mt-1 text-sm text-gray-500">Manage images for the city section on the homepage</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/${locale}/admin/dashboard`}>
              <Button variant="outline" size="sm">
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Actions Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={fetchCityImages} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-sm text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Cities Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CITIES.map((city) => {
            const cityImage = cityImages[city.id];
            const photoUrl = cityImage?.photo_url;

            return (
              <Card key={city.id} className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {city.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Photo Preview */}
                    <div>
                      <Label className="mb-2 block text-sm font-medium">City Photo</Label>
                      {photoUrl ? (
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                          <Image
                            src={photoUrl}
                            alt={`${city.name} photo`}
                            fill
                            className="object-cover"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute right-2 top-2"
                            onClick={() => handleRemoveImage(city.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex aspect-video w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                          <ImageIcon className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => openDialog(city)}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {photoUrl ? 'Update Image' : 'Upload Image'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Upload Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Images for {selectedCity?.name}</DialogTitle>
              <DialogDescription>
                Upload or update the photo image for this city
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Photo Upload */}
              <div className="space-y-2">
                <Label>City Photo</Label>
                <div
                  className={`relative rounded-lg border-2 border-dashed p-6 transition-colors ${
                    dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {photoPreview ? (
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                      <Image
                        src={photoPreview}
                        alt="Photo preview"
                        fill
                        className="object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute right-2 top-2"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <Upload className="h-12 w-12 text-gray-400" />
                      <div className="text-center">
                        <p className="text-sm text-gray-600">
                          Drag and drop an image here, or click to select
                        </p>
                        <p className="mt-1 text-xs text-gray-500">PNG, JPG, WEBP up to 50MB</p>
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileInput}
                        className="hidden"
                        id="photo-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('photo-upload')?.click()}
                      >
                        Select Photo
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Save Image'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

