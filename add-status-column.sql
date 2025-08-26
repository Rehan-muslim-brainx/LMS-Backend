-- Add status column to users table for user blocking functionality
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Update existing users to have 'active' status
UPDATE users SET status = 'active' WHERE status IS NULL;

-- Add comment to the column
COMMENT ON COLUMN users.status IS 'User status: active, blocked, or suspended';

-- Create index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status); 