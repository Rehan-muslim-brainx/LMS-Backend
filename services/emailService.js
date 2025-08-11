const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  async sendOTP(email, otp, purpose = 'login') {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.log(`OTP for ${email}: ${otp} (SendGrid not configured)`);
        return { success: true, message: 'OTP logged to console' };
      }

      const subject = purpose === 'registration' 
        ? 'Welcome to BRAINX - Your Verification Code'
        : 'BRAINX Login - Your Verification Code';

      const htmlContent = this.generateOTPEmailHTML(otp, purpose);

      const msg = {
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@brainx.com',
        subject: subject,
        html: htmlContent,
        text: `Your BRAINX verification code is: ${otp}. This code will expire in 10 minutes.`
      };

      const response = await sgMail.send(msg);
      console.log('OTP email sent successfully to:', email);
      return { success: true, message: 'OTP sent successfully' };

    } catch (error) {
      console.error('Email service error:', error);
      
      // Fallback: log OTP to console if email fails
      console.log(`FALLBACK - OTP for ${email}: ${otp}`);
      return { success: true, message: 'OTP sent (fallback mode)' };
    }
  }

  generateOTPEmailHTML(otp, purpose) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>BRAINX Verification Code</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); padding: 30px; text-align: center; }
        .logo { color: white; font-size: 28px; font-weight: bold; letter-spacing: 1px; }
        .content { padding: 40px 30px; }
        .otp-box { background-color: #f8f9fa; border: 2px dashed #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 30px 0; }
        .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; margin: 15px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        .btn { display: inline-block; padding: 12px 30px; background-color: #667eea; color: white; text-decoration: none; border-radius: 25px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🧠 BRAINX</div>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Learning Management System</p>
        </div>
        
        <div class="content">
          <h2 style="color: #333; margin-bottom: 20px;">
            ${purpose === 'registration' ? 'Welcome to BRAINX!' : 'Login Verification'}
          </h2>
          
          <p style="color: #666; line-height: 1.6;">
            ${purpose === 'registration' 
              ? 'Thank you for joining BRAINX! To complete your registration and access our learning platform, please use the verification code below:'
              : 'To securely access your BRAINX account, please use the verification code below:'
            }
          </p>
          
          <div class="otp-box">
            <p style="margin: 0; color: #333; font-weight: 600;">Your Verification Code</p>
            <div class="otp-code">${otp}</div>
            <p style="margin: 0; color: #666; font-size: 14px;">This code expires in 10 minutes</p>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            Enter this code on the ${purpose === 'registration' ? 'registration' : 'login'} page to continue. 
            If you didn't request this code, please ignore this email.
          </p>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #333; font-weight: 600;">Happy Learning! 📚</p>
          </div>
        </div>
        
        <div class="footer">
          <p>© 2024 BRAINX Learning Management System</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }
}

module.exports = new EmailService(); 