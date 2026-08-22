#!/usr/bin/env bash
#
# 앱 릴리스(iOS/Android 빌드 + 스토어 제출) 결과를 Slack으로 알립니다.
# .github/workflows/cd-app.yml 의 notify 잡에서 호출합니다.
#
# 로컬에서 그대로 돌려볼 수 있습니다(실제 run을 조회해 실제 Slack으로 보냅니다):
#   SLACK_WEBHOOK_URL=... GH_TOKEN=$(gh auth token) BUILD_RESULT=success \
#   GITHUB_REPOSITORY=guesung/Web-Memo GITHUB_RUN_ID=<run id> \
#   .github/scripts/notify-app-release.sh

set -euo pipefail

: "${GITHUB_REPOSITORY:?저장소를 알 수 없습니다}"
: "${GITHUB_RUN_ID:?실행 ID를 알 수 없습니다}"
GITHUB_SERVER_URL="${GITHUB_SERVER_URL:-https://github.com}"
BUILD_RESULT="${BUILD_RESULT:-unknown}"

if [[ -z "${SLACK_WEBHOOK_URL:-}" ]]; then
  echo "::warning::SLACK_WEBHOOK_URL 시크릿이 없어 Slack 알림을 건너뜁니다"
  exit 0
fi

# matrix 잡의 결과는 needs.build.result 하나로 합쳐져 플랫폼별 성패를 알 수 없습니다.
# 실행 중인 run의 잡 목록을 조회해 플랫폼별 conclusion을 그대로 가져옵니다.
jobs=$(gh api "/repos/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID/jobs?per_page=100")

# 재사용 워크플로로 호출되면 잡 이름 앞에 호출한 쪽 이름이 붙으므로("앱 릴리스 / ios 빌드")
# 정확히 일치시키지 않고 끝부분으로 찾습니다.
describe() {
  conclusion=$(echo "$jobs" | jq -r --arg name "$1 빌드" \
    'first(.jobs[] | select(.name | endswith($name)) | .conclusion) // "unknown"')
  case "$conclusion" in
    success)   echo "✅ 빌드·제출 완료" ;;
    failure)   echo "❌ 실패" ;;
    cancelled) echo "⚪️ 취소됨" ;;
    *)         echo "❔ 결과 확인 불가 ($conclusion)" ;;
  esac
}

version=$(jq -r '.expo.version' apps/app/app.json)
run_url="$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID"

if [[ "$BUILD_RESULT" == "success" ]]; then
  headline="✅ 앱 릴리스 완료 — v$version"
else
  headline="❌ 앱 릴리스 실패 — v$version"
fi

body=$(printf '%s\n• iOS (TestFlight): %s\n• Android (Play 내부 테스트): %s' \
  "*$headline*" "$(describe ios)" "$(describe android)")

payload=$(jq -n --arg text "$headline" --arg body "$body" --arg url "$run_url" '{
  text: $text,
  blocks: [
    { type: "section", text: { type: "mrkdwn", text: $body } },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "워크플로 실행 보기" },
          url: $url
        }
      ]
    }
  ]
}')

curl --fail --silent --show-error \
  -X POST -H "Content-Type: application/json" \
  --data "$payload" "$SLACK_WEBHOOK_URL"
