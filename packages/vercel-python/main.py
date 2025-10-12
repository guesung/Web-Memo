"""
Vercel FastAPI 엔트리포인트
모든 API 엔드포인트를 통합한 메인 애플리케이션
"""
import os
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

app = FastAPI(title="YouTube Transcript API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_proxy_config():
    """환경 변수에서 proxy 설정을 가져와 적절한 ProxyConfig 객체를 반환"""
    proxy_type = os.getenv('PROXY_TYPE', 'none').lower()

    if proxy_type == 'webshare':
        from youtube_transcript_api.proxies import WebshareProxyConfig
        username = os.getenv('WEBSHARE_PROXY_USERNAME')
        password = os.getenv('WEBSHARE_PROXY_PASSWORD')

        if not username or not password:
            print("Warning: WEBSHARE_PROXY_USERNAME or WEBSHARE_PROXY_PASSWORD not set. Using no proxy.")
            return None

        return WebshareProxyConfig(
            proxy_username=username,
            proxy_password=password
        )

    elif proxy_type == 'generic':
        from youtube_transcript_api.proxies import GenericProxyConfig
        http_url = os.getenv('PROXY_HTTP_URL')
        https_url = os.getenv('PROXY_HTTPS_URL')

        if not http_url or not https_url:
            print("Warning: PROXY_HTTP_URL or PROXY_HTTPS_URL not set. Using no proxy.")
            return None

        return GenericProxyConfig(
            http_url=http_url,
            https_url=https_url
        )

    # proxy_type == 'none' or invalid
    return None

def get_youtube_transcript(video_id: str):
    """YouTube 동영상 자막을 가져오는 함수"""
    try:
        # Proxy 설정 가져오기
        proxy_config = get_proxy_config()

        # YouTubeTranscriptApi 인스턴스 생성 (proxy 설정 포함)
        ytt_api = YouTubeTranscriptApi(proxy_config=proxy_config)
        transcript_list = ytt_api.list(video_id)
        transcript = transcript_list.find_transcript(['ko', 'en'])
        transcript_data = transcript.fetch()

        text_formatter = TextFormatter()
        text_formatted = text_formatter.format_transcript(transcript_data)

        return {
            'success': True,
            'transcript': text_formatted,
            'video_id': video_id
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'video_id': video_id
        }

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

@app.get("/health")
async def health_check_alias():
    """서버 상태 확인 (별칭)"""
    return {
        "status": "healthy",
        "message": "YouTube Transcript Server is running"
    }

@app.get("/api/youtube-transcript")
async def youtube_transcript(video_id: str = Query(None, description="YouTube 비디오 ID")):
    """YouTube 자막 API 엔드포인트"""
    if not video_id:
        return JSONResponse(
            status_code=400,
            content={
                'success': False,
                'error': 'video_id 파라미터가 필요합니다.'
            }
        )

    result = get_youtube_transcript(video_id)

    if result['success']:
        return JSONResponse(status_code=200, content=result)
    else:
        return JSONResponse(status_code=500, content=result)
