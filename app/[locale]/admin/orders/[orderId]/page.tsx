'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Home,
  ArrowLeft,
  RefreshCw,
  User,
  Mail,
  Phone,
  Package,
  CreditCard,
  Calendar,
  Trash2,
  Edit,
  Save,
  X,
  Send,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

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
  customer_phone?: string | null;
  shipping_address: Record<string, unknown> | null;
  billing_address: Record<string, unknown> | null;
  items: Array<{
    title?: string;
    quantity?: number;
    price?: number;
    productId?: string | null;
  }> | null;
  metadata: Record<string, unknown> | null;
  total_amount: number | null;
  stoqflow_order_id?: string | null;
}

export default function OrderDetailPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<StripeOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<StripeOrder>>({});

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stripe_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('Failed to fetch order:', error);
        toast.error('Failed to load order');
        return;
      }

      if (data) {
        setOrder(data as StripeOrder);
        setEditForm(data as StripeOrder);
      }
    } catch (err) {
      console.error('Failed to fetch order:', err);
      toast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (profile?.isAdmin || profile?.is_admin) && orderId) {
      void fetchOrder();
    }
  }, [user, profile, orderId]);

  const handleSave = async () => {
    if (!order) return;

    setSaving(true);
    try {
      // Get session token for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to update orders');
        setSaving(false);
        return;
      }

      const updates: Partial<StripeOrder> = {
        status: editForm.status,
        payment_status: editForm.payment_status,
        customer_name: editForm.customer_name,
        customer_email: editForm.customer_email,
        customer_phone: editForm.customer_phone,
        shipping_address: editForm.shipping_address,
        billing_address: editForm.billing_address,
      };

      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update order');
      }

      const { order: updatedOrder } = await response.json();

      toast.success('Order updated successfully');
      setEditMode(false);
      void fetchOrder();
    } catch (err: any) {
      console.error('Failed to update order:', err);
      toast.error(err.message || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!order) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('stripe_orders')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', order.id);

      if (error) {
        console.error('Failed to delete order:', error);
        toast.error('Failed to delete order');
        return;
      }

      toast.success('Order deleted successfully');
      router.push(`/${locale}/admin/orders`);
    } catch (err) {
      console.error('Failed to delete order:', err);
      toast.error('Failed to delete order');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleSendPaymentLink = async () => {
    if (!order) return;

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
          orderId: order.id,
          checkoutSessionId: order.checkout_session_id,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          amount: order.total_amount || (order.amount_total / 100),
          items: order.items || [],
          shippingAddress: order.shipping_address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send payment link');
      }

      toast.success(`Payment link sent to ${order.customer_email}`);
      void fetchOrder();
    } catch (err: any) {
      console.error('Error sending payment link:', err);
      toast.error(err.message || 'Failed to send payment link');
    }
  };

  const formatAmount = (amount: number, currency: string = 'eur') => {
    return new Intl.NumberFormat('nl-BE', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatAmountEuros = (amount: number) => {
    return new Intl.NumberFormat('nl-BE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">Order not found</p>
              <Link href={`/${locale}/admin/orders`}>
                <Button variant="outline" className="mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Orders
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/${locale}/admin/orders`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Order #{order.id}</h1>
              <p className="text-gray-500">
                Created {format(new Date(order.created_at), 'PPpp')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editMode ? (
              <>
                {order.payment_status === 'unpaid' && order.amount_total > 0 && (
                  <Button onClick={handleSendPaymentLink} variant="outline">
                    <Send className="h-4 w-4 mr-2" />
                    Send Payment Link
                  </Button>
                )}
                <Button onClick={() => setEditMode(true)} variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button onClick={() => setDeleteDialogOpen(true)} variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => { setEditMode(false); setEditForm(order); }} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Status</CardTitle>
            </CardHeader>
            <CardContent>
              {editMode ? (
                <Select
                  value={editForm.status || 'pending'}
                  onValueChange={(value) => setEditForm({ ...editForm, status: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge
                  variant={
                    order.status === 'completed' ? 'default' :
                    order.status === 'cancelled' ? 'destructive' :
                    order.status === 'refunded' ? 'secondary' : 'outline'
                  }
                >
                  {order.status}
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Payment Status</CardTitle>
            </CardHeader>
            <CardContent>
              {editMode ? (
                <Select
                  value={editForm.payment_status || 'unpaid'}
                  onValueChange={(value) => setEditForm({ ...editForm, payment_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="no_payment_required">No Payment Required</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge
                  variant={order.payment_status === 'paid' ? 'default' : 'destructive'}
                >
                  {order.payment_status}
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {order.total_amount ? formatAmountEuros(order.total_amount) : formatAmount(order.amount_total, order.currency)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Name</Label>
                {editMode ? (
                  <Input
                    value={editForm.customer_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                  />
                ) : (
                  <p className="mt-1">{order.customer_name || 'N/A'}</p>
                )}
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                {editMode ? (
                  <Input
                    type="email"
                    value={editForm.customer_email || ''}
                    onChange={(e) => setEditForm({ ...editForm, customer_email: e.target.value })}
                  />
                ) : (
                  <p className="mt-1">{order.customer_email || 'N/A'}</p>
                )}
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone
                </Label>
                {editMode ? (
                  <Input
                    value={editForm.customer_phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                  />
                ) : (
                  <p className="mt-1">{order.customer_phone || (order.metadata?.customerPhone ? String(order.metadata.customerPhone) : 'N/A')}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Checkout Session ID</Label>
                <p className="mt-1 font-mono text-sm">{order.checkout_session_id}</p>
              </div>
              <div>
                <Label>Payment Intent ID</Label>
                <p className="mt-1 font-mono text-sm">{order.payment_intent_id}</p>
              </div>
              <div>
                <Label>Customer ID</Label>
                <p className="mt-1 font-mono text-sm">{order.customer_id}</p>
              </div>
              {order.stoqflow_order_id && (
                <div>
                  <Label>Stoqflow Order ID</Label>
                  <p className="mt-1 font-mono text-sm">{order.stoqflow_order_id}</p>
                </div>
              )}
              <div>
                <Label>Subtotal</Label>
                <p className="mt-1">{formatAmount(order.amount_subtotal, order.currency)}</p>
              </div>
              <div>
                <Label>Total</Label>
                <p className="mt-1">{formatAmount(order.amount_total, order.currency)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items */}
        {order.items && order.items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="border rounded p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{item.title || 'Untitled Item'}</p>
                        <p className="text-sm text-gray-500">
                          Quantity: {item.quantity || 1} × {item.price ? formatAmountEuros(item.price) : 'N/A'}
                        </p>
                        {item.productId && (
                          <p className="text-xs text-gray-400 mt-1">Product ID: {item.productId}</p>
                        )}
                      </div>
                      <p className="font-semibold">
                        {item.price && item.quantity
                          ? formatAmountEuros(item.price * item.quantity)
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Shipping Address */}
        {order.shipping_address && (
          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={(editForm.shipping_address as any)?.name || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        shipping_address: { ...(editForm.shipping_address as any || {}), name: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label>Street</Label>
                    <Input
                      value={(editForm.shipping_address as any)?.street || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        shipping_address: { ...(editForm.shipping_address as any || {}), street: e.target.value }
                      })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>City</Label>
                      <Input
                        value={(editForm.shipping_address as any)?.city || ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          shipping_address: { ...(editForm.shipping_address as any || {}), city: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Postal Code</Label>
                      <Input
                        value={(editForm.shipping_address as any)?.postalCode || ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          shipping_address: { ...(editForm.shipping_address as any || {}), postalCode: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input
                      value={(editForm.shipping_address as any)?.country || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        shipping_address: { ...(editForm.shipping_address as any || {}), country: e.target.value }
                      })}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p><strong>Name:</strong> {(order.shipping_address as any)?.name || 'N/A'}</p>
                  <p><strong>Street:</strong> {(order.shipping_address as any)?.street || 'N/A'}</p>
                  <p><strong>City:</strong> {(order.shipping_address as any)?.city || 'N/A'}</p>
                  <p><strong>Postal Code:</strong> {(order.shipping_address as any)?.postalCode || 'N/A'}</p>
                  <p><strong>Country:</strong> {(order.shipping_address as any)?.country || 'N/A'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        {order.metadata && Object.keys(order.metadata).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(order.metadata, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Timestamps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timestamps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Created:</strong> {format(new Date(order.created_at), 'PPpp')}</p>
            <p><strong>Updated:</strong> {format(new Date(order.updated_at), 'PPpp')}</p>
            {order.deleted_at && (
              <p className="text-red-500"><strong>Deleted:</strong> {format(new Date(order.deleted_at), 'PPpp')}</p>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Order</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete order #{order.id}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
