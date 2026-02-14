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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Home, LogOut, RefreshCw, Plus, Pencil, Trash2, Gift, X, Search, Copy, CheckCircle2, ChevronDown, ChevronUp, History } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface GiftCard {
  id: string;
  code: string;
  initial_amount: number;
  current_balance: number;
  currency: string;
  status: 'active' | 'redeemed' | 'expired' | 'cancelled';
  purchaser_email: string | null;
  recipient_email: string | null;
  recipient_name: string | null;
  personal_message: string | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  purchased_at: string | null;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

interface GiftCardFormData {
  code: string;
  initial_amount: string;
  current_balance: string;
  currency: string;
  status: 'active' | 'redeemed' | 'expired' | 'cancelled';
  purchaser_email: string;
  recipient_email: string;
  recipient_name: string;
  personal_message: string;
  expires_at: string;
}

interface GiftCardTransaction {
  id: string;
  gift_card_id: string;
  order_id: string | null;
  stripe_order_id: string | null;
  amount_used: number;
  balance_before: number;
  balance_after: number;
  transaction_type: 'redemption' | 'refund' | 'adjustment';
  created_at: string;
}

const STATUS_OPTIONS = ['active', 'redeemed', 'expired', 'cancelled'] as const;
const CURRENCY_OPTIONS = ['EUR'];

export default function AdminGiftCardsPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGiftCard, setEditingGiftCard] = useState<GiftCard | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [transactions, setTransactions] = useState<Record<string, GiftCardTransaction[]>>({});
  const [loadingTransactions, setLoadingTransactions] = useState<Set<string>>(new Set());

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState<GiftCardFormData>({
    code: '',
    initial_amount: '0',
    current_balance: '0',
    currency: 'EUR',
    status: 'active',
    purchaser_email: '',
    recipient_email: '',
    recipient_name: '',
    personal_message: '',
    expires_at: '',
  });

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  const fetchGiftCards = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('gift_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Failed to fetch gift cards:', fetchError);
        setError('Failed to load gift cards');
        return;
      }

      setGiftCards((data as GiftCard[]) || []);
    } catch (err) {
      console.error('Failed to fetch gift cards:', err);
      setError('Failed to load gift cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (profile?.isAdmin || profile?.is_admin)) {
      void fetchGiftCards();
    }
  }, [user, profile]);

  const handleLogout = () => {
    signOut();
    router.push(`/${locale}`);
  };

  const openAddDialog = () => {
    setEditingGiftCard(null);
    setFormData({
      code: '',
      initial_amount: '0',
      current_balance: '0',
      currency: 'EUR',
      status: 'active',
      purchaser_email: '',
      recipient_email: '',
      recipient_name: '',
      personal_message: '',
      expires_at: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (giftCard: GiftCard) => {
    setEditingGiftCard(giftCard);
    setFormData({
      code: giftCard.code,
      initial_amount: giftCard.initial_amount.toString(),
      current_balance: giftCard.current_balance.toString(),
      currency: giftCard.currency,
      status: giftCard.status,
      purchaser_email: giftCard.purchaser_email || '',
      recipient_email: giftCard.recipient_email || '',
      recipient_name: giftCard.recipient_name || '',
      personal_message: giftCard.personal_message || '',
      expires_at: giftCard.expires_at ? new Date(giftCard.expires_at).toISOString().split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingGiftCard(null);
  };

  // Generate gift card code
  const generateGiftCardCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, I, 1)
    let code = '';
    
    for (let i = 0; i < 16; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      code += chars[randomIndex];
    }
    
    // Format as XXXX-XXXX-XXXX-XXXX
    return code.match(/.{1,4}/g)?.join('-') || code;
  };

  const generateUniqueCode = async (): Promise<string> => {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = generateGiftCardCode();
      
      // Check if code exists
      const { data } = await supabase
        .from('gift_cards')
        .select('id')
        .eq('code', code)
        .maybeSingle();
      
      if (!data) {
        return code;
      }
      
      attempts++;
    }
    
    throw new Error('Failed to generate unique code');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const initialAmount = parseFloat(formData.initial_amount);
      const currentBalance = parseFloat(formData.current_balance);

      if (isNaN(initialAmount) || initialAmount < 0) {
        toast.error('Initial amount must be a valid positive number');
        setSubmitting(false);
        return;
      }

      if (isNaN(currentBalance) || currentBalance < 0) {
        toast.error('Current balance must be a valid positive number');
        setSubmitting(false);
        return;
      }

      if (currentBalance > initialAmount) {
        toast.error('Current balance cannot exceed initial amount');
        setSubmitting(false);
        return;
      }

      // Generate code if not provided (for new gift cards)
      let finalCode = formData.code.trim().toUpperCase().replace(/\s+/g, '');
      if (!editingGiftCard && !finalCode) {
        try {
          finalCode = await generateUniqueCode();
          toast.success(`Generated code: ${finalCode}`);
        } catch (err) {
          toast.error('Failed to generate unique code. Please enter a code manually.');
          setSubmitting(false);
          return;
        }
      }

      if (!finalCode) {
        toast.error('Gift card code is required');
        setSubmitting(false);
        return;
      }

      const giftCardData: any = {
        code: finalCode,
        initial_amount: initialAmount,
        current_balance: currentBalance,
        currency: formData.currency,
        status: formData.status,
        purchaser_email: formData.purchaser_email.trim() || null,
        recipient_email: formData.recipient_email.trim() || null,
        recipient_name: formData.recipient_name.trim() || null,
        personal_message: formData.personal_message.trim() || null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      };

      if (editingGiftCard) {
        // Update existing gift card
        const { error: updateError } = await supabase
          .from('gift_cards')
          .update(giftCardData)
          .eq('id', editingGiftCard.id);

        if (updateError) {
          console.error('Failed to update gift card:', updateError);
          toast.error('Failed to update gift card');
          return;
        }

        toast.success('Gift card updated successfully');
      } else {
        // Create new gift card
        // Check if code already exists
        const { data: existing } = await supabase
          .from('gift_cards')
          .select('id')
          .eq('code', finalCode)
          .maybeSingle();

        if (existing) {
          toast.error('A gift card with this code already exists');
          setSubmitting(false);
          return;
        }

        const { error: insertError } = await supabase
          .from('gift_cards')
          .insert(giftCardData);

        if (insertError) {
          console.error('Failed to create gift card:', insertError);
          toast.error('Failed to create gift card');
          return;
        }

        toast.success('Gift card created successfully');
      }

      closeDialog();
      void fetchGiftCards();
    } catch (err) {
      console.error('Error saving gift card:', err);
      toast.error('An error occurred while saving the gift card');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (giftCard: GiftCard) => {
    if (!confirm(`Are you sure you want to delete gift card ${giftCard.code}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('gift_cards')
        .delete()
        .eq('id', giftCard.id);

      if (deleteError) {
        console.error('Failed to delete gift card:', deleteError);
        toast.error('Failed to delete gift card');
        return;
      }

      toast.success('Gift card deleted successfully');
      void fetchGiftCards();
    } catch (err) {
      console.error('Error deleting gift card:', err);
      toast.error('An error occurred while deleting the gift card');
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  const fetchTransactions = async (giftCardId: string) => {
    if (transactions[giftCardId]) {
      return; // Already loaded
    }

    setLoadingTransactions((prev) => new Set(prev).add(giftCardId));
    try {
      const { data, error: fetchError } = await supabase
        .from('gift_card_transactions')
        .select('*')
        .eq('gift_card_id', giftCardId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Failed to fetch transactions:', fetchError);
        toast.error('Failed to load transaction history');
        return;
      }

      setTransactions((prev) => ({
        ...prev,
        [giftCardId]: (data as GiftCardTransaction[]) || [],
      }));
    } catch (err) {
      console.error('Error fetching transactions:', err);
      toast.error('Failed to load transaction history');
    } finally {
      setLoadingTransactions((prev) => {
        const next = new Set(prev);
        next.delete(giftCardId);
        return next;
      });
    }
  };

  const toggleRow = async (giftCardId: string) => {
    const isExpanded = expandedRows.has(giftCardId);
    
    if (isExpanded) {
      // Collapse
      setExpandedRows((prev) => {
        const next = new Set(prev);
        next.delete(giftCardId);
        return next;
      });
    } else {
      // Expand - fetch transactions if not already loaded
      setExpandedRows((prev) => new Set(prev).add(giftCardId));
      await fetchTransactions(giftCardId);
    }
  };

  const getTransactionTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      redemption: 'default',
      refund: 'secondary',
      adjustment: 'outline',
    };

    return (
      <Badge variant={variants[type] || 'outline'}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      redeemed: 'secondary',
      expired: 'outline',
      cancelled: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Filter and search logic
  const filteredGiftCards = useMemo(() => {
    return giftCards.filter((giftCard) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        giftCard.code.toLowerCase().includes(searchLower) ||
        giftCard.recipient_email?.toLowerCase().includes(searchLower) ||
        giftCard.recipient_name?.toLowerCase().includes(searchLower) ||
        giftCard.purchaser_email?.toLowerCase().includes(searchLower);

      const matchesStatus = filterStatus === 'all' || giftCard.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [giftCards, searchQuery, filterStatus]);

  if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/${locale}/admin/dashboard`}>
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Gift Cards Management</h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Gift Cards Management
                </CardTitle>
                <CardDescription>
                  Manage gift card codes, balances, and status
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchGiftCards()}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button onClick={openAddDialog} className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Gift Card
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                {error}
              </div>
            )}

            {/* Filters */}
            <div className="mb-6 flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by code, email, or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
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

            {/* Table */}
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading gift cards...</div>
            ) : filteredGiftCards.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery || filterStatus !== 'all' ? 'No gift cards match your filters' : 'No gift cards found'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Initial Amount</TableHead>
                      <TableHead>Current Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Purchaser</TableHead>
                      <TableHead>Expires At</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGiftCards.map((giftCard) => {
                      const isExpanded = expandedRows.has(giftCard.id);
                      const giftCardTransactions = transactions[giftCard.id] || [];
                      const isLoadingTransactions = loadingTransactions.has(giftCard.id);

                      return (
                        <>
                          <TableRow
                            key={giftCard.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={(e) => {
                              // Don't toggle if clicking on action buttons
                              const target = e.target as HTMLElement;
                              if (target.closest('button')) {
                                return;
                              }
                              void toggleRow(giftCard.id);
                            }}
                          >
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void toggleRow(giftCard.id);
                                }}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="font-mono">
                              <div className="flex items-center gap-2">
                                {giftCard.code}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void copyToClipboard(giftCard.code);
                                  }}
                                >
                                  {copiedCode === giftCard.code ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>€{giftCard.initial_amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <span className={giftCard.current_balance === 0 ? 'text-gray-400' : ''}>
                                €{giftCard.current_balance.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell>{getStatusBadge(giftCard.status)}</TableCell>
                            <TableCell>
                              <div>
                                {giftCard.recipient_name && <div className="font-medium">{giftCard.recipient_name}</div>}
                                {giftCard.recipient_email && (
                                  <div className="text-sm text-gray-500">{giftCard.recipient_email}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {giftCard.purchaser_email || '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {giftCard.expires_at
                                ? new Date(giftCard.expires_at).toLocaleDateString()
                                : '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {giftCard.last_used_at
                                ? new Date(giftCard.last_used_at).toLocaleDateString()
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(giftCard)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => void handleDelete(giftCard)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${giftCard.id}-history`} className="bg-gray-50">
                              <TableCell colSpan={10} className="p-4">
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <History className="h-4 w-4 text-gray-600" />
                                    <h3 className="font-semibold text-gray-900">Transaction History</h3>
                                  </div>
                                  {isLoadingTransactions ? (
                                    <div className="text-center py-4 text-gray-500">Loading transactions...</div>
                                  ) : giftCardTransactions.length === 0 ? (
                                    <div className="text-center py-4 text-gray-500">No transactions found</div>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Amount Used</TableHead>
                                            <TableHead>Balance Before</TableHead>
                                            <TableHead>Balance After</TableHead>
                                            <TableHead>Order ID</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {giftCardTransactions.map((transaction) => (
                                            <TableRow key={transaction.id}>
                                              <TableCell className="text-sm">
                                                {new Date(transaction.created_at).toLocaleString()}
                                              </TableCell>
                                              <TableCell>
                                                {getTransactionTypeBadge(transaction.transaction_type)}
                                              </TableCell>
                                              <TableCell className="font-medium">
                                                €{transaction.amount_used.toFixed(2)}
                                              </TableCell>
                                              <TableCell className="text-sm text-gray-600">
                                                €{transaction.balance_before.toFixed(2)}
                                              </TableCell>
                                              <TableCell className="text-sm font-medium">
                                                €{transaction.balance_after.toFixed(2)}
                                              </TableCell>
                                              <TableCell className="text-sm text-gray-500 font-mono">
                                                {transaction.order_id || transaction.stripe_order_id || '-'}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGiftCard ? 'Edit Gift Card' : 'Add New Gift Card'}
            </DialogTitle>
            <DialogDescription>
              {editingGiftCard
                ? 'Update gift card information'
                : 'Create a new gift card code'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      required
                      disabled={!!editingGiftCard}
                      className="flex-1"
                    />
                    {!editingGiftCard && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          try {
                            const code = await generateUniqueCode();
                            setFormData({ ...formData, code });
                            toast.success('Code generated');
                          } catch (err) {
                            toast.error('Failed to generate code');
                          }
                        }}
                      >
                        Generate
                      </Button>
                    )}
                  </div>
                  {!editingGiftCard && (
                    <p className="text-xs text-gray-500">
                      Leave empty or click Generate to auto-generate
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="initial_amount">Initial Amount (€) *</Label>
                  <Input
                    id="initial_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.initial_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, initial_amount: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current_balance">Current Balance (€) *</Label>
                  <Input
                    id="current_balance"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.current_balance}
                    onChange={(e) =>
                      setFormData({ ...formData, current_balance: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient_name">Recipient Name</Label>
                  <Input
                    id="recipient_name"
                    value={formData.recipient_name}
                    onChange={(e) =>
                      setFormData({ ...formData, recipient_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipient_email">Recipient Email</Label>
                  <Input
                    id="recipient_email"
                    type="email"
                    value={formData.recipient_email}
                    onChange={(e) =>
                      setFormData({ ...formData, recipient_email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaser_email">Purchaser Email</Label>
                <Input
                  id="purchaser_email"
                  type="email"
                  value={formData.purchaser_email}
                  onChange={(e) =>
                    setFormData({ ...formData, purchaser_email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="personal_message">Personal Message</Label>
                <Textarea
                  id="personal_message"
                  value={formData.personal_message}
                  onChange={(e) =>
                    setFormData({ ...formData, personal_message: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires_at">Expires At</Label>
                <Input
                  id="expires_at"
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) =>
                    setFormData({ ...formData, expires_at: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : editingGiftCard ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
