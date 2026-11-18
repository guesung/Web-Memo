#!/usr/bin/env bash
# 레포의 infra/oracle 구성을 VM으로 보내고 컨테이너를 올립니다.
#
# 사용: infra/oracle/scripts/sync.sh <deploy@VM주소> [ssh 키 경로]
#
# - compose.yaml·caddy/만 보냅니다. VM 상태(state/, env/, .env)는 건드리지 않습니다.
# - 트래픽을 받는 색이 아직 정해지지 않았으면(첫 실행) blue로 정합니다.
# - 여러 번 실행해도 결과가 같습니다.
set -euo pipefail

TARGET="${1:?사용: sync.sh <deploy@VM주소> [ssh 키 경로]}"
KEY="${2:-$HOME/.ssh/webmemo_oci}"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_DIR=/opt/webmemo
SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=accept-new)

rsync -az --delete -e "${SSH[*]}" \
	"$SRC/compose.yaml" "$SRC/caddy" \
	"$TARGET:$REMOTE_DIR/"

"${SSH[@]}" "$TARGET" bash -s <<'REMOTE'
set -euo pipefail
cd /opt/webmemo
if [ ! -f state/active/upstream.caddy ]; then
	cat > state/active/upstream.caddy <<'EOF'
reverse_proxy web-blue:3000 {
	header_up X-Real-IP {client_ip}
}
EOF
fi
docker compose pull --quiet
docker compose up -d --remove-orphans
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile
docker compose ps
REMOTE
