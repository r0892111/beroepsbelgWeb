'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Home, LogOut, Plus, Pencil, Trash2, Search, X, Upload, Image as ImageIcon, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Image from 'next/image';
import { format } from 'date-fns';
import type { Blog } from '@/lib/data/types';
import BlogEditor from '@/components/admin/blog-editor';
// Note: Using API routes instead of direct server function calls since this is a client component

const STORAGE_BUCKET = 'airbnb-images';
const STORAGE_FOLDER = 'blog-images';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Helper function to generate slug from title
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Helper function to generate SEO fields
const generateSEOFields = (title: string, excerpt?: string, content?: string, thumbnail?: string) => {
  const meta_title = `${title} | Beroepsbelg`;
  
  let meta_description = '';
  if (excerpt) {
    meta_description = excerpt.length > 160 ? excerpt.substring(0, 157) + '...' : excerpt;
  } else if (content) {
    const plainText = content.replace(/[#*`\[\]()]/g, '').replace(/\n/g, ' ').trim();
    meta_description = plainText.length > 160 ? plainText.substring(0, 157) + '...' : plainText;
  }
  
  const og_image_url = thumbnail || undefined;
  
  return { meta_title, meta_description, og_image_url };
};

export default function AdminBlogsPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('admin.blogs');
  const tForm = useTranslations('admin.blogs.form');

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterFeatured, setFilterFeatured] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'main' | 'content' | 'seo' | 'multilang'>('main');
  const [showMultilang, setShowMultilang] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    thumbnail_url: '',
    author: '',
    published_at: '',
    status: 'draft' as 'draft' | 'published',
    featured: false,
    category: '',
    display_order: '',
    meta_title: '',
    meta_description: '',
    og_image_url: '',
    // Multi-language fields
    title_en: '',
    excerpt_en: '',
    content_en: '',
    title_fr: '',
    excerpt_fr: '',
    content_fr: '',
    title_de: '',
    excerpt_de: '',
    content_de: '',
  });

  // Image upload state
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  const fetchBlogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/blogs');
      if (!response.ok) {
        throw new Error('Failed to fetch blogs');
      }
      const allBlogs = await response.json();
      setBlogs(allBlogs);
    } catch (err) {
      console.error('Failed to fetch blogs:', err);
      setError('Failed to load blogs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (profile?.isAdmin || profile?.is_admin)) {
      void fetchBlogs();
    }
  }, [user, profile]);

  const filteredBlogs = useMemo(() => {
    let filtered = blogs;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (blog) =>
          blog.title.toLowerCase().includes(query) ||
          blog.excerpt?.toLowerCase().includes(query) ||
          blog.category?.toLowerCase().includes(query)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((blog) => blog.status === filterStatus);
    }

    if (filterFeatured !== null) {
      filtered = filtered.filter((blog) => blog.featured === filterFeatured);
    }

    return filtered;
  }, [blogs, searchQuery, filterStatus, filterFeatured]);

  const handleLogout = async () => {
    await signOut();
    router.push(`/${locale}`);
  };

  const openAddDialog = () => {
    setEditingBlog(null);
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      thumbnail_url: '',
      author: '',
      published_at: '',
      status: 'draft',
      featured: false,
      category: '',
      display_order: '',
      meta_title: '',
      meta_description: '',
      og_image_url: '',
      title_en: '',
      excerpt_en: '',
      content_en: '',
      title_fr: '',
      excerpt_fr: '',
      content_fr: '',
      title_de: '',
      excerpt_de: '',
      content_de: '',
    });
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setActiveTab('main');
    setShowMultilang(false);
    setDialogOpen(true);
  };

  const openEditDialog = (blog: Blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title || '',
      slug: blog.slug || '',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      thumbnail_url: blog.thumbnail_url || '',
      author: blog.author || '',
      published_at: blog.published_at ? format(new Date(blog.published_at), "yyyy-MM-dd'T'HH:mm") : '',
      status: blog.status || 'draft',
      featured: blog.featured || false,
      category: blog.category || '',
      display_order: blog.display_order?.toString() || '',
      meta_title: blog.meta_title || '',
      meta_description: blog.meta_description || '',
      og_image_url: blog.og_image_url || '',
      title_en: blog.title_en || '',
      excerpt_en: blog.excerpt_en || '',
      content_en: blog.content_en || '',
      title_fr: blog.title_fr || '',
      excerpt_fr: blog.excerpt_fr || '',
      content_fr: blog.content_fr || '',
      title_de: blog.title_de || '',
      excerpt_de: blog.excerpt_de || '',
      content_de: blog.content_de || '',
    });
    setThumbnailPreview(blog.thumbnail_url || null);
    setThumbnailFile(null);
    setActiveTab('main');
    setShowMultilang(false);
    setDialogOpen(true);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setThumbnailPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setFormData((prev) => ({ ...prev, thumbnail_url: '' }));
  };

  const uploadThumbnailToStorage = async (blogId: string): Promise<string | null> => {
    if (!thumbnailFile) return null;

    try {
      const fileExt = thumbnailFile.name.split('.').pop();
      const fileName = `${blogId}/${Date.now()}.${fileExt}`;
      const filePath = `${STORAGE_FOLDER}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, thumbnailFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading thumbnail:', uploadError);
        toast.error('Failed to upload thumbnail');
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Exception uploading thumbnail:', err);
      toast.error('Failed to upload thumbnail');
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error(tForm('titleRequired'));
      return;
    }

    setSubmitting(true);

    try {
      let thumbnailUrl = formData.thumbnail_url;

      // Upload thumbnail if new file selected
      if (thumbnailFile && editingBlog) {
        const uploadedUrl = await uploadThumbnailToStorage(editingBlog.id);
        if (uploadedUrl) thumbnailUrl = uploadedUrl;
      } else if (thumbnailFile) {
        // For new blog, we need to create it first, then upload thumbnail
        // We'll handle this after blog creation
      }

      // Auto-generate slug if empty
      const slug = formData.slug || generateSlug(formData.title);

      // Auto-generate SEO fields if empty
      const seoFields = generateSEOFields(
        formData.title,
        formData.excerpt,
        formData.content,
        thumbnailUrl || formData.og_image_url
      );

      const blogData: Omit<Blog, 'id' | 'created_at' | 'updated_at' | 'blogImages'> = {
        title: formData.title,
        slug,
        excerpt: formData.excerpt || undefined,
        content: formData.content,
        thumbnail_url: thumbnailUrl || undefined,
        author: formData.author || undefined,
        published_at: formData.published_at || undefined,
        status: formData.status,
        featured: formData.featured,
        category: formData.category || undefined,
        display_order: formData.display_order ? parseInt(formData.display_order) : undefined,
        meta_title: formData.meta_title || seoFields.meta_title,
        meta_description: formData.meta_description || seoFields.meta_description,
        og_image_url: formData.og_image_url || seoFields.og_image_url,
        title_en: formData.title_en || undefined,
        excerpt_en: formData.excerpt_en || undefined,
        content_en: formData.content_en || undefined,
        title_fr: formData.title_fr || undefined,
        excerpt_fr: formData.excerpt_fr || undefined,
        content_fr: formData.content_fr || undefined,
        title_de: formData.title_de || undefined,
        excerpt_de: formData.excerpt_de || undefined,
        content_de: formData.content_de || undefined,
      };

      if (editingBlog) {
        // Update existing blog
        if (thumbnailFile) {
          const uploadedUrl = await uploadThumbnailToStorage(editingBlog.id);
          if (uploadedUrl) blogData.thumbnail_url = uploadedUrl;
        }
        const response = await fetch(`/api/blogs/${editingBlog.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(blogData),
        });
        if (!response.ok) {
          throw new Error('Failed to update blog');
        }
        toast.success(t('saveSuccess'));
      } else {
        // Create new blog
        const response = await fetch('/api/blogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(blogData),
        });
        if (!response.ok) {
          throw new Error('Failed to create blog');
        }
        const newBlog = await response.json();
        if (newBlog && thumbnailFile) {
          const uploadedUrl = await uploadThumbnailToStorage(newBlog.id);
          if (uploadedUrl) {
            await fetch(`/api/blogs/${newBlog.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ thumbnail_url: uploadedUrl }),
            });
          }
        }
        toast.success(t('saveSuccess'));
      }

      setDialogOpen(false);
      await fetchBlogs();
    } catch (err: any) {
      console.error('Error saving blog:', err);
      toast.error(t('saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;

    try {
      const response = await fetch(`/api/blogs/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete blog');
      }
      toast.success(t('deleteSuccess'));
      await fetchBlogs();
    } catch (err) {
      console.error('Error deleting blog:', err);
      toast.error(t('deleteError'));
    }
  };

  // Auto-generate slug when title changes
  useEffect(() => {
    if (!editingBlog && formData.title && !formData.slug) {
      setFormData((prev) => ({ ...prev, slug: generateSlug(prev.title) }));
    }
  }, [formData.title, editingBlog]);

  // Auto-generate SEO fields when title/excerpt/content changes
  useEffect(() => {
    if (!formData.meta_title && formData.title) {
      setFormData((prev) => ({
        ...prev,
        meta_title: generateSEOFields(prev.title, prev.excerpt, prev.content).meta_title,
      }));
    }
    if (!formData.meta_description && (formData.excerpt || formData.content)) {
      setFormData((prev) => ({
        ...prev,
        meta_description: generateSEOFields(prev.title, prev.excerpt, prev.content).meta_description,
      }));
    }
    if (!formData.og_image_url && formData.thumbnail_url) {
      setFormData((prev) => ({
        ...prev,
        og_image_url: prev.thumbnail_url,
      }));
    }
  }, [formData.title, formData.excerpt, formData.content, formData.thumbnail_url]);

  if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-sand">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-navy">{t('title')}</h1>
            <p className="text-sm text-gray-600 mt-1">{t('subtitle')}</p>
          </div>
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
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="draft">{t('draft')}</SelectItem>
                <SelectItem value="published">{t('published')}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={filterFeatured === true ? 'default' : 'outline'}
              onClick={() => setFilterFeatured(filterFeatured === true ? null : true)}
            >
              {t('filterByFeatured')}
            </Button>
            <Button onClick={openAddDialog} className="bg-[#1BDD95] hover:bg-[#1BDD95]/90">
              <Plus className="h-4 w-4 mr-2" />
              {t('createBlog')}
            </Button>
          </div>
        </div>

        {/* Blogs List */}
        {loading ? (
          <div className="text-center py-12">
            <p>{tForm('loading')}</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">
            <p>{error}</p>
          </div>
        ) : filteredBlogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">{t('noBlogsFound')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredBlogs.map((blog) => (
              <Card key={blog.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-serif font-bold text-navy">{blog.title}</h3>
                        <Badge variant={blog.status === 'published' ? 'default' : 'secondary'}>
                          {blog.status === 'published' ? t('published') : t('draft')}
                        </Badge>
                        {blog.featured && (
                          <Badge variant="outline" className="bg-yellow-50">
                            {t('featured')}
                          </Badge>
                        )}
                      </div>
                      {blog.excerpt && (
                        <p className="text-gray-600 mb-2 line-clamp-2">{blog.excerpt}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {blog.author && <span>{t('author')}: {blog.author}</span>}
                        {blog.published_at && (
                          <span>{format(new Date(blog.published_at), 'PPP')}</span>
                        )}
                        {blog.category && <span>{blog.category}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(blog)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(blog.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBlog ? t('editBlog') : t('createBlog')}</DialogTitle>
            <DialogDescription>
              {editingBlog ? 'Edit blog post details' : 'Create a new blog post'}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="main">{tForm('editor')}</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="seo">{tForm('seoTab')}</TabsTrigger>
              <TabsTrigger value="multilang">
                <Globe className="h-4 w-4 mr-1" />
                {tForm('multilangTab')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="main" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">{tForm('title')}</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Blog post title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">{tForm('slug')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="url-slug"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData((prev) => ({ ...prev, slug: generateSlug(prev.title) }))}
                  >
                    {tForm('slugAutoGenerate')}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">{tForm('excerpt')}</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Brief excerpt for listing page"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnail">{tForm('thumbnail')}</Label>
                {thumbnailPreview ? (
                  <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                    <Image src={thumbnailPreview} alt="Thumbnail preview" fill className="object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={removeThumbnail}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <Label htmlFor="thumbnail-upload" className="cursor-pointer">
                      <span className="text-sm text-gray-600">{tForm('thumbnailUpload')}</span>
                      <input
                        id="thumbnail-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileInput}
                        className="hidden"
                      />
                    </Label>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="author">{tForm('author')}</Label>
                  <Input
                    id="author"
                    value={formData.author}
                    onChange={(e) => setFormData((prev) => ({ ...prev, author: e.target.value }))}
                    placeholder="Author name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="published_at">{tForm('publishedAt')}</Label>
                  <Input
                    id="published_at"
                    type="datetime-local"
                    value={formData.published_at}
                    onChange={(e) => setFormData((prev) => ({ ...prev, published_at: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">{tForm('status')}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, status: v as 'draft' | 'published' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{t('draft')}</SelectItem>
                      <SelectItem value="published">{t('published')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display_order">{tForm('displayOrder')}</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData((prev) => ({ ...prev, display_order: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">{tForm('category')}</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="Category or tag"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, featured: checked === true }))}
                />
                <Label htmlFor="featured" className="cursor-pointer">
                  {t('featured')}
                </Label>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4 mt-4">
              <BlogEditor
                content={formData.content}
                onChange={(newContent) => setFormData((prev) => ({ ...prev, content: newContent }))}
                blogId={editingBlog?.id}
              />
            </TabsContent>

            <TabsContent value="seo" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="meta_title">{tForm('metaTitle')}</Label>
                <Input
                  id="meta_title"
                  value={formData.meta_title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meta_title: e.target.value }))}
                  placeholder="Auto-generated from title"
                />
                <p className="text-xs text-gray-500">Auto-filled if empty</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_description">{tForm('metaDescription')}</Label>
                <Textarea
                  id="meta_description"
                  value={formData.meta_description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meta_description: e.target.value }))}
                  placeholder="Auto-generated from excerpt or content"
                  rows={3}
                />
                <p className="text-xs text-gray-500">Auto-filled if empty</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="og_image_url">{tForm('ogImage')}</Label>
                <Input
                  id="og_image_url"
                  value={formData.og_image_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, og_image_url: e.target.value }))}
                  placeholder="Auto-filled from thumbnail"
                />
                <p className="text-xs text-gray-500">Auto-filled from thumbnail if empty</p>
              </div>
            </TabsContent>

            <TabsContent value="multilang" className="space-y-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  {tForm('multilangTab')} - {tForm('copyFromDutch')}
                </p>
              </div>

              <div className="space-y-6">
                {/* English */}
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold">{tForm('english')}</h4>
                  <div className="space-y-2">
                    <Label>{tForm('titleEn')}</Label>
                    <Input
                      value={formData.title_en}
                      onChange={(e) => setFormData((prev) => ({ ...prev, title_en: e.target.value }))}
                      placeholder="English title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{tForm('excerptEn')}</Label>
                    <Textarea
                      value={formData.excerpt_en}
                      onChange={(e) => setFormData((prev) => ({ ...prev, excerpt_en: e.target.value }))}
                      placeholder="English excerpt"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{tForm('contentEn')}</Label>
                    <BlogEditor
                      content={formData.content_en}
                      onChange={(newContent) => setFormData((prev) => ({ ...prev, content_en: newContent }))}
                      blogId={editingBlog?.id}
                    />
                  </div>
                </div>

                {/* French */}
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold">{tForm('french')}</h4>
                  <div className="space-y-2">
                    <Label>{tForm('titleFr')}</Label>
                    <Input
                      value={formData.title_fr}
                      onChange={(e) => setFormData((prev) => ({ ...prev, title_fr: e.target.value }))}
                      placeholder="French title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{tForm('excerptFr')}</Label>
                    <Textarea
                      value={formData.excerpt_fr}
                      onChange={(e) => setFormData((prev) => ({ ...prev, excerpt_fr: e.target.value }))}
                      placeholder="French excerpt"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{tForm('contentFr')}</Label>
                    <BlogEditor
                      content={formData.content_fr}
                      onChange={(newContent) => setFormData((prev) => ({ ...prev, content_fr: newContent }))}
                      blogId={editingBlog?.id}
                    />
                  </div>
                </div>

                {/* German */}
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold">{tForm('german')}</h4>
                  <div className="space-y-2">
                    <Label>{tForm('titleDe')}</Label>
                    <Input
                      value={formData.title_de}
                      onChange={(e) => setFormData((prev) => ({ ...prev, title_de: e.target.value }))}
                      placeholder="German title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{tForm('excerptDe')}</Label>
                    <Textarea
                      value={formData.excerpt_de}
                      onChange={(e) => setFormData((prev) => ({ ...prev, excerpt_de: e.target.value }))}
                      placeholder="German excerpt"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{tForm('contentDe')}</Label>
                    <BlogEditor
                      content={formData.content_de}
                      onChange={(newContent) => setFormData((prev) => ({ ...prev, content_de: newContent }))}
                      blogId={editingBlog?.id}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tForm('cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? tForm('saving') : tForm('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

