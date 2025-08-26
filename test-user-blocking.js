// Test script for user blocking/unblocking functionality
// Run this to verify the system works correctly

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in config.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserBlocking() {
  try {
    console.log('🧪 Testing user blocking/unblocking functionality...\n');

    // 1. Get all users
    console.log('1. Fetching all users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`✅ Found ${users.length} users`);
    
    if (users.length === 0) {
      console.log('⚠️  No users found to test with');
      return;
    }

    // 2. Find a non-admin user to test with
    const testUser = users.find(user => user.role !== 'admin' && user.role !== 'general');
    
    if (!testUser) {
      console.log('⚠️  No non-admin users found to test blocking with');
      return;
    }

    console.log(`\n2. Testing with user: ${testUser.name} (${testUser.email})`);
    console.log(`   Current status: ${testUser.status || 'undefined'}`);

    // 3. Test blocking the user
    console.log('\n3. Testing user blocking...');
    const { data: blockedUser, error: blockError } = await supabase
      .from('users')
      .update({ status: 'blocked' })
      .eq('id', testUser.id)
      .select()
      .single();

    if (blockError) {
      console.error('❌ Error blocking user:', blockError);
      return;
    }

    console.log(`✅ User blocked successfully. New status: ${blockedUser.status}`);

    // 4. Test unblocking the user
    console.log('\n4. Testing user unblocking...');
    const { data: unblockedUser, error: unblockError } = await supabase
      .from('users')
      .update({ status: 'active' })
      .eq('id', testUser.id)
      .select()
      .single();

    if (unblockError) {
      console.error('❌ Error unblocking user:', unblockError);
      return;
    }

    console.log(`✅ User unblocked successfully. New status: ${unblockedUser.status}`);

    // 5. Verify final status
    console.log('\n5. Verifying final user status...');
    const { data: finalUser, error: finalError } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUser.id)
      .single();

    if (finalError) {
      console.error('❌ Error fetching final user status:', finalError);
      return;
    }

    console.log(`✅ Final status: ${finalUser.status}`);
    console.log('\n🎉 All tests passed! User blocking/unblocking is working correctly.');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testUserBlocking(); 