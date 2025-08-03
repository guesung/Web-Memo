import argparse
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import SRTFormatter, TextFormatter

def get_video_id(video_url):
    video_id = video_url.split('v=')[1][:11]
    return video_id

def main():
    # 명령행 인자 파싱
    parser = argparse.ArgumentParser(description='YouTube 동영상 자막을 다운로드합니다.')
    parser.add_argument('--video-id', required=True, help='YouTube 동영상 ID')
    args = parser.parse_args()

    video_id = args.video_id

    ytt_api = YouTubeTranscriptApi()

    try:
        transcript_list = ytt_api.list(video_id)

        print("사용 가능한 자막 목록:")
        for transcript in transcript_list:
            print(f"- [자막언어] {transcript.language}, [자막 언어 코드] {transcript.language_code}")

        transcript = transcript_list.find_transcript(['ko', 'en'])
        transcript_data = transcript.fetch()

    except Exception as e:
        print(f"자막을 가져오는 중 오류 발생: {e}")
        exit(1)

    # SRT 형식으로 변환
    srt_formatter = SRTFormatter()
    srt_formatted = srt_formatter.format_transcript(transcript_data)
    print("\nSRT 형식 자막 (처음 150자):")
    print(srt_formatted[:150])

    import os
    download_folder = "./make_service_for_me"
    os.makedirs(download_folder, exist_ok=True)

    srt_file = f"{download_folder}/{video_id}.srt"
    with open(srt_file, 'w', encoding='utf-8') as f:
        f.write(srt_formatted)
    print(f"\n- SRT 파일경로: {srt_file}")

    # TXT 형식으로 변환 (이미 가져온 transcript_data 사용)
    text_formatter = TextFormatter()
    text_formatted = text_formatter.format_transcript(transcript_data)
    print(f"\nTXT 형식 자막 (처음 100자):")
    print(text_formatted[:100])

    text_file = f"{download_folder}/{video_id}.txt"
    with open(text_file, 'w', encoding='utf-8') as f:
        f.write(text_formatted)
    print(f"- TXT 파일경로: {text_file}")

if __name__ == "__main__":
    main()