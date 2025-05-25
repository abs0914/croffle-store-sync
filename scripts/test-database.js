// Test script to diagnose database issues and apply migrations
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = "https://bwmkqscqkfoezcuzgpwq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function testDatabaseConnection() {
  console.log('=== DATABASE CONNECTION TEST ===');

  try {
    // Test basic connection
    const { data, error } = await supabase.from('app_users').select('count', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }

    console.log('✅ Database connection successful');
    console.log(`📊 Found ${data || 0} users in app_users table`);
    return true;
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    return false;
  }
}

async function testRPCFunctions() {
  console.log('\n=== RPC FUNCTIONS TEST ===');

  const functions = ['get_all_users', 'get_store_users', 'get_current_user_info'];

  for (const funcName of functions) {
    try {
      console.log(`Testing ${funcName}...`);

      if (funcName === 'get_store_users') {
        // Test with a dummy store ID
        const { data, error } = await supabase.rpc(funcName, { store_id_param: 'test-store-id' });
        if (error) {
          console.log(`⚠️  ${funcName}: ${error.message}`);
        } else {
          console.log(`✅ ${funcName}: Working (returned ${data?.length || 0} results)`);
        }
      } else if (funcName === 'get_current_user_info') {
        const { data, error } = await supabase.rpc(funcName, { user_email: 'admin@example.com' });
        if (error) {
          console.log(`⚠️  ${funcName}: ${error.message}`);
        } else {
          console.log(`✅ ${funcName}: Working (returned ${data?.length || 0} results)`);
        }
      } else {
        const { data, error } = await supabase.rpc(funcName);
        if (error) {
          console.log(`⚠️  ${funcName}: ${error.message}`);
        } else {
          console.log(`✅ ${funcName}: Working (returned ${data?.length || 0} results)`);
        }
      }
    } catch (err) {
      console.log(`❌ ${funcName}: ${err.message}`);
    }
  }
}

async function checkTableStructure() {
  console.log('\n=== TABLE STRUCTURE TEST ===');

  try {
    // Check if app_users table exists and has data
    const { data: users, error: usersError } = await supabase
      .from('app_users')
      .select('*')
      .limit(5);

    if (usersError) {
      console.log('⚠️  app_users table issue:', usersError.message);
    } else {
      console.log(`✅ app_users table: ${users?.length || 0} records found`);
      if (users && users.length > 0) {
        console.log('📋 Sample user:', {
          id: users[0].id,
          email: users[0].email,
          role: users[0].role,
          store_ids: users[0].store_ids
        });
      }
    }

    // Check if stores table exists
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .limit(5);

    if (storesError) {
      console.log('⚠️  stores table issue:', storesError.message);
    } else {
      console.log(`✅ stores table: ${stores?.length || 0} records found`);
    }

  } catch (err) {
    console.error('❌ Table structure check failed:', err.message);
  }
}

async function linkUsersToAuth() {
  console.log('\n=== LINKING APP_USERS TO AUTH.USERS ===');

  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.log('⚠️  Cannot access auth users (need service role key)');
      console.log('📝 Manual linking required - see instructions below');
      return;
    }

    console.log(`📋 Found ${authUsers.users?.length || 0} auth users`);

    // Get all app users
    const { data: appUsers, error: appError } = await supabase
      .from('app_users')
      .select('*');

    if (appError) {
      console.log('⚠️  Failed to fetch app users:', appError.message);
      return;
    }

    console.log(`📋 Found ${appUsers?.length || 0} app users`);

    // Try to link them by email
    for (const appUser of appUsers || []) {
      if (appUser.user_id) {
        console.log(`✅ ${appUser.email} already linked`);
        continue;
      }

      const authUser = authUsers.users?.find(au => au.email === appUser.email);
      if (authUser) {
        const { error: updateError } = await supabase
          .from('app_users')
          .update({ user_id: authUser.id })
          .eq('id', appUser.id);

        if (updateError) {
          console.log(`⚠️  Failed to link ${appUser.email}:`, updateError.message);
        } else {
          console.log(`✅ Linked ${appUser.email} to auth user ${authUser.id}`);
        }
      } else {
        console.log(`⚠️  No auth user found for ${appUser.email}`);
      }
    }
  } catch (err) {
    console.error('❌ User linking failed:', err.message);
    console.log('\n📝 MANUAL FIX REQUIRED:');
    console.log('Run these SQL commands in Supabase SQL Editor:');
    console.log(`
-- Link admin@example.com
UPDATE app_users
SET user_id = (SELECT id FROM auth.users WHERE email = 'admin@example.com')
WHERE email = 'admin@example.com';

-- Link rbsons.north.manager@croffle.com
UPDATE app_users
SET user_id = (SELECT id FROM auth.users WHERE email = 'rbsons.north.manager@croffle.com')
WHERE email = 'rbsons.north.manager@croffle.com';

-- Link robinsons.north@croffle.com
UPDATE app_users
SET user_id = (SELECT id FROM auth.users WHERE email = 'robinsons.north@croffle.com')
WHERE email = 'robinsons.north@croffle.com';

-- Link marasabaras@croffle.com
UPDATE app_users
SET user_id = (SELECT id FROM auth.users WHERE email = 'marasabaras@croffle.com')
WHERE email = 'marasabaras@croffle.com';
    `);
  }
}

async function main() {
  console.log('🔍 Starting database diagnostic...\n');

  const isConnected = await testDatabaseConnection();
  if (!isConnected) {
    console.log('\n❌ Cannot proceed without database connection');
    return;
  }

  await checkTableStructure();
  await testRPCFunctions();
  await linkUsersToAuth();

  console.log('\n🎉 Database diagnostic complete!');
  console.log('\n📝 Next steps:');
  console.log('1. If RPC functions are missing, run the migration files');
  console.log('2. If tables are missing, create them using the migration files');
  console.log('3. Check the browser console for detailed error messages');
}

main().catch(console.error);
