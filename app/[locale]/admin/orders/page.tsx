'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Home, LogOut, RefreshCw, Search, Filter, X, ExternalLink, Package, Eye, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all');

  // Create order form state
  const [orderItems, setOrderItems] = useState<Array<{ productId: string; quantity: number; customPrice?: number; isGiftCard?: boolean }>>([]);
  const [orderFormData, setOrderFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'België',
    giftCardCode: '',
    giftCardDiscount: 0,
    isPaid: false,
  });
  const [creatingOrder, setCreatingOrder] = useState(false);

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

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const { data, error } = await supabase
        .from('webshop_data')
        .select('uuid, Name, "Price (EUR)", Category, is_giftcard')
        .order('Name', { ascending: true });

      if (error) {
        console.error('Failed to fetch products:', error);
        toast.error('Failed to load products');
        return;
      }

      setProducts((data || []).map((p: any) => ({
        uuid: p.uuid,
        name: p.Name,
        price: parseFloat(p['Price (EUR)']?.toString().replace(',', '.') || '0'),
        category: p.Category,
        isGiftCard: p.is_giftcard === true || p.Category === 'GiftCard',
      })));
    } catch (err) {
      console.error('Failed to fetch products:', err);
      toast.error('Failed to load products');
    } finally {
      setProductsLoading(false);
    }
  };

  const openCreateOrderDialog = () => {
    setCreateOrderDialogOpen(true);
    setOrderItems([]);
    setOrderFormData({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      street: '',
      city: '',
      postalCode: '',
      country: 'België',
      giftCardCode: '',
      giftCardDiscount: 0,
      isPaid: false,
    });
    void fetchProducts();
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, { productId: '', quantity: 1 }]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };
    setOrderItems(updated);
  };

  const handleCreateOrder = async () => {
    if (!orderFormData.customerName || !orderFormData.customerEmail) {
      toast.error('Customer name and email are required');
      return;
    }

    if (orderItems.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    // Check if all items have productId
    if (orderItems.some(item => !item.productId)) {
      toast.error('Please select a product for all items');
      return;
    }

    // Check if gift card only
    const isGiftCardOnly = orderItems.every(item => {
      const product = products.find(p => p.uuid === item.productId);
      return product?.isGiftCard;
    });

    // Validate shipping address if not gift card only
    if (!isGiftCardOnly) {
      if (!orderFormData.street || !orderFormData.city || !orderFormData.postalCode) {
        toast.error('Shipping address is required for physical products');
        return;
      }
    }

    setCreatingOrder(true);
    try {
      // Calculate order totals
      let subtotal = 0;
      const orderItemsFormatted: any[] = [];

      for (const item of orderItems) {
        const product = products.find(p => p.uuid === item.productId);
        if (!product) continue;

        const quantity = item.quantity || 1;
        const price = item.customPrice && item.customPrice >= 10 ? item.customPrice : product.price;
        const itemTotal = price * quantity;
        subtotal += itemTotal;

        orderItemsFormatted.push({
          title: product.name,
          quantity: quantity,
          price: price,
          productId: product.uuid,
        });
      }

      // Calculate shipping cost
      const FREIGHT_COST_BE = 7.50;
      const FREIGHT_COST_INTERNATIONAL = 14.99;
      let shippingCost = 0;
      if (!isGiftCardOnly) {
        const isBelgium = orderFormData.country === 'België' || orderFormData.country === 'Belgium';
        shippingCost = isBelgium ? FREIGHT_COST_BE : FREIGHT_COST_INTERNATIONAL;
        orderItemsFormatted.push({
          title: isBelgium ? 'Verzendkosten (België)' : 'Verzendkosten (Internationaal)',
          quantity: 1,
          price: shippingCost,
        });
      }

      // Apply gift card discount
      const totalBeforeDiscount = subtotal + shippingCost;
      const finalTotal = Math.max(0, totalBeforeDiscount - (orderFormData.giftCardDiscount || 0));

      // Prepare shipping address
      const shippingAddress = !isGiftCardOnly ? {
        name: orderFormData.customerName,
        street: orderFormData.street,
        city: orderFormData.city,
        postalCode: orderFormData.postalCode,
        country: orderFormData.country,
      } : {
        name: orderFormData.customerName,
        street: '',
        city: '',
        postalCode: '',
        country: 'BE',
      };

      // Generate unique IDs for manual orders
      const checkoutSessionId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const paymentIntentId = orderFormData.isPaid ? `pi_manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : `pi_unpaid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const customerId = `cus_manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create order directly in database
      const { data: newOrder, error: orderError } = await supabase
        .from('stripe_orders')
        .insert({
          checkout_session_id: checkoutSessionId,
          payment_intent_id: paymentIntentId,
          stripe_payment_intent_id: paymentIntentId,
          customer_id: customerId,
          amount_subtotal: Math.round((subtotal - (orderFormData.giftCardDiscount || 0)) * 100), // In cents
          amount_total: Math.round(finalTotal * 100), // In cents
          currency: 'eur',
          payment_status: orderFormData.isPaid ? 'paid' : 'unpaid',
          status: orderFormData.isPaid ? 'completed' : 'pending',
          total_amount: finalTotal,
          customer_name: orderFormData.customerName,
          customer_email: orderFormData.customerEmail,
          shipping_address: shippingAddress,
          billing_address: shippingAddress,
          items: orderItemsFormatted,
          metadata: {
            customerName: orderFormData.customerName,
            customerEmail: orderFormData.customerEmail,
            customerPhone: orderFormData.customerPhone || '',
            userId: user?.id || null,
            shipping_cost: shippingCost,
            discount_amount: orderFormData.giftCardDiscount || 0,
            giftCardCode: orderFormData.giftCardCode || null,
            giftCardDiscount: orderFormData.giftCardDiscount || 0,
            isManualOrder: true,
            isPaid: orderFormData.isPaid,
          },
          user_id: user?.id || null,
        })
        .select('id')
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        throw new Error(orderError.message || 'Failed to create order');
      }

      toast.success(`Order created successfully${orderFormData.isPaid ? ' (marked as paid)' : ' (pending payment)'}`);
      setCreateOrderDialogOpen(false);

      // Refresh orders list
      void fetchOrders();
    } catch (err: any) {
      console.error('Error creating order:', err);
      toast.error(err.message || 'Failed to create order');
    } finally {
      setCreatingOrder(false);
    }
  };

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
            <Button onClick={openCreateOrderDialog} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Order
            </Button>
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
                            onClick={() => router.push(`/${locale}/admin/orders/${order.id}`)}
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

                {/* Send Payment Link Button for Unpaid Orders */}
                {selectedOrder.payment_status === 'unpaid' && selectedOrder.amount_total > 0 && (
                  <div className="pt-4 border-t">
                    <Button
                      onClick={async () => {
                        try {
                          // Get session token for authorization
                          const { data: { session } } = await supabase.auth.getSession();
                          if (!session) {
                            toast.error('You must be logged in to send payment links');
                            return;
                          }

                          const response = await fetch('/api/admin/send-webshop-payment-link', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${session.access_token}`,
                            },
                            body: JSON.stringify({
                              orderId: selectedOrder.id,
                              checkoutSessionId: selectedOrder.checkout_session_id,
                              customerName: selectedOrder.customer_name,
                              customerEmail: selectedOrder.customer_email,
                              amount: selectedOrder.total_amount || (selectedOrder.amount_total / 100),
                              items: selectedOrder.items || [],
                              shippingAddress: selectedOrder.shipping_address,
                            }),
                          });

                          if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || 'Failed to send payment link');
                          }

                          toast.success(`Payment link sent to ${selectedOrder.customer_email}`);
                          
                          // Refresh orders to get updated data
                          void fetchOrders();
                          
                          // Refresh selected order
                          const { data: updatedOrder } = await supabase
                            .from('stripe_orders')
                            .select('*')
                            .eq('id', selectedOrder.id)
                            .single();
                          
                          if (updatedOrder) {
                            setSelectedOrder(updatedOrder as StripeOrder);
                          }
                        } catch (err: any) {
                          console.error('Error sending payment link:', err);
                          toast.error(err.message || 'Failed to send payment link');
                        }
                      }}
                      className="w-full"
                    >
                      Send Payment Link
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Order Dialog */}
        <Dialog open={createOrderDialogOpen} onOpenChange={setCreateOrderDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Custom Order</DialogTitle>
              <DialogDescription>Create a new webshop order matching the checkout structure</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input
                      id="customerName"
                      value={orderFormData.customerName}
                      onChange={(e) => setOrderFormData({ ...orderFormData, customerName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">Customer Email *</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={orderFormData.customerEmail}
                      onChange={(e) => setOrderFormData({ ...orderFormData, customerEmail: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Customer Phone</Label>
                    <Input
                      id="customerPhone"
                      value={orderFormData.customerPhone}
                      onChange={(e) => setOrderFormData({ ...orderFormData, customerPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Order Items</h3>
                  <Button onClick={addOrderItem} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>
                {orderItems.length === 0 ? (
                  <p className="text-sm text-gray-500">No items added. Click "Add Product" to start.</p>
                ) : (
                  <div className="space-y-3">
                    {orderItems.map((item, index) => {
                      const selectedProduct = products.find(p => p.uuid === item.productId);
                      const isGiftCard = selectedProduct?.isGiftCard || false;
                      return (
                        <div key={index} className="border rounded p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div className="md:col-span-2">
                                <Label>Product *</Label>
                                <Select
                                  value={item.productId}
                                  onValueChange={(value) => updateOrderItem(index, 'productId', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select product" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products.map((product) => (
                                      <SelectItem key={product.uuid} value={product.uuid}>
                                        {product.name} - €{product.price.toFixed(2)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Quantity *</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity || 1}
                                  onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                />
                              </div>
                              {isGiftCard && (
                                <div>
                                  <Label>Custom Price (€)</Label>
                                  <Input
                                    type="number"
                                    min="10"
                                    step="0.01"
                                    value={item.customPrice || ''}
                                    onChange={(e) => updateOrderItem(index, 'customPrice', parseFloat(e.target.value) || undefined)}
                                    placeholder={selectedProduct?.price.toString()}
                                  />
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOrderItem(index)}
                              className="mt-6"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {selectedProduct && (
                            <div className="text-sm text-gray-600">
                              Price: €{item.customPrice && item.customPrice >= 10 ? item.customPrice.toFixed(2) : selectedProduct.price.toFixed(2)} × {item.quantity || 1} = €{((item.customPrice && item.customPrice >= 10 ? item.customPrice : selectedProduct.price) * (item.quantity || 1)).toFixed(2)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Shipping Address */}
              {orderItems.length > 0 && !orderItems.every(item => {
                const product = products.find(p => p.uuid === item.productId);
                return product?.isGiftCard;
              }) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Shipping Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="street">Street Address *</Label>
                      <Input
                        id="street"
                        value={orderFormData.street}
                        onChange={(e) => setOrderFormData({ ...orderFormData, street: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={orderFormData.city}
                        onChange={(e) => setOrderFormData({ ...orderFormData, city: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="postalCode">Postal Code *</Label>
                      <Input
                        id="postalCode"
                        value={orderFormData.postalCode}
                        onChange={(e) => setOrderFormData({ ...orderFormData, postalCode: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country *</Label>
                      <Select
                        value={orderFormData.country}
                        onValueChange={(value) => setOrderFormData({ ...orderFormData, country: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="België">België</SelectItem>
                          <SelectItem value="Nederland">Nederland</SelectItem>
                          <SelectItem value="France">France</SelectItem>
                          <SelectItem value="Deutschland">Deutschland</SelectItem>
                          <SelectItem value="Luxembourg">Luxembourg</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Gift Card Discount */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Gift Card Discount (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="giftCardCode">Gift Card Code</Label>
                    <Input
                      id="giftCardCode"
                      value={orderFormData.giftCardCode}
                      onChange={(e) => setOrderFormData({ ...orderFormData, giftCardCode: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="giftCardDiscount">Discount Amount (€)</Label>
                    <Input
                      id="giftCardDiscount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={orderFormData.giftCardDiscount}
                      onChange={(e) => setOrderFormData({ ...orderFormData, giftCardDiscount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Payment Status</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPaid"
                    checked={orderFormData.isPaid}
                    onCheckedChange={(checked) => setOrderFormData({ ...orderFormData, isPaid: checked === true })}
                  />
                  <Label htmlFor="isPaid" className="cursor-pointer">
                    Mark as paid
                  </Label>
                </div>
                {!orderFormData.isPaid && (
                  <p className="text-sm text-gray-500">
                    If unchecked, you can send a payment link to the customer after creating the order.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateOrderDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateOrder} disabled={creatingOrder || productsLoading}>
                  {creatingOrder ? 'Creating...' : 'Create Order'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

