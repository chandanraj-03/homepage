-- ==============================================================================
-- PrivCloud: Supabase Database Schema
-- Table: Users (and automatic sync with Supabase Auth)
-- Idempotent script (safe to re-run multiple times)
-- ==============================================================================

-- 1. Create the public "Users" table if it doesn't exist
CREATE TABLE IF NOT EXISTS public."Users" (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT,
    version TEXT DEFAULT '1.0.0',
    transaction_id TEXT,
    transaction_done_on TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1b. Ensure columns match requested structure if table was created previously
ALTER TABLE public."Users" ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0.0';
ALTER TABLE public."Users" ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE public."Users" ADD COLUMN IF NOT EXISTS transaction_done_on TIMESTAMPTZ;
ALTER TABLE public."Users" DROP COLUMN IF EXISTS full_name;
ALTER TABLE public."Users" DROP COLUMN IF EXISTS avatar_url;
ALTER TABLE public."Users" DROP COLUMN IF EXISTS storage_used_bytes;
ALTER TABLE public."Users" DROP COLUMN IF EXISTS storage_quota_bytes;
ALTER TABLE public."Users" DROP COLUMN IF EXISTS updated_at;

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public."Users" ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies (Drop first so re-running never causes 42710 error)
DROP POLICY IF EXISTS "Users can view their own profile" ON public."Users";
CREATE POLICY "Users can view their own profile" 
ON public."Users" 
FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public."Users";
CREATE POLICY "Users can update their own profile" 
ON public."Users" 
FOR UPDATE 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public."Users";
CREATE POLICY "Users can insert their own profile" 
ON public."Users" 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 4. Trigger Function: Automatically insert into public."Users" on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public."Users" (
        id, 
        email, 
        username, 
        version, 
        transaction_id, 
        transaction_done_on
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'version', '1.0.0'),
        NEW.raw_user_meta_data->>'transaction_id',
        CASE 
            WHEN NEW.raw_user_meta_data->>'transaction_done_on' IS NOT NULL 
            THEN (NEW.raw_user_meta_data->>'transaction_done_on')::TIMESTAMPTZ 
            ELSE NULL 
        END
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = COALESCE(EXCLUDED.username, public."Users".username),
        version = COALESCE(EXCLUDED.version, public."Users".version),
        transaction_id = COALESCE(EXCLUDED.transaction_id, public."Users".transaction_id),
        transaction_done_on = COALESCE(EXCLUDED.transaction_done_on, public."Users".transaction_done_on);
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach the trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
