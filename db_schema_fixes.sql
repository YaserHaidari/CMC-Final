-- Database Schema Fixes for CMC Application
-- Run these commands to fix the data type mismatches and add proper foreign keys

-- IMPORTANT: Your mentees.user_id contains UUIDs but users.id is bigint!
-- This means mentees.user_id should reference users.auth_user_id, not users.id

-- First, let's check if users table has auth_user_id column
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';

-- 1. We need to add auth_user_id column to users table if it doesn't exist
-- This will store the UUID from authentication
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE;

-- 2. Update existing users to populate auth_user_id if needed
-- You'll need to manually map these based on your authentication system
-- UPDATE users SET auth_user_id = 'actual-auth-uuid-here' WHERE id = 1;

-- 3. For mentees table - we'll reference auth_user_id instead of id
ALTER TABLE public.mentees 
DROP CONSTRAINT IF EXISTS mentee_userid_key;

-- mentees.user_id stays as uuid and references users.auth_user_id
ALTER TABLE public.mentees 
ADD CONSTRAINT mentees_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(auth_user_id);

-- Re-add unique constraint
ALTER TABLE public.mentees 
ADD CONSTRAINT mentee_userid_key UNIQUE (user_id);

-- 4. For mentors table - check what type of IDs you have
-- SELECT user_id, pg_typeof(user_id) FROM mentors LIMIT 5;
-- If mentors also have UUIDs, do the same as mentees:

ALTER TABLE public.mentors 
DROP CONSTRAINT IF EXISTS mentor_userid_key;

-- If mentors.user_id contains UUIDs (check first!), reference auth_user_id:
ALTER TABLE public.mentors 
ADD CONSTRAINT mentors_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(auth_user_id);

-- If mentors.user_id contains integers, convert and reference users.id:
-- ALTER TABLE public.mentors ALTER COLUMN user_id TYPE bigint USING user_id::bigint;
-- ALTER TABLE public.mentors ADD CONSTRAINT mentors_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

-- Re-add unique constraint
ALTER TABLE public.mentors 
ADD CONSTRAINT mentor_userid_key UNIQUE (user_id);

-- 5. For mentorship_requests table - decide what user_id should represent
-- If it should be the integer ID from users table:
ALTER TABLE public.mentorship_requests 
ALTER COLUMN user_id TYPE bigint USING user_id::bigint;

ALTER TABLE public.mentorship_requests 
ADD CONSTRAINT mentorship_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

-- 6. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users USING btree (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_mentees_user_id ON public.mentees USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_mentors_user_id ON public.mentors USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_requests_user_id ON public.mentorship_requests USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_requests_status ON public.mentorship_requests USING btree (status);

-- 7. Optional: Add some helpful indexes for queries
CREATE INDEX IF NOT EXISTS idx_mentorship_requests_created_at ON public.mentorship_requests USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentorship_requests_mentor_mentee ON public.mentorship_requests USING btree (mentor_id, mentee_id);