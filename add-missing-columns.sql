-- Add missing columns to users table for BRAINX LMS functionality
-- Run this in your Supabase SQL Editor

-- Add status column for user blocking functionality
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Add department column for department-based user management
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Add bio column for user profile
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add avatar_url column for user profile pictures
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add is_verified column for OTP authentication
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Update existing users to have default values
UPDATE users SET status = 'active' WHERE status IS NULL;
UPDATE users SET is_verified = TRUE WHERE is_verified IS NULL;

-- Add comments to the columns
COMMENT ON COLUMN users.status IS 'User status: active, blocked, or suspended';
COMMENT ON COLUMN users.department IS 'User department for role-based access control';
COMMENT ON COLUMN users.bio IS 'User biography/description';
COMMENT ON COLUMN users.avatar_url IS 'URL to user profile picture';
COMMENT ON COLUMN users.is_verified IS 'Whether user has verified their email with OTP';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Verify the updated table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position; 