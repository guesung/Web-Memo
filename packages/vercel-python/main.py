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

# 환경 변수 로드 (로컬 개발용, Vercel 환경에서는 선택 사항)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # Vercel 환경에서는 dotenv가 없어도 정상 동작
    pass

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

    print(f"[DEBUG] PROXY_TYPE: {proxy_type}")
    print(f"[DEBUG] Environment variables: PROXY_TYPE={os.getenv('PROXY_TYPE')}, "
          f"WEBSHARE_USERNAME={'SET' if os.getenv('WEBSHARE_PROXY_USERNAME') else 'NOT SET'}, "
          f"WEBSHARE_PASSWORD={'SET' if os.getenv('WEBSHARE_PROXY_PASSWORD') else 'NOT SET'}")

    if proxy_type == 'webshare':
        try:
            from youtube_transcript_api.proxies import WebshareProxyConfig
            username = os.getenv('WEBSHARE_PROXY_USERNAME')
            password = os.getenv('WEBSHARE_PROXY_PASSWORD')

            if not username or not password:
                print("[ERROR] WEBSHARE_PROXY_USERNAME or WEBSHARE_PROXY_PASSWORD not set. Using no proxy.")
                return None

            print(f"[INFO] Using Webshare proxy with username: {username}")
            return WebshareProxyConfig(
                proxy_username=username,
                proxy_password=password
            )
        except Exception as e:
            print(f"[ERROR] Failed to configure Webshare proxy: {e}")
            return None

    elif proxy_type == 'generic':
        try:
            from youtube_transcript_api.proxies import GenericProxyConfig
            http_url = os.getenv('PROXY_HTTP_URL')
            https_url = os.getenv('PROXY_HTTPS_URL')

            if not http_url or not https_url:
                print("[ERROR] PROXY_HTTP_URL or PROXY_HTTPS_URL not set. Using no proxy.")
                return None

            print(f"[INFO] Using Generic proxy: {http_url}")
            return GenericProxyConfig(
                http_url=http_url,
                https_url=https_url
            )
        except Exception as e:
            print(f"[ERROR] Failed to configure Generic proxy: {e}")
            return None

    # proxy_type == 'none' or invalid
    print("[INFO] No proxy configured")
    return None

def get_youtube_transcript(video_id: str):
    """YouTube 동영상 자막을 가져오는 함수"""
    try:
        # Proxy 설정 가져오기
        proxy_config = get_proxy_config()

        print(f"[DEBUG] Proxy config object: {proxy_config}")
        print(f"[DEBUG] Proxy config type: {type(proxy_config)}")

        # YouTubeTranscriptApi 인스턴스 생성 (proxy 설정 포함)
        ytt_api = YouTubeTranscriptApi(proxy_config=proxy_config)
        print(f"[DEBUG] YouTubeTranscriptApi instance created with proxy: {proxy_config is not None}")

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

@app.get("/api/debug/env")
async def debug_env():
    """환경 변수 디버깅"""
    return {
        "proxy_type": os.getenv('PROXY_TYPE', 'NOT_SET'),
        "webshare_username": 'SET' if os.getenv('WEBSHARE_PROXY_USERNAME') else 'NOT_SET',
        "webshare_password": 'SET' if os.getenv('WEBSHARE_PROXY_PASSWORD') else 'NOT_SET',
        "generic_http_url": 'SET' if os.getenv('PROXY_HTTP_URL') else 'NOT_SET',
        "generic_https_url": 'SET' if os.getenv('PROXY_HTTPS_URL') else 'NOT_SET',
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
