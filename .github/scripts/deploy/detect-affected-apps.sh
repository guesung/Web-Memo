#!/usr/bin/env bash
# 이번 변경이 어느 앱에 영향을 주는지 판정해 app/extension/web을 GITHUB_OUTPUT에 씁니다.
#
# 판정을 경로 매칭이 아니라 turbo 의존성 그래프로 하는 이유는, 경로 목록을 손으로
# 관리하면 패키지를 추가할 때 빼먹기 쉽고 그 실패가 "빌드가 조용히 안 도는" 쪽이기
# 때문입니다. turbo는 dependents까지 전파해 주므로 목록을 유지할 필요가 없습니다.
set -euo pipefail

: "${BASE_REF:?BASE_REF 환경변수가 필요합니다}"

emit() {
  printf 'app=%s\nextension=%s\nweb=%s\n' "$1" "$2" "$3" >> "${GITHUB_OUTPUT:-/dev/stdout}"
  echo "판정 → app=$1 extension=$2 web=$3"
}

# push 이벤트의 before는 새 브랜치·force-push에서 0000...이 됩니다. 기준을 잡을 수
# 없으면 판정을 포기하고 전부 빌드합니다. 스킵하는 쪽으로 틀리면 검증 없이 머지됩니다.
if ! git rev-parse --verify --quiet "${BASE_REF}^{commit}" >/dev/null; then
  echo "기준 커밋($BASE_REF)을 해석할 수 없음 → 전체 빌드"
  emit true true true
  exit 0
fi

# turbo --affected는 lockfile을 읽지 않습니다. 의존성만 올린 PR은 affected가 0개로
# 나와 빌드가 통째로 스킵되므로, 그 경우는 판정을 건너뛰고 전부 빌드합니다.
if ! git diff --quiet "$BASE_REF...HEAD" -- pnpm-lock.yaml package.json; then
  echo "의존성 파일 변경 → 전체 빌드"
  emit true true true
  exit 0
fi

export TURBO_SCM_BASE="$BASE_REF"
# turbo 버전은 루트 package.json 하나만 보고 따라갑니다.
TURBO="turbo@$(node -p "require('./package.json').devDependencies.turbo")"

# --affected와 --filter는 함께 쓸 수 없습니다. 전체 영향 목록을 한 번 받아 나눕니다.
# turbo 또는 jq 실패는 출력 전에 잡을 실패시켜, 빈 결과로 배포를 조용히 건너뛰지 않습니다.
affected_packages="$(npx --yes "$TURBO" ls --affected --output=json --skip-infer)"
app_affected="$(printf '%s' "$affected_packages" | jq -r 'any(.packages.items[]; .name == "@web-memo/app")')"
web_affected="$(printf '%s' "$affected_packages" | jq -r 'any(.packages.items[]; .name == "@web-memo/web")')"

# 확장은 build:extension과 같이 web·app·e2e를 뺀 패키지가 하나라도 바뀌면 빌드합니다.
extension_affected="$(printf '%s' "$affected_packages" | jq -r 'any(.packages.items[]; .name != "@web-memo/app" and .name != "@web-memo/web" and .name != "e2e")')"

# 앱 배포 워크플로는 패키지 밖에 있어 turbo가 감지하지 못합니다.
# 이 파일만 바뀌어도 새 빌드·제출 경로를 검증하도록 앱을 영향 대상으로 봅니다.
if ! git diff --quiet "$BASE_REF...HEAD" -- .github/workflows/cd-app.yml; then
  app_affected=true
fi

emit "$app_affected" "$extension_affected" "$web_affected"
