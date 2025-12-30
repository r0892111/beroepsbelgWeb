import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const redirectParam = requestUrl.searchParams.get('redirect');
  const localeParam = requestUrl.searchParams.get('locale');

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    await supabase.auth.exchangeCodeForSession(code);
  }

  // Determine locale: use locale param, extract from redirect, or default to 'nl'
  let locale = localeParam || 'nl';
  if (!localeParam && redirectParam) {
    const redirectMatch = redirectParam.match(/^\/([a-z]{2})\//);
    if (redirectMatch) {
      locale = redirectMatch[1];
    }
  }

  // Redirect to the specified URL or default to account page with correct locale
  const redirectUrl = redirectParam || `/${locale}/account`;
  return NextResponse.redirect(new URL(redirectUrl, requestUrl.origin));
}
