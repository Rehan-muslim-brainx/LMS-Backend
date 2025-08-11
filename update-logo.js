const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('🔄 Updating BRAINX Logo in Database...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

// Your exact BRAINX logo base64
const BRAINX_LOGO_BASE64 = 'data:image/png;base64,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';

async function updateLogo() {
  try {
    console.log('\n📋 Updating logo in database...');

    // First, check if the logo exists
    const { data: existingLogo, error: checkError } = await supabase
      .from('company_assets')
      .select('*')
      .eq('type', 'logo')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.log('❌ Error checking existing logo:', checkError.message);
      return;
    }

    if (existingLogo) {
      // Update existing logo
      const { data, error } = await supabase
        .from('company_assets')
        .update({
          name: 'BRAINX Logo',
          data: BRAINX_LOGO_BASE64,
          updated_at: new Date().toISOString()
        })
        .eq('type', 'logo')
        .select();

      if (error) {
        console.log('❌ Error updating logo:', error.message);
        return;
      }

      console.log('✅ Logo updated successfully!');
      console.log('📊 Updated record:', data[0]);
    } else {
      // Insert new logo
      const { data, error } = await supabase
        .from('company_assets')
        .insert({
          type: 'logo',
          name: 'BRAINX Logo',
          data: BRAINX_LOGO_BASE64
        })
        .select();

      if (error) {
        console.log('❌ Error inserting logo:', error.message);
        return;
      }

      console.log('✅ Logo inserted successfully!');
      console.log('📊 New record:', data[0]);
    }

    // Test the logo retrieval
    console.log('\n🧪 Testing logo retrieval...');
    const { data: testLogo, error: testError } = await supabase
      .from('company_assets')
      .select('*')
      .eq('type', 'logo')
      .single();

    if (testError) {
      console.log('❌ Error testing logo retrieval:', testError.message);
      return;
    }

    console.log('✅ Logo retrieval test successful!');
    console.log('📏 Logo data length:', testLogo.data.length);
    console.log('🔍 Logo data starts with:', testLogo.data.substring(0, 50));

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

updateLogo(); 