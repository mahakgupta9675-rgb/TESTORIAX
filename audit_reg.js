import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function audit() {
  console.log("=== DB AUDIT ===");
  
  // Check duplicates in test_registrations
  const { data: dups, error: dupErr } = await supabase.rpc('get_duplicate_registrations'); 
  // Wait, I can't write raw SQL with supabase-js easily unless I use rpc. 
  // Let's just fetch all test_registrations and count them locally to find duplicates.
  const { data: regs, error: regErr } = await supabase.from('test_registrations').select('*');
  if (regErr) console.error("Reg Error:", regErr);
  else {
    const map = {};
    const duplicates = [];
    for (const r of regs) {
      const key = `${r.test_id}-${r.user_id}-${r.competition_id || 'null'}`;
      if (map[key]) {
        duplicates.push(r);
        map[key]++;
      } else {
        map[key] = 1;
      }
    }
    console.log(`Found ${duplicates.length} duplicate registrations.`);
    if (duplicates.length > 0) {
      console.log("Duplicates samples:", duplicates.slice(0, 3));
    }
  }

  // Check tests table for reg_fields
  const { data: tests, error: testsErr } = await supabase.from('tests').select('*').limit(1);
  if (testsErr) {
    console.error("Tests Error:", testsErr);
  } else {
    if (tests.length > 0) {
      const t = tests[0];
      console.log("Tests columns:", Object.keys(t));
      console.log("Has reg_fields?", 'reg_fields' in t);
      console.log("Has registration_type?", 'registration_type' in t);
    }
  }
}
audit();
