// Lesson model for Supabase
class Lesson {
  constructor(supabase) {
    this.supabase = supabase;
  }

  // Get lesson by ID
  async getById(lessonId) {
    const { data, error } = await this.supabase
      .from('lessons')
      .select(`
        *,
        course:courses(title)
      `)
      .eq('id', lessonId)
      .single();
    
    if (error) throw error;
    return data;
  }

  // Get lessons by course
  async getByCourse(courseId) {
    const { data, error } = await this.supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
    
    if (error) throw error;
    return data;
  }

  // Create new lesson
  async create(lessonData) {
    const { data, error } = await this.supabase
      .from('lessons')
      .insert([lessonData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Update lesson
  async update(lessonId, updates) {
    const { data, error } = await this.supabase
      .from('lessons')
      .update(updates)
      .eq('id', lessonId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Delete lesson
  async delete(lessonId) {
    const { error } = await this.supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);
    
    if (error) throw error;
    return true;
  }

  // Reorder lessons
  async reorder(courseId, lessonIds) {
    const updates = lessonIds.map((id, index) => ({
      id,
      order_index: index + 1
    }));

    const { error } = await this.supabase
      .from('lessons')
      .upsert(updates);
    
    if (error) throw error;
    return true;
  }
}

module.exports = Lesson; 