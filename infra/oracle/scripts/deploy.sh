#!/usr/bin/env bash
# VM에서 실행합니다. 대기 색에 새 이미지를 띄우고, 확인되면 Caddy를 그쪽으로 돌립니다(blue-green).
#
# 사용: scripts/deploy.sh <이미지> <기대 커밋 SHA>
#
# 1. 지금 트래픽을 받는 색(state/active/upstream.caddy)의 반대 색을 대기 색으로 고릅니다
# 2. .env의 WEB_IMAGE_<대기 색>을 새 이미지로 바꾸고 그 컨테이너만 다시 띄웁니다 (= staged)
# 3. 컨테이너 안에서 /api/version을 불러 commit이 기대 SHA와 같을 때까지 기다립니다
# 4. 같아지면 upstream.caddy를 대기 색으로 바꾸고 caddy reload 합니다 (= promote)
#
# 이전 색은 멈추지 않습니다. 롤백(scripts/rollback.sh)은 upstream만 되돌리면 되므로 즉시 끝나고,
# 이전 색은 다음 배포 때 새 이미지로 교체됩니다. 3에서 실패하면 트래픽은 그대로 이전 색에 있습니다.
set -euo pipefail

IMAGE="${1:?사용: deploy.sh <이미지> <기대 커밋 SHA>}"
EXPECTED_COMMIT="${2:?사용: deploy.sh <이미지> <기대 커밋 SHA>}"
cd "${WEBMEMO_DIR:-/opt/webmemo}"

UPSTREAM=state/active/upstream.caddy
ACTIVE=$(grep -oE 'web-(blue|green)' "$UPSTREAM" 2>/dev/null | head -1 || true)
ACTIVE=${ACTIVE:-web-blue}
if [ "$ACTIVE" = web-blue ]; then IDLE=web-green; else IDLE=web-blue; fi
IDLE_VAR="WEB_IMAGE_$(echo "${IDLE#web-}" | tr '[:lower:]' '[:upper:]')"
echo "활성: $ACTIVE → 대기 색 $IDLE 에 $IMAGE 를 올립니다"

touch .env
grep -v "^${IDLE_VAR}=" .env > .env.next || true
echo "${IDLE_VAR}=${IMAGE}" >> .env.next
mv .env.next .env

docker compose up -d caddy
docker compose pull --quiet "$IDLE"
docker compose up -d --no-deps --force-recreate "$IDLE"

COMMIT=""
for _ in $(seq 1 60); do
	COMMIT=$(docker compose exec -T "$IDLE" node -e \
		"fetch('http://127.0.0.1:3000/api/version').then(r=>r.json()).then(j=>process.stdout.write(j.commit||'')).catch(()=>{})" \
		2>/dev/null || true)
	[ "$COMMIT" = "$EXPECTED_COMMIT" ] && break
	sleep 2
done

if [ "$COMMIT" != "$EXPECTED_COMMIT" ]; then
	echo "::error::$IDLE 가 기대 커밋($EXPECTED_COMMIT)으로 응답하지 않습니다(받은 값: '${COMMIT}'). 트래픽은 $ACTIVE 에 그대로 둡니다"
	docker compose logs --tail 80 "$IDLE" || true
	exit 1
fi

cat > "$UPSTREAM.next" <<CADDY
reverse_proxy ${IDLE}:3000 {
	header_up X-Real-IP {client_ip}
}
CADDY
mv "$UPSTREAM.next" "$UPSTREAM"
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile
echo "$ACTIVE" > state/previous
echo "전환 완료: 트래픽 $ACTIVE → $IDLE (commit $COMMIT)"
