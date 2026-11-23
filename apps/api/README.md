# @web-memo/api

Supabase 백엔드를 옮겨 받을 NestJS 서버입니다. 이전 계획은 노션 작업 카드
[Supabase → NestJS 백엔드 마이그레이션](https://app.notion.com/p/Supabase-NestJS-42189de02fde8183a3f9c992154e7bc9)에 있습니다.

```bash
pnpm -F @web-memo/api dev        # 개발 서버 (기본 포트 4000, PORT로 변경)
pnpm -F @web-memo/api build      # dist/로 빌드
pnpm -F @web-memo/api start      # 빌드 결과 실행
pnpm -F @web-memo/api test       # 단위 테스트 (src/**/*.spec.ts)
pnpm -F @web-memo/api test:e2e   # E2E 테스트 (test/**/*.e2e-spec.ts)
```

## 알아둘 것

- **ESM 프로젝트입니다.** NestJS 12는 ESM 전용이라 상대 경로 import에 `.js` 확장자를 붙입니다
  (`./app.module.js`). 소스는 `.ts`지만 실행되는 건 빌드된 `.js`이기 때문입니다.
- **주입받는 클래스를 `import type`으로 가져오지 않습니다.** Nest는 생성자 인자의 타입 정보
  (`emitDecoratorMetadata`)로 주입할 클래스를 찾는데, `import type`은 컴파일 결과에서 그 참조를 지웁니다.
  그래서 `biome.json`에서 이 폴더만 `style/useImportType`을 껐습니다.
- **테스트 파일은 `*.test.ts`가 아니라 `*.spec.ts`입니다.** 루트 Vitest는 `*.test.ts`를 SWC 없이
  돌리는데, 그러면 데코레이터 메타데이터가 없어 DI가 깨집니다. 이 앱의 테스트는 SWC 플러그인을 쓰는
  `apps/api/vitest.config*.ts`로만 돌립니다.
