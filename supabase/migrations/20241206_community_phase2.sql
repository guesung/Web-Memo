-- Phase 2: Social Interactions
-- This migration adds likes, bookmarks, comments, and follow features

-- ============================================
-- 1. Create memo_likes table
-- ============================================

CREATE TABLE IF NOT EXISTS memo.memo_likes (
  id SERIAL PRIMARY KEY,
  memo_id INTEGER NOT NULL REFERENCES memo.memo(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(memo_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memo_likes_memo_id ON memo.memo_likes(memo_id);
CREATE INDEX IF NOT EXISTS idx_memo_likes_user_id ON memo.memo_likes(user_id);

-- ============================================
-- 2. Create memo_bookmarks table
-- ============================================

CREATE TABLE IF NOT EXISTS memo.memo_bookmarks (
  id SERIAL PRIMARY KEY,
  memo_id INTEGER NOT NULL REFERENCES memo.memo(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(memo_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memo_bookmarks_memo_id ON memo.memo_bookmarks(memo_id);
CREATE INDEX IF NOT EXISTS idx_memo_bookmarks_user_id ON memo.memo_bookmarks(user_id);

-- ============================================
-- 3. Create memo_comments table
-- ============================================

CREATE TABLE IF NOT EXISTS memo.memo_comments (
  id SERIAL PRIMARY KEY,
  memo_id INTEGER NOT NULL REFERENCES memo.memo(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memo_comments_memo_id ON memo.memo_comments(memo_id);
CREATE INDEX IF NOT EXISTS idx_memo_comments_user_id ON memo.memo_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_memo_comments_created_at ON memo.memo_comments(created_at DESC);

-- ============================================
-- 4. Create user_follows table
-- ============================================

CREATE TABLE IF NOT EXISTS memo.user_follows (
  id SERIAL PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON memo.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON memo.user_follows(following_id);

-- ============================================
-- 5. Add count columns to memo table for performance
-- ============================================

ALTER TABLE memo.memo
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bookmark_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- ============================================
-- 6. Add follower/following counts to profiles
-- ============================================

ALTER TABLE memo.profiles
ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- ============================================
-- 7. RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE memo.memo_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE memo.memo_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE memo.memo_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE memo.user_follows ENABLE ROW LEVEL SECURITY;

-- Likes policies
DROP POLICY IF EXISTS "Anyone can view likes on public memos" ON memo.memo_likes;
DROP POLICY IF EXISTS "Users can like public memos" ON memo.memo_likes;
DROP POLICY IF EXISTS "Users can unlike their own likes" ON memo.memo_likes;

CREATE POLICY "Anyone can view likes on public memos"
ON memo.memo_likes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM memo.memo m WHERE m.id = memo_id AND m.is_public = TRUE
  )
);

CREATE POLICY "Users can like public memos"
ON memo.memo_likes FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM memo.memo m WHERE m.id = memo_id AND m.is_public = TRUE
  )
);

CREATE POLICY "Users can unlike their own likes"
ON memo.memo_likes FOR DELETE
USING (auth.uid() = user_id);

-- Bookmarks policies
DROP POLICY IF EXISTS "Users can view own bookmarks" ON memo.memo_bookmarks;
DROP POLICY IF EXISTS "Users can create bookmarks" ON memo.memo_bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON memo.memo_bookmarks;

CREATE POLICY "Users can view own bookmarks"
ON memo.memo_bookmarks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookmarks"
ON memo.memo_bookmarks FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM memo.memo m WHERE m.id = memo_id AND m.is_public = TRUE
  )
);

CREATE POLICY "Users can delete own bookmarks"
ON memo.memo_bookmarks FOR DELETE
USING (auth.uid() = user_id);

-- Comments policies
DROP POLICY IF EXISTS "Anyone can view comments on public memos" ON memo.memo_comments;
DROP POLICY IF EXISTS "Users can create comments" ON memo.memo_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON memo.memo_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON memo.memo_comments;

CREATE POLICY "Anyone can view comments on public memos"
ON memo.memo_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM memo.memo m WHERE m.id = memo_id AND m.is_public = TRUE
  )
);

CREATE POLICY "Users can create comments"
ON memo.memo_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM memo.memo m WHERE m.id = memo_id AND m.is_public = TRUE
  )
);

CREATE POLICY "Users can update own comments"
ON memo.memo_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
ON memo.memo_comments FOR DELETE
USING (auth.uid() = user_id);

