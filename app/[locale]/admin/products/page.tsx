'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Home, LogOut, RefreshCw, Plus, Pencil, Trash2, Package, X, Search, RefreshCcw, Image, GripVertical, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
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

interface Product {
  uuid: string;
  Name: string;
  Category: string;
  "Price (EUR)": string;
  Description: string;
  "Additional Info": string | null;
  status?: string | null;
  // Multi-language fields
  name_en?: string | null;
  name_fr?: string | null;
  name_de?: string | null;
  description_en?: string | null;
  description_fr?: string | null;
  description_de?: string | null;
  additional_info_en?: string | null;
  additional_info_fr?: string | null;
  additional_info_de?: string | null;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  display_order?: number | null;
  category_display_order?: number | null;
  featured_on_homepage?: boolean;
  homepage_featured_order?: number | null;
}

interface ProductFormData {
  Name: string;
  Category: string;
  "Price (EUR)": string;
  Description: string;
  "Additional Info": string;
  status: string;
  // Multi-language fields
  name_en: string;
  name_fr: string;
  name_de: string;
  description_en: string;
  description_fr: string;
  description_de: string;
  additional_info_en: string;
  additional_info_fr: string;
  additional_info_de: string;
}

const CATEGORY_OPTIONS = ['Book', 'Merchandise', 'Game'];
const STATUS_OPTIONS = ['draft', 'published'];

