# Web-Memo OpenAI API 통합 가이드

Chrome 확장 프로그램의 요약 기능을 Background Script에서 Next.js Route Handler로 마이그레이션하고, 사용자 설정 프롬프트를 활용하는 완전한 가이드입니다.

## 📋 목차
- [개요](#개요)
- [새로운 아키텍처](#새로운-아키텍처)
- [구현 상세](#구현-상세)
- [환경 설정](#환경-설정)
- [배포 가이드](#배포-가이드)
- [테스트 방법](#테스트-방법)
- [문제 해결](#문제-해결)

## 🎯 개요

### 변경 전 (기존 아키텍처)
```
사이드 패널 → Background Script → OpenAI API → Background Script → 사이드 패널
```

### 변경 후 (새로운 아키텍처)
```
사이드 패널 (사용자 프롬프트) → Next.js Route Handler (/api/openai) → OpenAI API → Next.js Route Handler → 사이드 패널
```

### 주요 개선사항
- ✅ **보안 강화**: API 키가 서버 측에서만 관리됨
- ✅ **사용자 맞춤화**: 사용자가 설정한 프롬프트 활용
- ✅ **확장성**: 일반적인 OpenAI API 엔드포인트로 다양한 용도 지원
- ✅ **유지보수성**: 중앙화된 API 로직 관리
- ✅ **모니터링**: 서버 레벨에서 로그 및 메트릭 수집 가능

## 🏗️ 새로운 아키텍처

### 1. Next.js Route Handler (`/app/api/openai/route.ts`)

핵심 기능:
- 일반적인 OpenAI API 프록시 서버 역할
- messages 배열을 직접 받아 OpenAI API 호출
- 스트리밍/비스트리밍 응답 모두 지원
- CORS 헤더 설정으로 Chrome Extension 지원
- 포괄적인 에러 처리 및 토큰 최적화

주요 특징:
```typescript
// 메시지 형식으로 요청 받기
const { messages, model = "gpt-4o-mini", stream = true } = body;

// 스트리밍 응답
const customReadable = new ReadableStream({
  async start(controller) {
    const streamResponse = await openai.chat.completions.create({
      model,
      messages,
      stream: true,
      max_tokens: 1000,
      temperature: 0.3,
    });
    // 스트리밍 처리 로직
  }
});
```

### 2. 사이드 패널 업데이트 (`useSummary.ts`)

주요 변경사항:
- Background Script 의존성 제거
- 사용자 설정 프롬프트 활용 (getSystemPrompt 함수 사용)
- OpenAI messages 형식으로 요청 구성
- 직접 HTTP 요청으로 변경
- Server-Sent Events(SSE) 스타일 스트리밍 처리

```typescript
// 사용자 설정 프롬프트 생성
const systemPrompt = await getSystemPrompt({ 
  language: language || "ko", 
  category: currentCategory 
});

// OpenAI API 메시지 형식으로 구성
const messages = [
  { role: "system", content: systemPrompt },
  { role: "user", content: pageContent }
];

// 서버로 직접 요청
const response = await fetch(`${CONFIG.webUrl}/api/openai`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages,
    model: "gpt-4o-mini",
    stream: true,
    max_tokens: 1000,
    temperature: 0.3,
  }),
});

// 스트리밍 응답 처리
const reader = response.body?.getReader();
const decoder = new TextDecoder();
// 실시간 텍스트 업데이트
```

## ⚙️ 환경 설정

### 1. 환경 변수 설정

#### 개발 환경 (`.env.local` 생성 권장)
```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

#### 운영 환경
배포 플랫폼에서 환경 변수 설정:
- **Vercel**: Dashboard → Settings → Environment Variables
- **Netlify**: Site Settings → Environment Variables
- **AWS/기타**: 해당 플랫폼 문서 참조

### 2. API 키 보안 주의사항
- ❌ `NEXT_PUBLIC_` 접두사 사용 금지 (클라이언트 노출됨)
- ✅ 서버 전용 환경변수로만 설정
- ✅ `.env.local` 파일을 `.gitignore`에 추가
- ✅ 운영 환경에서는 보안이 확보된 환경변수 관리 서비스 사용

### 3. CORS 설정

Route Handler에서 자동으로 처리되는 CORS 헤더:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
```

## 🚀 배포 가이드

### 1. 개발 환경 실행
```bash
# Next.js 웹 애플리케이션 실행
pnpm dev:web

# Chrome Extension 개발 빌드
pnpm dev:extension
```

### 2. 운영 환경 배포

#### Vercel 배포 (권장)
```bash
# Vercel 배포
vercel --prod

# 환경 변수 설정
vercel env add OPENAI_API_KEY
```

#### 기타 플랫폼
```bash
# 운영 빌드
pnpm build:web

# 환경 변수 OPENAI_API_KEY 설정 필요
```

### 3. Chrome Extension 배포
```bash
# Extension 빌드
pnpm build:extension

# 배포용 패키지 생성
pnpm zip
```

## 🧪 테스트 방법

### 1. 로컬 테스트

#### API 엔드포인트 테스트
```bash
curl -X POST http://localhost:3000/api/openai \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "당신은 도움이 되는 어시스턴트입니다."},
      {"role": "user", "content": "안녕하세요!"}
    ],
    "model": "gpt-4o-mini",
    "stream": true,
    "max_tokens": 100
  }'
```

#### 스트리밍 응답 확인
브라우저 개발자 도구 Network 탭에서 응답 확인:
- Content-Type: `text/plain; charset=utf-8`
- 실시간으로 데이터 수신되는지 확인

### 2. Extension 테스트
1. Chrome Extension 개발자 모드에서 로드
2. 웹페이지에서 사이드 패널 열기
3. 요약 버튼 클릭
4. 실시간으로 요약 텍스트가 나타나는지 확인

### 3. E2E 테스트
```bash
# Playwright E2E 테스트 실행
pnpm test:e2e
```

## 🔧 문제 해결

### 1. 일반적인 오류

#### API 키 오류
```
Error: OpenAI API 키가 설정되지 않았습니다.
```
**해결방법**: 환경 변수 `OPENAI_API_KEY` 설정 확인

#### CORS 오류
```
Access to fetch at 'API_URL' from origin 'chrome-extension://...' has been blocked
```
**해결방법**: Route Handler의 CORS 헤더 설정 확인

#### 스트리밍 오류
```
Response body is not readable
```
**해결방법**: 네트워크 연결 및 서버 응답 형식 확인

### 2. 성능 최적화

#### 토큰 사용량 관리
```typescript
// 텍스트 길이 제한
const maxLength = 100000; // 약 25,000 토큰
if (pageContent.length > maxLength) {
  processedContent = pageContent.substring(0, maxLength);
}

// 토큰 수 제한
max_tokens: 1000, // 응답 길이 제한
temperature: 0.3, // 일관성 있는 요약
```

#### 비용 최적화
- **모델 선택**: `gpt-4o-mini` 사용 (비용 효율적)
- **토큰 제한**: `max_tokens` 설정으로 응답 길이 제한
- **캐싱**: 동일한 내용에 대한 중복 요청 방지

### 3. 디버깅 가이드

#### 서버 로그 확인
```bash
# 개발 환경에서 콘솔 로그 확인
console.log("Request received:", { pageContent, category, language });
```

#### 클라이언트 디버깅
```javascript
// Chrome Extension 개발자 도구에서 확인
console.error("Summary error:", error);
```

#### 네트워크 디버깅
Chrome 개발자 도구 → Network 탭:
- 요청 헤더 확인
- 응답 상태 코드 확인
- 스트리밍 데이터 확인

## 📝 추가 고려사항

### 1. 프롬프트 최적화
```typescript
const getSystemPrompt = (language: string, category: string) => {
  // 언어별, 카테고리별 최적화된 프롬프트
  // 요약 품질 향상을 위한 구체적인 지침 포함
};
```

### 2. 대용량 텍스트 처리
- 청킹(Chunking): 긴 텍스트를 여러 부분으로 나누어 처리
- 요약의 요약: 매우 긴 콘텐츠에 대해 단계별 요약

### 3. 에러 처리 개선
- 재시도 로직 구현
- 부분 응답 복구 기능
- 사용자 친화적 오류 메시지

이 가이드를 통해 Chrome 확장 프로그램의 요약 기능을 성공적으로 Next.js Route Handler로 마이그레이션할 수 있습니다.