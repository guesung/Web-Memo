# YouTube 요약 SEO 페이지 구현 문서

## 개요

### 목적
사용자가 저장한 YouTube 영상의 AI 요약을 공개 SEO 페이지로 노출하여 검색 엔진을 통한 유입을 기하급수적으로 증가시킨다.

### 배경
- 기존 SEO 전략: 정적 랜딩 페이지 (features, use-cases) - 약 10페이지
- 새로운 SEO 전략: UGC 기반 동적 페이지 - 사용자 증가에 비례하여 무한 확장

### 기대 효과
```
사용자 1,000명 × 평균 20개 요약 = 20,000 SEO 페이지
사용자 10,000명 × 평균 20개 요약 = 200,000 SEO 페이지
```

---

## 의사결정 기록

| 날짜 | 결정 사항 | 선택 | 이유 |
|------|----------|------|------|
| 2024-XX-XX | 우선순위 | YouTube 요약 먼저 | 검색 수요 높음, 경쟁 적음 |
| 2024-XX-XX | 중복 콘텐츠 처리 | 첫 번째 요약 재사용 | 비용 절감, URL 기준 중복 방지 |
| 2024-XX-XX | 공개 정책 | 모든 요약 자동 공개 | MVP 단순화 |
| 2024-XX-XX | 적용 범위 | 새로 저장되는 것부터 | 점진적 롤아웃 |
| 2024-XX-XX | MVP 범위 | 요약 텍스트 + 기본 메타데이터 | 빠른 출시 우선 |

---

## 기술 설계

### 1. 데이터베이스 스키마

#### 새 테이블: `youtube_summaries`

```sql
CREATE TABLE youtube_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- YouTube 식별 정보
  video_id TEXT NOT NULL UNIQUE,        -- YouTube video ID (예: dQw4w9WgXcQ)
  video_url TEXT NOT NULL,              -- 전체 URL

  -- 메타데이터
  title TEXT NOT NULL,                  -- 영상 제목
  channel_name TEXT,                    -- 채널명
  channel_id TEXT,                      -- 채널 ID
  thumbnail_url TEXT,                   -- 썸네일 이미지
  duration TEXT,                        -- 영상 길이
  published_at TIMESTAMP,               -- 영상 게시일

  -- AI 요약 콘텐츠
  summary TEXT NOT NULL,                -- AI 생성 요약

  -- SEO & 통계
  view_count INT DEFAULT 0,             -- 페이지 조회수

  -- 관리
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID                       -- 최초 요약 요청 사용자
);

-- 인덱스
CREATE INDEX idx_youtube_summaries_video_id ON youtube_summaries(video_id);
CREATE INDEX idx_youtube_summaries_view_count ON youtube_summaries(view_count DESC);
CREATE INDEX idx_youtube_summaries_created_at ON youtube_summaries(created_at DESC);
```

#### RLS (Row Level Security) 정책

```sql
-- 공개 읽기 허용 (SEO 페이지용)
ALTER TABLE youtube_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON youtube_summaries
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert" ON youtube_summaries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### 2. URL 구조

```
/youtube/[videoId]
예시: /youtube/dQw4w9WgXcQ
```

### 3. 페이지 구성 (MVP)

```
┌─────────────────────────────────────────┐
│ 🎬 [영상 제목]                           │
│ [채널명] · [게시일]                       │
├─────────────────────────────────────────┤
│ 📺 썸네일 이미지                         │
├─────────────────────────────────────────┤
│ 📝 AI 요약                               │
│ [요약 내용]                              │
├─────────────────────────────────────────┤
│ 🔗 YouTube에서 보기 [버튼]               │
├─────────────────────────────────────────┤
│ 💡 CTA: Slid로 나만의 요약 만들기         │
│ [크롬 확장 설치 버튼]                     │
└─────────────────────────────────────────┘
```

### 4. SEO 메타데이터

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const summary = await getYoutubeSummary(params.videoId);

  return {
    title: `${summary.title} - AI 요약 | Slid`,
    description: summary.summary.slice(0, 160),
    openGraph: {
      title: summary.title,
      description: summary.summary.slice(0, 160),
      images: [summary.thumbnail_url],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: summary.title,
      description: summary.summary.slice(0, 160),
      images: [summary.thumbnail_url],
    },
  };
}
```

---

## 구현 단계

### Phase 1: 데이터베이스 설정 ✅
- [x] Supabase에 youtube_summaries 테이블 생성 (SQL 마이그레이션 파일 생성)
- [x] RLS 정책 설정
- [x] TypeScript 타입 생성

### Phase 2: SEO 페이지 구현 ✅
- [x] `/youtube/[videoId]/page.tsx` 생성
- [x] 메타데이터 생성 함수 구현
- [x] 페이지 컴포넌트 구현
- [x] 스타일링
- [x] i18n 번역 키 추가 (ko, en)

### Phase 3: API 연동 ✅
- [x] Supabase 쿼리 함수 구현
- [x] 조회수 증가 로직

### Phase 4: 요약 생성 API 및 연동 ✅
- [x] `/api/youtube-summary` API 라우트 구현
- [x] 기존 useSummary 훅에 YouTube 요약 저장 로직 연동
- [x] 사전 생성된 요약 텍스트 전달 지원

---

## 파일 구조

