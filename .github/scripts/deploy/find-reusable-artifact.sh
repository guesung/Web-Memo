#!/usr/bin/env bash
# master CI가 같은 커밋에서 이미 만들어 올린 빌드 아티팩트를 찾아 GITHUB_OUTPUT에 씁니다.
#
# 스토어에 올리는 것은 master에 머지된 커밋의 빌드인데, 그 커밋은 CI(ci.yml)에서
# 이미 한 번 빌드돼 아티팩트로 올라가 있습니다. 릴리스에서 같은 커밋을 다시 빌드하면
# 앱은 약 30분, 확장은 약 3분을 그대로 반복합니다. 있으면 그것을 내려받아 씁니다.
#
# 찾지 못하면 실패시키지 않고 found=false만 씁니다. 아티팩트는 7일 뒤 만료되고,
# 변경이 없어 CI가 그 앱을 아예 안 빌드했을 수도 있습니다. 그때는 호출부가
# 기존대로 새로 빌드합니다.
set -euo pipefail

: "${ARTIFACT_PREFIX:?ARTIFACT_PREFIX 환경변수가 필요합니다}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY 환경변수가 필요합니다}"

emit() {
  printf 'found=%s\nname=%s\nrun_id=%s\n' "$1" "${2:-}" "${3:-}" \
    >> "${GITHUB_OUTPUT:-/dev/stdout}"
}

# 체크아웃한 커밋을 기준으로 찾습니다. workflow_dispatch의 github.sha는 워크플로를
# 실행한 브랜치의 커밋이라, ref 입력으로 다른 커밋을 배포할 때 어긋납니다.
head_sha=""
head_sha="$(git rev-parse HEAD)"
echo "커밋 $head_sha 에서 '$ARTIFACT_PREFIX' 로 시작하는 아티팩트를 찾습니다"

artifacts=""
artifacts="$(gh api "repos/$GITHUB_REPOSITORY/actions/artifacts?per_page=100" --jq '.artifacts')"

# 같은 커밋을 여러 번 빌드했을 수 있으므로 가장 최근 것을 씁니다.
match=""
match="$(printf '%s' "$artifacts" | jq -c \
  --arg sha "$head_sha" \
  --arg prefix "$ARTIFACT_PREFIX" '
    [ .[]
      | select(.expired == false)
      | select(.workflow_run.head_sha == $sha)
      | select(.name | startswith($prefix))
    ] | sort_by(.created_at) | last // empty')"

if [[ -z "$match" ]]; then
  echo "재사용할 아티팩트가 없습니다. 새로 빌드합니다."
  emit false
  exit 0
fi

name=""
name="$(printf '%s' "$match" | jq -r '.name')"
run_id=""
run_id="$(printf '%s' "$match" | jq -r '.workflow_run.id')"

echo "재사용: $name (run $run_id)"
emit true "$name" "$run_id"
