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
- **`@Body()` 같은 파라미터 데코레이터는 TC39 표준이 아닙니다.** Biome가 기본으로는 파싱하지 못해
  `biome.json`에서 이 폴더만 `unsafeParameterDecoratorsEnabled`를 켰습니다.
- **환경 변수는 서버가 뜰 때 검증합니다**(`src/config/env.validation.ts`). 필수 값이 빠지면 요청을 받기 전에
  시작이 실패합니다. 로컬 실행에는 `WEBHOOK_SECRET`(32자 이상)·`SLACK_FEEDBACK_WEBHOOK_URL`·`SLACK_SIGNUP_WEBHOOK_URL`·
  `DATABASE_URL`·`UNSUBSCRIBE_SECRET`(32자 이상)이 필요합니다.
- **테스트 파일은 `*.test.ts`가 아니라 `*.spec.ts`입니다.** 루트 Vitest는 `*.test.ts`를 SWC 없이
  돌리는데, 그러면 데코레이터 메타데이터가 없어 DI가 깨집니다. 이 앱의 테스트는 SWC 플러그인을 쓰는
  `apps/api/vitest.config*.ts`로만 돌립니다.

## DB (Prisma)

```
요청 → Controller → Service → PrismaService → 커넥션 풀(pg) → Supabase 풀러 → Postgres
```

- **Prisma는 읽고 쓰는 용도로만 씁니다.** 테이블을 만들고 바꾸는 원본은
  `packages/supabase-edge-functions/supabase/migrations`의 SQL 파일입니다. `prisma migrate`·`prisma db push`는 쓰지 않고,
  컬럼이 바뀌면 SQL 마이그레이션과 `prisma/schema.prisma`를 함께 고칩니다.
- **스키마에는 이 서버가 쓰는 테이블과 컬럼만 적습니다.** 적지 않은 컬럼은 DB의 기본값을 그대로 씁니다.
- **생성된 클라이언트(`src/generated`)는 커밋하지 않습니다.** `dev`·`build`·`type-check`·`test` 스크립트가
  먼저 `prisma generate`를 돌립니다. 생성은 DB에 붙지 않아 `DATABASE_URL` 없이도 됩니다.
- **전용 DB 역할(`api_server`)로 붙습니다.** `postgres`·`service_role`과 달리 RLS를 건너뛰지 못하고,
  마이그레이션이 허용한 테이블·동작만 할 수 있습니다. 새 테이블을 쓰려면 그 역할에 권한과 정책을 주는 마이그레이션이 필요합니다.
  반대로 말하면, 이 서버에서는 "누구의 데이터인가"를 RLS가 아니라 서버 코드가 확인해야 합니다(지금은 메일의 서명 토큰).
- **운영 접속은 TLS로 서버 신원까지 확인합니다**(`sslmode=verify-full`). Supabase 풀러의 인증서는 Supabase 자체 CA가
  서명해서, 공개된 루트 CA(`certs/supabase-prod-ca-2021.crt`, 2031-04 만료)를 이미지에 넣고 `NODE_EXTRA_CA_CERTS`로 알려 줍니다.
  `sslmode`를 빼면 평문으로 붙고, `require`만 쓰면 이 CA 없이는 검증에 실패합니다. 로컬 Postgres에는 `sslmode` 없이 붙습니다.
- **서버가 뜰 때 DB에 미리 붙지 않습니다.** 연결은 첫 쿼리 때 풀이 만듭니다. DB가 잠깐 죽어 있어도 서버는 뜨고,
  DB를 쓰지 않는 요청(Slack 웹훅·`/health`)은 그대로 처리합니다.
- **테스트는 `PrismaService`를 가짜로 바꿉니다.** 실제 쿼리는 로컬 Postgres 컨테이너로 따로 확인했습니다.
