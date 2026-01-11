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

async function getSupabaseClientForAuth(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabase;
}

async function checkAdminAccess(request: NextRequest): Promise<{ isAdmin: boolean; userId: string | null }> {
  try {
    const authHeader = request.headers.get('authorization');
    let accessToken: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }

    if (accessToken) {
      const supabaseAnon = await getSupabaseClientForAuth(request);
      const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(accessToken);
      
      if (authError || !user) {
        return { isAdmin: false, userId: null };
      }

      const supabaseServer = getSupabaseServer();
      const { data: profile, error: profileError } = await supabaseServer
        .from('profiles')
        .select('isAdmin')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return { isAdmin: false, userId: user.id };
      }

      const isAdmin = profile.isAdmin === true;
      return { isAdmin, userId: user.id };
    }

    return { isAdmin: false, userId: null };
  } catch (error) {
    return { isAdmin: false, userId: null };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    // Check admin access
    const { isAdmin } = await checkAdminAccess(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { bookingId } = await params;
    const bookingIdNum = parseInt(bookingId, 10);

    if (isNaN(bookingIdNum)) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { guideId } = body;

    if (!guideId) {
      return NextResponse.json(
        { error: 'Guide ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Fetch current booking
    const { data: booking, error: bookingError } = await supabase
      .from('tourbooking')
      .select('id, guide_id, selectedGuides, status')
      .eq('id', bookingIdNum)
      .single();

    if (bookingError || !booking) {
      console.error('Error fetching booking:', bookingError);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if this guide is actually assigned to the booking
    if (booking.guide_id !== guideId) {
      return NextResponse.json(
        { error: 'This guide is not assigned to this booking' },
        { status: 400 }
      );
    }

    // Update selectedGuides array
    interface SelectedGuide {
      id: number;
      status?: 'offered' | 'declined' | 'accepted';
      offeredAt?: string;
      respondedAt?: string;
    }

    let updatedSelectedGuides: SelectedGuide[] = [];
    
    if (booking.selectedGuides && Array.isArray(booking.selectedGuides)) {
      updatedSelectedGuides = booking.selectedGuides.map((item: any) => {
        if (typeof item === 'object' && item !== null && 'id' in item) {
          return item as SelectedGuide;
        }
        if (typeof item === 'number') {
          return { id: item };
        }
        if (typeof item === 'string') {
          return { id: parseInt(item, 10) };
        }
        return null;
      }).filter((item): item is SelectedGuide => item !== null);
    }

    // Check if guide is already in the list
    const guideIndex = updatedSelectedGuides.findIndex(g => g.id === guideId);
    
    if (guideIndex >= 0) {
      // Update existing entry to 'declined'
      updatedSelectedGuides[guideIndex] = {
        ...updatedSelectedGuides[guideIndex],
        status: 'declined',
        respondedAt: new Date().toISOString(),
      };
    } else {
      // Add guide with 'declined' status
      updatedSelectedGuides.push({
        id: guideId,
        status: 'declined',
        respondedAt: new Date().toISOString(),
      });
    }

    // Update the booking - set guide_id to null
    const { error: updateError } = await supabase
      .from('tourbooking')
      .update({
        guide_id: null,
        status: 'pending_guide_confirmation',
        selectedGuides: updatedSelectedGuides,
      })
      .eq('id', bookingIdNum);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json(
        { error: `Failed to update booking: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Update guide metrics - increment cancelled_tours
    const { data: guideData, error: guideError } = await supabase
      .from('guides_temp')
      .select('cancelled_tours, name')
      .eq('id', guideId)
      .single();

    if (!guideError && guideData) {
      const { error: guideUpdateError } = await supabase
        .from('guides_temp')
        .update({ cancelled_tours: (guideData.cancelled_tours || 0) + 1 })
        .eq('id', guideId);

      if (guideUpdateError) {
        console.warn('Failed to update guide cancelled_tours:', guideUpdateError);
      }
    }

    // Trigger webhook
    try {
      await fetch('https://alexfinit.app.n8n.cloud/webhook/f22ab19e-bc75-475e-ac13-ca9b5c8f72fe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...booking,
          guide_id: null,
          selectedGuides: updatedSelectedGuides,
          cancelled_guide_id: guideId,
          cancelled_guide_name: guideData?.name || null,
        }),
      });
    } catch (webhookErr) {
      console.error('Failed to trigger webhook:', webhookErr);
      // Don't fail the request if webhook fails
    }

    return NextResponse.json({
      success: true,
      message: 'Guide cancelled successfully',
    });
  } catch (error) {
    console.error('Error in cancel-guide API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

