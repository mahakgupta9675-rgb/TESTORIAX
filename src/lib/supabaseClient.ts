import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Display developer warnings if keys are not defined yet
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase environment variables VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY are missing.\n' +
    'Please set these in your local .env file in the root of the project.\n' +
    'Falling back to placeholder values so the UI can compile and launch.'
  );
}

// Initialize Supabase client (using placeholders if missing)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project-id.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

export const isPlaceholderConfig = 
  !supabaseUrl || 
  supabaseUrl.includes('placeholder-project-id') || 
  !supabaseAnonKey || 
  supabaseAnonKey === 'placeholder-anon-key';

export default supabase;
