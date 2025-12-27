import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseServerInstance: SupabaseClient | null = null;

function getSupabaseServer(): SupabaseClient {
  // Only initialize on server-side - check this FIRST before accessing env vars
  if (typeof window !== 'undefined') {
    throw new Error('supabaseServer can only be used server-side');
  }

  if (supabaseServerInstance) {
    return supabaseServerInstance;
  }

  // Only access environment variables on server-side
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Supabase Server] Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      serviceKeyPrefix: supabaseServiceKey?.substring(0, 20) || 'missing',
      allSupabaseKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
    });
  }

  if (!supabaseUrl) {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!supabaseServiceKey) {
    const availableKeys = Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('SERVICE'));
    throw new Error(
      `Missing environment variable: SUPABASE_SERVICE_ROLE_KEY\n` +
      `Available SUPABASE-related keys: ${availableKeys.join(', ') || 'none'}`
    );
  }

  // Validate that the service key looks correct (should start with 'eyJ' for JWT tokens)
  if (!supabaseServiceKey.startsWith('eyJ')) {
    throw new Error(
      'Invalid SUPABASE_SERVICE_ROLE_KEY format. Make sure you are using the service_role key, not the anon key.'
    );
  }

  supabaseServerInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  });

  return supabaseServerInstance;
}

// Server-side client for use in Server Components and Server Actions
// Using Proxy to lazy-load only when actually accessed (not at import time)
export const supabaseServer = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseServer();
    const value = client[prop as keyof SupabaseClient];
    return typeof value === 'function' ? value.bind(client) : value;
  }
}) as SupabaseClient;

