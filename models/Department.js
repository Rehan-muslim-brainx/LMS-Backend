class Department {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async getAll() {
    try {
      const { data, error } = await this.supabase
        .from('departments')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  }

  async create(departmentData) {
    try {
      const { data, error } = await this.supabase
        .from('departments')
        .insert([departmentData])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error creating department:', error);
      throw error;
    }
  }

  async update(id, departmentData) {
    try {
      const { data, error } = await this.supabase
        .from('departments')
        .update(departmentData)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error updating department:', error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const { error } = await this.supabase
        .from('departments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting department:', error);
      throw error;
    }
  }

  async getById(id) {
    try {
      const { data, error } = await this.supabase
        .from('departments')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching department:', error);
      throw error;
    }
  }
}

module.exports = Department; 