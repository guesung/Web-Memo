from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import sys
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # URL 파라미터 파싱
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            video_id = params.get('video', [None])[0]

            if not video_id:
                self._send_json_response(400, {"error": "video parameter required"})
                return

            # 여기서 실제 YouTube 처리 로직 실행
            transcript = self.get_youtube_transcript(video_id)

            self._send_json_response(200, {"transcript": transcript})

        except Exception as e:
            self._send_json_response(500, {"error": str(e)})

    def _send_json_response(self, status, data):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def get_youtube_transcript(self, video_id):
        try:
            ytt_api = YouTubeTranscriptApi()
            transcript_list = ytt_api.list(video_id)
            transcript = transcript_list.find_transcript(['ko', 'en'])
            transcript_data = transcript.fetch()
            text_formatter = TextFormatter()

            text_formatted = text_formatter.format_transcript(transcript_data)

            return text_formatted
        except Exception as e:
            raise Exception(f"자막을 가져오는 중 오류 발생: {e}")