-- Follows policies
DROP POLICY IF EXISTS "Anyone can view follows" ON memo.user_follows;
DROP POLICY IF EXISTS "Users can follow others" ON memo.user_follows;
DROP POLICY IF EXISTS "Users can unfollow" ON memo.user_follows;

CREATE POLICY "Anyone can view follows"
ON memo.user_follows FOR SELECT
USING (TRUE);

CREATE POLICY "Users can follow others"
ON memo.user_follows FOR INSERT
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
ON memo.user_follows FOR DELETE
USING (auth.uid() = follower_id);

-- ============================================
-- 8. Trigger functions for count updates
-- ============================================

-- Like count trigger
CREATE OR REPLACE FUNCTION memo.update_memo_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE memo.memo SET like_count = like_count + 1 WHERE id = NEW.memo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE memo.memo SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.memo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_memo_like_count ON memo.memo_likes;
CREATE TRIGGER trigger_update_memo_like_count
AFTER INSERT OR DELETE ON memo.memo_likes
FOR EACH ROW
EXECUTE FUNCTION memo.update_memo_like_count();

-- Bookmark count trigger
CREATE OR REPLACE FUNCTION memo.update_memo_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE memo.memo SET bookmark_count = bookmark_count + 1 WHERE id = NEW.memo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE memo.memo SET bookmark_count = GREATEST(bookmark_count - 1, 0) WHERE id = OLD.memo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_memo_bookmark_count ON memo.memo_bookmarks;
CREATE TRIGGER trigger_update_memo_bookmark_count
AFTER INSERT OR DELETE ON memo.memo_bookmarks
FOR EACH ROW
EXECUTE FUNCTION memo.update_memo_bookmark_count();

-- Comment count trigger
CREATE OR REPLACE FUNCTION memo.update_memo_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE memo.memo SET comment_count = comment_count + 1 WHERE id = NEW.memo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE memo.memo SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.memo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_memo_comment_count ON memo.memo_comments;
CREATE TRIGGER trigger_update_memo_comment_count
AFTER INSERT OR DELETE ON memo.memo_comments
FOR EACH ROW
EXECUTE FUNCTION memo.update_memo_comment_count();

-- Follow count trigger
CREATE OR REPLACE FUNCTION memo.update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE memo.profiles SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
    UPDATE memo.profiles SET follower_count = follower_count + 1 WHERE user_id = NEW.following_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE memo.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE user_id = OLD.follower_id;
    UPDATE memo.profiles SET follower_count = GREATEST(follower_count - 1, 0) WHERE user_id = OLD.following_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_follow_counts ON memo.user_follows;
CREATE TRIGGER trigger_update_follow_counts
AFTER INSERT OR DELETE ON memo.user_follows
FOR EACH ROW
EXECUTE FUNCTION memo.update_follow_counts();

-- Comment updated_at trigger
CREATE OR REPLACE FUNCTION memo.update_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_comment_updated_at ON memo.memo_comments;
CREATE TRIGGER trigger_update_comment_updated_at
BEFORE UPDATE ON memo.memo_comments
FOR EACH ROW
EXECUTE FUNCTION memo.update_comment_updated_at();

-- ============================================
-- 9. Update get_public_memos function with counts and interaction status
-- ============================================

