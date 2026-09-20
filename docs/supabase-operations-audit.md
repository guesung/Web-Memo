# Supabase 운영 상태 감사

이 감사의 목적은 이상 유무만 확인하는 데 그치지 않고, 운영 Supabase에 현재 무엇이 배포되어 있고 어떤 상태인지 지속적으로 관리하는 것입니다. 저장소의 [`.github/supabase-audit-manifest.json`](../.github/supabase-audit-manifest.json)을 기대 상태의 원천으로 삼고, 실제 운영 프로젝트에서 읽은 현재 상태와 비교합니다.

## 관리하는 현재 상태

| 영역 | 기록하는 현재 상태 | 오류로 판정하는 조건 | 경고로 판정하는 조건 |
| --- | --- | --- | --- |
| 프로젝트 | 프로젝트 상태, PostgreSQL 버전 | 프로젝트가 `ACTIVE_HEALTHY`가 아니거나 버전을 읽지 못함 | PostgreSQL major가 선언과 다름 |
| Supabase 서비스 | DB, Auth, REST, Realtime, Storage의 이름과 상태 | 필수 서비스가 없거나 관측된 서비스가 `ACTIVE_HEALTHY`가 아님 | 선언하지 않은 서비스가 관측됨 |
| DB 마이그레이션 | 운영 DB에 기록된 전체 migration version | 선언한 migration version이 운영에 없음 | 운영에만 있는 migration version이 있음 |
| DB 자동화 | Cron job, DB trigger, Database Webhook의 이름과 활성 상태 | 선언한 항목이 없거나 관측된 항목이 비활성 상태임 | 운영에만 있는 항목이 있음 |
| Vault | Vault secret의 이름 | 선언한 이름이 없음 | 운영에만 있는 이름이 있음 |
| Edge Functions | 운영에 배포된 전체 함수의 이름, 배포 버전, 상태 | 선언한 함수가 없거나 관측된 함수의 상태가 `ACTIVE`가 아니거나 버전을 읽지 못함 | 운영에만 있는 함수가 있거나 고정한 기대 버전과 다름 |
| Edge Function secrets | Supabase 기본 항목을 제외한 secret 이름 | 선언한 이름이 없음 | 운영에만 있는 이름이 있음 |
| Edge Function 오류 | 최근 24시간 HTTP 400 이상 건수, 오류 로그 및 처리되지 않은 예외 건수 | 한 건 이상 관측됨 | 없음 |
| Edge Runtime | 함수 배포 버전과 프로젝트 서비스 상태를 대체 지표로 사용 | 없음 | 정확한 Edge Runtime 및 Deno 버전은 공식 API에서 관측할 수 없음을 알림 |

감사 결과의 GitHub Actions Summary에는 이상 항목뿐 아니라 위 현재 상태 인벤토리를 항상 표시합니다. 따라서 운영자가 현재 DB 서비스가 정상인지, 어떤 migration과 DB 자동화가 적용되어 있는지, 어떤 Edge Function이 어느 버전과 상태로 배포되어 있는지를 한 실행 결과에서 확인할 수 있습니다. 실행 중 생성되는 JSON 결과의 `observations`에도 같은 구조화된 상태가 남습니다.

## 선언 파일로 관리하는 방법

- 운영에 반드시 있어야 하는 리소스를 manifest에 추가합니다. 누락되면 PR 검사가 실패합니다.
- 새 migration이나 Edge Function을 운영에 배포할 때 manifest도 같은 변경에서 갱신합니다.
- Edge Function의 `version`을 `null`로 두면 존재와 활성 상태만 검사합니다. 숫자로 고정하면 예기치 않은 재배포도 경고로 확인할 수 있습니다.
- 운영에서 발견된 미선언 리소스는 자동으로 정상 상태에 편입하지 않습니다. 필요한 리소스인지 확인한 뒤 manifest에 추가하거나 운영에서 제거합니다.
- `baselineNotes`에는 아직 확정하지 못한 기준이나 API 제약을 기록합니다. 각 항목은 해결될 때까지 실행 결과에 경고로 남습니다.

## 실행과 판정

- Pull Request에서는 필수 리소스 누락, 서비스 비정상, 함수 오류, API·권한·응답 문제처럼 감사를 완료하지 못한 상황이 체크를 실패시킵니다.
- 매일 08:00 KST 정기 실행과 수동 실행에서는 오류와 경고를 Slack으로 알립니다.
- 선언에 없는 추가 리소스의 존재와 버전 차이는 운영 상태를 임의로 변경하지 않도록 경고로 보고합니다. 추가 리소스라도 비정상·비활성 상태이면 별도 오류도 함께 기록합니다.
- Management API와 읽기 전용 SQL만 사용하므로 감사 자체가 DB나 함수를 변경하지 않습니다.

## 수집하지 않는 정보

감사 결과가 새로운 비밀 저장소가 되지 않도록 다음 정보는 조회하거나 출력하지 않습니다.

- Edge Function secret의 값
- Vault의 암호화 값과 복호화 값
- Database Webhook URL과 HTTP header
- Cron command와 trigger 인자
- Edge Function 로그 원문과 요청·응답 본문

정확한 Edge Runtime 및 Deno 버전은 현재 공식 Management API가 제공하지 않습니다. 이 한계는 조용히 정상 처리하지 않고 모든 실행에서 경고로 표시합니다.
