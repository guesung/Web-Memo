#!/usr/bin/env bash
# VM에서 실행합니다. API 서버(apps/api) 컨테이너를 새 이미지로 교체하고 /health가 200이 될 때까지 기다립니다.
#
# 사용: scripts/deploy-api.sh <이미지>
#
# 웹(deploy.sh)과 달리 blue-green이 아니라 한 대를 바로 교체합니다. 교체하는 몇 초 동안 들어온 요청은 실패합니다.
# 새 컨테이너가 /health에 응답하지 않으면 실패로 끝나고 로그를 남깁니다(이전 컨테이너는 이미 내려간 상태입니다).
set -euo pipefail

IMAGE="${1:?사용: deploy-api.sh <이미지>}"
cd "${WEBMEMO_DIR:-/opt/webmemo}"
# shellcheck source=lib.sh
. "$(dirname "$0")/lib.sh"

touch .env
grep -v -e '^API_IMAGE=' -e '^API_SITE_ADDRESS=' .env > .env.next || true
echo "API_IMAGE=${IMAGE}" >> .env.next
# 사이트 주소를 넘기면 Caddy가 그 도메인으로 HTTPS를 엽니다. 안 넘기면 이전 값을 그대로 둡니다
if [ -n "${API_SITE_ADDRESS:-}" ]; then
	echo "API_SITE_ADDRESS=${API_SITE_ADDRESS}" >> .env.next
else
	grep '^API_SITE_ADDRESS=' .env >> .env.next || true
fi
mv .env.next .env

[ -s env/api.env ] || { echo "::error::env/api.env가 없습니다. API는 필수 환경 변수가 없으면 시작하지 않습니다"; exit 1; }

# caddy 컨테이너에는 API_SITE_ADDRESS가 환경 변수로 들어가므로 값이 바뀌면 다시 만들어야 합니다(up -d가 알아서 판단)
for attempt in 1 2 3; do
	docker compose up -d caddy && break
	[ "$attempt" = 3 ] && exit 1
	sleep 3
done
start_alloy_if_configured
docker compose pull --quiet api
docker compose up -d --no-deps --force-recreate api

STATUS=""
for _ in $(seq 1 30); do
	STATUS=$(docker compose exec -T api node -e \
		"fetch('http://127.0.0.1:4000/health').then(r=>process.stdout.write(String(r.status))).catch(()=>{})" \
		2>/dev/null || true)
	[ "$STATUS" = 200 ] && break
	sleep 2
done

if [ "$STATUS" != 200 ]; then
	echo "::error::api가 /health에 200으로 응답하지 않습니다(받은 값: '${STATUS}')"
	docker compose logs --tail 80 api || true
	exit 1
fi

reload_caddy_if_changed
echo "API 교체 완료: $IMAGE"
