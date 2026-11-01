#!/usr/bin/env bash
# 모델이 고친 변경을 검증합니다. Biome 자동 수정은 고친 파일에만 적용하고, 그 뒤 변경 범위를 다시 검사합니다.
set -euo pipefail

git diff -z --name-only --diff-filter=M -- '*.ts' '*.tsx' | xargs -0 -r pnpm exec biome check --write
node .github/scripts/ga-events/maintain.mjs changes
pnpm check
pnpm type-check
pnpm exec vitest run packages/shared/src/modules/analytics
