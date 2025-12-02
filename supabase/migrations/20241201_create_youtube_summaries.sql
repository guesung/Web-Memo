-- YouTube 요약 SEO 페이지를 위한 테이블
-- 생성일: 2024-12-01
-- 목적: 사용자가 저장한 YouTube 영상의 AI 요약을 저장하여 SEO 페이지로 노출

CREATE TABLE IF NOT EXISTS memo.youtube_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- YouTube 식별 정보
  video_id TEXT NOT NULL UNIQUE,        -- YouTube video ID (예: dQw4w9WgXcQ)
  video_url TEXT NOT NULL,              -- 전체 URL

  -- 메타데이터
  title TEXT NOT NULL,                  -- 영상 제목
  channel_name TEXT,                    -- 채널명
  thumbnail_url TEXT,                   -- 썸네일 이미지
  duration TEXT,                        -- 영상 길이 (예: "10:30")
  published_at TIMESTAMPTZ,             -- 영상 게시일

  -- AI 요약 콘텐츠
  summary TEXT NOT NULL,                -- AI 생성 요약
  language TEXT DEFAULT 'ko',           -- 요약 언어

  -- SEO & 통계
  view_count INT DEFAULT 0,             -- 페이지 조회수

  -- 관리
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID                       -- 최초 요약 요청 사용자 (memo.profiles 참조)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_youtube_summaries_video_id
  ON memo.youtube_summaries(video_id);

CREATE INDEX IF NOT EXISTS idx_youtube_summaries_view_count
  ON memo.youtube_summaries(view_count DESC);

CREATE INDEX IF NOT EXISTS idx_youtube_summaries_created_at
  ON memo.youtube_summaries(created_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE memo.youtube_summaries ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 허용 (SEO 페이지용 - 누구나 조회 가능)
CREATE POLICY "Allow public read access"
  ON memo.youtube_summaries
  FOR SELECT
  USING (true);

-- 인증된 사용자만 삽입 가능
CREATE POLICY "Allow authenticated insert"
  ON memo.youtube_summaries
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 인증된 사용자만 업데이트 가능 (조회수 증가 등)
CREATE POLICY "Allow authenticated update"
  ON memo.youtube_summaries
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION memo.update_youtube_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER youtube_summaries_updated_at
  BEFORE UPDATE ON memo.youtube_summaries
  FOR EACH ROW
  EXECUTE FUNCTION memo.update_youtube_summaries_updated_at();

-- 조회수 증가 함수 (RPC)
CREATE OR REPLACE FUNCTION memo.increment_youtube_summary_view_count(p_video_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE memo.youtube_summaries
  SET view_count = view_count + 1
  WHERE video_id = p_video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
