#!/usr/bin/env bash
# VM에서 실행합니다. 트래픽을 직전 배포 전의 색으로 되돌립니다.
#
# 사용: scripts/rollback.sh
#
# deploy.sh는 이전 색을 멈추지 않으므로 upstream만 바꾸면 됩니다. 되돌릴 색이 응답하지 않으면
# 아무것도 바꾸지 않고 실패합니다.
set -euo pipefail
cd "${WEBMEMO_DIR:-/opt/webmemo}"

UPSTREAM=state/active/upstream.caddy
ACTIVE=$(grep -oE 'web-(blue|green)' "$UPSTREAM" | head -1)
if [ "$ACTIVE" = web-blue ]; then TARGET=web-green; else TARGET=web-blue; fi

if ! docker compose exec -T "$TARGET" node -e \
	"fetch('http://127.0.0.1:3000/api/version').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
	echo "::error::$TARGET 가 응답하지 않아 되돌리지 않습니다. 트래픽은 $ACTIVE 에 그대로 있습니다"
	exit 1
fi

cat > "$UPSTREAM.next" <<CADDY
reverse_proxy ${TARGET}:3000 {
	header_up X-Real-IP {client_ip}
}
CADDY
mv "$UPSTREAM.next" "$UPSTREAM"
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile
echo "$ACTIVE" > state/previous
echo "롤백 완료: 트래픽 $ACTIVE → $TARGET"
