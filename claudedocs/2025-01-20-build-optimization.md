# Turborepo & pnpm 빌드 속도 최적화

**Date**: 2025-01-20
**Type**: performance
**Status**: completed
**PR**: https://github.com/guesung/Web-Memo/pull/294

## 측정 결과 요약

| 작업 | 최적화 전 | 최적화 후 (캐시 히트) | 개선율 |
|------|----------|---------------------|--------|
| `type-check` | ~10.5s | **139ms** | **75x 빠름** |
| `build:extension` | ~20s+ | ~15.5s (부분 캐시) | ~25% 단축 |

---

## 1. Turborepo 설정 (`turbo.json`)

### 변경 내용

```diff
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
+ "cacheDir": ".turbo/cache",
+ "daemon": true,
+ "envMode": "strict",
  "tasks": {
    "ready": {
      "dependsOn": ["^ready"],
-     "outputs": ["dist", "build"],
-     "cache": false
+     "outputs": ["dist/**", "build/**"],
+     "inputs": ["src/**", "package.json", "tsconfig.json"],
+     "cache": true
    },
    "type-check": {
-     "cache": false
+     "dependsOn": ["^ready"],
+     "outputs": [],
+     "inputs": ["src/**/*.ts", "src/**/*.tsx", "tsconfig.json", "..."],
+     "cache": true
    },
    "lint": {
-     "cache": false
+     "dependsOn": ["^ready"],
+     "outputs": [],
+     "inputs": ["src/**/*.ts", "src/**/*.tsx", "biome.json", "..."],
+     "cache": true
    }
  }
}
```

### 개선 효과

| 설정 | 효과 |
|------|------|
| `daemon: true` | Turbo 프로세스 상주로 콜드 스타트 제거 |
| `envMode: "strict"` | 환경변수 변경 시에만 캐시 무효화 |
| `cache: true` (type-check, lint, ready) | **반복 실행 시 즉시 완료** |
| `inputs` 명시 | 관련 파일 변경 시에만 재실행 |
| `outputs` 글로브 패턴 | 정확한 캐시 저장/복원 |

**결과**: `pnpm type-check` 두 번째 실행 시 `10.5s → 139ms` (FULL TURBO)

---

## 2. TypeScript 설정 (`packages/tsconfig/base.json`)

### 변경 내용

```diff
{
  "compilerOptions": {
    "composite": false,
+   "incremental": true,
+   "tsBuildInfoFile": ".tsbuildinfo",
-   "module": "ESNext",
-   "lib": ["DOM", "ESNext"],
+   "module": "ESNext",
+   "target": "ES2022",
+   "lib": ["DOM", "DOM.Iterable", "ESNext"],
+   "moduleDetection": "force"
  },
- "exclude": ["node_modules"]
+ "exclude": ["node_modules", "dist", "build", ".next"]
}
```

### 개선 효과

| 설정 | 효과 |
|------|------|
| `incremental: true` | `.tsbuildinfo` 파일로 증분 타입 체크 (20-40% 단축) |
| `target: ES2022` | 최신 문법 그대로 출력 → 변환 오버헤드 제거 |
| `moduleDetection: force` | 모듈 감지 최적화 |
| `exclude` 확장 | 불필요한 폴더 타입 체크 제외 |

---

## 3. Next.js 설정 (`apps/web/next.config.mjs`)

### 변경 내용

```diff
const nextConfig = {
  images: {
    remotePatterns: [
-     { hostname: "**" }
+     { protocol: "https", hostname: "*.supabase.co" },
+     { protocol: "https", hostname: "*.supabase.in" },
+     { protocol: "https", hostname: "lh3.googleusercontent.com" },
+     { protocol: "https", hostname: "avatars.githubusercontent.com" }
    ],
  },
  experimental: {
-   optimizePackageImports: ["@web-memo/ui"],
+   optimizePackageImports: [
+     "@web-memo/ui",
+     "@web-memo/shared",
+     "lucide-react",
+     "@tanstack/react-query",
+     "date-fns",
+     "framer-motion"
+   ],
  },
+ typescript: { ignoreBuildErrors: false },
+ eslint: { ignoreDuringBuilds: true },
+ poweredByHeader: false,
+ reactStrictMode: true,
+ productionBrowserSourceMaps: false,
};
```

### 개선 효과

| 설정 | 효과 |
|------|------|
| 이미지 패턴 제한 | 알 수 없는 도메인 이미지 최적화 방지 → 빌드 속도 향상 |
| `optimizePackageImports` 확장 | 6개 패키지 tree-shaking 최적화 → **번들 크기 감소** |
| `productionBrowserSourceMaps: false` | 프로덕션 소스맵 생성 제외 → 빌드 시간 단축 |
| `eslint.ignoreDuringBuilds` | Biome 사용하므로 ESLint 스킵 |

---

## 4. Vite 설정 (`packages/vite-config/lib/withPageConfig.mjs`)

### 변경 내용

