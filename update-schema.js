const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('🔄 Updating Database Schema...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSchema() {
  try {
    console.log('\n📋 Adding new columns to courses table...');

    // Note: This would normally be done via Supabase dashboard SQL editor
    // Since we can't run DDL commands via the JavaScript client,
    // we'll test the table structure instead
    
    console.log('\n🧪 Testing courses table structure...');
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Error accessing courses table:', error.message);
      console.log('\n📝 Please run this SQL in your Supabase dashboard:');
      console.log(`
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS document_url TEXT,
ADD COLUMN IF NOT EXISTS external_link TEXT;
      `);
      return;
    }

    console.log('✅ Courses table accessible');
    
    // Check if we have any data
    if (data && data.length > 0) {
      console.log('📊 Sample course data:');
      const course = data[0];
      console.log('- Title:', course.title);
      console.log('- Has document_url field:', 'document_url' in course);
      console.log('- Has external_link field:', 'external_link' in course);
      
      if (!('document_url' in course) || !('external_link' in course)) {
        console.log('\n⚠️  Missing new columns! Please run this SQL in Supabase:');
        console.log(`
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS document_url TEXT,
ADD COLUMN IF NOT EXISTS external_link TEXT;
        `);
      } else {
        console.log('✅ All required columns are present!');
      }
    } else {
      console.log('📝 No courses in database yet - table structure will be validated when first course is created');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

updateSchema(); 