# Vercel Python - YouTube Transcript API

Vercel Python Runtime을 사용한 YouTube 자막 API 서버입니다.

## 기능

- YouTube 비디오 자막 가져오기 (한국어/영어)
- FastAPI 기반 RESTful API
- CORS 지원
- UTF-8 인코딩 지원

## API 엔드포인트

### 1. YouTube 자막 가져오기

```
GET /api/youtube-transcript?video_id={VIDEO_ID}
```

**파라미터:**
- `video_id` (required): YouTube 비디오 ID

**응답 예시:**

성공:
```json
{
  "success": true,
  "transcript": "자막 텍스트...",
  "video_id": "VIDEO_ID"
}
```

실패:
```json
{
  "success": false,
  "error": "에러 메시지",
  "video_id": "VIDEO_ID"
}
```

### 2. 서버 상태 확인

```
GET /api/health
```

**응답:**
```json
{
  "status": "healthy",
  "message": "YouTube Transcript Server is running"
}
```

### 3. 기본 정보

```
GET /
```

**응답:**
```json
{
  "message": "YouTube Transcript API Server",
  "endpoints": {
    "/api/youtube-transcript": "GET - YouTube 자막 가져오기 (video_id 파라미터 필요)",
    "/api/health": "GET - 서버 상태 확인"
  }
}
```

## 로컬 개발

### 필수 요구사항

- Python 3.12 이상
- pip 또는 uv

### 설치

```bash
# 의존성 설치
pip install -r requirements.txt

# 또는 uv 사용
uv pip install -r requirements.txt
```

### 로컬 실행

```bash
# FastAPI 개발 서버 실행
uvicorn api.index:app --reload --port 8085

# 또는 다른 엔드포인트
uvicorn api.youtube-transcript:app --reload --port 8085
```

## Vercel 배포

### 1. Vercel CLI 설치

```bash
npm i -g vercel
```

### 2. 배포

```bash
# 프로젝트 디렉토리에서
vercel

# 프로덕션 배포
vercel --prod
```

### 3. 환경 변수 설정

필요한 경우 Vercel 대시보드에서 환경 변수를 설정할 수 있습니다.

## 프로젝트 구조

```
packages/vercel-python/
├── api/
│   ├── index.py                  # 기본 엔드포인트
│   └── youtube-transcript.py     # YouTube 자막 API
├── pyproject.toml                # Python 프로젝트 설정
├── requirements.txt              # 의존성 목록
├── vercel.json                   # Vercel 설정
├── .vercelignore                 # 배포 제외 파일
└── README.md                     # 프로젝트 문서
```

## 기술 스택

- **Python**: 3.12
- **Framework**: FastAPI 0.117.1+
- **YouTube API**: youtube-transcript-api 0.6.2+
- **Deployment**: Vercel Python Runtime

## 제한 사항

- 번들 크기: 최대 250MB (압축 해제 기준)
- Python 런타임: Vercel에서 제공하는 버전만 사용 가능
- 실행 시간: Vercel Functions 제한 시간 적용

## 참고

- [Vercel Python Runtime 문서](https://vercel.com/docs/functions/runtimes/python)
- [FastAPI 문서](https://fastapi.tiangolo.com/)
- [YouTube Transcript API](https://github.com/jdepoix/youtube-transcript-api)
