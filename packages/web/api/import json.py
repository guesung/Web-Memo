import json
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
from youtube_transcript_api.proxies import WebshareProxyConfig


def lambda_handler(event, context):
    """
    AWS Lambda handler function for YouTube transcript extraction
    """
    try:
        # CORS 헤더 설정
        headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }

        # OPTIONS 요청 처리 (CORS preflight)
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'CORS preflight'})
            }

        # GET 파라미터에서 video_id 추출
        video_id = None

        # API Gateway를 통한 요청인 경우
        if 'queryStringParameters' in event and event['queryStringParameters']:
            video_id = event['queryStringParameters'].get('video')

        # 직접 Lambda 호출인 경우
        elif 'video' in event:
            video_id = event['video']

        # video_id가 없는 경우
        if not video_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'video parameter is required',
                    'usage': 'Add ?video=VIDEO_ID to your request'
                }, ensure_ascii=False)
            }

        ytt_api = YouTubeTranscriptApi(
          proxy_config=WebshareProxyConfig(
            proxy_username="sojdnauc",
            proxy_password="70h2hp3xbhg8",
          )
        )

        transcript_list = ytt_api.list(video_id)
        transcript = transcript_list.find_transcript(['ko', 'en'])
        transcript_data = transcript.fetch()
        text_formatter = TextFormatter()

        transcript = text_formatter.format_transcript(transcript_data)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'video_id': video_id,
                'transcript': transcript
            }, ensure_ascii=False)
        }


    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': str(e)
            }, ensure_ascii=False)
        }


# 로컬 테스트용 함수 (선택사항)
if __name__ == "__main__":
    # 테스트 이벤트
    test_event = {
        'httpMethod': 'GET',
        'queryStringParameters': {
            'video': 'kbfmeHOHnl0'
        }
    }

    result = lambda_handler(test_event, None)
    print(json.dumps(result, indent=2, ensure_ascii=False))