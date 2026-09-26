#!/usr/bin/env bash
# Claude Code·Codex의 주간 사용률(%)을 읽어 덜 쓴 쪽을 고른다.
# 출력: claude=<% | unknown> codex=<% | unknown> pick=<Claude Code | Codex | unknown> basis=<both | claude-only | codex-only | none>
# 읽는 방식은 apps/macos/usage-scope(quota.rs, codex_quota.rs)와 같다.
set -uo pipefail

# 한쪽만 읽혔을 때, 읽힌 쪽이 이 값 이상이면 다른 쪽을 고른다.
HIGH_USAGE_PERCENT=80
now=$(date +%s)

read_claude() {
	local token response resets_at
	token=$(security find-generic-password -s "Claude Code-credentials" -a "$USER" -w 2>/dev/null \
		| jq -r '.claudeAiOauth.accessToken // empty' 2>/dev/null)
	if [ -z "$token" ]; then
		token=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null \
			| jq -r '.claudeAiOauth.accessToken // empty' 2>/dev/null)
	fi
	if [ -z "$token" ]; then
		return 1
	fi

	response=$(curl -sf --max-time 10 https://api.anthropic.com/api/oauth/usage \
		-H "Authorization: Bearer $token" \
		-H "anthropic-beta: oauth-2025-04-20") || return 1

	resets_at=$(echo "$response" | jq -r '.seven_day.resets_at // empty' | cut -c1-19)
	if [ -n "$resets_at" ] && [ "$(date -j -u -f '%Y-%m-%dT%H:%M:%S' "$resets_at" +%s 2>/dev/null || echo 0)" -le "$now" ]; then
		# 리셋이 지났으면 새 주간이 시작된 것이다.
		echo 0
		return 0
	fi
	echo "$response" | jq -er '.seven_day.utilization // empty' 2>/dev/null
}

read_codex() {
	local file line window
	while read -r file; do
		line=$(tail -c 262144 "$file" | grep '"rate_limits"' | tail -1)
		if [ -z "$line" ]; then
			continue
		fi
		# 300분 이하 윈도우는 5시간 세션, 넘으면 주간이다.
		window=$(echo "$line" | jq -c '[.payload.rate_limits.primary, .payload.rate_limits.secondary]
			| map(select(. != null and .window_minutes > 300)) | first // empty' 2>/dev/null)
		if [ -z "$window" ]; then
			return 1
		fi
		if [ "$(echo "$window" | jq -r '.resets_at')" -le "$now" ]; then
			echo 0
			return 0
		fi
		echo "$window" | jq -r '.used_percent'
		return 0
	done < <(find "$HOME/.codex/sessions" -name 'rollout-*.jsonl' 2>/dev/null | sort -r | head -20)
	return 1
}

claude=$(read_claude) || claude=unknown
codex=$(read_codex) || codex=unknown
[ -z "$claude" ] && claude=unknown
[ -z "$codex" ] && codex=unknown

is_lower() {
	awk -v a="$1" -v b="$2" 'BEGIN { exit !(a < b) }'
}

if [ "$claude" != unknown ] && [ "$codex" != unknown ]; then
	basis=both
	# 같으면 기존 기본값인 Codex.
	if is_lower "$claude" "$codex"; then
		pick="Claude Code"
	else
		pick=Codex
	fi
elif [ "$claude" != unknown ]; then
	basis=claude-only
	if is_lower "$claude" "$HIGH_USAGE_PERCENT"; then
		pick="Claude Code"
	else
		pick=Codex
	fi
elif [ "$codex" != unknown ]; then
	basis=codex-only
	if is_lower "$codex" "$HIGH_USAGE_PERCENT"; then
		pick=Codex
	else
		pick="Claude Code"
	fi
else
	basis=none
	pick=unknown
fi

echo "claude=$claude codex=$codex pick=$pick basis=$basis"
