import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateGuideMetrics, incrementGuideDeniedAssignment } from '@/lib/utils/update-guide-metrics';
import { nowBrussels } from '@/lib/utils/timezone';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;

    if (!dealId) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (!action || (action !== 'accept' && action !== 'decline')) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "decline"' },
        { status: 400 }
      );
    }

    // Parse booking ID - can be a number (like 551) or UUID format
    const bookingIdNum = parseInt(dealId, 10);
    const isNumericId = !isNaN(bookingIdNum);

    // Verify booking exists (using booking id)
    const supabase = getSupabaseServer();
    const { data: booking, error: bookingError } = await supabase
      .from('tourbooking')
      .select('id, deal_id, guide_id, selectedGuides, status')
      .eq('id', isNumericId ? bookingIdNum : dealId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if booking is already confirmed - if so, return error
    if (booking.status === 'confirmed') {
      return NextResponse.json(
        { error: 'This assignment has already been confirmed and can no longer be modified.' },
        { status: 403 }
      );
    }

    // Use booking's guide_id
    const finalGuideId = booking.guide_id;
    
    // Trigger webhook with booking id and deal_id
    // Send both booking.id and deal_id for compatibility
    const webhookSuccess = await triggerWebhook(booking.deal_id || booking.id.toString(), finalGuideId, action);
    
    console.info('[Webhook] Sent to webhook:', {
      webhookUrl: 'https://alexfinit.app.n8n.cloud/webhook/d83af522-aa75-431d-bbf8-6b9f4faa1a14',
      deal_id: booking.deal_id,
      booking_id: booking.id,
      guide_id: finalGuideId,
      action,
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
              respondedAt: nowBrussels(),
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
        .eq('id', booking.id);

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
              respondedAt: nowBrussels(),
            };
          }
          return g;
        });
      }

      // Update the selectedGuides in the database
      await supabase
        .from('tourbooking')
        .update({ selectedGuides: updatedSelectedGuides })
        .eq('id', booking.id);

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

