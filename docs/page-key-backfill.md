# 페이지 식별값 백필

`20260924_add_page_keys.sql` 마이그레이션을 적용하면 기존 메모와 하이라이트의 `page_key`는 빈 문자열로 남습니다. 새 클라이언트는 이 행도 원본 URL로 확인할 수 있으므로, 백필이 끝나기 전에도 기존 데이터를 조회할 수 있습니다. 백필은 조회 비용을 줄이기 위한 후속 작업입니다.

새 클라이언트를 테스트 서버나 운영 환경에 배포하기 전에 해당 환경의 DB에 마이그레이션을 먼저 적용합니다. `page_key` 컬럼이 없는 DB로 새 클라이언트를 배포하면 메모와 하이라이트 조회가 실패합니다.

서비스 역할 키를 사용할 수 있는 안전한 운영 환경에서 실행합니다. 키를 명령줄 인자나 저장소 파일에 넣지 않습니다.

```bash
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
node --experimental-strip-types packages/shared/scripts/backfillPageKeys.mjs --dry-run
node --experimental-strip-types packages/shared/scripts/backfillPageKeys.mjs --apply
```

> ⚠️ **`memo.memo`에는 `moddatetime('updated_at')` BEFORE UPDATE 트리거가 걸려 있습니다.** 스크립트가 `updated_at`을 읽은 값 그대로 다시 써도 트리거가 현재 시각으로 덮어쓰므로, 백필을 돌리면 모든 메모의 수정 시각이 실행 시각으로 바뀌고 스크립트는 전 행을 `errors`로 보고합니다(값은 이미 바뀐 뒤입니다). 2026-10-09 운영 백필에서 실제로 6,436건이 이렇게 바뀌어 전날 논리 백업의 `updated_at`으로 되돌렸습니다. 다시 돌리기 전에 SQL 편집기에서 `alter table memo.memo disable trigger handle_updated_at;`로 트리거를 끄고, 끝난 뒤 `enable trigger`로 되살리세요. `memo.highlight`에는 이 트리거가 없어 그대로 됩니다.

스크립트는 공용 `getPageKey` 함수로 값을 계산하고, `memo.memo`와 `memo.highlight`를 ID 순서로 처리합니다. 원본 URL과 `updated_at`이 읽은 값과 같을 때만 `page_key`를 변경합니다. URL이나 수정 시각이 실행 중에 바뀐 행은 건너뜁니다. 잘못된 URL, 동시 변경, 갱신 실패는 테이블명과 ID로 보고하며 종료 코드가 1이 됩니다. 같은 명령을 다시 실행하면 아직 빈 값인 행만 재시도합니다.

각 테이블의 JSON 요약에서 `invalid`, `conflicts`, `errors`가 모두 0인지 확인합니다. 백필이 끝난 뒤 빈 값의 개수를 확인하려면 각 테이블에 `select count(*) from memo.memo where page_key = '';`, `select count(*) from memo.highlight where page_key = '';`를 실행합니다. 오래된 클라이언트가 쓰는 동안에는 새 빈 값이 다시 생길 수 있습니다.
