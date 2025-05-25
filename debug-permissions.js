// Debug script to check database permissions and table access
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bwmkqscqkfoezcuzgpwq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function debugPermissions() {
  console.log('🔍 Debugging database permissions...\n');

  // Test access to various tables
  const tables = [
    'stores',
    'categories', 
    'products',
    'inventory_stock',
    'app_users',
    'cashiers',
    'shifts'
  ];

  for (const table of tables) {
    console.log(`📋 Testing access to ${table} table...`);
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
      } else {
        console.log(`   ✅ Success: Can read ${table} (${data?.length || 0} records in sample)`);
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
    }
  }

  // Test authentication status
  console.log('\n🔐 Checking authentication status...');
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log(`   ❌ Auth error: ${error.message}`);
    } else if (session) {
      console.log(`   ✅ Authenticated as: ${session.user?.email}`);
      console.log(`   User ID: ${session.user?.id}`);
    } else {
      console.log(`   ⚠️  Not authenticated (anonymous access)`);
    }
  } catch (error) {
    console.log(`   ❌ Auth exception: ${error.message}`);
  }

  // Test RPC functions
  console.log('\n🔧 Testing RPC functions...');
  try {
    const { data, error } = await supabase
      .rpc('get_current_user_info', { user_email: 'rbnorth.cashier@croffle.com' });

    if (error) {
      console.log(`   ❌ RPC error: ${error.message}`);
    } else {
      console.log(`   ✅ RPC success: Found ${data?.length || 0} user records`);
    }
  } catch (error) {
    console.log(`   ❌ RPC exception: ${error.message}`);
  }
}

debugPermissions().catch(console.error);
