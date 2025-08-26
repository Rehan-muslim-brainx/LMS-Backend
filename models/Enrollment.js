// Enrollment model for Supabase
class Enrollment {
  constructor(supabase) {
    this.supabase = supabase;
  }

  // Get all enrollments
  async getAll() {
    const { data, error } = await this.supabase
      .from('enrollments')
      .select(`
        *,
        user:users!enrollments_user_id_fkey(name, email),
        course:courses(title, description),
        admin_approver:users!enrollments_admin_approved_by_fkey(name, email)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Get enrollment by ID
  async getById(enrollmentId) {
    const { data, error } = await this.supabase
      .from('enrollments')
      .select(`
        *,
        user:users!enrollments_user_id_fkey(name, email),
        course:courses(title, description),
        admin_approver:users!enrollments_admin_approved_by_fkey(name, email)
      `)
      .eq('id', enrollmentId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No enrollment found
      }
      throw error;
    }
    return data;
  }

  // Get enrollments by user
  async getByUser(userId) {
    const { data, error } = await this.supabase
      .from('enrollments')
      .select(`
        *,
        course:courses(title, description, image_url, category, is_active, instructor:users!courses_instructor_id_fkey(name))
      `)
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Get enrollments by course
  async getByCourse(courseId) {
    const { data, error } = await this.supabase
      .from('enrollments')
      .select(`
        *,
        user:users!enrollments_user_id_fkey(name, email, department)
      `)
      .eq('course_id', courseId)
      .order('enrolled_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Get enrollments pending admin approval
  async getPendingApproval() {
    const { data, error } = await this.supabase
      .from('enrollments')
      .select(`
        *,
        user:users!enrollments_user_id_fkey(name, email, department),
        course:courses(title, description)
      `)
      .eq('status', 'completion_requested')
      .order('completion_requested_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Get completed enrollments
  async getCompleted() {
    const { data, error } = await this.supabase
      .from('enrollments')
      .select(`
        *,
        user:users!enrollments_user_id_fkey(name, email, department),
        course:courses(title, description),
        admin_approver:users!enrollments_admin_approved_by_fkey(name, email)
      `)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Check if user is enrolled in course
  async isEnrolled(userId, courseId) {
    const { data, error } = await this.supabase
      .from('enrollments')
      .select('id, status')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? { isEnrolled: true, status: data.status } : { isEnrolled: false, status: null };
  }

  // Create enrollment
  async create(enrollmentData) {
    const { data, error } = await this.supabase
      .from('enrollments')
      .insert([enrollmentData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Update enrollment
  async update(enrollmentId, updates) {
    console.log('🔍 MODEL - update called for enrollment:', enrollmentId);
    console.log('🔍 MODEL - update with data:', updates);
    
    const { data, error } = await this.supabase
      .from('enrollments')
      .update(updates)
      .eq('id', enrollmentId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ MODEL - update error:', error);
      throw error;
    }
    
    console.log('✅ MODEL - update successful, returned data:', data);
    return data;
  }

  // Request completion
  async requestCompletion(enrollmentId, notes = null) {
    const updates = {
      status: 'completion_requested',
      completion_requested_at: new Date().toISOString(),
      completion_notes: notes
    };
    
    return await this.update(enrollmentId, updates);
  }

  // Approve completion (admin only)
  async approveCompletion(enrollmentId, adminUserId) {
    console.log('🔍 MODEL - approveCompletion called for enrollment:', enrollmentId);
    const updates = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      admin_approved_at: new Date().toISOString(),
      admin_approved_by: adminUserId
    };
    
    console.log('🔍 MODEL - approveCompletion updates:', updates);
    const result = await this.update(enrollmentId, updates);
    console.log('✅ MODEL - approveCompletion result:', result);
    return result;
  }

  // Reject completion (admin only)
  async rejectCompletion(enrollmentId, adminUserId, rejectionNotes = null) {
    console.log('🔍 MODEL - rejectCompletion called for enrollment:', enrollmentId);
    const updates = {
      status: 'active',
      completion_requested_at: null,
      completion_notes: rejectionNotes || 'Completion request rejected'
    };
    
    console.log('🔍 MODEL - rejectCompletion updates:', updates);
    const result = await this.update(enrollmentId, updates);
    console.log('✅ MODEL - rejectCompletion result:', result);
    return result;
  }

  // Delete enrollment
  async delete(enrollmentId) {
    const { error } = await this.supabase
      .from('enrollments')
      .delete()
      .eq('id', enrollmentId);
    
    if (error) throw error;
    return true;
  }

  // Get enrollment statistics
  async getStats() {
    const { data, error } = await this.supabase
      .from('enrollments')
      .select('status');
    
    if (error) throw error;
    
    const stats = {
      total: data.length,
      active: data.filter(e => e.status === 'active').length,
      completed: data.filter(e => e.status === 'completed').length,
      completion_requested: data.filter(e => e.status === 'completion_requested').length,
      dropped: data.filter(e => e.status === 'dropped').length
    };
    
    return stats;
  }
}

module.exports = Enrollment; 