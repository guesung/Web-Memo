-- PR #828(DB-1284)이 원격에 적용해 둔 memo.get_memo_retention_stats 를 지운다.
--
-- 그 PR은 이 작업(DB-1332)의 메모 리텐션 섹션으로 대체되어 머지하지 않고 닫았다. 같은 7~30일
-- 재작성률은 memo.get_admin_monthly_rewrite_rate 가 맡는다. master 코드에는 이 함수를 부르는 곳이 없다.
--
-- 롤백: PR #828 브랜치의 20261103120000_add_memo_retention_stats.sql 을 다시 적용한다.

drop function if exists memo.get_memo_retention_stats(text, text);
