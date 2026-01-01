import { NextRequest, NextResponse } from 'next/server';
import { createNewsletterSubscription } from '@/lib/api/content';
import type { NewsletterSubscription } from '@/lib/data/types';

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
    return NextResponse.json(newSubscription, { status: 201 });
  } catch (error: any) {
    console.error('API Error creating newsletter subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create newsletter subscription.' },
      { status: 500 }
    );
  }
}

