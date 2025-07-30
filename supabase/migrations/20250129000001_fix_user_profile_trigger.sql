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

-- Also create a function to manually fix missing profiles for existing users
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.users_profiles WHERE id = user_uuid) THEN
    -- Create missing profile
    INSERT INTO public.users_profiles (
      id,
      created_at,
      updated_at,
      subscription_tier,
      daily_digest_time,
      timezone
    ) VALUES (
      user_uuid,
      NOW(),
      NOW(),
      'free',
      '09:00:00',
      'UTC'
    );
    
    RAISE LOG 'Created missing user profile for: %', user_uuid;
  END IF;
  
  -- Check if processing state exists
  IF NOT EXISTS (SELECT 1 FROM public.user_processing_state WHERE user_id = user_uuid) THEN
    -- Create missing processing state
    INSERT INTO public.user_processing_state (
      user_id,
      created_at,
      updated_at
    ) VALUES (
      user_uuid,
      NOW(),
      NOW()
    );
    
    RAISE LOG 'Created missing processing state for: %', user_uuid;
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error ensuring user profile for %: %', user_uuid, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;