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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Home, LogOut, RefreshCw, Plus, Pencil, Trash2, X, Upload, Image as ImageIcon, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Image from 'next/image';

interface CityData {
  id: string;
  slug: string;
  name_nl: string | null;
  name_en: string | null;
  name_fr: string | null;
  name_de: string | null;
}

interface AirBNB {
  id: string;
  url: string;
  price: number | null;
  title: string;
  image_url: string | null;
  city: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface AirBNBFormData {
  url: string;
  price: string;
  title: string;
  image_url: string;
  city: string;
}

const STORAGE_BUCKET = 'airbnb-images';

export default function AdminAirBNBPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [airbnbs, setAirbnbs] = useState<AirBNB[]>([]);
  const [cities, setCities] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAirBNB, setEditingAirBNB] = useState<AirBNB | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState<AirBNBFormData>({
    url: '',
    price: '',
    title: '',
    image_url: '',
    city: '',
  });

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  useEffect(() => {
    if (user && (profile?.isAdmin || profile?.is_admin)) {
      fetchAirBNBs();
      fetchCities();
    }
  }, [user, profile]);

  const fetchAirBNBs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('airbnb')
        .select('*')
        .order('city', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setAirbnbs((data || []) as AirBNB[]);
      
      // Expand all cities by default
      const cityKeys = new Set((data || []).map((a: any) => a.city).filter(Boolean));
      setExpandedCities(cityKeys);
    } catch (err: any) {
      console.error('Failed to fetch AirBNB listings:', err);
      setError(err.message || 'Failed to fetch AirBNB listings');
      toast.error('Failed to fetch AirBNB listings');
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('cities')
        .select('*')
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('slug', { ascending: true });

      if (fetchError) {
        console.error('Failed to fetch cities:', fetchError);
        return;
      }

      setCities((data || []) as CityData[]);
    } catch (err) {
      console.error('Failed to fetch cities:', err);
    }
  };

  const openAddDialog = () => {
    setEditingAirBNB(null);
    setFormData({
      url: '',
      price: '',
      title: '',
      image_url: '',
      city: '',
    });
    setImageFile(null);
    setImagePreview(null);
    setDialogOpen(true);
  };

  const openEditDialog = (airbnb: AirBNB) => {
    setEditingAirBNB(airbnb);
    setFormData({
      url: airbnb.url || '',
      price: airbnb.price?.toString() || '',
      title: airbnb.title || '',
      image_url: airbnb.image_url || '',
      city: airbnb.city || '',
    });
    setImageFile(null);
    setImagePreview(airbnb.image_url || null);
    setDialogOpen(true);
  };

  const toggleCity = (city: string) => {
    setExpandedCities(prev => {
      const next = new Set(prev);
      if (next.has(city)) {
        next.delete(city);
      } else {
        next.add(city);
      }
      return next;
    });
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Image file size must be less than 50MB');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImageFile = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  const uploadImageFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `airbnb_${Date.now()}.${fileExt}`;
      const filePath = fileName;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setUploading(true);

    try {
      let imageUrl: string | null = formData.image_url || null;

      // Upload new image if provided
      if (imageFile) {
        try {
          const uploadedUrl = await uploadImageFile(imageFile);
          if (uploadedUrl) {
            imageUrl = uploadedUrl;
          }
        } catch (err: any) {
          toast.error('Failed to upload image. Please try again.');
          setUploading(false);
          setSubmitting(false);
          return;
        }
      }

      const payload: Partial<AirBNB> = {
        url: formData.url,
        price: formData.price ? parseFloat(formData.price) : null,
        title: formData.title,
        image_url: imageUrl || null,
        city: formData.city || null,
      };

      if (editingAirBNB) {
        // Update existing AirBNB
        const { error: updateError } = await supabase
          .from('airbnb')
          .update(payload)
          .eq('id', editingAirBNB.id);

        if (updateError) throw updateError;

        toast.success('AirBNB listing updated successfully');
      } else {
        // Create new AirBNB
        const { error: insertError } = await supabase
          .from('airbnb')
          .insert([payload]);

        if (insertError) throw insertError;

        toast.success('AirBNB listing created successfully');
      }

      setDialogOpen(false);
      await fetchAirBNBs();
    } catch (err: any) {
      console.error('Failed to save AirBNB listing:', err);
      toast.error(err.message || 'Failed to save AirBNB listing');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this AirBNB listing?')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('airbnb')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast.success('AirBNB listing deleted successfully');
      await fetchAirBNBs();
    } catch (err: any) {
      console.error('Failed to delete AirBNB listing:', err);
      toast.error(err.message || 'Failed to delete AirBNB listing');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 py-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">AirBNB Management</h1>
                <p className="text-gray-600 mt-1">Manage AirBNB listings</p>
              </div>
              <div className="flex items-center gap-4">
                <Link href={`/${locale}/admin/dashboard`}>
                  <Button variant="outline">
                    <Home className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add AirBNB
                </Button>
                <Button variant="outline" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <p className="text-red-800">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* AirBNB Listings Grouped by City */}
            {airbnbs.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-gray-500">
                    <Home className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No AirBNB listings found. Click "Add AirBNB" to create one.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {(() => {
                  // Group airbnbs by city
                  const groupedByCity = new Map<string | null, AirBNB[]>();
                  airbnbs.forEach(airbnb => {
                    const cityKey = airbnb.city || 'no-city';
                    if (!groupedByCity.has(cityKey)) {
                      groupedByCity.set(cityKey, []);
                    }
                    groupedByCity.get(cityKey)!.push(airbnb);
                  });

                  // Sort cities: null/undefined last, then by city name
                  const sortedCities = Array.from(groupedByCity.keys()).sort((a, b) => {
                    if (a === 'no-city' || a === null) return 1;
                    if (b === 'no-city' || b === null) return -1;
                    return a.localeCompare(b);
                  });

                  return sortedCities.map((cityKey) => {
                    const cityAirbnbs = groupedByCity.get(cityKey) || [];
                    const cityData = cityKey !== 'no-city' && cityKey !== null
                      ? cities.find(c => c.slug === cityKey || c.id === cityKey)
                      : null;
                    const cityName = cityData
                      ? (cityData.name_nl || cityData.name_en || cityData.slug)
                      : cityKey === 'no-city' ? 'No City' : cityKey || 'No City';
                    const isExpanded = expandedCities.has(cityKey || 'no-city');

                    return (
                      <Card key={cityKey || 'no-city'}>
                        <CardHeader
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => toggleCity(cityKey || 'no-city')}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <MapPin className="h-5 w-5 text-gray-400" />
                              <CardTitle className="text-xl">{cityName}</CardTitle>
                              <span className="text-sm text-gray-500">({cityAirbnbs.length})</span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </CardHeader>
                        {isExpanded && (
                          <CardContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Image</TableHead>
                                  <TableHead>Title</TableHead>
                                  <TableHead>Price</TableHead>
                                  <TableHead>URL</TableHead>
                                  <TableHead>Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {cityAirbnbs.map((airbnb) => (
                                  <TableRow key={airbnb.id}>
                                    <TableCell>
                                      {airbnb.image_url ? (
                                        <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                                          <Image
                                            src={airbnb.image_url}
                                            alt={airbnb.title}
                                            fill
                                            className="object-cover"
                                          />
                                        </div>
                                      ) : (
                                        <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center">
                                          <ImageIcon className="h-8 w-8 text-gray-400" />
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell className="font-medium">{airbnb.title}</TableCell>
                                    <TableCell>
                                      {airbnb.price ? `€${airbnb.price.toFixed(2)}` : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                      <a
                                        href={airbnb.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline truncate max-w-xs block"
                                      >
                                        {airbnb.url}
                                      </a>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => openEditDialog(airbnb)}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleDelete(airbnb.id)}
                                        >
                                          <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        )}
                      </Card>
                    );
                  });
                })()}
              </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingAirBNB ? 'Edit AirBNB Listing' : 'Add AirBNB Listing'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingAirBNB
                      ? 'Update the AirBNB listing information'
                      : 'Create a new AirBNB listing'}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Title */}
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      required
                      placeholder="Charming City Center Apartment"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Select
                      value={formData.city || 'no-city'}
                      onValueChange={(value) =>
                        setFormData({ ...formData, city: value === 'no-city' ? '' : value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a city (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-city">No City</SelectItem>
                        {cities.map((city) => (
                          <SelectItem key={city.id || city.slug} value={city.slug}>
                            {city.name_nl || city.name_en || city.slug}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* URL */}
                  <div>
                    <Label htmlFor="url">AirBNB URL *</Label>
                    <Input
                      id="url"
                      type="url"
                      value={formData.url}
                      onChange={(e) =>
                        setFormData({ ...formData, url: e.target.value })
                      }
                      required
                      placeholder="https://www.airbnb.com/rooms/..."
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <Label htmlFor="price">Price per Night (EUR)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      placeholder="120.00"
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <Label htmlFor="image">Image</Label>
                    {!imagePreview ? (
                      <div className="relative">
                        <Input
                          id="image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileSelect}
                          className="w-full px-4 py-4 border-2 border-neutral-200 rounded-lg font-inter focus:border-[#1BDD95] focus:ring-0 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1BDD95] file:text-white hover:file:bg-[#14BE82]"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative w-full h-64 rounded-lg overflow-hidden border-2 border-[#1BDD95]">
                          <Image
                            src={imagePreview}
                            alt="Preview"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={removeImageFile}
                          className="w-full"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove Image
                        </Button>
                      </div>
                    )}
                    <p className="mt-1 text-xs text-neutral-500 font-inter">
                      Maximum file size: 50MB
                    </p>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting || uploading}>
                      {uploading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : submitting ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : editingAirBNB ? (
                        'Update AirBNB'
                      ) : (
                        'Create AirBNB'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </main>
    </div>
  );
}

