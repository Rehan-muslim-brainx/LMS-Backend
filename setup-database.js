const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('🚀 Setting up BRAINX LMS Database...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? 'Present' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  try {
    console.log('\n📋 Creating database tables...');
    
    // Create users table
    console.log('Creating users table...');
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'project_coordinator',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (usersError) {
      console.log('⚠️  Users table might already exist or error:', usersError.message);
    } else {
      console.log('✅ Users table created');
    }
    
    // Create courses table
    console.log('Creating courses table...');
    const { error: coursesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS courses (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100) DEFAULT 'Project Management',
          price DECIMAL(10,2) DEFAULT 0.00,
          duration INTEGER DEFAULT 0,
          image_url TEXT,
          instructor_id UUID REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (coursesError) {
      console.log('⚠️  Courses table might already exist or error:', coursesError.message);
    } else {
      console.log('✅ Courses table created');
    }
    
    // Create lessons table
    console.log('Creating lessons table...');
    const { error: lessonsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS lessons (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          content TEXT,
          video_url TEXT,
          duration INTEGER DEFAULT 0,
          order_index INTEGER DEFAULT 0,
          course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (lessonsError) {
      console.log('⚠️  Lessons table might already exist or error:', lessonsError.message);
    } else {
      console.log('✅ Lessons table created');
    }
    
    // Create enrollments table
    console.log('Creating enrollments table...');
    const { error: enrollmentsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS enrollments (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
          status VARCHAR(50) DEFAULT 'enrolled',
          progress INTEGER DEFAULT 0,
          completed_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, course_id)
        );
      `
    });
    
    if (enrollmentsError) {
      console.log('⚠️  Enrollments table might already exist or error:', enrollmentsError.message);
    } else {
      console.log('✅ Enrollments table created');
    }
    
    // Create indexes
    console.log('Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);',
      'CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);',
      'CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);'
    ];
    
    for (const index of indexes) {
      const { error: indexError } = await supabase.rpc('exec_sql', { sql: index });
      if (indexError) {
        console.log('⚠️  Index creation error:', indexError.message);
      }
    }
    
    console.log('✅ Indexes created');
    
    console.log('\n🎉 Database setup completed!');
    console.log('📊 Tables created: users, courses, lessons, enrollments');
    console.log('🔗 Indexes created for better performance');
    
    // Test the connection
    console.log('\n🧪 Testing database connection...');
    await testConnection();
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('\n💡 Alternative: Please create tables manually in Supabase SQL Editor');
  }
}

async function testConnection() {
  try {
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
    
    console.log('\n🎉 All tables are ready!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

setupDatabase(); 