export default function AdminProductsPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [orderingMode, setOrderingMode] = useState<'global' | 'category'>('global');
  const [activeTab, setActiveTab] = useState<'all' | 'featured'>('all');

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Form state
  const [formData, setFormData] = useState<ProductFormData>({
    Name: '',
    Category: 'Book',
    "Price (EUR)": '0',
    Description: '',
    "Additional Info": '',
    status: 'draft',
    name_en: '',
    name_fr: '',
    name_de: '',
    description_en: '',
    description_fr: '',
    description_de: '',
    additional_info_en: '',
    additional_info_fr: '',
    additional_info_de: '',
  });

  // Active language tab in form
  const [formLanguageTab, setFormLanguageTab] = useState<'nl' | 'en' | 'fr' | 'de'>('nl');

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('webshop_data')
        .select('*')
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('category_display_order', { ascending: true, nullsFirst: false })
        .order('Name', { ascending: true });

      if (fetchError) {
        console.error('Failed to fetch products:', fetchError);
        setError('Failed to load products');
        return;
      }

      console.log('Fetched products:', data);
      setProducts((data as Product[]) || []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (profile?.isAdmin || profile?.is_admin)) {
      void fetchProducts();
    }
  }, [user, profile]);

  const handleLogout = () => {
    signOut();
    router.push(`/${locale}`);
  };

  const openAddDialog = () => {
    setEditingProduct(null);
    setFormData({
      Name: '',
      Category: 'Book',
      "Price (EUR)": '0',
      Description: '',
      "Additional Info": '',
      status: 'draft',
      name_en: '',
      name_fr: '',
      name_de: '',
      description_en: '',
      description_fr: '',
      description_de: '',
      additional_info_en: '',
      additional_info_fr: '',
      additional_info_de: '',
    });
    setFormLanguageTab('nl');
    setDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      Name: product.Name || '',
      Category: product.Category || 'Book',
      "Price (EUR)": product["Price (EUR)"] || '0',
      Description: product.Description || '',
      "Additional Info": product["Additional Info"] || '',
      status: product.status || 'draft',
      name_en: product.name_en || '',
      name_fr: product.name_fr || '',
      name_de: product.name_de || '',
      description_en: product.description_en || '',
      description_fr: product.description_fr || '',
      description_de: product.description_de || '',
      additional_info_en: product.additional_info_en || '',
      additional_info_fr: product.additional_info_fr || '',
      additional_info_de: product.additional_info_de || '',
    });
    setFormLanguageTab('nl');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        Name: formData.Name,
        Category: formData.Category,
        "Price (EUR)": formData["Price (EUR)"],
        Description: formData.Description,
        "Additional Info": formData["Additional Info"] || null,
        status: formData.status,
        // Multi-language fields
        name_en: formData.name_en || null,
        name_fr: formData.name_fr || null,
        name_de: formData.name_de || null,
        description_en: formData.description_en || null,
        description_fr: formData.description_fr || null,
        description_de: formData.description_de || null,
        additional_info_en: formData.additional_info_en || null,
        additional_info_fr: formData.additional_info_fr || null,
        additional_info_de: formData.additional_info_de || null,
      };

      if (editingProduct) {
        // Update existing product
        // Note: This will trigger the webhook which syncs to Stripe
        const { error } = await supabase
          .from('webshop_data')
          .update(payload)
          .eq('uuid', editingProduct.uuid);

        if (error) throw error;
        
        // Wait a moment for webhook to process
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        toast.success('Product updated successfully. Syncing to Stripe...');
      } else {
        // Create new product
        const { error } = await supabase
          .from('webshop_data')
          .insert([payload]);

        if (error) throw error;
        toast.success('Product created successfully');
      }

      setDialogOpen(false);
      void fetchProducts();
    } catch (err) {
      console.error('Failed to save product:', err);
      toast.error('Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.Name}"? This will also deactivate it in Stripe.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('webshop_data')
        .delete()
        .eq('uuid', product.uuid);

      if (error) throw error;
      toast.success('Product deleted successfully. Stripe product will be deactivated automatically.');
      void fetchProducts();
    } catch (err) {
      console.error('Failed to delete product:', err);
      toast.error('Failed to delete product');
    }
  };

  const handleSyncToStripe = async (product: Product) => {
    try {
      toast.info('Syncing to Stripe...');
      
      // Trigger an update to the product to force webhook sync
      // Update a timestamp-like field or the same value to trigger webhook
      // We'll update the Description field slightly to ensure webhook fires
      const currentDesc = product.Description || '';
      const { error } = await supabase
        .from('webshop_data')
        .update({
          Description: currentDesc + (currentDesc.endsWith(' ') ? '' : ' '), // Add/remove space to trigger update
        })
        .eq('uuid', product.uuid);

      if (error) throw error;
      
      // Immediately revert the description change
      await supabase
        .from('webshop_data')
        .update({
          Description: currentDesc,
        })
        .eq('uuid', product.uuid);
      
      // Wait a moment for webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh to see updated Stripe IDs
      await fetchProducts();
      toast.success('Product synced to Stripe successfully');
    } catch (err) {
      console.error('Failed to sync product:', err);
      toast.error('Failed to sync product to Stripe. Check webhook configuration.');
    }
  };

  const handleToggleFeatured = async (product: Product) => {
    try {
      const newFeaturedStatus = !product.featured_on_homepage;

      if (newFeaturedStatus) {
        // If featuring, get the max order and assign next number
        const { data: featuredProducts } = await supabase
          .from('webshop_data')
          .select('homepage_featured_order')
          .eq('featured_on_homepage', true)
          .not('homepage_featured_order', 'is', null)
          .order('homepage_featured_order', { ascending: false })
          .limit(1);

        const maxOrder = featuredProducts && featuredProducts.length > 0 
          ? (featuredProducts[0].homepage_featured_order as number) 
          : 0;
        const newOrder = maxOrder + 1;

        const { error } = await supabase
          .from('webshop_data')
          .update({
            featured_on_homepage: true,
            homepage_featured_order: newOrder,
          })
          .eq('uuid', product.uuid);

        if (error) throw error;
      } else {
        // If un-featuring, set homepage_featured_order to NULL
        const { error } = await supabase
          .from('webshop_data')
          .update({
            featured_on_homepage: false,
            homepage_featured_order: null,
          })
          .eq('uuid', product.uuid);

        if (error) throw error;

        // Reorder remaining featured products to be sequential
        const { data: remainingFeatured } = await supabase
          .from('webshop_data')
          .select('uuid')
          .eq('featured_on_homepage', true)
          .order('homepage_featured_order', { ascending: true, nullsFirst: false })
          .order('Name', { ascending: true });

        if (remainingFeatured) {
          for (let i = 0; i < remainingFeatured.length; i++) {
            await supabase
              .from('webshop_data')
              .update({ homepage_featured_order: i + 1 })
              .eq('uuid', remainingFeatured[i].uuid);
          }
        }
      }

      // Refresh products
      await fetchProducts();

      toast.success(
        newFeaturedStatus 
          ? 'Product added to homepage. Reorder in the Featured Products tab.' 
          : 'Product removed from homepage'
      );
    } catch (err) {
      console.error('Failed to toggle featured status:', err);
      toast.error('Failed to update featured status');
      await fetchProducts();
    }
  };

  // Handle drag-and-drop reordering for featured products
  const handleFeaturedDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const featuredProducts = products
      .filter(p => p.featured_on_homepage === true)
      .sort((a, b) => {
        const aOrder = a.homepage_featured_order ?? 999999;
        const bOrder = b.homepage_featured_order ?? 999999;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return (a.Name || '').localeCompare(b.Name || '');
      });

    const oldIndex = featuredProducts.findIndex(p => p.uuid === active.id);
    const newIndex = featuredProducts.findIndex(p => p.uuid === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedProducts = arrayMove(featuredProducts, oldIndex, newIndex);

    // Update all featured products with sequential order numbers (1, 2, 3, ...)
    try {
      for (let i = 0; i < reorderedProducts.length; i++) {
        const { error } = await supabase
          .from('webshop_data')
          .update({ homepage_featured_order: i + 1 })
          .eq('uuid', reorderedProducts[i].uuid);

        if (error) throw error;
      }

      // Update local state
      const updatedProducts = products.map(p => {
        const reorderedIndex = reorderedProducts.findIndex(rp => rp.uuid === p.uuid);
        if (reorderedIndex !== -1 && p.featured_on_homepage) {
          return { ...p, homepage_featured_order: reorderedIndex + 1 };
        }
        return p;
      });

      setProducts(updatedProducts);
      toast.success('Featured products order updated');
    } catch (err) {
      console.error('Failed to update featured products order:', err);
      toast.error('Failed to update order');
      await fetchProducts();
    }
  };

  const handleUpdateHomepageOrder = async (productUuid: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from('webshop_data')
        .update({ homepage_featured_order: newOrder })
        .eq('uuid', productUuid);

      if (error) throw error;

      // Update local state
      setProducts(products.map(p => 
        p.uuid === productUuid 
          ? { ...p, homepage_featured_order: newOrder }
          : p
      ));

      toast.success('Homepage order updated');
    } catch (err) {
      console.error('Failed to update homepage order:', err);
      toast.error('Failed to update homepage order');
    }
  };

  // Filter and search logic
  const filteredProducts = products.filter((product) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      product.Name?.toLowerCase().includes(searchLower) ||
      product.Description?.toLowerCase().includes(searchLower);

    const matchesCategory = filterCategory === 'all' || product.Category === filterCategory;
    const matchesStatus = filterStatus === 'all' || product.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Group products by category for per-category ordering
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    filteredProducts.forEach((product) => {
      const category = product.Category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(product);
    });

    // Sort products within each category by category_display_order, then Name
    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) => {
        const aOrder = a.category_display_order ?? null;
        const bOrder = b.category_display_order ?? null;
        if (aOrder === null && bOrder === null) {
          return (a.Name || '').localeCompare(b.Name || '');
        }
        if (aOrder === null) return 1;
        if (bOrder === null) return -1;
        return aOrder - bOrder;
      });
    });

    return grouped;
  }, [filteredProducts]);

  // Sort products for global ordering
  const sortedProductsForGlobal = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const aOrder = a.display_order ?? null;
      const bOrder = b.display_order ?? null;
      if (aOrder === null && bOrder === null) {
        return (a.Name || '').localeCompare(b.Name || '');
      }
      if (aOrder === null) return 1;
      if (bOrder === null) return -1;
      return aOrder - bOrder;
    });
  }, [filteredProducts]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleDragEnd = async (event: DragEndEvent, category?: string) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    if (orderingMode === 'global') {
      // Global ordering - update display_order
      const oldIndex = sortedProductsForGlobal.findIndex(p => p.uuid === active.id);
      const newIndex = sortedProductsForGlobal.findIndex(p => p.uuid === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      const reorderedProducts = arrayMove(sortedProductsForGlobal, oldIndex, newIndex);
      const reorderedProductsWithOrder = reorderedProducts.map((product, index) => ({
        ...product,
        display_order: index + 1,
      }));

      const updatedProductsMap = new Map(reorderedProductsWithOrder.map(p => [p.uuid, p]));
      const updatedProducts = products.map(product => {
        const updatedProduct = updatedProductsMap.get(product.uuid);
        return updatedProduct || product;
      });

      setProducts(updatedProducts);

      try {
        for (const product of reorderedProductsWithOrder) {
          const { error } = await supabase
            .from('webshop_data')
            .update({ display_order: product.display_order })
            .eq('uuid', product.uuid);

          if (error) {
            console.error('Failed to update display_order:', error);
            throw error;
          }
        }

        toast.success('Product order updated');
      } catch (err) {
        console.error('Failed to update product order:', err);
        toast.error('Failed to update product order');
        void fetchProducts();
      }
    } else if (category) {
      // Per-category ordering - update category_display_order
      const categoryProducts = productsByCategory[category] || [];
      const oldIndex = categoryProducts.findIndex(p => p.uuid === active.id);
      const newIndex = categoryProducts.findIndex(p => p.uuid === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      const reorderedProducts = arrayMove(categoryProducts, oldIndex, newIndex);
      const reorderedProductsWithOrder = reorderedProducts.map((product, index) => ({
        ...product,
        category_display_order: index + 1,
      }));

      const updatedProductsMap = new Map(reorderedProductsWithOrder.map(p => [p.uuid, p]));
      const updatedProducts = products.map(product => {
        if (product.Category === category) {
          const updatedProduct = updatedProductsMap.get(product.uuid);
          return updatedProduct || product;
        }
        return product;
      });

      setProducts(updatedProducts);

      try {
        for (const product of reorderedProductsWithOrder) {
          const { error } = await supabase
            .from('webshop_data')
            .update({ category_display_order: product.category_display_order })
            .eq('uuid', product.uuid);

          if (error) {
            console.error('Failed to update category_display_order:', error);
            throw error;
          }
        }

        toast.success(`Product order updated for ${category}`);
      } catch (err) {
        console.error('Failed to update product order:', err);
        toast.error('Failed to update product order');
        void fetchProducts();
      }
    }
  };

  // Product move up/down handlers
  const handleProductMove = async (productUuid: string, direction: 'up' | 'down', category?: string) => {
    let productsList: Product[];
    
    if (orderingMode === 'global') {
      productsList = sortedProductsForGlobal;
    } else if (category) {
      productsList = productsByCategory[category] || [];
    } else {
      return;
    }

    const currentIndex = productsList.findIndex(p => p.uuid === productUuid);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= productsList.length) return;

    // Create a fake drag event to reuse existing logic
    const fakeEvent = {
      active: { id: productUuid },
      over: { id: productsList[newIndex].uuid },
    } as DragEndEvent;

    await handleDragEnd(fakeEvent, category);
  };

  // Sortable Featured Product Item Component
  const SortableFeaturedProductItem = ({ product }: { product: Product }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: product.uuid });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <TableRow
        ref={setNodeRef}
        style={style}
        className={`cursor-move ${isDragging ? 'bg-gray-100' : ''}`}
      >
        <TableCell className="w-24">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        </TableCell>
        <TableCell className="font-medium max-w-xs truncate">
          {product.Name}
        </TableCell>
        <TableCell>
          <Badge className="bg-blue-100 text-blue-900">{product.Category}</Badge>
        </TableCell>
        <TableCell>€{parseFloat(product["Price (EUR)"]?.replace(',', '.') || '0').toFixed(2)}</TableCell>
        <TableCell>
          <Badge className="bg-[#1BDD95] text-white">
            {product.homepage_featured_order ?? 'Unordered'}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleFeatured(product)}
              title="Remove from homepage"
              className="text-[#1BDD95] hover:text-[#14BE82] border-[#1BDD95]"
            >
              <Home className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  // Sortable Product Item Component
  const SortableProductItem = ({ product, category, index, totalProducts }: { product: Product; category?: string; index: number; totalProducts: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: product.uuid });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <TableRow
        ref={setNodeRef}
        style={style}
        className={isDragging ? 'bg-gray-100' : ''}
      >
        <TableCell className="w-24">
          <div className="flex items-center gap-1">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => handleProductMove(product.uuid, 'up', category)}
              disabled={index === 0}
              title="Move up"
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => handleProductMove(product.uuid, 'down', category)}
              disabled={index === totalProducts - 1}
              title="Move down"
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
        <TableCell className="font-medium max-w-xs truncate">
          {product.Name}
        </TableCell>
        <TableCell>
          <Badge className="bg-blue-100 text-blue-900">{product.Category}</Badge>
        </TableCell>
        <TableCell>
          <Badge className={product.status === 'published' ? 'bg-green-100 text-green-900' : 'bg-yellow-100 text-yellow-900'}>
            {product.status === 'published' ? 'Published' : 'Draft'}
          </Badge>
        </TableCell>
        <TableCell>€{parseFloat(product["Price (EUR)"]?.replace(',', '.') || '0').toFixed(2)}</TableCell>
        <TableCell className="text-xs">
          {product.stripe_product_id ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-green-600" title={product.stripe_product_id}>
                <span className="text-xs">✓</span>
                <span className="font-mono text-[10px] truncate max-w-[120px]">
                  {product.stripe_product_id.slice(0, 20)}...
                </span>
              </div>
              {product.stripe_price_id ? (
                <div className="flex items-center gap-1 text-blue-600" title={product.stripe_price_id}>
                  <span className="text-xs">€</span>
                  <span className="font-mono text-[10px] truncate max-w-[120px]">
                    {product.stripe_price_id.slice(0, 20)}...
                  </span>
                </div>
              ) : (
                <span className="text-orange-600 text-[10px]">No price</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Not synced</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSyncToStripe(product)}
                className="h-6 px-2 text-xs"
                title="Sync to Stripe"
              >
                <RefreshCcw className="h-3 w-3" />
              </Button>
            </div>
          )}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground max-w-xs truncate font-mono text-xs">
          {product.uuid.slice(0, 8)}...
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditDialog(product)}
              title="Edit product"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleFeatured(product)}
              title={product.featured_on_homepage ? "Hide from homepage" : "Show on homepage"}
              className={product.featured_on_homepage ? "text-[#1BDD95] hover:text-[#14BE82] border-[#1BDD95]" : ""}
            >
              <Home className="h-4 w-4" />
            </Button>
            {!product.stripe_product_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSyncToStripe(product)}
                title="Sync to Stripe"
                className="text-blue-600 hover:text-blue-700"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(product)}
              className="text-destructive hover:text-destructive"
              title="Delete product"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('all');
    setFilterStatus('all');
  };

  if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-sand">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-serif font-bold text-navy">Products Management</h1>
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
                  <Package className="h-5 w-5" />
                  Products Management
                </CardTitle>
                <CardDescription>
                  Manage webshop products. Changes automatically sync to Stripe via webhook.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchProducts()}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Link href={`/${locale}/admin/product-images`}>
                  <Button variant="outline" size="sm">
                    <Image className="h-4 w-4 mr-2" />
                    Product Images
                  </Button>
                </Link>
                <Button onClick={openAddDialog} className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
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

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'featured')} className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="all">All Products</TabsTrigger>
                <TabsTrigger value="featured">Featured Products</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
            {/* Search and Filters */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products by title or slug..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={!searchQuery && filterCategory === 'all' && filterStatus === 'all'}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>

              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {CATEGORY_OPTIONS.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
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
              </div>

              {(searchQuery || filterCategory !== 'all' || filterStatus !== 'all') && (
                <div className="text-sm text-muted-foreground">
                  Showing {filteredProducts.length} of {products.length} products
                </div>
              )}
            </div>

            {/* Ordering Mode Toggle */}
            <div className="mb-4 flex items-center gap-4">
              <Label className="text-sm font-semibold">Ordering Mode:</Label>
              <div className="flex gap-2">
                <Button
                  variant={orderingMode === 'global' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOrderingMode('global')}
                >
                  Global Order
                </Button>
                <Button
                  variant={orderingMode === 'category' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOrderingMode('category')}
                >
                  Per-Category Order
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {products.length === 0 ? 'No products found' : 'No products match your filters'}
              </div>
            ) : orderingMode === 'global' ? (
              <div className="overflow-x-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => handleDragEnd(event)}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24"></TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stripe IDs</TableHead>
                        <TableHead>UUID</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SortableContext
                        items={sortedProductsForGlobal.map(p => p.uuid)}
                        strategy={verticalListSortingStrategy}
                      >
                        {sortedProductsForGlobal.map((product, index) => (
                          <SortableProductItem
                            key={product.uuid}
                            product={product}
                            index={index}
                            totalProducts={sortedProductsForGlobal.length}
                          />
                        ))}
                      </SortableContext>
                    </TableBody>
                  </Table>
                </DndContext>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.keys(productsByCategory).sort().map((category) => {
                  const categoryProducts = productsByCategory[category];
                  const isExpanded = expandedCategories.has(category);

                  return (
                    <Card key={category}>
                      <CardHeader className="cursor-pointer" onClick={() => toggleCategory(category)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CardTitle className="flex items-center gap-2">
                              <Badge className="bg-blue-100 text-blue-900">{category}</Badge>
                              <span className="text-sm font-normal text-muted-foreground">
                                ({categoryProducts.length} {categoryProducts.length === 1 ? 'product' : 'products'})
                              </span>
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                        <CardDescription>
                          Drag products to reorder within this category. The order will be reflected on the webshop page.
                        </CardDescription>
                      </CardHeader>
                      {isExpanded && (
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={(event) => handleDragEnd(event, category)}
                            >
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-24"></TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Stripe IDs</TableHead>
                                    <TableHead>UUID</TableHead>
                                    <TableHead>Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  <SortableContext
                                    items={categoryProducts.map(p => p.uuid)}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    {categoryProducts.map((product, index) => (
                                      <SortableProductItem
                                        key={product.uuid}
                                        product={product}
                                        category={category}
                                        index={index}
                                        totalProducts={categoryProducts.length}
                                      />
                                    ))}
                                  </SortableContext>
                                </TableBody>
                              </Table>
                            </DndContext>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            {!loading && filteredProducts.length > 0 && (
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
                {filteredProducts.length !== products.length && ` (filtered from ${products.length} total)`}
              </div>
            )}
              </TabsContent>

              <TabsContent value="featured">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">
                      Drag and drop to reorder featured products. Order determines display order on homepage.
                    </p>
                  </div>

                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading featured products...</div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleFeaturedDragEnd}
                    >
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-24"></TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <SortableContext
                            items={products
                              .filter(p => p.featured_on_homepage === true)
                              .sort((a, b) => {
                                const aOrder = a.homepage_featured_order ?? 999999;
                                const bOrder = b.homepage_featured_order ?? 999999;
                                if (aOrder !== bOrder) return aOrder - bOrder;
                                return (a.Name || '').localeCompare(b.Name || '');
                              })
                              .map(p => p.uuid)}
                            strategy={verticalListSortingStrategy}
                          >
                            {products
                              .filter(p => p.featured_on_homepage === true)
                              .sort((a, b) => {
                                const aOrder = a.homepage_featured_order ?? 999999;
                                const bOrder = b.homepage_featured_order ?? 999999;
                                if (aOrder !== bOrder) return aOrder - bOrder;
                                return (a.Name || '').localeCompare(b.Name || '');
                              })
                              .map((product) => (
                                <SortableFeaturedProductItem
                                  key={product.uuid}
                                  product={product}
                                />
                              ))}
                          </SortableContext>
                        </TableBody>
                      </Table>
                    </DndContext>
                  )}

                  {!loading && products.filter(p => p.featured_on_homepage === true).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No featured products. Use the Home icon in the All Products tab to feature products.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update product information' : 'Create a new product for the webshop'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category and Price - Always visible */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="Category" className="text-navy font-semibold">Category*</Label>
                <Select
                  value={formData.Category}
                  onValueChange={(value) => setFormData({ ...formData, Category: value })}
                  required
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="Price (EUR)" className="text-navy font-semibold">Price (EUR)*</Label>
                <Input
                  id="Price (EUR)"
                  type="text"
                  value={formData["Price (EUR)"]}
                  onChange={(e) => setFormData({ ...formData, "Price (EUR)": e.target.value })}
                  required
                  className="bg-white"
                  placeholder="e.g., 45.00 or 45,00"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status" className="text-navy font-semibold">Status*</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === 'draft' ? 'Draft (not visible on website)' : 'Published (visible on website)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Draft products are only visible in the admin panel, not on the public website.
              </p>
            </div>

            {/* Language Tabs for Name, Description, Additional Info */}
            <Tabs value={formLanguageTab} onValueChange={(value) => setFormLanguageTab(value as 'nl' | 'en' | 'fr' | 'de')} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="nl">Nederlands (NL)*</TabsTrigger>
                <TabsTrigger value="en">English (EN)</TabsTrigger>
                <TabsTrigger value="fr">Francais (FR)</TabsTrigger>
                <TabsTrigger value="de">Deutsch (DE)</TabsTrigger>
              </TabsList>

              {/* Dutch (Primary) */}
              <TabsContent value="nl" className="space-y-4">
                <div>
                  <Label htmlFor="Name" className="text-navy font-semibold">Product Name (NL)*</Label>
                  <Input
                    id="Name"
                    value={formData.Name}
                    onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
                    required
                    className="bg-white"
                    placeholder="e.g., Antwerpen Zwart Wit"
                  />
                </div>
                <div>
                  <Label htmlFor="Description" className="text-navy font-semibold">Description (NL)*</Label>
                  <Textarea
                    id="Description"
                    rows={4}
                    value={formData.Description}
                    onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                    required
                    className="bg-white"
                    placeholder="Product description in Dutch..."
                  />
                </div>
                <div>
                  <Label htmlFor="Additional Info" className="text-navy font-semibold">Additional Info (NL)</Label>
                  <Textarea
                    id="Additional Info"
                    rows={3}
                    value={formData["Additional Info"]}
                    onChange={(e) => setFormData({ ...formData, "Additional Info": e.target.value })}
                    className="bg-white"
                    placeholder="Additional product information in Dutch..."
                  />
                </div>
              </TabsContent>

              {/* English */}
              <TabsContent value="en" className="space-y-4">
                <div>
                  <Label htmlFor="name_en" className="text-navy font-semibold">Product Name (EN)</Label>
                  <Input
                    id="name_en"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    className="bg-white"
                    placeholder="e.g., Antwerp Black & White"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to use Dutch version</p>
                </div>
                <div>
                  <Label htmlFor="description_en" className="text-navy font-semibold">Description (EN)</Label>
                  <Textarea
                    id="description_en"
                    rows={4}
                    value={formData.description_en}
                    onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                    className="bg-white"
                    placeholder="Product description in English..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to use Dutch version</p>
                </div>
                <div>
                  <Label htmlFor="additional_info_en" className="text-navy font-semibold">Additional Info (EN)</Label>
                  <Textarea
                    id="additional_info_en"
                    rows={3}
                    value={formData.additional_info_en}
                    onChange={(e) => setFormData({ ...formData, additional_info_en: e.target.value })}
                    className="bg-white"
                    placeholder="Additional product information in English..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to use Dutch version</p>
                </div>
              </TabsContent>

              {/* French */}
              <TabsContent value="fr" className="space-y-4">
                <div>
                  <Label htmlFor="name_fr" className="text-navy font-semibold">Product Name (FR)</Label>
                  <Input
                    id="name_fr"
                    value={formData.name_fr}
                    onChange={(e) => setFormData({ ...formData, name_fr: e.target.value })}
                    className="bg-white"
                    placeholder="e.g., Anvers Noir et Blanc"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to use English or Dutch version</p>
                </div>
                <div>
                  <Label htmlFor="description_fr" className="text-navy font-semibold">Description (FR)</Label>
                  <Textarea
                    id="description_fr"
                    rows={4}
                    value={formData.description_fr}
                    onChange={(e) => setFormData({ ...formData, description_fr: e.target.value })}
                    className="bg-white"
                    placeholder="Product description in French..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to use English or Dutch version</p>
                </div>
                <div>
                  <Label htmlFor="additional_info_fr" className="text-navy font-semibold">Additional Info (FR)</Label>
                  <Textarea
                    id="additional_info_fr"
                    rows={3}
                    value={formData.additional_info_fr}
                    onChange={(e) => setFormData({ ...formData, additional_info_fr: e.target.value })}
                    className="bg-white"
                    placeholder="Additional product information in French..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to use English or Dutch version</p>
                </div>
              </TabsContent>

              {/* German */}
              <TabsContent value="de" className="space-y-4">
                <div>
                  <Label htmlFor="name_de" className="text-navy font-semibold">Product Name (DE)</Label>
                  <Input
                    id="name_de"
                    value={formData.name_de}
                    onChange={(e) => setFormData({ ...formData, name_de: e.target.value })}
                    className="bg-white"
                    placeholder="e.g., Antwerpen Schwarz und Weiss"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to use English or Dutch version</p>
                </div>
                <div>
                  <Label htmlFor="description_de" className="text-navy font-semibold">Description (DE)</Label>
                  <Textarea
                    id="description_de"
                    rows={4}
                    value={formData.description_de}
                    onChange={(e) => setFormData({ ...formData, description_de: e.target.value })}
                    className="bg-white"
                    placeholder="Product description in German..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to use English or Dutch version</p>
                </div>
                <div>
                  <Label htmlFor="additional_info_de" className="text-navy font-semibold">Additional Info (DE)</Label>
                  <Textarea
                    id="additional_info_de"
                    rows={3}
                    value={formData.additional_info_de}
                    onChange={(e) => setFormData({ ...formData, additional_info_de: e.target.value })}
                    className="bg-white"
                    placeholder="Additional product information in German..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to use English or Dutch version</p>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

