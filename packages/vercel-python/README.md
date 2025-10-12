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

**방법 1: 통합 개발 서버 (권장)**

```bash
# 로컬 개발용 통합 앱 실행
python api/dev.py

# 또는 uvicorn 사용
uvicorn api.dev:app --reload --port 8085
```

**방법 2: Vercel Dev CLI**

```bash
# Vercel 로컬 개발 환경 (프로덕션과 동일한 환경)
vercel dev
```

로컬 실행 후 다음 URL로 접속:
- http://127.0.0.1:8085/api/youtube-transcript?video_id=Gl1RmDAkFX4
- http://127.0.0.1:8085/api/health
- http://127.0.0.1:8085/

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

## Proxy 설정 (YouTube IP 차단 우회)

YouTube에서 IP를 차단하는 경우 proxy를 사용하여 우회할 수 있습니다.

### 1. 환경 변수 파일 생성

`.env.example` 파일을 복사하여 `.env` 파일을 생성합니다:

```bash
cp .env.example .env
```

### 2. Proxy 타입 선택

`.env` 파일에서 `PROXY_TYPE`을 설정합니다:
- `none`: Proxy 사용 안함 (기본값)
- `webshare`: Webshare proxy 사용 (권장)
- `generic`: 사용자 지정 proxy 사용

### 3-A. Webshare Proxy 사용 (권장)

Webshare는 무료 티어를 제공합니다 (10개 프록시 + 1GB 대역폭, 신용카드 불필요).

1. [Webshare](https://www.webshare.io/)에 가입
2. [Dashboard](https://dashboard.webshare.io/)에서 API 자격증명 확인
3. `.env` 파일에 설정:

```env
PROXY_TYPE=webshare
WEBSHARE_PROXY_USERNAME=your-username
WEBSHARE_PROXY_PASSWORD=your-password
```

### 3-B. Generic Proxy 사용

무료 또는 유료 proxy 서비스를 사용할 수 있습니다.

```env
PROXY_TYPE=generic
PROXY_HTTP_URL=http://user:pass@proxy-server:port
PROXY_HTTPS_URL=https://user:pass@proxy-server:port
```

**무료 대안**: [Tor Proxy](https://github.com/dperson/torproxy) (Docker 사용, 속도 느림)

### 4. Vercel 환경 변수 설정

Vercel에 배포할 때는 Vercel 대시보드에서 환경 변수를 설정합니다:

1. Vercel 프로젝트 페이지로 이동
2. **Settings** → **Environment Variables** 선택
3. 다음 변수를 추가:
   - `PROXY_TYPE`: `webshare` 또는 `generic`
   - Webshare 사용 시:
     - `WEBSHARE_PROXY_USERNAME`
     - `WEBSHARE_PROXY_PASSWORD`
   - Generic 사용 시:
     - `PROXY_HTTP_URL`
     - `PROXY_HTTPS_URL`
4. 재배포하여 적용

## 프로젝트 구조

```
packages/vercel-python/
├── api/
│   ├── dev.py                    # 로컬 개발용 통합 앱
│   ├── index.py                  # 기본 엔드포인트 (Vercel Functions)
│   └── youtube-transcript.py     # YouTube 자막 API (Vercel Functions)
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
