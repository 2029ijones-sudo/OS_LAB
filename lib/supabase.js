import { createPagesBrowserClient } from '@supabase/ssr';

// This is the ONLY Supabase client you need for browser-side auth
// It's pre-configured for Google OAuth with redirects
export const supabase = createPagesBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
