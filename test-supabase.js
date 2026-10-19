import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// 1. Read environment variables from local .env
try {
  const envContent = fs.readFileSync('.env', 'utf-8');
  const env = {};
  envContent.split('\n').forEach((line) => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });

  const url = env['VITE_SUPABASE_URL'];
  const key = env['VITE_SUPABASE_ANON_KEY'];

  console.log('----------------------------------------------------');
  console.log('🔍 Testing Supabase Connection Settings...');
  console.log('Supabase URL:', url);
  console.log('Anon Key Length:', key ? key.length : 0);
  console.log('----------------------------------------------------');

  if (!url || !key) {
    console.error('❌ Error: Supabase keys are missing from your .env file.');
    process.exit(1);
  }

  // 2. Initialize Supabase Client
  const supabase = createClient(url, key);

  async function diagnose() {
    // A. Check Auth connection
    console.log('⌛ Checking Auth service reachability...');
    const { error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('❌ Auth service error:', authError.message);
    } else {
      console.log('✅ Auth service is reachable and responding!');
    }

    // B. Check Profiles table
    console.log('⌛ Checking Database "profiles" table accessibility...');
    const { error: dbError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (dbError) {
      console.error('❌ Database / Table error:', dbError.message);
      console.log('💡 Note: This error occurs if you have not run the SQL setup script in your Supabase SQL Editor.');
    } else {
      console.log('✅ Connection to "profiles" table was successful!');
    }
    console.log('----------------------------------------------------');
  }

  diagnose();
} catch (err) {
  console.error('❌ Failed to read .env file. Make sure a file named ".env" exists in the root directory.', err.message);
}
