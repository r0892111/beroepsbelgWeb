/*
  # Create profile on user signup trigger

  1. Changes
    - Create a database trigger that automatically creates a profile entry when a new user signs up
    - This ensures profiles are always created regardless of signup method (email/password, OAuth, etc.)
    - Uses the user's metadata (full_name, preferred_language) if available

  2. Notes
    - Trigger fires AFTER INSERT on auth.users
    - Creates profile with user's email and metadata
    - Uses ON CONFLICT to handle cases where profile might already exist
*/

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, preferred_language, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL),
    COALESCE((NEW.raw_user_meta_data->>'preferred_language')::text, 'nl'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
