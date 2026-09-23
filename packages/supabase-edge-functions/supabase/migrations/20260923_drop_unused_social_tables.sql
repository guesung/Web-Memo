-- 현재 제품에서 사용하지 않는 공개 메모 소셜 기능을 제거한다.
--
-- Production에서 네 테이블이 모두 0행이고, 저장소 코드와 배포된 Edge Functions에
-- 사용처가 없음을 확인했다. 알림 기능은 daily-article-reminder가 사용하므로 유지한다.
-- CASCADE를 사용하지 않아 예상하지 못한 의존 객체가 있으면 전체 트랜잭션을 중단한다.

BEGIN;

LOCK TABLE
  memo.memo_bookmarks,
  memo.memo_comments,
  memo.memo_likes,
  memo.user_follows
IN ACCESS EXCLUSIVE MODE;

DO $function$
BEGIN
  IF EXISTS (SELECT 1 FROM memo.memo_bookmarks) THEN
    RAISE EXCEPTION 'memo.memo_bookmarks contains rows';
  END IF;

  IF EXISTS (SELECT 1 FROM memo.memo_comments) THEN
    RAISE EXCEPTION 'memo.memo_comments contains rows';
  END IF;

  IF EXISTS (SELECT 1 FROM memo.memo_likes) THEN
    RAISE EXCEPTION 'memo.memo_likes contains rows';
  END IF;

  IF EXISTS (SELECT 1 FROM memo.user_follows) THEN
    RAISE EXCEPTION 'memo.user_follows contains rows';
  END IF;
END;
$function$;

DROP FUNCTION memo.get_bookmarked_memos(uuid, integer, timestamp with time zone);
DROP FUNCTION memo.get_followers(uuid, integer, timestamp with time zone);
DROP FUNCTION memo.get_following(uuid, integer, timestamp with time zone);
DROP FUNCTION memo.get_memo_comments(integer, integer, timestamp with time zone);
DROP FUNCTION memo.get_profile_with_stats(uuid, uuid);
DROP FUNCTION memo.get_public_memos(integer, timestamp with time zone, uuid, uuid);

DROP TABLE memo.memo_bookmarks;
DROP TABLE memo.memo_comments;
DROP TABLE memo.memo_likes;
DROP TABLE memo.user_follows;

DROP FUNCTION memo.update_memo_bookmark_count();
DROP FUNCTION memo.update_comment_updated_at();
DROP FUNCTION memo.update_memo_comment_count();
DROP FUNCTION memo.update_memo_like_count();
DROP FUNCTION memo.update_follow_counts();

COMMIT;
