import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Webhook URL from n8n
    const webhookUrl = 'https://alexfinit.app.n8n.cloud/webhook/f84e268c-f325-4820-b0b4-c3ed9b5fc56c';

    // Forward the request to the webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Webhook error:', errorText);
      return NextResponse.json(
        { error: 'Webhook call failed', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json().catch(() => ({})); // Handle non-JSON responses

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error calling webhook:', error);
    return NextResponse.json(
      { error: 'Failed to call webhook', details: error.message },
      { status: 500 }
    );
  }
}
