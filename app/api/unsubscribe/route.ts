import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  console.log('Unsubscribe request received, token:', token);

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  try {
    // Token is the user_id (URL-decoded)
    const userId = decodeURIComponent(token);
    console.log('User ID:', userId);

    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Create supabase client inside the handler to ensure env vars are loaded
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update the user's unsubscribed status
    const { data, error } = await supabase
      .from('profiles')
      .update({ unsubscribed: true })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Error unsubscribing user:', error);
      return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
    }

    console.log('Unsubscribe successful, updated rows:', data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing unsubscribe:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }
}
