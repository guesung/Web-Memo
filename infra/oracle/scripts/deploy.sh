#!/usr/bin/env bash
# VM에서 실행합니다. 대기 색에 새 이미지를 띄우고, 확인되면 트래픽을 그쪽으로 돌립니다(blue-green).
#
# 사용: scripts/deploy.sh <이미지> <기대 커밋 SHA>
#
# 1. 활성 색(state/color/active)의 반대 색을 대기 색으로 고릅니다
# 2. .env의 WEB_IMAGE_<대기 색>을 새 이미지로 바꾸고 그 컨테이너만 다시 띄웁니다 (= staged)
# 3. 컨테이너 안에서 /api/version을 불러 commit이 기대 SHA와 같을 때까지 기다립니다
# 4. 활성 색 파일을 대기 색으로 바꿉니다 (= promote). Caddy는 1초마다 /api/health를 확인해
#    200이 된 새 색으로 옮겨 갑니다. Caddy 설정은 다시 불러오지 않습니다(리로드는 요청을 끊음)
#
# 이전 색은 멈추지 않습니다. 롤백(scripts/rollback.sh)은 파일만 되돌리면 되고,
# 이전 색은 다음 배포 때 새 이미지로 교체됩니다. 3에서 실패하면 트래픽은 그대로 이전 색에 있습니다.
set -euo pipefail

IMAGE="${1:?사용: deploy.sh <이미지> <기대 커밋 SHA>}"
EXPECTED_COMMIT="${2:?사용: deploy.sh <이미지> <기대 커밋 SHA>}"
cd "${WEBMEMO_DIR:-/opt/webmemo}"
# shellcheck source=lib.sh
. "$(dirname "$0")/lib.sh"

ACTIVE=$(active_color)
IDLE=$(other_color "$ACTIVE")
IDLE_VAR="WEB_IMAGE_$(echo "$IDLE" | tr '[:lower:]' '[:upper:]')"
echo "활성: web-$ACTIVE → 대기 색 web-$IDLE 에 $IMAGE 를 올립니다"

touch .env
grep -v "^${IDLE_VAR}=" .env > .env.next || true
echo "${IDLE_VAR}=${IMAGE}" >> .env.next
mv .env.next .env

# 활성 색 파일이 없던 첫 배포면 지금 활성 색으로 만들어 둡니다(없으면 두 색 모두 200)
write_active "$ACTIVE"

docker compose up -d caddy
docker compose pull --quiet "web-$IDLE"
docker compose up -d --no-deps --force-recreate "web-$IDLE"

COMMIT=""
for _ in $(seq 1 60); do
	COMMIT=$(container_get "web-$IDLE" /api/version "j.commit||''" || true)
	[ "$COMMIT" = "$EXPECTED_COMMIT" ] && break
	sleep 2
done

if [ "$COMMIT" != "$EXPECTED_COMMIT" ]; then
	echo "::error::web-$IDLE 가 기대 커밋($EXPECTED_COMMIT)으로 응답하지 않습니다(받은 값: '${COMMIT}'). 트래픽은 web-$ACTIVE 에 그대로 둡니다"
	docker compose logs --tail 80 "web-$IDLE" || true
	exit 1
fi

switch_to "$IDLE"
reload_caddy_if_changed
echo "전환 완료: 트래픽 web-$ACTIVE → web-$IDLE (commit $COMMIT)"
