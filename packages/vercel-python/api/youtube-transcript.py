from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_youtube_transcript(video_id: str):
    """YouTube 동영상 자막을 가져오는 함수"""
    try:
        ytt_api = YouTubeTranscriptApi()
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
