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

# turbo 버전은 루트 package.json 하나만 보고 따라갑니다.
TURBO_VERSION="$(node -p "require('./package.json').devDependencies.turbo")"

# 실패하면 잡을 실패시킵니다. 빈 결과로 넘어가면 배포 잡이 조용히 스킵됩니다.
AFFECTED_JSON="$(TURBO_SCM_BASE="$BASE_REF" npx --yes "turbo@${TURBO_VERSION}" \
  ls --affected --output=json --skip-infer)"

PACKAGES="$(jq -r '.packages.items[].name' <<<"$AFFECTED_JSON")"
echo "affected 패키지:"
echo "${PACKAGES:-  (없음)}" | sed 's/^/  /'

has() { grep -qxF "$1" <<<"$PACKAGES"; }

APP=false;       has '@web-memo/app' && APP=true
WEB=false;       has '@web-memo/web' && WEB=true

# 확장은 여러 패키지로 나뉘어 있어(pages/*, packages/*) 이름 하나로 판정할 수 없습니다.
# build:extension이 web·app을 제외한 전부를 빌드하므로 같은 기준을 씁니다.
# e2e는 확장 빌드 그래프에 끌려오지만 build 스크립트가 없는 no-op이라 제외합니다.
EXTENSION=false
if grep -qvxE '@web-memo/(web|app)|e2e' <<<"$PACKAGES" 2>/dev/null && [ -n "$PACKAGES" ]; then
  EXTENSION=true
fi

emit "$APP" "$EXTENSION" "$WEB"
