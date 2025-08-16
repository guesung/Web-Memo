from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import os
import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False
app.config['JSONIFY_MIMETYPE'] = 'application/json; charset=utf-8'
CORS(app)

def create_json_response(data, status_code=200):
    """UTF-8 인코딩을 보장하는 JSON 응답 생성"""
    return Response(
        json.dumps(data, ensure_ascii=False, indent=2),
        status=status_code,
        mimetype='application/json; charset=utf-8'
    )

def get_youtube_transcript(video_id):
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

@app.route('/api/youtube-transcript', methods=['GET'])
def youtube_transcript():
    """YouTube 자막 API 엔드포인트"""
    video_id = request.args.get('video_id')

    if not video_id:
        return create_json_response({
            'success': False,
            'error': 'video_id 파라미터가 필요합니다.'
        }, 400)

    result = get_youtube_transcript(video_id)

    if result['success']:
        return create_json_response(result)
    else:
        return create_json_response(result, 500)

@app.route('/health', methods=['GET'])
def health_check():
    """서버 상태 확인"""
    return create_json_response({
        'status': 'healthy',
        'message': 'YouTube Transcript Server is running'
    })

@app.route('/', methods=['GET'])
def index():
    """기본 엔드포인트"""
    return create_json_response({
        'message': 'YouTube Transcript API Server',
        'endpoints': {
            '/api/youtube-transcript': 'GET - YouTube 자막 가져오기 (video_id 파라미터 필요)',
            '/health': 'GET - 서버 상태 확인'
        }
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8085))
    app.run(host='0.0.0.0', port=port, debug=True)