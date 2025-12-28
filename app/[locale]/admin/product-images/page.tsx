'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, LogOut, RefreshCw, Upload, X, Image as ImageIcon, Package, Star, ArrowUp, ArrowDown, Search } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ProductImage } from '@/lib/data/types';
import { getProductPlaceholder } from '@/lib/utils/placeholder-images';

interface Product {
  uuid: string;
  Name: string;
  Category: string;
  "Price (EUR)": string;
  Description: string;
}

interface ProductWithImages extends Product {
  images: ProductImage[];
  primaryImage?: ProductImage;
  imageCount: number;
}

const STORAGE_BUCKET = 'WebshopItemsImages';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function AdminProductImagesPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [allProductImages, setAllProductImages] = useState<Record<string, ProductImage[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [availableFolders, setAvailableFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');

  // File states
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  
  // Folder image states
  const [folderImages, setFolderImages] = useState<Array<{name: string, url: string}>>([]);
  const [selectedFolderImages, setSelectedFolderImages] = useState<string[]>([]);
  const [loadingFolderImages, setLoadingFolderImages] = useState(false);
  const [tableExists, setTableExists] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  const fetchProducts = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('webshop_data')
        .select('*')
        .order('Name', { ascending: true });

      if (fetchError) {
        console.error('Failed to fetch products:', fetchError);
        setError('Failed to load products');
        return;
      }

      return (data as Product[]) || [];
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Failed to load products');
      return [];
    }
  };

  const fetchProductImages = async () => {
    try {
      // Fetch from webshop_data table, extracting product_images JSONB column
      const { data, error: fetchError } = await supabase
        .from('webshop_data')
        .select('uuid, product_images');

      if (fetchError) {
        // Check if column doesn't exist
        if (fetchError.message?.includes('does not exist') || 
            fetchError.message?.includes('schema cache') ||
            fetchError.message?.includes('column') ||
            fetchError.code === '42P01' || fetchError.code === '42703') {
          console.error('Product images column does not exist. Please run migration to add product_images column to webshop_data.');
          setTableExists(false);
          setError('Database migration required. Please add product_images JSONB column to webshop_data table.');
          return {};
        }
        console.error('Failed to fetch product images:', fetchError);
        return {};
      }
      
      setTableExists(true);

      const imagesMap: Record<string, ProductImage[]> = {};
      (data || []).forEach((row: any) => {
        const productUuid = row.uuid;
        const imagesJson = row.product_images;
        
        if (imagesJson && Array.isArray(imagesJson)) {
          imagesMap[productUuid] = imagesJson.map((img: any, index: number) => ({
            id: img.id || `${productUuid}-${index}`, // Generate ID if not present
            product_uuid: productUuid,
            image_url: img.url || img.image_url,
            is_primary: img.is_primary || false,
            sort_order: img.sort_order !== undefined ? img.sort_order : index,
            storage_folder_name: img.storage_folder_name || undefined,
            created_at: img.created_at,
            updated_at: img.updated_at,
          })).sort((a, b) => a.sort_order - b.sort_order);
        } else {
          imagesMap[productUuid] = [];
        }
      });

      return imagesMap;
    } catch (err) {
      console.error('Failed to fetch product images:', err);
      return {};
    }
  };

  const fetchAvailableFolders = async () => {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list('', {
          limit: 1000,
          offset: 0,
        });

      if (error) {
        console.error('Failed to list folders:', error);
        return [];
      }

      // Filter for folders (items without file extensions)
      const folders = (data || [])
        .filter((item) => !item.name.includes('.') && item.id === null)
        .map((item) => item.name)
        .filter((name) => name !== 'City Images'); // Exclude City Images folder

      return folders;
    } catch (err) {
      console.error('Failed to fetch folders:', err);
      return [];
    }
  };

  const fetchFolderImages = async (folderName: string): Promise<Array<{name: string, url: string}>> => {
    if (!folderName) return [];
    
    setLoadingFolderImages(true);
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(folderName, {
          limit: 1000,
          offset: 0,
        });

      if (error) {
        console.error('Failed to list folder images:', error);
        toast.error('Failed to load images from folder');
        return [];
      }

      // Filter for image files
      const imageFiles = (data || []).filter(file => 
        file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
      );

      // Get public URLs
      const imagesWithUrls = imageFiles.map(file => {
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(`${folderName}/${file.name}`);
        
        return {
          name: file.name,
          url: urlData.publicUrl
        };
      });

      return imagesWithUrls;
    } catch (err) {
      console.error('Failed to fetch folder images:', err);
      toast.error('Failed to load images from folder');
      return [];
    } finally {
      setLoadingFolderImages(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsData, imagesData, foldersData] = await Promise.all([
        fetchProducts(),
        fetchProductImages(),
        fetchAvailableFolders(),
      ]);

      setAvailableFolders(foldersData);
      setAllProductImages(imagesData);

      // Merge products with images
      const productsWithImages: ProductWithImages[] = (productsData || []).map((product) => {
        const images = imagesData[product.uuid] || [];
        const primaryImage = images.find((img) => img.is_primary) || images[0];
        return {
          ...product,
          images,
          primaryImage,
          imageCount: images.length,
        };
      });

      setProducts(productsWithImages);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data');
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (profile?.isAdmin || profile?.is_admin)) {
      void loadData();
    }
  }, [user, profile]);

  const handleLogout = () => {
    signOut();
    router.push(`/${locale}`);
  };

  const openDialog = async (product: Product) => {
    setSelectedProduct(product);
    const images = allProductImages[product.uuid] || [];
    setProductImages([...images].sort((a, b) => a.sort_order - b.sort_order));
    
    // Try to find linked folder
    const firstImage = images[0];
    if (firstImage?.storage_folder_name) {
      setSelectedFolder(firstImage.storage_folder_name);
    } else {
      // Try to match folder automatically
      const matchedFolder = await matchFolderToProduct(product);
      if (matchedFolder) {
        setSelectedFolder(matchedFolder);
      } else {
        setSelectedFolder('');
      }
    }
    
    setUploadFiles([]);
    setUploadPreviews([]);
    setDialogOpen(true);
  };

  const matchFolderToProduct = async (product: Product): Promise<string | null> => {
    // Try exact UUID match
    const uuidMatch = availableFolders.find((folder) => folder === product.uuid);
    if (uuidMatch) return uuidMatch;

    // Try normalized name match
    const normalizedName = product.Name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const nameMatch = availableFolders.find(
      (folder) => folder.toLowerCase() === normalizedName
    );
    if (nameMatch) return nameMatch;

    // Try partial match (folder contains UUID or name)
    const partialMatch = availableFolders.find(
      (folder) => folder.includes(product.uuid) || folder.toLowerCase().includes(normalizedName)
    );
    if (partialMatch) return partialMatch;

    return null;
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

    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/')
      );
      if (files.length > 0) {
        handleFilesSelect(files);
      } else {
        toast.error('Please drop image files');
      }
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFilesSelect(files);
    }
  };

  const handleFilesSelect = (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error('Please select image files');
      return;
    }

    // Check file sizes
    const oversizedFiles = imageFiles.filter((file) => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error(`Some files exceed 50MB limit`);
      return;
    }

    setUploadFiles((prev) => [...prev, ...imageFiles]);
    
    // Create previews
    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeUploadFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFilesToStorage = async (files: File[], folderName: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = folderName ? `${folderName}/${fileName}` : fileName;

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

  const handleSaveImages = async () => {
    if (!selectedProduct) return;

    if (!selectedFolder) {
      toast.error('Please select or create a folder for this product');
      return;
    }

    setUploading(true);

    try {
      const folderName = selectedFolder;
      
      // Ensure folder exists before uploading
      const folderExists = await ensureFolderExists(folderName);
      if (!folderExists) {
        toast.error('Failed to create folder. Please try again.');
        setUploading(false);
        return;
      }

      // Fetch latest images from database to ensure we have the most up-to-date data
      // This prevents issues where images added via "Add selected image" might be lost
      const { data: freshData, error: fetchError } = await supabase
        .from('webshop_data')
        .select('product_images')
        .eq('uuid', selectedProduct.uuid)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Failed to fetch current images:', fetchError);
        toast.error('Failed to load current images. Please try again.');
        setUploading(false);
        return;
      }

      // Parse current images from database (source of truth)
      const currentImagesJson = freshData?.product_images || [];
      const currentImages = Array.isArray(currentImagesJson) 
        ? currentImagesJson.map((img: any, index: number) => ({
            id: img.id || `${selectedProduct.uuid}-${index}`,
            url: img.url || img.image_url,
            is_primary: img.is_primary || false,
            sort_order: img.sort_order !== undefined ? img.sort_order : index,
            storage_folder_name: img.storage_folder_name,
            created_at: img.created_at,
            updated_at: img.updated_at,
          }))
        : [];

      let newImageUrls: string[] = [];

      // Upload new files
      if (uploadFiles.length > 0) {
        newImageUrls = await uploadFilesToStorage(uploadFiles, folderName);
      }

      // Get current max sort_order from fresh data
      const maxSortOrder = currentImages.length > 0
        ? Math.max(...currentImages.map((img) => img.sort_order))
        : -1;

      // Prepare new images to add
      const newImages = newImageUrls.map((url, index) => ({
        id: `${selectedProduct.uuid}-${Date.now()}-${index}`,
        url: url,
        is_primary: currentImages.length === 0 && index === 0, // First image is primary if no existing images
        sort_order: maxSortOrder + index + 1,
        storage_folder_name: folderName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // Merge with existing images from database (not from state)
      const existingImages = currentImages.map(img => ({
        id: img.id,
        url: img.url,
        is_primary: img.is_primary,
        sort_order: img.sort_order,
        storage_folder_name: img.storage_folder_name || folderName,
        created_at: img.created_at,
        updated_at: img.updated_at,
      }));

      const allImages = [...existingImages, ...newImages];

      // Update webshop_data with new images array
      const { error: updateError } = await supabase
        .from('webshop_data')
        .update({ product_images: allImages })
        .eq('uuid', selectedProduct.uuid);

      if (updateError) {
        if (updateError.message?.includes('does not exist') || 
            updateError.message?.includes('schema cache') ||
            updateError.message?.includes('column') ||
            updateError.code === '42P01' || updateError.code === '42703') {
          toast.error('Database migration required. Please add product_images JSONB column to webshop_data table.');
          setTableExists(false);
          return;
        }
        throw updateError;
      }

      toast.success(`Images saved for ${selectedProduct.Name}`);
      setDialogOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Failed to save images:', err);
      toast.error(err.message || 'Failed to save images');
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    if (!selectedProduct) return;

    try {
      // Check if column exists
      if (tableExists === false) {
        toast.error('Database migration required. Please add product_images JSONB column to webshop_data table.');
        return;
      }

      // Update images array: unset current primary, set new primary
      const updatedImages = productImages.map(img => ({
        id: img.id,
        url: img.image_url,
        is_primary: img.id === imageId,
        sort_order: img.sort_order,
        storage_folder_name: img.storage_folder_name,
        created_at: img.created_at,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('webshop_data')
        .update({ product_images: updatedImages })
        .eq('uuid', selectedProduct.uuid);

      if (error) {
        if (error.message?.includes('does not exist') || 
            error.message?.includes('schema cache') ||
            error.message?.includes('column') ||
            error.code === '42P01' || error.code === '42703') {
          toast.error('Database migration required. Please add product_images JSONB column to webshop_data table.');
          setTableExists(false);
          return;
        }
        throw error;
      }

      toast.success('Primary image updated');
      await loadData();
      // Refresh dialog
      if (selectedProduct) {
        const images = allProductImages[selectedProduct.uuid] || [];
        setProductImages([...images].sort((a, b) => a.sort_order - b.sort_order));
      }
    } catch (err: any) {
      console.error('Failed to set primary image:', err);
      toast.error('Failed to set primary image');
    }
  };

  const handleDeleteImage = async (imageId: string, imageUrl: string) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    if (!selectedProduct) return;

    try {
      // Optimistically update UI state first
      const updatedImages = productImages.filter(img => img.id !== imageId);
      
      // Update local state immediately
      setProductImages(updatedImages);

      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const filePath = urlParts.slice(urlParts.indexOf(STORAGE_BUCKET) + 1).join('/');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);

      if (storageError) {
        console.warn('Failed to delete from storage:', storageError);
        // Revert state if storage deletion fails
        setProductImages(productImages);
        toast.error('Failed to delete image from storage');
        return;
      }

      // Prepare images for database update
      const imagesForDb = updatedImages.map(img => ({
        id: img.id,
        url: img.image_url,
        is_primary: img.is_primary,
        sort_order: img.sort_order,
        storage_folder_name: img.storage_folder_name,
        created_at: img.created_at,
        updated_at: img.updated_at,
      }));

      // Update database
      const { error: dbError } = await supabase
        .from('webshop_data')
        .update({ product_images: imagesForDb })
        .eq('uuid', selectedProduct.uuid);

      if (dbError) {
        // Revert state if database update fails
        setProductImages(productImages);
        if (dbError.message?.includes('does not exist') || 
            dbError.message?.includes('schema cache') ||
            dbError.message?.includes('column') ||
            dbError.code === '42P01' || dbError.code === '42703') {
          toast.error('Database migration required. Please add product_images JSONB column to webshop_data table.');
          setTableExists(false);
          return;
        }
        throw dbError;
      }

      toast.success('Image deleted');
      
      // Reload all data to ensure consistency
      await loadData();
      
      // Refresh dialog state after loadData completes
      const refreshedImages = allProductImages[selectedProduct.uuid] || [];
      setProductImages([...refreshedImages].sort((a, b) => a.sort_order - b.sort_order));
    } catch (err: any) {
      console.error('Failed to delete image:', err);
      toast.error('Failed to delete image');
      // Revert state on error
      if (selectedProduct) {
        const images = allProductImages[selectedProduct.uuid] || [];
        setProductImages([...images].sort((a, b) => a.sort_order - b.sort_order));
      }
    }
  };

  const handleReorder = async (imageId: string, direction: 'up' | 'down') => {
    const currentIndex = productImages.findIndex((img) => img.id === imageId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= productImages.length) return;

    try {
      // Check if column exists
      if (tableExists === false) {
        toast.error('Database migration required. Please add product_images JSONB column to webshop_data table.');
        return;
      }

      // Swap images in array
      const updatedImages = [...productImages];
      const temp = updatedImages[currentIndex];
      updatedImages[currentIndex] = updatedImages[newIndex];
      updatedImages[newIndex] = temp;

      // Update sort orders
      const reorderedImages = updatedImages.map((img, index) => ({
        id: img.id,
        url: img.image_url,
        is_primary: img.is_primary,
        sort_order: index,
        storage_folder_name: img.storage_folder_name,
        created_at: img.created_at,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('webshop_data')
        .update({ product_images: reorderedImages })
        .eq('uuid', selectedProduct?.uuid);

      if (error) {
        if (error.message?.includes('does not exist') || 
            error.message?.includes('schema cache') ||
            error.message?.includes('column') ||
            error.code === '42P01' || error.code === '42703') {
          toast.error('Database migration required. Please add product_images JSONB column to webshop_data table.');
          setTableExists(false);
          return;
        }
        throw error;
      }

      toast.success('Image order updated');
      await loadData();
      // Refresh dialog
      if (selectedProduct) {
        const images = allProductImages[selectedProduct.uuid] || [];
        setProductImages([...images].sort((a, b) => a.sort_order - b.sort_order));
      }
    } catch (err: any) {
      console.error('Failed to reorder image:', err);
      toast.error('Failed to reorder image');
    }
  };

  const ensureFolderExists = async (folderName: string): Promise<boolean> => {
    if (!folderName) return false;

    try {
      // Check if folder exists by trying to list it
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(folderName, {
          limit: 1,
        });

      // If folder doesn't exist, create it by uploading a .keep file
      if (error || !data) {
        const keepFilePath = `${folderName}/.keep`;
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(keepFilePath, new Blob([''], { type: 'text/plain' }), {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.error('Failed to create folder:', uploadError);
          return false;
        }

        return true;
      }

      return true; // Folder already exists
    } catch (err) {
      console.error('Error checking/creating folder:', err);
      return false;
    }
  };

  const handleCreateFolder = async () => {
    if (!selectedFolder) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      const created = await ensureFolderExists(selectedFolder);
      if (created) {
        toast.success(`Folder "${selectedFolder}" created successfully`);
        // Refresh available folders
        const folders = await fetchAvailableFolders();
        setAvailableFolders(folders);
        // Also link it to the product if one is selected
        if (selectedProduct) {
          await handleLinkFolder();
        }
      } else {
        toast.error('Failed to create folder');
      }
    } catch (err: any) {
      console.error('Failed to create folder:', err);
      toast.error(err.message || 'Failed to create folder');
    }
  };

  const handleLinkFolder = async () => {
    if (!selectedProduct || !selectedFolder) return;

    try {
      // Check if column exists
      if (tableExists === false) {
        toast.error('Database migration required. Please add product_images JSONB column to webshop_data table.');
        return;
      }

      // Update all images for this product with the folder name
      const updatedImages = productImages.map(img => ({
        id: img.id,
        url: img.image_url,
        is_primary: img.is_primary,
        sort_order: img.sort_order,
        storage_folder_name: selectedFolder,
        created_at: img.created_at,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('webshop_data')
        .update({ product_images: updatedImages })
        .eq('uuid', selectedProduct.uuid);

      if (error) {
        if (error.message?.includes('does not exist') || 
            error.message?.includes('schema cache') ||
            error.message?.includes('column') ||
            error.code === '42P01' || error.code === '42703') {
          toast.error('Database migration required. Please add product_images JSONB column to webshop_data table.');
          setTableExists(false);
          return;
        }
        throw error;
      }

      toast.success('Folder linked to product');
      await loadData();
    } catch (err: any) {
      console.error('Failed to link folder:', err);
      toast.error(err.message || 'Failed to link folder');
    }
  };

  // Fetch folder images when folder is selected
  useEffect(() => {
    if (selectedFolder && dialogOpen) {
      fetchFolderImages(selectedFolder).then(setFolderImages);
      setSelectedFolderImages([]);
    } else {
      setFolderImages([]);
      setSelectedFolderImages([]);
    }
  }, [selectedFolder, dialogOpen]);

  const handleFolderImageToggle = (imageUrl: string) => {
    setSelectedFolderImages(prev => 
      prev.includes(imageUrl) 
        ? prev.filter(url => url !== imageUrl)
        : [...prev, imageUrl]
    );
  };

  const handleAddSelectedFolderImages = async () => {
    if (!selectedProduct || !selectedFolder || selectedFolderImages.length === 0) return;

    setUploading(true);
    try {
      // Check if table exists
      if (tableExists === false) {
        toast.error('Database migration required. Please run: supabase db push');
        return;
      }

      // Get current max sort_order
      const maxSortOrder = productImages.length > 0
        ? Math.max(...productImages.map((img) => img.sort_order))
        : -1;

      // Check which images are already added (by URL)
      const existingUrls = new Set(productImages.map(img => img.image_url));
      const newImages = selectedFolderImages
        .filter(url => !existingUrls.has(url))
        .map((url, index) => ({
          id: `${selectedProduct.uuid}-${Date.now()}-${index}`,
          url: url,
          is_primary: productImages.length === 0 && index === 0,
          sort_order: maxSortOrder + index + 1,
          storage_folder_name: selectedFolder,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

      if (newImages.length === 0) {
        toast.info('All selected images are already added');
        return;
      }

      // Merge with existing images
      const existingImages = productImages.map(img => ({
        id: img.id,
        url: img.image_url,
        is_primary: img.is_primary,
        sort_order: img.sort_order,
        storage_folder_name: img.storage_folder_name,
        created_at: img.created_at,
        updated_at: img.updated_at,
      }));

      const allImages = [...existingImages, ...newImages];

      const { error: updateError } = await supabase
        .from('webshop_data')
        .update({ product_images: allImages })
        .eq('uuid', selectedProduct.uuid);

      if (updateError) {
        if (updateError.message?.includes('does not exist') || 
            updateError.message?.includes('schema cache') ||
            updateError.message?.includes('column') ||
            updateError.code === '42P01' || updateError.code === '42703') {
          toast.error('Database migration required. Please add product_images JSONB column to webshop_data table.');
          setTableExists(false);
          return;
        }
        throw updateError;
      }

      toast.success(`Added ${newImages.length} image(s) to product`);
      setSelectedFolderImages([]);
      
      // Reload data to ensure state is synchronized
      await loadData();
      
      // Refresh dialog state with fresh data after loadData completes
      if (selectedProduct) {
        // Use a small delay to ensure loadData has updated allProductImages
        setTimeout(() => {
          const refreshedImages = allProductImages[selectedProduct.uuid] || [];
          setProductImages([...refreshedImages].sort((a, b) => a.sort_order - b.sort_order));
        }, 100);
      }
    } catch (err: any) {
      console.error('Failed to add folder images:', err);
      toast.error(err.message || 'Failed to add images');
    } finally {
      setUploading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = searchQuery === '' || 
      product.Name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.Category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Images Management</h1>
            <p className="mt-1 text-sm text-gray-500">Manage images for webshop products</p>
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
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Book">Book</SelectItem>
                    <SelectItem value="Merchandise">Merchandise</SelectItem>
                    <SelectItem value="Game">Game</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
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

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading products...</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => {
              const primaryImageUrl = product.primaryImage?.image_url;
              const category = product.Category as 'Book' | 'Merchandise' | 'Game';

              return (
                <Card key={product.uuid} className="overflow-hidden">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {product.Name}
                    </CardTitle>
                    <CardDescription>
                      {product.Category} • €{product["Price (EUR)"]}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Primary Image Preview */}
                      <div>
                        <Label className="mb-2 block text-sm font-medium">Primary Image</Label>
                        {primaryImageUrl ? (
                          <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                            <Image
                              src={primaryImageUrl}
                              alt={product.Name}
                              fill
                              className="object-cover"
                            />
                            {product.primaryImage?.is_primary && (
                              <div className="absolute left-2 top-2 rounded bg-yellow-500 px-2 py-1 text-xs font-semibold text-white">
                                Primary
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex aspect-video w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="text-sm text-gray-500">
                        {product.imageCount} image{product.imageCount !== 1 ? 's' : ''} total
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => openDialog(product)}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Manage Images
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Manage Images Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Images for {selectedProduct?.Name}</DialogTitle>
              <DialogDescription>
                Upload, set primary, and reorder images for this product
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Folder Selection */}
              <div className="space-y-2">
                <Label>Storage Folder</Label>
                <div className="flex gap-2">
                  <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select or create folder" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFolders.map((folder) => (
                        <SelectItem key={folder} value={folder}>
                          {folder}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Or type new folder name"
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleCreateFolder} variant="default">
                    Create Folder
                  </Button>
                  {selectedProduct && (
                    <Button onClick={handleLinkFolder} variant="outline">
                      Set Folder
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Select an existing folder or create a new one. Images will be uploaded to this folder.
                </p>
              </div>

              {/* Folder Images Display */}
              {selectedFolder && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Images in Folder: {selectedFolder}</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchFolderImages(selectedFolder).then(setFolderImages)}
                      disabled={loadingFolderImages}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${loadingFolderImages ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                  {loadingFolderImages ? (
                    <div className="text-center py-8 text-sm text-gray-500">
                      Loading images from folder...
                    </div>
                  ) : folderImages.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {folderImages.map((folderImg, index) => {
                          const isAlreadyAdded = productImages.some(img => img.image_url === folderImg.url);
                          const isSelected = selectedFolderImages.includes(folderImg.url);
                          
                          return (
                            <div
                              key={index}
                              className={`relative aspect-video overflow-hidden rounded-lg border-2 transition-all ${
                                isSelected
                                  ? 'border-blue-500 ring-2 ring-blue-200'
                                  : isAlreadyAdded
                                  ? 'border-green-300'
                                  : 'border-gray-200'
                              }`}
                            >
                              <Image
                                src={folderImg.url}
                                alt={folderImg.name}
                                fill
                                className="object-cover"
                              />
                              {isAlreadyAdded && (
                                <div className="absolute left-2 top-2 rounded bg-green-500 px-2 py-1 text-xs font-semibold text-white">
                                  Already Added
                                </div>
                              )}
                              {!isAlreadyAdded && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleFolderImageToggle(folderImg.url)}
                                    className="h-5 w-5 cursor-pointer"
                                  />
                                </div>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1">
                                <p className="text-xs text-white truncate">{folderImg.name}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {selectedFolderImages.length > 0 && (
                        <Button
                          onClick={handleAddSelectedFolderImages}
                          className="w-full"
                          disabled={uploading}
                        >
                          {uploading ? 'Adding...' : `Add ${selectedFolderImages.length} Selected Image${selectedFolderImages.length !== 1 ? 's' : ''}`}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-gray-500 border-2 border-dashed rounded-lg">
                      No images found in this folder
                    </div>
                  )}
                </div>
              )}

              {/* Upload Area */}
              <div className="space-y-2">
                <Label>Upload New Images</Label>
                <div
                  className={`relative rounded-lg border-2 border-dashed p-6 transition-colors ${
                    dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {uploadPreviews.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                        {uploadPreviews.map((preview, index) => (
                          <div key={index} className="relative aspect-video overflow-hidden rounded-lg border">
                            <Image
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute right-2 top-2"
                              onClick={() => removeUploadFile(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <Upload className="h-12 w-12 text-gray-400" />
                      <div className="text-center">
                        <p className="text-sm text-gray-600">
                          Drag and drop images here, or click to select
                        </p>
                        <p className="mt-1 text-xs text-gray-500">PNG, JPG, WEBP up to 50MB each</p>
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileInput}
                        className="hidden"
                        id="image-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('image-upload')?.click()}
                      >
                        Select Images
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Existing Images */}
              {productImages.length > 0 && (
                <div className="space-y-2">
                  <Label>Existing Images ({productImages.length})</Label>
                  <div className="space-y-3">
                    {productImages.map((image, index) => (
                      <div
                        key={image.id}
                        className="flex items-center gap-4 rounded-lg border p-3"
                      >
                        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                          <Image
                            src={image.image_url}
                            alt={`Image ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                          {image.is_primary && (
                            <div className="absolute left-1 top-1 rounded bg-yellow-500 p-1">
                              <Star className="h-3 w-3 fill-white text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            Image {index + 1}
                            {image.is_primary && (
                              <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Order: {image.sort_order}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReorder(image.id, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReorder(image.id, 'down')}
                            disabled={index === productImages.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          {!image.is_primary && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetPrimary(image.id)}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteImage(image.id, image.image_url)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveImages} disabled={uploading || !selectedFolder}>
                {uploading ? 'Uploading...' : 'Save Images'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

