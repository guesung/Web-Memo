#!/usr/bin/env bash
# VM에서 실행합니다. 트래픽을 직전 배포 전의 색으로 되돌립니다.
#
# 사용: scripts/rollback.sh
#
# deploy.sh는 이전 색을 멈추지 않으므로 활성 색 파일만 바꾸면 됩니다.
# 되돌릴 색이 /api/health에 응답하지 않으면(앱이 아니거나 죽었으면) 아무것도 바꾸지 않습니다.
set -euo pipefail
cd "${WEBMEMO_DIR:-/opt/webmemo}"
# shellcheck source=lib.sh
. "$(dirname "$0")/lib.sh"

ACTIVE=$(active_color)
TARGET=$(other_color "$ACTIVE")

if ! container_status "web-$TARGET" /api/health | grep -qE '^(200|503)$'; then
	echo "::error::web-$TARGET 가 /api/health에 응답하지 않아 되돌리지 않습니다. 트래픽은 web-$ACTIVE 에 그대로 있습니다"
	exit 1
fi

switch_to "$TARGET"
echo "롤백 완료: 트래픽 web-$ACTIVE → web-$TARGET"
