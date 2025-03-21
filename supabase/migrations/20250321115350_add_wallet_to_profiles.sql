-- Add wallet fields to profiles table
ALTER TABLE profiles
ADD COLUMN wallet_public_key TEXT,
ADD COLUMN wallet_private_key TEXT ENCRYPTED,
ADD COLUMN has_wallet BOOLEAN DEFAULT FALSE;

-- Add comment to explain the encrypted column
COMMENT ON COLUMN profiles.wallet_private_key IS 'Encrypted Solana wallet private key';

-- Update RLS policies for the new columns
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if needed and recreate with new columns
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create policies that include the new wallet columns
CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);
