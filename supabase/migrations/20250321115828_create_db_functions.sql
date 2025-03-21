-- Create function to check if wallet columns exist in profiles table
CREATE OR REPLACE FUNCTION check_profile_columns()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  column_count integer;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name IN ('wallet_public_key', 'wallet_private_key', 'has_wallet');
  
  RETURN column_count = 3;
END;
$$;

-- Create function that allows adding the wallet columns
CREATE OR REPLACE FUNCTION run_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;

-- Create function to get wallet columns existence
CREATE OR REPLACE FUNCTION get_profile_columns()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN check_profile_columns();
END;
$$;

-- Add wallet columns if they don't exist already
DO $$
BEGIN
  IF NOT check_profile_columns() THEN
    ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS wallet_public_key TEXT,
    ADD COLUMN IF NOT EXISTS wallet_private_key TEXT,
    ADD COLUMN IF NOT EXISTS has_wallet BOOLEAN DEFAULT FALSE;
  END IF;
END
$$;
