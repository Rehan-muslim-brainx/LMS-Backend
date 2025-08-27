-- Add quiz_link column to courses table
-- Run this in your Supabase SQL Editor

ALTER TABLE courses ADD COLUMN IF NOT EXISTS quiz_link TEXT;

-- Add comment to the column
COMMENT ON COLUMN courses.quiz_link IS 'Link to the quiz that students must complete before course completion';

-- Verify the updated table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'courses' 
ORDER BY ordinal_position; 