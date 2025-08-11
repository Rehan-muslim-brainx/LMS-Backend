// User model for Supabase
// This is a helper class to work with Supabase users table

class User {
  constructor(supabase) {
    this.supabase = supabase;
  }

  // Check if Supabase is configured
  _checkSupabase() {
    if (!this.supabase) {
      throw new Error('Supabase not configured. Please set up your Supabase credentials in backend/config.env');
    }
  }

  // Get user by ID
  async getById(userId) {
    this._checkSupabase();
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  }

  // Get user by email
  async getByEmail(email) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) throw error;
    return data;
  }

  // Create new user
  async create(userData) {
    const { data, error } = await this.supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Update user
  async update(userId, updates) {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Delete user
  async delete(userId) {
    const { error } = await this.supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (error) throw error;
    return true;
  }

  // Get all users (for admin)
  async getAll() {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Verify user (set is_verified to true)
  async verifyUser(email) {
    const { data, error } = await this.supabase
      .from('users')
      .update({ is_verified: true })
      .eq('email', email)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Check if email exists
  async emailExists(email) {
    try {
      const user = await this.getByEmail(email);
      return !!user;
    } catch (error) {
      return false;
    }
  }

  // Block user
  async blockUser(userId) {
    const { data, error } = await this.supabase
      .from('users')
      .update({ status: 'blocked' })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Unblock user
  async unblockUser(userId) {
    const { data, error } = await this.supabase
      .from('users')
      .update({ status: 'active' })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Check if user is blocked
  async isBlocked(userId) {
    try {
      const user = await this.getById(userId);
      return user && user.status === 'blocked';
    } catch (error) {
      return false;
    }
  }
}

module.exports = User; 