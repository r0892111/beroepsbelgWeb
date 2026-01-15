'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckCircle2, Loader2, AlertCircle, Download, ExternalLink } from 'lucide-react';

interface CalendarResponse {
  icsUrl?: string;
  googleCalendarUrl?: string;
  outlookUrl?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
}

export default function AddToCalendarPage() {
  const params = useParams();
  const tourId = params.tourId as string;
  const locale = params.locale as string;
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [calendarData, setCalendarData] = useState<CalendarResponse | null>(null);

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
        const data = await response.json();
        setCalendarData(data);
        setStatus('success');
      } else {
        const errorText = await response.text();
        console.error('Webhook error:', errorText);
        setErrorMessage('Failed to generate calendar invite. Please try again.');
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
              ? 'Calendar Invite Ready!' 
              : status === 'error'
              ? 'Something went wrong'
              : 'Add Tour to Calendar'}
          </CardTitle>
          <CardDescription>
            {status === 'success' 
              ? calendarData?.title || 'Your calendar invite is ready to download.'
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
              Generate Calendar Invite
            </Button>
          )}

          {status === 'loading' && (
            <Button disabled className="w-full gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating invite...
            </Button>
          )}

          {status === 'success' && calendarData && (
            <div className="space-y-3">
              {/* Event details */}
              {(calendarData.startDate || calendarData.location) && (
                <div className="p-3 rounded-lg bg-muted text-sm space-y-1">
                  {calendarData.startDate && (
                    <p><strong>Date:</strong> {new Date(calendarData.startDate).toLocaleDateString(locale, { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  )}
                  {calendarData.location && (
                    <p><strong>Location:</strong> {calendarData.location}</p>
                  )}
                </div>
              )}

              {/* Google Calendar */}
              {calendarData.googleCalendarUrl && (
                <Button 
                  asChild
                  className="w-full gap-2"
                  style={{ backgroundColor: '#4285f4' }}
                >
                  <a href={calendarData.googleCalendarUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Add to Google Calendar
                  </a>
                </Button>
              )}

              {/* ICS Download */}
              {calendarData.icsUrl && (
                <Button 
                  asChild
                  variant="outline"
                  className="w-full gap-2"
                >
                  <a href={calendarData.icsUrl} download="tour-invite.ics">
                    <Download className="h-4 w-4" />
                    Download .ics File (Apple/Outlook)
                  </a>
                </Button>
              )}

              {/* Outlook Web */}
              {calendarData.outlookUrl && (
                <Button 
                  asChild
                  variant="outline"
                  className="w-full gap-2"
                >
                  <a href={calendarData.outlookUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Add to Outlook
                  </a>
                </Button>
              )}

              {/* If no URLs returned, show a message */}
              {!calendarData.googleCalendarUrl && !calendarData.icsUrl && !calendarData.outlookUrl && (
                <p className="text-center text-sm text-muted-foreground">
                  Calendar invite has been processed. Check your email for details.
                </p>
              )}

              <Button 
                variant="ghost" 
                onClick={() => {
                  setStatus('idle');
                  setCalendarData(null);
                }}
                className="w-full"
              >
                Generate New Invite
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
