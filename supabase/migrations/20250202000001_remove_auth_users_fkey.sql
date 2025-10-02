-- Update foreign key constraint from users_profiles to reference next_auth.users
-- We're now using NextAuth which stores users in next_auth.users schema instead of auth.users

-- Drop the old foreign key constraint
ALTER TABLE public.users_profiles
DROP CONSTRAINT IF EXISTS users_profiles_id_fkey;

-- Add new foreign key constraint referencing next_auth.users
ALTER TABLE public.users_profiles
ADD CONSTRAINT users_profiles_id_fkey
FOREIGN KEY (id) REFERENCES next_auth.users(id) ON DELETE CASCADE;
