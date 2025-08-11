const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

class CompanyAsset {
  static _checkSupabase() {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase not configured');
    }
  }

  static async getLogo() {
    try {
      this._checkSupabase();
      
      const { data, error } = await supabase
        .from('company_assets')
        .select('*')
        .eq('type', 'logo')
        .single();
      
      if (error) {
        console.error('Error fetching logo:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in getLogo:', error);
      return null;
    }
  }

  static async updateLogo(logoData) {
    try {
      this._checkSupabase();
      
      const { data, error } = await supabase
        .from('company_assets')
        .upsert({
          type: 'logo',
          data: logoData,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error updating logo:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in updateLogo:', error);
      return null;
    }
  }

  static async getAllAssets() {
    try {
      this._checkSupabase();
      
      const { data, error } = await supabase
        .from('company_assets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching assets:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getAllAssets:', error);
      return [];
    }
  }
}

module.exports = CompanyAsset; 