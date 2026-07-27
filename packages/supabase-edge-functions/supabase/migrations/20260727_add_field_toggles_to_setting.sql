-- 확장프로그램·앱·웹이 공통으로 참조하는 "느낀점/액션아이템 입력란 표시 여부" 설정 컬럼 추가.
ALTER TABLE memo.setting
  ADD COLUMN IF NOT EXISTS "show_impression" boolean NOT NULL DEFAULT true;
ALTER TABLE memo.setting
  ADD COLUMN IF NOT EXISTS "show_action_item" boolean NOT NULL DEFAULT true;

-- user_id 기준 upsert(on_conflict)를 지원하려면 유니크 제약이 필요.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'setting_user_id_key'
  ) THEN
    ALTER TABLE memo.setting ADD CONSTRAINT setting_user_id_key UNIQUE (user_id);
  END IF;
END $$;

ALTER TABLE memo.setting ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'memo' AND tablename = 'setting' AND policyname = 'setting_owner_access'
  ) THEN
    CREATE POLICY setting_owner_access ON memo.setting
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
