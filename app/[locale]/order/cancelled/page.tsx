'use client';

import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OrderCancelledPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Order Cancelled</CardTitle>
          <CardDescription>
            Your order was not completed. No charges have been made to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-900">
              If you experienced any issues during the checkout process, please contact our support team.
              Your cart items have been saved and you can return to complete your purchase anytime.
            </p>
          </div>

          <div className="flex gap-4">
            <Button asChild className="flex-1">
              <Link href="/webshop">Return to Shop</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/contact/contactformulier">Contact Support</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
