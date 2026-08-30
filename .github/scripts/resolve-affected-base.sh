#!/usr/bin/env bash
# 변경 판정의 기준 커밋(BASE_REF)을 골라 GITHUB_OUTPUT에 씁니다.
#
# push의 github.event.before(직전 커밋)를 그대로 쓰면 배포가 조용히 사라집니다.
# 앞 런이 concurrency로 취소되면 그 커밋의 변경분은 빌드되지 않은 채로 남는데,
# 다음 런은 바로 그 커밋을 기준으로 삼아 "그 뒤로 바뀐 것"만 봅니다. 그래서
# 취소된 런이 들고 있던 변경은 어느 런에서도 판정되지 않고 빠집니다.
# 실패가 아니라 스킵으로 나타나므로 알림도 뜨지 않습니다.
#
# 그래서 기준을 "마지막으로 성공한 이 워크플로 런의 커밋"으로 잡습니다. 취소되거나
# 실패한 런의 커밋은 성공 이력에 없으므로 다음 런의 비교 범위 안에 그대로 남습니다.
set -euo pipefail

: "${FALLBACK_REF:?FALLBACK_REF 환경변수가 필요합니다}"

emit() {
  echo "base_ref=$1" >> "${GITHUB_OUTPUT:-/dev/stdout}"
  echo "기준 커밋 → $1 ($2)"
}

# PR은 base 브랜치가 곧 기준이라 그대로 씁니다. 런이 취소돼도 다음 런이 같은 범위를
# 다시 보므로 여기서 말하는 누락이 생기지 않습니다.
if [ "${EVENT_NAME:-}" != "push" ]; then
  emit "$FALLBACK_REF" "push가 아님"
  exit 0
fi

# 조회에 실패하면(권한·네트워크·이력 없음) 판정을 포기하지 않고 기존 기준으로 돌아갑니다.
# 여기서 멈추면 배포가 통째로 막힙니다.
runs=$(gh api --paginate \
  "repos/${GITHUB_REPOSITORY}/actions/workflows/${WORKFLOW_FILE}/runs?branch=${BRANCH}&event=push&status=success&per_page=20" \
  --jq '.workflow_runs[].head_sha' 2>/dev/null | head -20) || runs=""

if [ -z "$runs" ]; then
  emit "$FALLBACK_REF" "성공한 이전 런이 없음"
  exit 0
fi

# 성공 이력의 커밋이라도 로컬에 없거나(얕은 클론) 다른 갈래에 있으면(force-push)
# 비교 기준이 못 됩니다. HEAD의 조상인 것 중 가장 최근 것을 씁니다.
#
# HEAD 자신은 건너뜁니다. 성공한 런을 재실행하면 그 런의 커밋이 곧 HEAD라, 그대로
# 기준으로 삼으면 비교 범위가 비어 전부 스킵됩니다. 재실행은 보통 뭔가를 다시
# 돌리려는 것이므로 한 칸 더 거슬러 올라가 다시 빌드하는 쪽이 맞습니다.
head_sha=$(git rev-parse HEAD)

while read -r sha; do
  [ -n "$sha" ] || continue
  [ "$sha" != "$head_sha" ] || continue
  git rev-parse --verify --quiet "${sha}^{commit}" >/dev/null || continue
  git merge-base --is-ancestor "$sha" HEAD || continue

  emit "$sha" "마지막으로 성공한 런"
  exit 0
done <<< "$runs"

emit "$FALLBACK_REF" "성공 이력이 모두 HEAD의 조상이 아님"
