import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateGuideMetrics, incrementGuideDeniedAssignment } from '@/lib/utils/update-guide-metrics';

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
      .select('id, deal_id, guide_id, selectedGuides')
      .eq('deal_id', uuid)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify that the deal_id from the booking matches what we're sending to webhook
    if (booking.deal_id !== uuid) {
      console.error('[Webhook] Deal ID mismatch:', {
        bookingDealId: booking.deal_id,
        parsedUuid: uuid,
        dealIdParam: dealId,
      });
      return NextResponse.json(
        { error: 'Deal ID mismatch - booking deal_id does not match parsed UUID' },
        { status: 400 }
      );
    }

    // Use parsed guideId if available, otherwise use booking's guide_id
    const finalGuideId = guideId || booking.guide_id;
    
    // Trigger webhook with the verified deal_id from the booking
    // Use booking.deal_id to ensure we're sending the actual deal_id from database
    const webhookSuccess = await triggerWebhook(booking.deal_id, finalGuideId, action);
    
    console.info('[Webhook] Sent to webhook:', {
      webhookUrl: 'https://alexfinit.app.n8n.cloud/webhook/d83af522-aa75-431d-bbf8-6b9f4faa1a14',
      deal_id: booking.deal_id,
      guide_id: finalGuideId,
      action,
      bookingId: booking.id,
    });

    if (!webhookSuccess) {
      return NextResponse.json(
        { error: 'Failed to trigger webhook' },
        { status: 500 }
      );
    }

    // Update booking status only when guide accepts
    // When guide declines, status remains unchanged (payment_completed for B2C, pending_guide_confirmation for B2B)
    // This allows another guide to accept the booking offer
    if (action === 'accept') {
      // Update selectedGuides to mark this guide as accepted
      let updatedSelectedGuides = booking.selectedGuides || [];
      if (Array.isArray(updatedSelectedGuides)) {
        updatedSelectedGuides = updatedSelectedGuides.map((g: any) => {
          const gId = typeof g === 'object' && g !== null ? g.id : g;
          if (gId === finalGuideId) {
            return {
              ...(typeof g === 'object' ? g : { id: finalGuideId }),
              status: 'accepted',
              respondedAt: new Date().toISOString(),
            };
          }
          return g;
        });
      }

      const { error: updateError } = await supabase
        .from('tourbooking')
        .update({ 
          status: 'confirmed', 
          guide_id: finalGuideId,
          selectedGuides: updatedSelectedGuides,
        })
        .eq('deal_id', uuid);

      if (!updateError) {
        // Update guide metrics when guide accepts (tours_done will be recalculated)
        await updateGuideMetrics(finalGuideId);
      }
    } else if (action === 'decline') {
      // Update selectedGuides to mark this guide as declined
      let updatedSelectedGuides = booking.selectedGuides || [];
      if (Array.isArray(updatedSelectedGuides)) {
        updatedSelectedGuides = updatedSelectedGuides.map((g: any) => {
          const gId = typeof g === 'object' && g !== null ? g.id : g;
          if (gId === finalGuideId) {
            return {
              ...(typeof g === 'object' ? g : { id: finalGuideId }),
              status: 'declined',
              respondedAt: new Date().toISOString(),
            };
          }
          return g;
        });
      }

      // Update the selectedGuides in the database
      await supabase
        .from('tourbooking')
        .update({ selectedGuides: updatedSelectedGuides })
        .eq('deal_id', uuid);

      // Increment denied_assignment count when guide declines
      await incrementGuideDeniedAssignment(finalGuideId);
    }
    // If declined, don't update status - keep current status so another guide can accept

    return NextResponse.json({
      success: true,
      message: `Guide assignment ${action}ed successfully`,
      action,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

