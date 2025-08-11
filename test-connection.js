const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('🧪 Testing BRAINX LMS Database Connection...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('\n🔍 Testing database tables...');
    
    // Test users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Users table error:', usersError.message);
    } else {
      console.log('✅ Users table accessible');
    }
    
    // Test courses table
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('count')
      .limit(1);
    
    if (coursesError) {
      console.log('❌ Courses table error:', coursesError.message);
    } else {
      console.log('✅ Courses table accessible');
    }
    
    // Test lessons table
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('count')
      .limit(1);
    
    if (lessonsError) {
      console.log('❌ Lessons table error:', lessonsError.message);
    } else {
      console.log('✅ Lessons table accessible');
    }
    
    // Test enrollments table
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('count')
      .limit(1);
    
    if (enrollmentsError) {
      console.log('❌ Enrollments table error:', enrollmentsError.message);
    } else {
      console.log('✅ Enrollments table accessible');
    }
    
    console.log('\n🎉 Database connection test completed!');
    console.log('🚀 Your BRAINX LMS is ready to use!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

testConnection(); 