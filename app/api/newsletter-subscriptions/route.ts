import { NextRequest, NextResponse } from 'next/server';
import { createNewsletterSubscription } from '@/lib/api/content';
import type { NewsletterSubscription } from '@/lib/data/types';
import { sendNewsletterWebhook } from '@/lib/utils/webhooks';

export async function POST(request: NextRequest) {
  try {
    const subscriptionData: Omit<NewsletterSubscription, 'id' | 'created_at' | 'updated_at'> = await request.json();

    // Basic validation (more comprehensive validation is in the API function)
    if (!subscriptionData.email || !subscriptionData.consent_given) {
      return NextResponse.json(
        { error: 'Email and consent are required.' },
        { status: 400 }
      );
    }

    const newSubscription = await createNewsletterSubscription(subscriptionData);
    
    // Send to n8n webhook (non-blocking)
    sendNewsletterWebhook({
      email: subscriptionData.email,
      first_name: subscriptionData.first_name,
      last_name: subscriptionData.last_name,
      consent_given: subscriptionData.consent_given,
    });
    
    return NextResponse.json(newSubscription, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create newsletter subscription.' },
      { status: 500 }
    );
  }
}

