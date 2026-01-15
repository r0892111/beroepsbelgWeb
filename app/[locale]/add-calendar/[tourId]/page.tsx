'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export default function AddToCalendarPage() {
  const params = useParams();
  const tourId = params.tourId as string;
  const locale = params.locale as string;
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleAddToCalendar = async () => {
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('https://alexfinit.app.n8n.cloud/webhook/d882600d-3765-44d5-9fd4-459294ee2b7a', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tour_id: tourId,
          timestamp: new Date().toISOString(),
          locale: locale,
        }),
      });

      if (response.ok) {
        setStatus('success');
      } else {
        const errorText = await response.text();
        console.error('Webhook error:', errorText);
        setErrorMessage('Failed to add to calendar. Please try again.');
        setStatus('error');
      }
    } catch (error) {
      console.error('Error calling webhook:', error);
      setErrorMessage('Network error. Please check your connection and try again.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#fdfcfa' }}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--brass-light, #f5e6c8)' }}>
            {status === 'success' ? (
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            ) : status === 'error' ? (
              <AlertCircle className="h-8 w-8 text-red-600" />
            ) : (
              <Calendar className="h-8 w-8" style={{ color: 'var(--brass, #d4af37)' }} />
            )}
          </div>
          <CardTitle className="text-2xl font-serif">
            {status === 'success' 
              ? 'Added to Calendar!' 
              : status === 'error'
              ? 'Something went wrong'
              : 'Add Tour to Calendar'}
          </CardTitle>
          <CardDescription>
            {status === 'success' 
              ? 'The calendar event has been created successfully.'
              : status === 'error'
              ? errorMessage
              : `Tour ID: ${tourId}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'idle' && (
            <Button 
              onClick={handleAddToCalendar} 
              className="w-full gap-2"
              style={{ backgroundColor: 'var(--brass, #d4af37)' }}
            >
              <Calendar className="h-4 w-4" />
              Add to Calendar
            </Button>
          )}

          {status === 'loading' && (
            <Button disabled className="w-full gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Adding to calendar...
            </Button>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                You can close this page now.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setStatus('idle')}
                className="w-full"
              >
                Add Again
              </Button>
            </div>
          )}

          {status === 'error' && (
            <Button 
              onClick={handleAddToCalendar} 
              className="w-full gap-2"
              variant="outline"
            >
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
