-- Phase 1: Community Foundation
-- This migration adds community features to the memo application

-- ============================================
-- 1. Extend profiles table
-- ============================================

ALTER TABLE memo.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 2. Add public sharing fields to memo table
-- ============================================

ALTER TABLE memo.memo
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

-- ============================================
-- 3. Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_memo_is_public
ON memo.memo(is_public)
WHERE is_public = TRUE;

CREATE INDEX IF NOT EXISTS idx_memo_shared_at
ON memo.memo(shared_at DESC)
WHERE is_public = TRUE;

CREATE INDEX IF NOT EXISTS idx_memo_user_id_is_public
ON memo.memo(user_id, is_public)
WHERE is_public = TRUE;

-- ============================================
-- 4. RLS Policies for public access
-- ============================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Public memos viewable by everyone" ON memo.memo;
DROP POLICY IF EXISTS "Users can view own memos" ON memo.memo;
DROP POLICY IF EXISTS "Public profiles viewable by everyone" ON memo.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON memo.profiles;

-- Enable RLS if not already enabled
ALTER TABLE memo.memo ENABLE ROW LEVEL SECURITY;
ALTER TABLE memo.profiles ENABLE ROW LEVEL SECURITY;

-- Memo policies
CREATE POLICY "Public memos viewable by everyone"
ON memo.memo FOR SELECT
USING (is_public = TRUE OR auth.uid() = user_id);

CREATE POLICY "Users can insert own memos"
ON memo.memo FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memos"
ON memo.memo FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memos"
ON memo.memo FOR DELETE
USING (auth.uid() = user_id);

-- Profile policies
CREATE POLICY "Public profiles viewable by everyone"
ON memo.profiles FOR SELECT
USING (TRUE);

CREATE POLICY "Users can update own profile"
ON memo.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON memo.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 5. Function to get public memos with author info
-- ============================================

CREATE OR REPLACE FUNCTION memo.get_public_memos(
  p_limit INTEGER DEFAULT 20,
  p_cursor TIMESTAMPTZ DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id INTEGER,
  title TEXT,
  memo TEXT,
  url TEXT,
  fav_icon_url TEXT,
  user_id UUID,
  is_public BOOLEAN,
  shared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  author_nickname TEXT,
  author_avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.title,
    m.memo,
    m.url,
    m."favIconUrl" AS fav_icon_url,
    m.user_id,
    m.is_public,
    m.shared_at,
    m.created_at,
    p.nickname AS author_nickname,
    p.avatar_url AS author_avatar_url
  FROM memo.memo m
  LEFT JOIN memo.profiles p ON m.user_id = p.user_id
  WHERE
    m.is_public = TRUE
    AND (p_cursor IS NULL OR m.shared_at < p_cursor)
    AND (p_user_id IS NULL OR m.user_id = p_user_id)
  ORDER BY m.shared_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Function to get user profile with stats
-- ============================================

CREATE OR REPLACE FUNCTION memo.get_profile_with_stats(
  p_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  nickname TEXT,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  created_at TIMESTAMPTZ,
  public_memo_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id,
    p.nickname,
    p.avatar_url,
    p.bio,
    p.website,
    p.created_at,
    COUNT(m.id) FILTER (WHERE m.is_public = TRUE) AS public_memo_count
  FROM memo.profiles p
  LEFT JOIN memo.memo m ON p.user_id = m.user_id
  WHERE p.user_id = p_user_id
  GROUP BY p.user_id, p.nickname, p.avatar_url, p.bio, p.website, p.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Trigger to update shared_at when is_public changes
-- ============================================

CREATE OR REPLACE FUNCTION memo.update_shared_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_public = TRUE AND (OLD.is_public = FALSE OR OLD.is_public IS NULL) THEN
    NEW.shared_at = NOW();
  ELSIF NEW.is_public = FALSE AND OLD.is_public = TRUE THEN
    NEW.shared_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_shared_at ON memo.memo;

CREATE TRIGGER trigger_update_shared_at
BEFORE UPDATE ON memo.memo
FOR EACH ROW
WHEN (OLD.is_public IS DISTINCT FROM NEW.is_public)
EXECUTE FUNCTION memo.update_shared_at();

-- ============================================
-- 8. Trigger to update profiles.updated_at
-- ============================================

CREATE OR REPLACE FUNCTION memo.update_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_profile_updated_at ON memo.profiles;

CREATE TRIGGER trigger_update_profile_updated_at
BEFORE UPDATE ON memo.profiles
FOR EACH ROW
EXECUTE FUNCTION memo.update_profile_updated_at();
