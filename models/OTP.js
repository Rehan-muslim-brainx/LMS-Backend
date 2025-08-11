const { createClient } = require('@supabase/supabase-js');

class OTP {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }

  async _checkSupabase() {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }
  }

  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Store OTP in database
  async createOTP(email, otp, purpose = 'login') {
    await this._checkSupabase();
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    const { data, error } = await this.supabase
      .from('otps')
      .insert([
        {
          email,
          otp,
          purpose,
          expires_at: expiresAt.toISOString(),
          used: false,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Create OTP error:', error);
      throw new Error('Failed to create OTP');
    }

    return data;
  }

  // Verify OTP
  async verifyOTP(email, otp, purpose = 'login') {
    await this._checkSupabase();

    console.log('Verifying OTP:', { email, otp: otp.substring(0, 2) + '****', purpose });

    const { data, error } = await this.supabase
      .from('otps')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .eq('purpose', purpose)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    console.log('OTP query result:', { data, error });

    if (error) {
      console.error('Verify OTP error:', error);
      return false;
    }

    if (!data || data.length === 0) {
      console.log('No valid OTP found for:', { email, otp: otp.substring(0, 2) + '****', purpose });
      
      // Let's also check what OTPs exist for this email
      const { data: allOtps } = await this.supabase
        .from('otps')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false });
      
      console.log('All OTPs for this email:', allOtps);
      return false;
    }

    const otpRecord = data[0];
    console.log('Found valid OTP:', otpRecord);

    // Mark OTP as used
    const updateResult = await this.supabase
      .from('otps')
      .update({ used: true })
      .eq('id', otpRecord.id);

    console.log('OTP marked as used:', updateResult);

    return true;
  }

  // Clean up expired OTPs
  async cleanupExpiredOTPs() {
    await this._checkSupabase();

    const { error } = await this.supabase
      .from('otps')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Cleanup OTPs error:', error);
    }
  }

  // Delete all OTPs for an email (useful for cleanup)
  async deleteOTPsForEmail(email) {
    await this._checkSupabase();

    const { error } = await this.supabase
      .from('otps')
      .delete()
      .eq('email', email);

    if (error) {
      console.error('Delete OTPs error:', error);
    }
  }
}

module.exports = OTP; 