-- 느낀점/액션아이템 입력란은 기본 OFF로 시작하도록 컬럼 기본값 변경.
ALTER TABLE memo.setting ALTER COLUMN "show_impression" SET DEFAULT false;
ALTER TABLE memo.setting ALTER COLUMN "show_action_item" SET DEFAULT false;
