-- 확장프로그램이 사용자에게 보여줄 공지. 운영자가 대시보드(service_role)로만 쓰고, 클라이언트는 읽기만 한다.
-- link_target은 'open_options'(확장 설정 열기) 또는 https URL이다.
CREATE TABLE IF NOT EXISTS memo.notice (
  id             bigint generated always as identity primary key,
  title_ko       text not null,
  title_en       text not null,
  body_ko        text not null,
  body_en        text not null,
  link_label_ko  text,
  link_label_en  text,
  link_target    text,
  starts_at      timestamptz,
  ends_at        timestamptz,
  created_at     timestamptz not null default now()
);

ALTER TABLE memo.notice ENABLE ROW LEVEL SECURITY;

-- memo 스키마의 기본 권한이 새 테이블에 쓰기 권한까지 주므로, 읽기 전용임을 권한에서도 분명히 한다.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON memo.notice FROM anon, authenticated;
GRANT SELECT ON memo.notice TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'memo' AND tablename = 'notice' AND policyname = 'notice_select_all'
  ) THEN
    CREATE POLICY notice_select_all ON memo.notice
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- 첫 공지: 하이라이트 버블 안내. 같은 제목이 이미 있으면 넣지 않는다.
INSERT INTO memo.notice (
  title_ko, title_en, body_ko, body_en,
  link_label_ko, link_label_en, link_target,
  starts_at, ends_at
)
SELECT
  '드래그하면 하이라이트 버튼이 떠요',
  'A highlight button appears when you drag text',
  '글을 드래그하면 웹 메모 로고가 달린 버튼이 떠요. 눌러서 문장을 저장해 두면 웹에서 모아 볼 수 있어요. 필요 없으면 버튼의 X나 설정에서 끌 수 있어요.',
  'Drag text and a button with the Web Memo logo appears. Save sentences with it and find them later on the web. If you don''t need it, turn it off with the X on the button or in settings.',
  '설정 열기',
  'Open settings',
  'open_options',
  null,
  '2026-11-01T00:00:00+09:00'
WHERE NOT EXISTS (
  SELECT 1 FROM memo.notice WHERE title_ko = '드래그하면 하이라이트 버튼이 떠요'
);
