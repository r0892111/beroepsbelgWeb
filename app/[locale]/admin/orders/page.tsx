'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Home, LogOut, RefreshCw, Search, Filter, X, ExternalLink, Package, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface StripeOrder {
  id: number;
  checkout_session_id: string;
  payment_intent_id: string;
  customer_id: string;
  amount_subtotal: number;
  amount_total: number;
  currency: string;
  payment_status: string;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  shipping_address: Record<string, unknown> | null;
  billing_address: Record<string, unknown> | null;
  items: Array<{
    title?: string;
    quantity?: number;
    price?: number;
  }> | null;
  metadata: Record<string, unknown> | null;
  total_amount: number | null;
}

const STATUS_OPTIONS = ['all', 'pending', 'completed', 'cancelled', 'refunded'];
const PAYMENT_STATUS_OPTIONS = ['all', 'paid', 'unpaid', 'no_payment_required'];

export default function AdminOrdersPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [orders, setOrders] = useState<StripeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<StripeOrder | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all');

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('stripe_orders')
        .select('*')
        .is('deleted_at', null) // Only fetch non-deleted orders
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Failed to fetch orders:', fetchError);
        setError('Failed to load orders');
        return;
      }

      setOrders((data as StripeOrder[]) || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (profile?.isAdmin || profile?.is_admin)) {
      void fetchOrders();
    }
  }, [user, profile]);

  const handleLogout = () => {
    signOut();
    router.push(`/${locale}`);
  };

  const formatAmount = (amount: number, currency: string = 'eur') => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'refunded':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getPaymentStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'unpaid':
        return 'destructive';
      case 'no_payment_required':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !searchQuery ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.checkout_session_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.payment_intent_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesPaymentStatus =
      filterPaymentStatus === 'all' || order.payment_status === filterPaymentStatus;

    return matchesSearch && matchesStatus && matchesPaymentStatus;
  });

  const handleViewOrder = (order: StripeOrder) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600 mt-1">Manage webshop orders</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/${locale}/admin/dashboard`}>
              <Button variant="outline" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by customer, email, session ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Order Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
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
              <div>
                <label className="text-sm font-medium mb-2 block">Payment Status</label>
                <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={fetchOrders} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {(searchQuery || filterStatus !== 'all' || filterPaymentStatus !== 'all') && (
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('all');
                    setFilterPaymentStatus('all');
                  }}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Orders ({filteredOrders.length})</CardTitle>
            <CardDescription>All webshop orders</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading orders...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">{error}</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No orders found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">{order.id}</TableCell>
                        <TableCell>{order.customer_name || 'N/A'}</TableCell>
                        <TableCell>{order.customer_email || 'N/A'}</TableCell>
                        <TableCell className="font-semibold">
                          {formatAmount(order.amount_total, order.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(order.status)}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPaymentStatusBadgeVariant(order.payment_status)}>
                            {order.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.created_at
                            ? format(new Date(order.created_at), 'dd MMM yyyy HH:mm')
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Detail Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>Order ID: {selectedOrder?.id}</DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Order Status</label>
                    <div className="mt-1">
                      <Badge variant={getStatusBadgeVariant(selectedOrder.status)}>
                        {selectedOrder.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Status</label>
                    <div className="mt-1">
                      <Badge variant={getPaymentStatusBadgeVariant(selectedOrder.payment_status)}>
                        {selectedOrder.payment_status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Customer Information</label>
                  <div className="mt-1 space-y-1">
                    <div>
                      <strong>Name:</strong> {selectedOrder.customer_name || 'N/A'}
                    </div>
                    <div>
                      <strong>Email:</strong> {selectedOrder.customer_email || 'N/A'}
                    </div>
                    <div>
                      <strong>Customer ID:</strong>{' '}
                      <span className="font-mono text-sm">{selectedOrder.customer_id}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Amounts</label>
                  <div className="mt-1 space-y-1">
                    <div>
                      <strong>Subtotal:</strong> {formatAmount(selectedOrder.amount_subtotal, selectedOrder.currency)}
                    </div>
                    <div>
                      <strong>Total:</strong> {formatAmount(selectedOrder.amount_total, selectedOrder.currency)}
                    </div>
                    <div>
                      <strong>Currency:</strong> {selectedOrder.currency.toUpperCase()}
                    </div>
                  </div>
                </div>

                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Items</label>
                    <div className="mt-2 space-y-2">
                      {selectedOrder.items.map((item, index) => (
                        <div key={index} className="border rounded p-2">
                          <div>
                            <strong>{item.title || 'Untitled Item'}</strong>
                          </div>
                          <div className="text-sm text-gray-600">
                            Quantity: {item.quantity || 1} ×{' '}
                            {item.price ? formatAmount(item.price * 100, selectedOrder.currency) : 'N/A'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedOrder.shipping_address && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Shipping Address</label>
                    <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(selectedOrder.shipping_address, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {selectedOrder.billing_address && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Billing Address</label>
                    <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(selectedOrder.billing_address, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500">Session Information</label>
                  <div className="mt-1 space-y-1 text-sm">
                    <div>
                      <strong>Checkout Session ID:</strong>{' '}
                      <span className="font-mono">{selectedOrder.checkout_session_id}</span>
                    </div>
                    <div>
                      <strong>Payment Intent ID:</strong>{' '}
                      <span className="font-mono">{selectedOrder.payment_intent_id}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Timestamps</label>
                  <div className="mt-1 space-y-1 text-sm">
                    <div>
                      <strong>Created:</strong>{' '}
                      {selectedOrder.created_at
                        ? format(new Date(selectedOrder.created_at), 'PPpp')
                        : 'N/A'}
                    </div>
                    <div>
                      <strong>Updated:</strong>{' '}
                      {selectedOrder.updated_at
                        ? format(new Date(selectedOrder.updated_at), 'PPpp')
                        : 'N/A'}
                    </div>
                  </div>
                </div>

                {selectedOrder.metadata && Object.keys(selectedOrder.metadata).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Metadata</label>
                    <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(selectedOrder.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