DROP FUNCTION IF EXISTS memo.get_public_memos(INTEGER, TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS memo.get_public_memos(INTEGER, TIMESTAMPTZ, UUID, UUID);

CREATE OR REPLACE FUNCTION memo.get_public_memos(
  p_limit INTEGER DEFAULT 20,
  p_cursor TIMESTAMPTZ DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_current_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  memo TEXT,
  url TEXT,
  fav_icon_url TEXT,
  user_id UUID,
  is_public BOOLEAN,
  shared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  author_nickname TEXT,
  author_avatar_url TEXT,
  like_count INTEGER,
  bookmark_count INTEGER,
  comment_count INTEGER,
  is_liked BOOLEAN,
  is_bookmarked BOOLEAN
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
    p.avatar_url AS author_avatar_url,
    COALESCE(m.like_count, 0) AS like_count,
    COALESCE(m.bookmark_count, 0) AS bookmark_count,
    COALESCE(m.comment_count, 0) AS comment_count,
    CASE WHEN p_current_user_id IS NOT NULL THEN
      EXISTS (SELECT 1 FROM memo.memo_likes ml WHERE ml.memo_id = m.id AND ml.user_id = p_current_user_id)
    ELSE FALSE END AS is_liked,
    CASE WHEN p_current_user_id IS NOT NULL THEN
      EXISTS (SELECT 1 FROM memo.memo_bookmarks mb WHERE mb.memo_id = m.id AND mb.user_id = p_current_user_id)
    ELSE FALSE END AS is_bookmarked
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
-- 10. Function to get comments for a memo
-- ============================================

CREATE OR REPLACE FUNCTION memo.get_memo_comments(
  p_memo_id INTEGER,
  p_limit INTEGER DEFAULT 50,
  p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id INTEGER,
  memo_id INTEGER,
  user_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  author_nickname TEXT,
  author_avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.memo_id,
    c.user_id,
    c.content,
    c.created_at,
    c.updated_at,
    p.nickname AS author_nickname,
    p.avatar_url AS author_avatar_url
  FROM memo.memo_comments c
  LEFT JOIN memo.profiles p ON c.user_id = p.user_id
  WHERE
    c.memo_id = p_memo_id
    AND (p_cursor IS NULL OR c.created_at < p_cursor)
  ORDER BY c.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 11. Function to get user's bookmarked memos
-- ============================================

CREATE OR REPLACE FUNCTION memo.get_bookmarked_memos(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_cursor TIMESTAMPTZ DEFAULT NULL
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
  author_avatar_url TEXT,
  like_count INTEGER,
  bookmark_count INTEGER,
  comment_count INTEGER,
  bookmarked_at TIMESTAMPTZ
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
    p.avatar_url AS author_avatar_url,
    COALESCE(m.like_count, 0) AS like_count,
    COALESCE(m.bookmark_count, 0) AS bookmark_count,
    COALESCE(m.comment_count, 0) AS comment_count,
    b.created_at AS bookmarked_at
  FROM memo.memo_bookmarks b
  INNER JOIN memo.memo m ON b.memo_id = m.id
  LEFT JOIN memo.profiles p ON m.user_id = p.user_id
  WHERE
    b.user_id = p_user_id
    AND m.is_public = TRUE
    AND (p_cursor IS NULL OR b.created_at < p_cursor)
  ORDER BY b.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 12. Update get_profile_with_stats to include follow counts
-- ============================================

DROP FUNCTION IF EXISTS memo.get_profile_with_stats(UUID);

CREATE OR REPLACE FUNCTION memo.get_profile_with_stats(
  p_user_id UUID,
  p_current_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  nickname TEXT,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  created_at TIMESTAMPTZ,
  public_memo_count BIGINT,
  follower_count INTEGER,
  following_count INTEGER,
  is_following BOOLEAN
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
    COUNT(m.id) FILTER (WHERE m.is_public = TRUE) AS public_memo_count,
    COALESCE(p.follower_count, 0) AS follower_count,
    COALESCE(p.following_count, 0) AS following_count,
    CASE WHEN p_current_user_id IS NOT NULL THEN
      EXISTS (SELECT 1 FROM memo.user_follows f WHERE f.follower_id = p_current_user_id AND f.following_id = p.user_id)
    ELSE FALSE END AS is_following
  FROM memo.profiles p
  LEFT JOIN memo.memo m ON p.user_id = m.user_id
  WHERE p.user_id = p_user_id
  GROUP BY p.user_id, p.nickname, p.avatar_url, p.bio, p.website, p.created_at, p.follower_count, p.following_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 13. Function to get followers/following list
-- ============================================

CREATE OR REPLACE FUNCTION memo.get_followers(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  nickname TEXT,
  avatar_url TEXT,
  bio TEXT,
  followed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id,
    p.nickname,
    p.avatar_url,
    p.bio,
    f.created_at AS followed_at
  FROM memo.user_follows f
  INNER JOIN memo.profiles p ON f.follower_id = p.user_id
  WHERE
    f.following_id = p_user_id
    AND (p_cursor IS NULL OR f.created_at < p_cursor)
  ORDER BY f.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION memo.get_following(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  nickname TEXT,
  avatar_url TEXT,
  bio TEXT,
  followed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id,
    p.nickname,
    p.avatar_url,
    p.bio,
    f.created_at AS followed_at
  FROM memo.user_follows f
  INNER JOIN memo.profiles p ON f.following_id = p.user_id
  WHERE
    f.follower_id = p_user_id
    AND (p_cursor IS NULL OR f.created_at < p_cursor)
  ORDER BY f.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
