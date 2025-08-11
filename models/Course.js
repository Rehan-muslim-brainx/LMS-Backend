// Course model for Supabase
class Course {
  constructor(supabase) {
    this.supabase = supabase;
  }

  // Get course by ID
  async getById(courseId) {
    const { data, error } = await this.supabase
      .from('courses')
      .select(`
        *,
        instructor:users(name, email),
        lessons:lessons(*)
      `)
      .eq('id', courseId)
      .single();
    
    if (error) throw error;
    return data;
  }

  // Get all courses
  async getAll() {
    const { data, error } = await this.supabase
      .from('courses')
      .select(`
        *,
        instructor:users(name, email),
        lessons:lessons(count)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Get courses by instructor
  async getByInstructor(instructorId) {
    const { data, error } = await this.supabase
      .from('courses')
      .select(`
        *,
        lessons:lessons(count)
      `)
      .eq('instructor_id', instructorId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Create new course
  async create(courseData) {
    const { data, error } = await this.supabase
      .from('courses')
      .insert([courseData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Update course
  async update(courseId, updates) {
    const { data, error } = await this.supabase
      .from('courses')
      .update(updates)
      .eq('id', courseId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Delete course
  async delete(courseId) {
    const { error } = await this.supabase
      .from('courses')
      .delete()
      .eq('id', courseId);
    
    if (error) throw error;
    return true;
  }

  // Search courses
  async search(query) {
    const { data, error } = await this.supabase
      .from('courses')
      .select(`
        *,
        instructor:users(name, email)
      `)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}

module.exports = Course; 