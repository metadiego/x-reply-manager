-- Fix user profile creation function for Twitter OAuth users
-- This ensures user profiles are created reliably for all authentication methods

-- Replace the existing function with improved error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the user creation for debugging
  RAISE LOG 'Creating user profile for user: %', NEW.id;
  
  -- Create user profile with all required fields
  INSERT INTO public.users_profiles (
    id,
    created_at,
    updated_at,
    subscription_tier,
    daily_digest_time,
    timezone
  ) VALUES (
    NEW.id,
    NOW(),
    NOW(),
    'free',
    '09:00:00',
    'UTC'
  ) ON CONFLICT (id) DO NOTHING; -- Prevent duplicate insertion
  
  -- Create user processing state
  INSERT INTO public.user_processing_state (
    user_id,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicate insertion
  
  RAISE LOG 'Successfully created profile and processing state for user: %', NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't prevent user creation
    RAISE LOG 'Error creating user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;