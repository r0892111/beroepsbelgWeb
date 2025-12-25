import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  });
}

async function triggerWebhook(dealId: string, guideId: number | null, action: 'accept' | 'decline') {
  try {
    const response = await fetch('https://alexfinit.app.n8n.cloud/webhook/d83af522-aa75-431d-bbf8-6b9f4faa1a14', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        deal_id: dealId,
        guide_id: guideId,
        action: action,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error triggering webhook:', error);
    return false;
  }
}

// Parse dealId which is in format "uuid-guide_id"
function parseDealId(dealId: string): { uuid: string; guideId: number | null } {
  const parts = dealId.split('-');
  
  // UUID has 5 parts separated by hyphens, guide_id is appended after
  // Format: "123e4567-e89b-12d3-a456-426614174000-123"
  if (parts.length >= 6) {
    // Last part is guide_id
    const guideId = parseInt(parts[parts.length - 1], 10);
    // Everything except last part is UUID
    const uuid = parts.slice(0, -1).join('-');
    
    if (!isNaN(guideId)) {
      return { uuid, guideId };
    }
  }
  
  // Fallback: treat entire string as UUID (backward compatibility)
  return { uuid: dealId, guideId: null };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;

    if (!dealId) {
      return NextResponse.json(
        { error: 'Invalid deal ID' },
        { status: 400 }
      );
    }

    const { uuid, guideId } = parseDealId(dealId);

    const body = await request.json();
    const { action } = body;

    if (!action || (action !== 'accept' && action !== 'decline')) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "decline"' },
        { status: 400 }
      );
    }

    // Verify booking exists (using UUID part)
    const supabase = getSupabaseServer();
    const { data: booking, error: bookingError } = await supabase
      .from('tourbooking')
      .select('id, deal_id, guide_id')
      .eq('deal_id', uuid)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Use parsed guideId if available, otherwise use booking's guide_id
    const finalGuideId = guideId || booking.guide_id;
    
    // Trigger webhook with guide_id included
    const webhookSuccess = await triggerWebhook(uuid, finalGuideId, action);

    if (!webhookSuccess) {
      return NextResponse.json(
        { error: 'Failed to trigger webhook' },
        { status: 500 }
      );
    }

    // Update booking status based on action (using UUID part)
    const newStatus = action === 'accept' ? 'confirmed' : 'declined';
    const { error: updateError } = await supabase
      .from('tourbooking')
      .update({ status: newStatus })
      .eq('deal_id', uuid);

    if (updateError) {
      console.error('Error updating booking status:', updateError);
      // Still return success if webhook worked
    }

    return NextResponse.json({
      success: true,
      message: `Guide assignment ${action}ed successfully`,
      action,
    });
  } catch (error) {
    console.error('Error confirming guide assignment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

