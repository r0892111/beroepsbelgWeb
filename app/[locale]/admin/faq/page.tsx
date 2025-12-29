'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Home, LogOut, RefreshCw, Plus, Pencil, Trash2, HelpCircle, X, Search, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
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

interface FaqItem {
  id: number;
  question_nl: string;
  question_en: string;
  question_fr: string;
  question_de: string;
  answer_nl: string;
  answer_en: string;
  answer_fr: string;
  answer_de: string;
  sort_order: number | null;
  created_at?: string;
  updated_at?: string;
}

interface FaqFormData {
  question_nl: string;
  question_en: string;
  question_fr: string;
  question_de: string;
  answer_nl: string;
  answer_en: string;
  answer_fr: string;
  answer_de: string;
  sort_order: number;
}

export default function AdminFaqPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaqItem, setEditingFaqItem] = useState<FaqItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState<FaqFormData>({
    question_nl: '',
    question_en: '',
    question_fr: '',
    question_de: '',
    answer_nl: '',
    answer_en: '',
    answer_fr: '',
    answer_de: '',
    sort_order: 0,
  });

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  const fetchFaqItems = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try faq_items first, fallback to FAQ_ITEMS if needed
      let { data, error: fetchError } = await supabase
        .from('faq_items')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false });

      // If faq_items doesn't work, try FAQ_ITEMS
      if (fetchError && fetchError.message?.includes('does not exist')) {
        const result = await supabase
          .from('FAQ_ITEMS')
          .select('*')
          .order('sort_order', { ascending: true, nullsFirst: false });
        data = result.data;
        fetchError = result.error;
      }

      if (fetchError) {
        console.error('Failed to fetch FAQ items:', fetchError);
        setError('Failed to load FAQ items');
        toast.error('Failed to load FAQ items');
        return;
      }

      setFaqItems((data as FaqItem[]) || []);
    } catch (err) {
      console.error('Failed to fetch FAQ items:', err);
      setError('Failed to load FAQ items');
      toast.error('Failed to load FAQ items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (profile?.isAdmin || profile?.is_admin)) {
      void fetchFaqItems();
    }
  }, [user, profile]);

  const handleLogout = () => {
    signOut();
    router.push(`/${locale}`);
  };

  const openAddDialog = () => {
    setEditingFaqItem(null);
    setFormData({
      question_nl: '',
      question_en: '',
      question_fr: '',
      question_de: '',
      answer_nl: '',
      answer_en: '',
      answer_fr: '',
      answer_de: '',
      sort_order: faqItems.length > 0 ? Math.max(...faqItems.map(item => item.sort_order || 0)) + 1 : 0,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (item: FaqItem) => {
    setEditingFaqItem(item);
    setFormData({
      question_nl: item.question_nl || '',
      question_en: item.question_en || '',
      question_fr: item.question_fr || '',
      question_de: item.question_de || '',
      answer_nl: item.answer_nl || '',
      answer_en: item.answer_en || '',
      answer_fr: item.answer_fr || '',
      answer_de: item.answer_de || '',
      sort_order: item.sort_order || 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        question_nl: formData.question_nl.trim(),
        question_en: formData.question_en.trim(),
        question_fr: formData.question_fr.trim(),
        question_de: formData.question_de.trim(),
        answer_nl: formData.answer_nl.trim(),
        answer_en: formData.answer_en.trim(),
        answer_fr: formData.answer_fr.trim(),
        answer_de: formData.answer_de.trim(),
        sort_order: formData.sort_order,
      };

      if (editingFaqItem) {
        // Update existing FAQ item
        const { error } = await supabase
          .from('faq_items')
          .update(payload)
          .eq('id', editingFaqItem.id);

        if (error) {
          console.error('Failed to update FAQ item:', error);
          toast.error('Failed to update FAQ item');
          return;
        }

        toast.success('FAQ item updated successfully');
      } else {
        // Create new FAQ item
        const { error } = await supabase
          .from('faq_items')
          .insert([payload]);

        if (error) {
          console.error('Failed to create FAQ item:', error);
          toast.error('Failed to create FAQ item');
          return;
        }

        toast.success('FAQ item created successfully');
      }

      setDialogOpen(false);
      await fetchFaqItems();
    } catch (err) {
      console.error('Failed to save FAQ item:', err);
      toast.error('Failed to save FAQ item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this FAQ item?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('faq_items')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete FAQ item:', error);
        toast.error('Failed to delete FAQ item');
        return;
      }

      toast.success('FAQ item deleted successfully');
      await fetchFaqItems();
    } catch (err) {
      console.error('Failed to delete FAQ item:', err);
      toast.error('Failed to delete FAQ item');
    }
  };

  const filteredFaqItems = useMemo(() => {
    return faqItems.filter((item) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        item.question_nl?.toLowerCase().includes(query) ||
        item.question_en?.toLowerCase().includes(query) ||
        item.question_fr?.toLowerCase().includes(query) ||
        item.question_de?.toLowerCase().includes(query) ||
        item.answer_nl?.toLowerCase().includes(query) ||
        item.answer_en?.toLowerCase().includes(query) ||
        item.answer_fr?.toLowerCase().includes(query) ||
        item.answer_de?.toLowerCase().includes(query)
      );
    });
  }, [faqItems, searchQuery]);

  // Sort filtered items by sort_order
  const sortedFaqItems = useMemo(() => {
    return [...filteredFaqItems].sort((a, b) => {
      if (a.sort_order === null && b.sort_order === null) {
        return (a.id || 0) - (b.id || 0);
      }
      if (a.sort_order === null) return 1;
      if (b.sort_order === null) return -1;
      return a.sort_order - b.sort_order;
    });
  }, [filteredFaqItems]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = sortedFaqItems.findIndex(item => item.id === active.id);
    const newIndex = sortedFaqItems.findIndex(item => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Optimistically update UI
    const reorderedItems = arrayMove(sortedFaqItems, oldIndex, newIndex);
    const reorderedItemsWithOrder = reorderedItems.map((item, index) => ({
      ...item,
      sort_order: index + 1,
    }));

    setFaqItems(reorderedItemsWithOrder);

    // Update sort_order in database
    try {
      for (const item of reorderedItemsWithOrder) {
        const { error } = await supabase
          .from('faq_items')
          .update({ sort_order: item.sort_order })
          .eq('id', item.id);

        if (error) {
          console.error('Failed to update sort_order:', error);
          throw error;
        }
      }

      toast.success('FAQ order updated');
    } catch (err) {
      console.error('Failed to update FAQ order:', err);
      toast.error('Failed to update FAQ order');
      // Revert on error
      void fetchFaqItems();
    }
  };

  // FAQ item move up/down handlers
  const handleFaqMove = async (itemId: number, direction: 'up' | 'down') => {
    const currentIndex = sortedFaqItems.findIndex(item => item.id === itemId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sortedFaqItems.length) return;

    // Create a fake drag event to reuse existing logic
    const fakeEvent = {
      active: { id: itemId },
      over: { id: sortedFaqItems[newIndex].id },
    } as DragEndEvent;

    await handleDragEnd(fakeEvent);
  };

  // Sortable FAQ Item Component
  const SortableFaqItem = ({ item, index }: { item: FaqItem; index: number }) => {
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
              onClick={() => handleFaqMove(item.id, 'up')}
              disabled={index === 0}
              title="Move up"
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => handleFaqMove(item.id, 'down')}
              disabled={index === sortedFaqItems.length - 1}
              title="Move down"
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
        <TableCell className="font-medium">{item.sort_order ?? '-'}</TableCell>
        <TableCell className="max-w-xs truncate">{item.question_nl || '-'}</TableCell>
        <TableCell className="max-w-xs truncate">{item.question_en || '-'}</TableCell>
        <TableCell className="max-w-md truncate text-sm text-gray-500">
          {item.answer_nl?.substring(0, 100) || item.answer_en?.substring(0, 100) || '-'}
          {(item.answer_nl?.length || item.answer_en?.length || 0) > 100 ? '...' : ''}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditDialog(item)}
              className="h-8 w-8 p-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(item.id)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
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
            <h1 className="text-3xl font-bold text-gray-900">FAQ Management</h1>
            <p className="mt-1 text-sm text-gray-500">Manage frequently asked questions</p>
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
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search FAQ items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={fetchFaqItems} disabled={loading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button onClick={openAddDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add FAQ Item
                </Button>
              </div>
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

        {/* FAQ Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>FAQ Items ({sortedFaqItems.length})</CardTitle>
            <CardDescription>Manage all frequently asked questions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : filteredFaqItems.length === 0 ? (
              <div className="py-12 text-center">
                <HelpCircle className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-4 text-sm text-gray-500">No FAQ items found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24"></TableHead>
                        <TableHead className="w-16">Order</TableHead>
                        <TableHead>Question (NL)</TableHead>
                        <TableHead>Question (EN)</TableHead>
                        <TableHead>Answer Preview</TableHead>
                        <TableHead className="w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SortableContext
                        items={sortedFaqItems.map(item => item.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {sortedFaqItems.map((item, index) => (
                          <SortableFaqItem
                            key={item.id}
                            item={item}
                            index={index}
                          />
                        ))}
                      </SortableContext>
                    </TableBody>
                  </Table>
                </DndContext>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingFaqItem ? 'Edit FAQ Item' : 'Add FAQ Item'}</DialogTitle>
              <DialogDescription>
                {editingFaqItem ? 'Update the FAQ item details' : 'Create a new FAQ item with translations'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="space-y-6 py-4">
                {/* Sort Order */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="sort_order">Sort Order</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                      min="0"
                    />
                  </div>
                </div>

                {/* Questions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Questions</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="question_nl">Question (Dutch)</Label>
                      <Input
                        id="question_nl"
                        value={formData.question_nl}
                        onChange={(e) => setFormData({ ...formData, question_nl: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="question_en">Question (English)</Label>
                      <Input
                        id="question_en"
                        value={formData.question_en}
                        onChange={(e) => setFormData({ ...formData, question_en: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="question_fr">Question (French)</Label>
                      <Input
                        id="question_fr"
                        value={formData.question_fr}
                        onChange={(e) => setFormData({ ...formData, question_fr: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="question_de">Question (German)</Label>
                      <Input
                        id="question_de"
                        value={formData.question_de}
                        onChange={(e) => setFormData({ ...formData, question_de: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Answers */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Answers</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="answer_nl">Answer (Dutch)</Label>
                      <Textarea
                        id="answer_nl"
                        value={formData.answer_nl}
                        onChange={(e) => setFormData({ ...formData, answer_nl: e.target.value })}
                        rows={4}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="answer_en">Answer (English)</Label>
                      <Textarea
                        id="answer_en"
                        value={formData.answer_en}
                        onChange={(e) => setFormData({ ...formData, answer_en: e.target.value })}
                        rows={4}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="answer_fr">Answer (French)</Label>
                      <Textarea
                        id="answer_fr"
                        value={formData.answer_fr}
                        onChange={(e) => setFormData({ ...formData, answer_fr: e.target.value })}
                        rows={4}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="answer_de">Answer (German)</Label>
                      <Textarea
                        id="answer_de"
                        value={formData.answer_de}
                        onChange={(e) => setFormData({ ...formData, answer_de: e.target.value })}
                        rows={4}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : editingFaqItem ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

