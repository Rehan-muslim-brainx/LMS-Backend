-- Add is_active column to courses table
ALTER TABLE courses ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Update existing courses to be active by default
UPDATE courses SET is_active = true WHERE is_active IS NULL;

-- Add comment to the column
COMMENT ON COLUMN courses.is_active IS 'Whether the course is visible to users (true) or hidden (false)'; 