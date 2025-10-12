from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def index():
    """기본 엔드포인트"""
    return {
        "message": "YouTube Transcript API Server",
        "endpoints": {
            "/api/youtube-transcript": "GET - YouTube 자막 가져오기 (video_id 파라미터 필요)",
            "/api/health": "GET - 서버 상태 확인"
        }
    }

@app.get("/api/health")
async def health_check():
    """서버 상태 확인"""
    return {
        "status": "healthy",
        "message": "YouTube Transcript Server is running"
    }