```diff
build: {
  sourcemap: isDev,
  minify: isProduction,
  reportCompressedSize: isProduction,
  emptyOutDir: isProduction,
  watch: watchOption,
+ target: "esnext",
+ cssCodeSplit: true,
  rollupOptions: {
    external: ["chrome"],
+   treeshake: {
+     preset: "recommended",
+     moduleSideEffects: false,
+   },
  },
},
+esbuild: {
+  target: "esnext",
+  treeShaking: true,
+  minifyIdentifiers: isProduction,
+  minifySyntax: isProduction,
+  minifyWhitespace: isProduction,
+  legalComments: "none",
+},
+optimizeDeps: {
+  esbuildOptions: { target: "esnext" },
+},
+cacheDir: "node_modules/.vite",
```

### 개선 효과

| 설정 | 효과 |
|------|------|
| `target: "esnext"` | 트랜스파일 최소화 → 빌드 속도 향상 |
| `treeshake.moduleSideEffects: false` | 적극적인 트리쉐이킹 → 번들 크기 감소 |
| `esbuild` 최적화 | 빠른 minification 설정 |
| `legalComments: "none"` | 라이센스 주석 제거 → 번들 크기 감소 |
| `cacheDir` 명시 | 의존성 캐시 위치 고정 |

---

## 5. pnpm 설정 (`.npmrc` 신규 생성)

### 추가된 내용

```ini
# 워크스페이스 최적화
prefer-workspace-packages=true
auto-install-peers=true

# 설치 최적화
prefer-frozen-lockfile=true
prefer-offline=true
fetch-retries=3

# 캐시 설정
store-dir=~/.pnpm-store
modules-cache-max-age=10080

# 성능 최적화
dedupe-peer-dependents=true
side-effects-cache=true
resolution-mode=highest
```

### 개선 효과

| 설정 | 효과 |
|------|------|
| `prefer-offline` | 오프라인 캐시 우선 → 네트워크 요청 감소 |
| `prefer-frozen-lockfile` | lockfile 변경 방지 → CI 안정성 |
| `side-effects-cache` | 사이드이펙트 캐싱 → 재설치 속도 향상 |
| `dedupe-peer-dependents` | peer 의존성 중복 제거 → node_modules 크기 감소 |

---

## 6. 스크립트 최적화 (`package.json`)

### 변경 내용

```diff
"scripts": {
- "clean": "rimraf dist && rimraf .turbo && turbo clean && rimraf node_modules",
+ "clean": "rimraf dist && rimraf .turbo && rimraf **/node_modules/.cache && turbo clean",
+ "clean:full": "rimraf dist && rimraf .turbo && turbo clean && rimraf node_modules",

- "dev": "turbo watch dev",
+ "dev": "turbo watch dev --concurrency=15",

- "build": "turbo build",
+ "build": "turbo build --concurrency=10",

- "type-check": "turbo type-check",
+ "type-check": "turbo type-check --concurrency=10",

+ "type-check:affected": "turbo type-check --filter=...[origin/develop]",
+ "build:analyze": "ANALYZE=true turbo build --filter=@web-memo/web",
+ "cache:status": "turbo daemon status",
+ "cache:clean": "turbo daemon clean",
}
```

### 개선 효과

| 스크립트 | 효과 |
|---------|------|
| `--concurrency=10-15` | 병렬 작업 수 명시 → CPU 활용 최적화 |
| `clean` (개선) | node_modules 유지하고 캐시만 정리 → 빠른 재시작 |
| `type-check:affected` | 변경된 파일만 타입 체크 → PR 검증 최적화 |
| `cache:status/clean` | 캐시 관리 유틸리티 추가 |

---

## 총 개선 효과 요약

| 영역 | 개선 내용 | 예상 효과 |
|------|----------|----------|
| **반복 빌드** | Turbo 캐싱 | **75x 속도 향상** |
| **증분 타입체크** | TS incremental | 20-40% 단축 |
| **번들 크기** | tree-shaking, optimizePackageImports | 10-20% 감소 |
| **의존성 설치** | pnpm 최적화 | 네트워크 요청 감소 |
| **병렬 처리** | concurrency 설정 | CPU 활용 최적화 |

---

## Remote Caching 설정 (추가 권장)

CI/CD에서 **추가 30-60% 속도 향상**을 위해 Turbo Remote Caching 설정 권장:

```bash
# Vercel 계정 연결
npx turbo login

# 팀 연결
npx turbo link
```

또는 환경변수로 설정:

```bash
TURBO_TOKEN=your_token
TURBO_TEAM=your_team
```

---

## 새로 추가된 스크립트

```bash
pnpm clean              # 캐시만 정리 (node_modules 유지)
pnpm clean:full         # 전체 정리 (node_modules 포함)
pnpm build:analyze      # Next.js 번들 분석
pnpm type-check:affected # 변경된 파일만 타입 체크
pnpm cache:status       # Turbo 캐시 상태 확인
pnpm cache:clean        # Turbo 캐시 정리
```
