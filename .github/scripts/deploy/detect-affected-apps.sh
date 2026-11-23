#!/usr/bin/env bash
# 이번 변경이 어느 앱에 영향을 주는지 판정해 app/extension/web/oracle/api를 GITHUB_OUTPUT에 씁니다.
# oracle은 Oracle VM staging 웹 배포 대상 여부입니다(웹이 바뀌었거나 VM 서버 구성이 바뀜).
# api는 같은 VM의 API 서버(apps/api) 배포 대상 여부입니다(API가 바뀌었거나 VM 서버 구성이 바뀜).
#
# 판정을 경로 매칭이 아니라 turbo 의존성 그래프로 하는 이유는, 경로 목록을 손으로
# 관리하면 패키지를 추가할 때 빼먹기 쉽고 그 실패가 "빌드가 조용히 안 도는" 쪽이기
# 때문입니다. turbo는 dependents까지 전파해 주므로 목록을 유지할 필요가 없습니다.
set -euo pipefail

: "${BASE_REF:?BASE_REF 환경변수가 필요합니다}"

# 선택 입력. 주어지면 HEAD 대신 이 ref까지의 변경(BASE_REF..HEAD_REF)을 판정합니다.
# 배포 기록이 과거 머지 커밋 하나가 어느 앱에 영향을 줬는지 판정할 때 씁니다.
# 비우면 지금까지와 똑같이 체크아웃된 HEAD 기준입니다.
HEAD_REF="${HEAD_REF:-}"
DIFF_HEAD="${HEAD_REF:-HEAD}"

# 네 번째 인자(oracle)·다섯 번째 인자(api)를 생략하면 web과 같게 봅니다.
emit() {
  local oracle="${4:-$3}"
  local api="${5:-$3}"
  printf 'app=%s\nextension=%s\nweb=%s\noracle=%s\napi=%s\n' "$1" "$2" "$3" "$oracle" "$api" >> "${GITHUB_OUTPUT:-/dev/stdout}"
  echo "판정 → app=$1 extension=$2 web=$3 oracle=$oracle api=$api"
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
if ! git diff --quiet "$BASE_REF...$DIFF_HEAD" -- pnpm-lock.yaml package.json; then
  echo "의존성 파일 변경 → 전체 빌드"
  emit true true true
  exit 0
fi

export TURBO_SCM_BASE="$BASE_REF"
if [ -n "$HEAD_REF" ]; then
  export TURBO_SCM_HEAD="$HEAD_REF"
fi
# turbo 버전은 루트 package.json 하나만 보고 따라갑니다.
TURBO="turbo@$(node -p "require('./package.json').devDependencies.turbo")"

# --affected와 --filter는 함께 쓸 수 없습니다. 전체 영향 목록을 한 번 받아 나눕니다.
# turbo 또는 jq 실패는 출력 전에 잡을 실패시켜, 빈 결과로 배포를 조용히 건너뛰지 않습니다.
affected_packages="$(npx --yes "$TURBO" ls --affected --output=json --skip-infer)"
app_affected="$(printf '%s' "$affected_packages" | jq -r 'any(.packages.items[]; .name == "@web-memo/app")')"
web_affected="$(printf '%s' "$affected_packages" | jq -r 'any(.packages.items[]; .name == "@web-memo/web")')"
api_affected="$(printf '%s' "$affected_packages" | jq -r 'any(.packages.items[]; .name == "@web-memo/api")')"

# 확장은 build:extension과 같이 web·app·api·e2e를 뺀 패키지가 하나라도 바뀌면 빌드합니다.
# api는 확장이 의존하지 않는 별도 서버라, api만 바뀐 변경에 확장을 빌드하지 않습니다.
extension_affected="$(printf '%s' "$affected_packages" | jq -r 'any(.packages.items[]; .name != "@web-memo/app" and .name != "@web-memo/web" and .name != "@web-memo/api" and .name != "e2e")')"

# 앱 배포 워크플로는 패키지 밖에 있어 turbo가 감지하지 못합니다.
# 앱 큐·성공 이력·영향 판정이 바뀌어도 새 빌드·배포 경로를 검증합니다.
if ! git diff --quiet "$BASE_REF...$DIFF_HEAD" -- \
  .github/workflows/ci.yml .github/workflows/cd-app.yml .github/workflows/release.yml \
  .github/scripts/deploy/appDeploymentState.mjs .github/scripts/deploy/prepareStagingApp.mjs \
  .github/scripts/deploy/detect-affected-apps.sh; then
  app_affected=true
fi

# vercel.json은 어느 패키지에도 속하지 않아 turbo가 변경으로 잡지 못한다. 함수 설정(fluid 등)은
# 배포해야 반영되므로, 이 파일이 바뀌면 웹을 배포 대상으로 본다.
if ! git diff --quiet "$BASE_REF...$DIFF_HEAD" -- vercel.json; then
  web_affected=true
fi

# VM 서버 구성(compose·Caddy·Alloy·배포 스크립트)은 웹 패키지 밖이라 turbo가 잡지 못한다.
# 이것만 바뀌어도 VM에 다시 보내야 반영되므로 Oracle 배포 대상으로 본다. Vercel 배포는 하지 않는다.
# 알림 규칙(terraform)은 cd-terraform.yml이 따로 적용하므로 제외한다.
oracle_affected="$web_affected"
if ! git diff --quiet "$BASE_REF...$DIFF_HEAD" -- infra/oracle .github/workflows/cd-web-oracle.yml ':!infra/oracle/terraform'; then
  oracle_affected=true
fi

# API도 같은 VM 구성(compose·Caddy·스크립트)을 쓰므로 구성이 바뀌면 함께 다시 배포합니다.
vm_config_changed=false
if ! git diff --quiet "$BASE_REF...$DIFF_HEAD" -- infra/oracle ':!infra/oracle/terraform'; then
  vm_config_changed=true
fi
if [ "$vm_config_changed" = true ] || ! git diff --quiet "$BASE_REF...$DIFF_HEAD" -- .github/workflows/cd-api-oracle.yml; then
  api_affected=true
fi

emit "$app_affected" "$extension_affected" "$web_affected" "$oracle_affected" "$api_affected"
