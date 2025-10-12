# YouTube Transcript API Server

Python Flask 서버로 YouTube 동영상 자막을 가져오는 API를 제공합니다.

## 설치

### 1. 가상 환경 생성 및 패키지 설치 (권장)

```bash
# pnpm 사용
pnpm run setup

# 또는 수동으로
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
# venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### 2. 패키지만 설치 (시스템 전역)

```bash
python3 -m pip install -r requirements.txt
```

## 실행

### pnpm 사용 (가상 환경 자동 활성화)

```bash
pnpm run start
# 또는
pnpm run dev
```

### 수동 실행

```bash
# 가상 환경 사용 시
source venv/bin/activate
python app.py

# 시스템 Python 사용 시
python3 app.py
```

서버는 기본적으로 `http://localhost:5000`에서 실행됩니다.

## API 엔드포인트

### GET /api/youtube-transcript

YouTube 동영상의 자막을 가져옵니다.

**파라미터:**
- `video_id` (required): YouTube 동영상 ID

**예시:**
```bash
curl "http://localhost:5000/api/youtube-transcript?video_id=dQw4w9WgXcQ"
```

**응답:**
```json
{
  "success": true,
  "transcript": "자막 텍스트...",
  "video_id": "dQw4w9WgXcQ"
}
```

### GET /health

서버 상태를 확인합니다.

### GET /

API 정보를 확인합니다.

## 환경 변수

- `PORT`: 서버 포트 (기본값: 5000)