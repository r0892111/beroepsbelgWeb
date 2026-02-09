import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { booking, tour, opMaatAnswers, submittedAt } = body;

    // Extract main invitee information
    const mainInvitee = booking?.invitees?.[0] || null;

    // Build comprehensive webhook payload with all available information
    const comprehensivePayload = {
      // Booking information
      booking_id: booking?.id || null,
      booking_status: booking?.status || null,
      booking_type: booking?.booking_type || null,
      deal_id: booking?.deal_id || null,
      stripe_session_id: booking?.stripe_session_id || null,
      created_at: booking?.created_at || null,
      
      // Tour information
      tour_id: booking?.tour_id || tour?.id || null,
      tour_title: tour?.title || null,
      tour_description: tour?.description || null,
      tour_city: booking?.city || tour?.city || null,
      tour_datetime: booking?.tour_datetime || null,
      tour_end: booking?.tour_end || null,
      start_location: booking?.start_location || null,
      end_location: booking?.end_location || null,
      
      // Customer/Contact information
      customer_name: mainInvitee?.name || null,
      customer_email: mainInvitee?.email || null,
      customer_phone: mainInvitee?.phone || null,
      number_of_people: mainInvitee?.numberOfPeople || null,
      language: mainInvitee?.language || null,
      contact_language: mainInvitee?.contactLanguage || null,
      special_requests: mainInvitee?.specialRequests || null,
      
      // Payment information
      amount: mainInvitee?.amount || null,
      original_amount: mainInvitee?.originalAmount || null,
      discount_applied: mainInvitee?.discountApplied || null,
      tanguy_cost: mainInvitee?.tanguyCost || null,
      extra_hour_cost: mainInvitee?.extraHourCost || null,
      weekend_fee_cost: mainInvitee?.weekendFeeCost || null,
      evening_fee_cost: mainInvitee?.eveningFeeCost || null,
      currency: mainInvitee?.currency || 'eur',
      
      // Op maat specific answers
      op_maat_answers: {
        start_location: opMaatAnswers?.startLocation || mainInvitee?.opMaatAnswers?.startLocation || null,
        end_location: opMaatAnswers?.endLocation || mainInvitee?.opMaatAnswers?.endLocation || null,
        city_part: opMaatAnswers?.cityPart || mainInvitee?.opMaatAnswers?.cityPart || null,
        subjects: opMaatAnswers?.subjects || mainInvitee?.opMaatAnswers?.subjects || null,
        special_wishes: opMaatAnswers?.specialWishes || mainInvitee?.opMaatAnswers?.specialWishes || null,
        extra_hour: mainInvitee?.opMaatAnswers?.extraHour || opMaatAnswers?.extraHour || false,
      },
      
      // Additional booking details
      guide_id: booking?.guide_id || null,
      request_tanguy: booking?.request_tanguy || mainInvitee?.requestTanguy || false,
      is_contacted: mainInvitee?.isContacted || false,
      
      // Upsell products
      upsell_products: mainInvitee?.upsellProducts || booking?.upsellProducts || [],
      
      // Tour metadata
      tour_duration_minutes: mainInvitee?.durationMinutes || tour?.durationMinutes || null,
      tour_start_datetime: mainInvitee?.tourStartDatetime || booking?.tour_datetime || null,
      tour_end_datetime: mainInvitee?.tourEndDatetime || booking?.tour_end || null,
      
      // Submission metadata
      submitted_at: submittedAt || new Date().toISOString(),
      form_submission_type: 'op_maat_form',
      
      // Full objects for reference (if needed)
      full_booking: booking,
      full_tour: tour,
      full_op_maat_answers: opMaatAnswers,
    };

    // Original webhook URL
    const originalWebhookUrl = 'https://alexfinit.app.n8n.cloud/webhook/f84e268c-f325-4820-b0b4-c3ed9b5fc56c';
    
    // New webhook URL for op maat form submissions
    const newWebhookUrl = 'https://alexfinit.app.n8n.cloud/webhook/b4293b27-2f7d-4afb-93ad-8aab31be8557';

    // Call both webhooks in parallel (don't fail if one fails)
    let originalSuccess = false;
    let newSuccess = false;
    let originalData: any = null;
    let newData: any = null;

    // Call original webhook
    try {
      const originalResponse = await fetch(originalWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (originalResponse.ok) {
        originalSuccess = true;
        originalData = await originalResponse.json().catch(() => ({}));
      } else {
        const errorText = await originalResponse.text().catch(() => 'Unknown error');
        console.error('Original webhook error:', errorText);
      }
    } catch (error) {
      console.error('Error calling original webhook:', error);
    }

    // Call new webhook with comprehensive payload
    try {
      const newResponse = await fetch(newWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(comprehensivePayload),
      });

      if (newResponse.ok) {
        newSuccess = true;
        newData = await newResponse.json().catch(() => ({}));
      } else {
        const errorText = await newResponse.text().catch(() => 'Unknown error');
        console.error('New op maat webhook error:', errorText);
      }
    } catch (error) {
      console.error('Error calling new op maat webhook:', error);
    }

    // Return success if at least one webhook succeeded
    if (!originalSuccess && !newSuccess) {
      return NextResponse.json(
        { error: 'Both webhook calls failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      originalWebhook: originalSuccess ? { success: true, data: originalData } : { success: false },
      newWebhook: newSuccess ? { success: true, data: newData } : { success: false },
    });
  } catch (error: any) {
    console.error('Error calling webhook:', error);
    return NextResponse.json(
      { error: 'Failed to call webhook', details: error.message },
      { status: 500 }
    );
  }
}
