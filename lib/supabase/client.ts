import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl.trim() === '') {
  throw new Error('Missing or empty environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
  throw new Error('Missing or empty environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Validate that the anon key looks correct (should start with 'eyJ' for JWT tokens)
if (!supabaseAnonKey.startsWith('eyJ')) {
  console.warn('Warning: NEXT_PUBLIC_SUPABASE_ANON_KEY does not appear to be a valid JWT token. Make sure you are using the anon/public key, not the service_role key.');
}

// Extract project ref from URL to help with debugging
const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
if (projectRef && typeof window !== 'undefined') {
  console.log('Supabase client initialized for project:', projectRef);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
