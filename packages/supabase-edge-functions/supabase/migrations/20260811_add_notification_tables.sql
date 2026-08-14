-- 매일 아침 아티클 리마인더 알림용 테이블 3개.
-- notification_setting: 유저별 알림 On/Off·시각·타임존
-- push_token: 기기별 Expo 푸시 토큰
-- notification_log: 발송 이력(같은 메모 재알림 방지의 단일 진실 원천)

CREATE TABLE IF NOT EXISTS memo.notification_setting (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "isEnabled" boolean NOT NULL DEFAULT false,
  "notifyTime" time NOT NULL DEFAULT '08:00',
  timezone text NOT NULL DEFAULT 'Asia/Seoul',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memo.push_token (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_token_user_id_idx ON memo.push_token (user_id);

CREATE TABLE IF NOT EXISTS memo.notification_log (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memo_id bigint NOT NULL REFERENCES memo.memo(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, memo_id)
);

CREATE INDEX IF NOT EXISTS notification_log_user_sent_idx
  ON memo.notification_log (user_id, sent_at DESC);

-- RLS: 본인 행만 접근. Edge Function은 service_role로 우회 접근한다.
ALTER TABLE memo.notification_setting ENABLE ROW LEVEL SECURITY;
ALTER TABLE memo.push_token ENABLE ROW LEVEL SECURITY;
ALTER TABLE memo.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_setting_own_rows" ON memo.notification_setting
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_token_own_rows" ON memo.push_token
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_log_own_rows" ON memo.notification_log
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON memo.notification_setting TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON memo.push_token TO authenticated;
GRANT SELECT, INSERT, DELETE ON memo.notification_log TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE memo.push_token_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE memo.notification_log_id_seq TO authenticated;
