import argparse
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter

def main():
    # 명령행 인자 파싱
    parser = argparse.ArgumentParser(description='YouTube 동영상 자막을 다운로드합니다.')
    parser.add_argument('--video-id', required=True, help='YouTube 동영상 ID')

    args = parser.parse_args()
    video_id = args.video_id

    try:
        ytt_api = YouTubeTranscriptApi()
        transcript_list = ytt_api.list(video_id)
        transcript = transcript_list.find_transcript(['ko', 'en'])
        transcript_data = transcript.fetch()

    except Exception as e:
        print(f"자막을 가져오는 중 오류 발생: {e}")
        exit(1)

    text_formatter = TextFormatter()
    text_formatted = text_formatter.format_transcript(transcript_data)

    print(text_formatted)

if __name__ == "__main__":
    main()