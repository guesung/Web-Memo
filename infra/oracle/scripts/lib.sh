#!/usr/bin/env bash
# deploy.sh·rollback.sh가 함께 쓰는 함수. /opt/webmemo(또는 WEBMEMO_DIR)에서 source 합니다.

COLOR_FILE=state/color/active

# 지금 트래픽을 받는 색. 파일이 없으면 예전 방식(upstream.caddy)에서 읽고, 그것도 없으면 blue
active_color() {
	if [ -s "$COLOR_FILE" ]; then
		tr -d '[:space:]' < "$COLOR_FILE"
	elif [ -f state/active/upstream.caddy ]; then
		grep -oE 'web-(blue|green)' state/active/upstream.caddy | head -1 | sed 's/^web-//'
	else
		echo blue
	fi
}

other_color() {
	if [ "$1" = blue ]; then echo green; else echo blue; fi
}

# 활성 색 파일을 원자적으로 바꿉니다(컨테이너는 디렉터리를 마운트해 새 파일을 봅니다)
write_active() {
	mkdir -p "$(dirname "$COLOR_FILE")"
	printf '%s\n' "$1" > "$COLOR_FILE.next"
	mv "$COLOR_FILE.next" "$COLOR_FILE"
}

# 컨테이너 안에서 경로를 불러 JSON 필드 식(예: "j.commit||''")의 값을 출력합니다
container_get() {
	docker compose exec -T "$1" node -e \
		"fetch('http://127.0.0.1:3000$2').then(r=>r.json()).then(j=>process.stdout.write(String($3))).catch(()=>{})" \
		2>/dev/null
}

# 컨테이너 안에서 경로를 불러 HTTP 상태 코드만 출력합니다. 앱이 아니면(node 없음) 아무것도 출력하지 않습니다
container_status() {
	docker compose exec -T "$1" node -e \
		"fetch('http://127.0.0.1:3000$2').then(r=>process.stdout.write(String(r.status))).catch(()=>{})" \
		2>/dev/null || true
}

# 활성 색을 바꾸고, 새 색이 200·이전 색이 503이 된 뒤 Caddy가 다음 헬스체크(1초)로 따라올 때까지 기다립니다
switch_to() {
	local next=$1 prev
	prev=$(other_color "$next")
	write_active "$next"
	for _ in $(seq 1 20); do
		[ "$(container_status "web-$next" /api/health)" = 200 ] && break
		sleep 0.5
	done
	sleep 2.5
	echo "web-$next /api/health=$(container_status "web-$next" /api/health), web-$prev /api/health=$(container_status "web-$prev" /api/health)"
}

# Caddyfile이 바뀐 배포에서만 한 번 다시 불러옵니다. 이 순간만은 요청이 끊길 수 있습니다
reload_caddy_if_changed() {
	if ! cmp -s caddy/Caddyfile state/Caddyfile.applied 2>/dev/null; then
		echo "Caddyfile이 바뀌어 한 번 다시 불러옵니다"
		docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile
		cp caddy/Caddyfile state/Caddyfile.applied
	fi
}
