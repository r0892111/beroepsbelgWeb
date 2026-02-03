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

async function triggerWebhook(bookingId: number, guideId: number | null, action: 'accept' | 'decline') {
  try {
    const response = await fetch('https://alexfinit.app.n8n.cloud/webhook/d83af522-aa75-431d-bbf8-6b9f4faa1a14', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        booking_id: bookingId,
        guide_id: guideId,
        action: action,
      }),
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

// Parse URL parameter which is in format "bookingId-guideId" (e.g., "551-18")
function parseBookingAndGuideId(param: string): { bookingId: number; guideId: number | null } {
  const parts = param.split('-');
  
  if (parts.length >= 2) {
    // Last part is guide_id
    const guideId = parseInt(parts[parts.length - 1], 10);
    // Everything except last part is booking_id
    const bookingId = parseInt(parts.slice(0, -1).join('-'), 10);
    
    if (!isNaN(bookingId) && !isNaN(guideId)) {
      return { bookingId, guideId };
    }
  }
  
  // Fallback: treat entire string as booking ID (backward compatibility)
  const bookingId = parseInt(param, 10);
  return { bookingId: isNaN(bookingId) ? 0 : bookingId, guideId: null };
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

    // Parse booking ID and guide ID from URL format "bookingId-guideId"
    const { bookingId, guideId: urlGuideId } = parseBookingAndGuideId(dealId);

    if (!bookingId || bookingId === 0) {
      return NextResponse.json(
        { error: 'Invalid booking ID format. Expected format: bookingId-guideId' },
        { status: 400 }
      );
    }

    // Verify booking exists (using booking id)
    const supabase = getSupabaseServer();
    const { data: booking, error: bookingError } = await supabase
      .from('tourbooking')
      .select('id, deal_id, guide_id, selectedGuides, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if booking is already confirmed - confirmed means status is 'confirmed' AND guide_id is not null
    if (booking.status === 'confirmed' && booking.guide_id !== null) {
      return NextResponse.json(
        { error: 'This assignment has already been confirmed and can no longer be modified.' },
        { status: 403 }
      );
    }

    // Use guide_id from URL if provided, otherwise use booking's guide_id, otherwise find from selectedGuides
    let finalGuideId = urlGuideId || booking.guide_id;
    
    // If guide_id is still null but we're accepting, try to find guide from selectedGuides
    // Look for a guide with status 'offered' (the one being accepted)
    if (action === 'accept' && !finalGuideId && booking.selectedGuides) {
      const selectedGuidesArray = Array.isArray(booking.selectedGuides) ? booking.selectedGuides : [];
      // Find the guide that was offered (status: 'offered')
      for (const item of selectedGuidesArray) {
        if (typeof item === 'object' && item !== null && 'id' in item) {
          const itemId = typeof item.id === 'number' ? item.id : parseInt(String(item.id), 10);
          if (!isNaN(itemId) && item.status === 'offered') {
            finalGuideId = itemId;
            break;
          }
        }
      }
    }

    // Update booking status only when guide accepts
    // When guide declines, status remains unchanged (payment_completed for B2C, pending_guide_confirmation for B2B)
    // This allows another guide to accept the booking offer
    if (action === 'accept') {
      // Ensure guide_id is not null before confirming
      if (!finalGuideId) {
        return NextResponse.json(
          { error: 'Guide ID is required to confirm this assignment.' },
          { status: 400 }
        );
      }

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

      // Only set status to 'confirmed' if guide_id is not null
      const { error: updateError } = await supabase
        .from('tourbooking')
        .update({ 
          status: 'confirmed', 
          guide_id: finalGuideId, // This ensures guide_id is set
          selectedGuides: updatedSelectedGuides,
        })
        .eq('id', booking.id);

      if (!updateError) {
        // Update guide metrics when guide accepts (tours_done will be recalculated)
        await updateGuideMetrics(finalGuideId);

        // Trigger webhook AFTER status update so webhook receives updated booking data
        // Don't block the response if webhook fails - log error but continue
        triggerWebhook(booking.id, finalGuideId, action).then((success) => {
          if (success) {
            console.info('[Webhook] Successfully sent to webhook:', {
              webhookUrl: 'https://alexfinit.app.n8n.cloud/webhook/d83af522-aa75-431d-bbf8-6b9f4faa1a14',
              booking_id: booking.id,
              guide_id: finalGuideId,
              action,
            });
          } else {
            console.error('[Webhook] Failed to send webhook:', {
              webhookUrl: 'https://alexfinit.app.n8n.cloud/webhook/d83af522-aa75-431d-bbf8-6b9f4faa1a14',
              booking_id: booking.id,
              guide_id: finalGuideId,
              action,
            });
          }
        }).catch((error) => {
          console.error('[Webhook] Error sending webhook:', error);
        });
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
      const { error: declineUpdateError } = await supabase
        .from('tourbooking')
        .update({ selectedGuides: updatedSelectedGuides })
        .eq('id', booking.id);

      if (!declineUpdateError) {
        // Increment denied_assignment count when guide declines
        await incrementGuideDeniedAssignment(finalGuideId);

        // Trigger webhook AFTER status update for decline action too
        // Don't block the response if webhook fails - log error but continue
        triggerWebhook(booking.id, finalGuideId, action).then((success) => {
          if (success) {
            console.info('[Webhook] Successfully sent to webhook:', {
              webhookUrl: 'https://alexfinit.app.n8n.cloud/webhook/d83af522-aa75-431d-bbf8-6b9f4faa1a14',
              booking_id: booking.id,
              guide_id: finalGuideId,
              action,
            });
          } else {
            console.error('[Webhook] Failed to send webhook:', {
              webhookUrl: 'https://alexfinit.app.n8n.cloud/webhook/d83af522-aa75-431d-bbf8-6b9f4faa1a14',
              booking_id: booking.id,
              guide_id: finalGuideId,
              action,
            });
          }
        }).catch((error) => {
          console.error('[Webhook] Error sending webhook:', error);
        });
      }
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

