'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const response = await fetch(
          `${supabaseUrl}/rest/v1/orders?stripe_session_id=eq.${sessionId}&select=*`,
          {
            headers: {
              'apikey': supabaseAnonKey || '',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            setOrder(data[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!sessionId || !order) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Order Not Found</CardTitle>
            <CardDescription>We couldn't find your order details.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Return to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Order Confirmed!</CardTitle>
          <CardDescription>
            Thank you for your purchase. You will receive a confirmation email shortly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Order ID:</span>
              <span className="text-muted-foreground font-mono text-sm">{order.id.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Customer Name:</span>
              <span className="text-muted-foreground">{order.customer_name}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Email:</span>
              <span className="text-muted-foreground">{order.customer_email}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Status:</span>
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                {order.status === 'paid' ? 'Paid' : 'Processing'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Order Items</h3>
            <div className="space-y-2">
              {order.items?.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center py-2 border-b">
                  <div className="flex items-center gap-3">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                  </div>
                  <p className="font-medium">€{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {order.shipping_address && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Shipping Address</h3>
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p>{order.shipping_address.street}</p>
                <p>{order.shipping_address.city}, {order.shipping_address.postalCode}</p>
                <p>{order.shipping_address.country}</p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t-2">
            <span className="text-lg font-bold">Total:</span>
            <span className="text-lg font-bold">€{order.total_amount.toFixed(2)}</span>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>What's Next?</strong>
              <br />
              Your order is being prepared for shipment. You will receive tracking information
              via email once your order has been dispatched.
            </p>
          </div>

          <div className="flex gap-4">
            <Button asChild className="flex-1">
              <Link href="/">Return to Home</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/webshop">Continue Shopping</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
