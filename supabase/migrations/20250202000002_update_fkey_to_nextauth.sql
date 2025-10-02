-- Update foreign key constraint to point to next_auth.users instead of removing it entirely

-- Drop the constraint (it was already removed in the previous migration)
ALTER TABLE public.users_profiles
DROP CONSTRAINT IF EXISTS users_profiles_id_fkey;

-- Add new foreign key constraint referencing next_auth.users
ALTER TABLE public.users_profiles
ADD CONSTRAINT users_profiles_id_fkey
FOREIGN KEY (id) REFERENCES next_auth.users(id) ON DELETE CASCADE;
