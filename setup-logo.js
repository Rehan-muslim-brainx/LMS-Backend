const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('🚀 Setting up BRAINX Logo in Database...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

// Base64 encoded BRAINX logo (blue B design)
const BRAINX_LOGO_BASE64 = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTUgMjVIMzVWNzVIMTVWMjVaIiBmaWxsPSIjMDA3QkZGIi8+CjxwYXRoIGQ9Ik0xNSA0NUgzNVY2NUgxNVY0NVoiIGZpbGw9IiMwMDdCRkYiLz4KPHBhdGggZD0iTTE1IDI1SDM1VjM1SDE1VjI1WiIgZmlsbD0iIzAwN0JGRiIvPgo8cGF0aCBkPSJNMTUgNjVIMzVWNzVIMTVWNjVaIiBmaWxsPSIjMDA3QkZGIi8+CjxwYXRoIGQ9Ik0zNSAyNUg1NVYzNUgzNVYyNVoiIGZpbGw9IiMwMDdCRkYiLz4KPHBhdGggZD0iTTM1IDY1SDU1Vjc1SDM1VjY1WiIgZmlsbD0iIzAwN0JGRiIvPgo8cGF0aCBkPSJNNTUgMjVINzVWMzVINTVWMjVaIiBmaWxsPSIjMDA3QkZGIi8+CjxwYXRoIGQ9Ik01NSA2NUg3NVY3NUg1NVY2NVoiIGZpbGw9IiMwMDdCRkYiLz4KPHBhdGggZD0iTTc1IDI1SDk1VjM1SDc1VjI1WiIgZmlsbD0iIzAwN0JGRiIvPgo8cGF0aCBkPSJNNzUgNjVIOTVWNzVINzVWNjVaIiBmaWxsPSIjMDA3QkZGIi8+Cjwvc3ZnPgo=`;

async function setupLogo() {
  try {
    console.log('\n📋 Creating company_assets table...');
    
    // Create company_assets table
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS company_assets (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          data TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(type)
        );
      `
    });
    
    if (tableError) {
      console.log('⚠️  Company assets table might already exist or error:', tableError.message);
    } else {
      console.log('✅ Company assets table created');
    }
    
    console.log('\n🎨 Inserting BRAINX logo...');
    
    // Insert the logo
    const { data: logoData, error: logoError } = await supabase
      .from('company_assets')
      .upsert({
        type: 'logo',
        data: BRAINX_LOGO_BASE64,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (logoError) {
      console.log('⚠️  Logo insertion error:', logoError.message);
    } else {
      console.log('✅ BRAINX logo inserted successfully');
      console.log('📊 Logo ID:', logoData.id);
    }
    
    console.log('\n🎉 Logo setup completed!');
    console.log('🖼️  BRAINX logo is now stored in the database');
    console.log('🌐 The logo will be fetched from the API instead of static files');
    
  } catch (error) {
    console.error('❌ Logo setup failed:', error.message);
  }
}

setupLogo(); 