### SEO 페이지
```
packages/web/src/app/[lng]/(no-auth)/youtube/
├── [videoId]/
│   ├── page.tsx              # 메인 페이지
│   ├── _components/
│   │   ├── index.ts
│   │   ├── VideoHeader.tsx   # 제목, 채널, 날짜
│   │   ├── Thumbnail.tsx     # 썸네일 이미지
│   │   ├── Summary.tsx       # AI 요약 섹션
│   │   ├── WatchButton.tsx   # YouTube 링크 버튼
│   │   └── CTA.tsx           # 설치 유도 섹션
│   ├── _utils/
│   │   ├── index.ts
│   │   └── getYoutubeSummary.ts
│   └── _types/
│       └── index.ts
```

### API 라우트
```
packages/web/src/app/api/youtube-summary/
├── route.ts                  # GET/POST 핸들러
├── constant.ts               # 상수 및 에러 메시지
├── type.ts                   # TypeScript 타입 정의
└── util.ts                   # 유틸리티 함수 (Supabase, OpenAI 연동)
```

### 확장 프로그램 연동
```
pages/side-panel/src/hooks/useSummary/
└── index.ts                  # YouTube 요약 시 SEO DB 저장 로직 추가
```

---

## 테스트 계획

### 단위 테스트
- [ ] getYoutubeSummary 함수
- [ ] 메타데이터 생성 함수

### E2E 테스트
- [ ] 페이지 로딩 테스트
- [ ] SEO 메타태그 검증
- [ ] 404 처리 (존재하지 않는 videoId)

### SEO 검증
- [ ] Google Search Console 등록
- [ ] 구조화된 데이터 (JSON-LD) 검증
- [ ] 모바일 친화성 테스트

---

## 향후 확장 계획

### Phase 2 기능 (MVP 이후)
- 타임스탬프별 요약
- 키포인트 추출
- 관련 영상 추천

### Phase 3 기능
- 아티클 요약 페이지 (`/article/[slug]`)
- 컬렉션 페이지 (`/collection/[id]`)
- 사용자 프로필 페이지

---

## 생성된 파일 목록

### 데이터베이스
- `supabase/migrations/20241201_create_youtube_summaries.sql` - 테이블 생성 SQL

### TypeScript 타입
- `packages/shared/src/types/supabase.ts` - youtube_summaries 타입 추가

### SEO 페이지
```
packages/web/src/app/[lng]/(no-auth)/youtube/[videoId]/
├── page.tsx
├── _components/
│   ├── index.ts
│   ├── VideoHeader.tsx
│   ├── Thumbnail.tsx
│   ├── Summary.tsx
│   ├── WatchButton.tsx
│   └── CTA.tsx
└── _utils/
    ├── index.ts
    └── getYoutubeSummary.ts
```

### API 라우트 (NEW)
```
packages/web/src/app/api/youtube-summary/
├── route.ts        # GET: 요약 조회, POST: 요약 생성/저장
├── constant.ts     # 에러 메시지, HTTP 상태, 요약 프롬프트
├── type.ts         # Request/Response 타입 정의
└── util.ts         # Supabase/OpenAI 연동 유틸리티
```

### 확장 프로그램 훅 (MODIFIED)
- `pages/side-panel/src/hooks/useSummary/index.ts` - YouTube 요약 완료 시 SEO DB 저장 로직 추가

### 번역 파일
- `packages/web/src/modules/i18n/locales/ko/translation.json` - youtube.summary 키 추가
- `packages/web/src/modules/i18n/locales/en/translation.json` - youtube.summary 키 추가

---

## 배포 전 필요 작업

### 1. Supabase 테이블 생성
```bash
# Supabase 대시보드에서 SQL 실행 또는
supabase db push
```

### 2. 환경 변수 확인
API 라우트 동작을 위해 다음 환경 변수가 필요합니다:
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 서비스 롤 키 (RLS 우회)
- `OPENAI_API_KEY` - OpenAI API 키 (요약 생성)
- `YOUTUBE_TRANSCRIPT_URL` - Python 서버 URL (자막 추출)

### 3. 테스트 데이터 추가 (선택)
```sql
INSERT INTO memo.youtube_summaries (video_id, video_url, title, channel_name, thumbnail_url, summary)
VALUES (
  'dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'Rick Astley - Never Gonna Give You Up',
  'Rick Astley',
  'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  '이 영상은 Rick Astley의 대표곡 Never Gonna Give You Up의 뮤직비디오입니다...'
);
```

---

## API 사용 방법

### GET /api/youtube-summary
기존 요약 조회
```bash
curl "https://slid.cc/api/youtube-summary?video_id=dQw4w9WgXcQ"
```

### POST /api/youtube-summary
새 요약 생성 및 저장

**Option 1: 자동 요약 생성**
```bash
curl -X POST "https://slid.cc/api/youtube-summary" \
  -H "Content-Type: application/json" \
  -d '{"video_id": "dQw4w9WgXcQ", "language": "ko"}'
```

**Option 2: 기존 요약 전달 (확장 프로그램에서 사용)**
```bash
curl -X POST "https://slid.cc/api/youtube-summary" \
  -H "Content-Type: application/json" \
  -d '{
    "video_id": "dQw4w9WgXcQ",
    "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "summary_text": "이미 생성된 요약 텍스트...",
    "language": "ko"
  }'
```

---

## 변경 이력

| 날짜 | 변경 내용 | 작성자 |
|------|----------|--------|
| 2024-12-02 | 최초 문서 작성 및 Phase 1-3 구현 완료 | Claude |
| 2024-12-02 | Phase 4 완료: API 라우트 및 확장 프로그램 연동 | Claude |
