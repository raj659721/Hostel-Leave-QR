import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

function isPlaceholder(url: string, key: string) {
  return (
    !url ||
    !key ||
    url.includes('placeholder') ||
    url.includes('<your-project-ref>') ||
    key.includes('placeholder') ||
    key.includes('<your-anon-key>')
  );
}

const supabaseConfigValid = !isPlaceholder(supabaseUrl, supabaseAnonKey);

if (!supabaseConfigValid) {
  // Log a helpful error but do not throw — this prevents a blank screen in dev.
  // The app can read `SUPABASE_CONFIG_VALID` to show a user-friendly banner.
  // NOTE: ensure you restart the dev server after updating `.env` so Vite picks up values.
  // See README.md -> Setup for instructions.
  // eslint-disable-next-line no-console
  console.error(
    '[hostel-manager] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required. ' +
      'Copy .env.example to .env and set the Supabase project URL and anon key. See README.md -> "Setup" for details.'
  );
}

export const SUPABASE_CONFIG_VALID = supabaseConfigValid;

export const supabase = createClient(
  SUPABASE_CONFIG_VALID ? supabaseUrl : 'https://placeholder.supabase.co',
  SUPABASE_CONFIG_VALID ? supabaseAnonKey : 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
