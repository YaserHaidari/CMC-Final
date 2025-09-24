-- Fix ONLY the mentees table
-- Run these commands step by step

-- Step 1: Check if users table has auth_user_id column
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'auth_user_id';

-- Step 2: Add auth_user_id column to users table if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE;

-- Step 3: You need to populate auth_user_id with the actual authentication UUIDs
-- This maps your integer user IDs to their authentication UUIDs
-- You'll need to run queries like this for each user:
-- UPDATE users SET auth_user_id = '7b56e7de-bdc4-47b8-b346-8f02432591af' WHERE id = 1;
-- UPDATE users SET auth_user_id = 'c3aa2cbb-fd0f-41e5-8d52-358045d179f8' WHERE id = 2;
-- ... etc for all your users

-- Step 4: Fix mentees table constraints
ALTER TABLE public.mentees 
DROP CONSTRAINT IF EXISTS mentee_userid_key;

-- Step 5: Add foreign key constraint - mentees.user_id (uuid) -> users.auth_user_id (uuid)
ALTER TABLE public.mentees 
ADD CONSTRAINT mentees_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(auth_user_id);

-- Step 6: Re-add unique constraint
ALTER TABLE public.mentees 
ADD CONSTRAINT mentee_userid_key UNIQUE (user_id);

-- Step 7: Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users USING btree (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_mentees_user_id ON public.mentees USING btree (user_id);