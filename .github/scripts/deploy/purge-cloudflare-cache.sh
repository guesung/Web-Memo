#!/usr/bin/env bash
# Oracle VM 배포·롤백 뒤 Cloudflare 엣지에 캐시된 공개 정적 페이지 HTML을 비웁니다.
# 옛 HTML이 남으면 새 컨테이너에 없는 JS 파일을 불러 페이지가 깨질 수 있습니다.
# 대상은 infra/oracle/edge-cache-paths.json. zone 전체를 비우지 않아 다른 호스트 캐시는 그대로입니다.
#
# 사용: purge-cloudflare-cache.sh <host>
# 환경: CLOUDFLARE_API_TOKEN(Cache Purge 권한), CLOUDFLARE_ZONE_ID
set -euo pipefail

HOST="${1:?host가 필요합니다}"
: "${CLOUDFLARE_API_TOKEN:?}" "${CLOUDFLARE_ZONE_ID:?}"
MANIFEST="$(dirname "$0")/../../../infra/oracle/edge-cache-paths.json"

FILES=$(jq -c --arg host "$HOST" '[.languages[] as $l | .paths[] | "https://\($host)/\($l)\(.)"]' "$MANIFEST")
COUNT=$(jq 'length' <<<"$FILES")

RESPONSE=$(curl -sS -X POST \
  "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "{\"files\":${FILES}}")

if [ "$(jq -r '.success' <<<"$RESPONSE")" != "true" ]; then
  echo "::error::Cloudflare 캐시 비우기 실패: $(jq -c '.errors' <<<"$RESPONSE")"
  exit 1
fi
echo "Cloudflare 엣지 캐시 ${COUNT}개 URL을 비웠습니다 (${HOST})"
