# AI 리뷰 워크플로우

두 AI 페르소나("이도현" 인턴 개발자, "박성우" 시니어 개발자)가 GitHub PR에
직접 코멘트를 다는 워크플로우다. 목적은 지적이 아니라 **작성자가 자기 코드를
설명하게 만드는 것** — 시니어의 지적 요약(`scan`)만 예외로, 답변을 요구하지
않는 참고용 코멘트다.

설계 근거(왜 두 페르소나인지, 왜 1턴 제한인지, 마커·후속 작업 체크리스트
설계 등)는 [`docs/superpowers/specs/2026-08-17-ai-review-personas-design.md`](../../docs/superpowers/specs/2026-08-17-ai-review-personas-design.md)에
있다. 이 README는 **설정과 실행 방법만** 다룬다.

## 두 개의 슬래시 커맨드

| 커맨드 | 역할 |
| --- | --- |
| `/ai-review` | 현재 PR의 diff를 읽고 두 페르소나 명의로 인라인 질문(과 시니어의 지적 요약)을 게시한다. |
| `/ai-review-reply` | 작성자가 답변한 스레드를 찾아 각 봇이 한 번만 재답변하고, 인턴 스레드는 코드 주석 제안으로, 시니어 스레드는 PR 본문의 후속 작업 체크리스트로 남긴다. |

두 커맨드 모두 `.claude/commands/ai-review.md` / `ai-review-reply.md`에 절차가
있고, 내부에서 이 디렉터리의 `cli.ts`를 서브프로세스로 호출한다. 커맨드는
`cli.ts`가 인식하는 세 서브커맨드(`pending`/`post`/`followup`)를 순서대로
호출하며, `cli.ts`가 사전 검증에서 거부하는 필드(`persona`/`kind`/`line`/
`rootId`)와 거부하지 않는 필드(`path`/`body`)를 각 커맨드 문서에서 명시한다.

## Node 요구 사항

**Node 24.2.0 이상**이 필요하다. `cli.ts`는 자신이 `node cli.ts ...`로
직접 실행됐는지 판별할 때 `process.argv[1]`을 이 파일의 실제 경로와 비교하므로
그 판별 자체는 모든 Node 24 버전에서 동작하지만, CLI 진입 시점에 최소 버전을
명시적으로 검사해 미달이면 큰 소리로 실패한다(현재 버전과 요구 버전을 stderr에
출력하고 exit code 1). Node 24 미만이나 native TypeScript 타입 스트리핑을
지원하지 않는 버전에서는 애초에 이 파일 자체가 실행되지 않는다.

## GitHub App 설정

봇마다 GitHub App이 하나씩 필요하다 — 인턴용, 시니어용 총 **두 개**. 코멘트가
"이도현이 답니다" / "박성우가 답니다"로 구분되어 보이는 것도, 재답변 1회 제한이
페르소나 단위로 동작하는 것도 이 분리 덕분이다.

### 1. App 생성 (GitHub → Settings → Developer settings → GitHub Apps)

앱마다:

- **이름**: 봇을 알아볼 수 있는 이름 (예: `web-memo-review-intern`)
- **아바타**: 페르소나를 구분하기 쉽게 서로 다른 이미지로 설정한다
- **Webhook**: 비활성화 (이 워크플로우는 webhook을 쓰지 않는다)
- **Repository permissions**:
  - `Pull requests`: **Read and write** — 리뷰 코멘트, 스레드 답글, 시니어의 지적 요약
    코멘트, PR 본문 수정까지 **전부** 이 권한 하나로 커버된다
  - `Contents`: **Read-only** — 현재 코드 경로에서 직접 요구하지는 않는다.
    실제 설치 App에 포함돼 있고 검증도 이 조합으로 마쳤으므로 그대로 둔다.
  - `Metadata`: **Read-only** — App 설치 시 GitHub이 강제하는 최소 권한
- 그 외 권한은 추가하지 않는다. **특히 `Issues` 권한은 필요 없다.**
  지적 요약은 `POST /issues/{pr}/comments` 로 게시하지만, PR에 대한 이 엔드포인트는
  `Pull requests` 권한으로 동작한다 — 위 세 권한만으로 실제 게시되는 것을
  PR #416에서 확인했다.

### 2. 레포에 설치

App을 이 레포(`guesung/web-memo`)에 설치하고, 설치 후 URL의 installation ID를
기록해 둔다 (`https://github.com/settings/installations/<이 숫자>`).

### 3. Private key 발급

App 설정 페이지에서 **Generate a private key**로 `.pem` 파일을 받는다.
두 봇 각각 하나씩, 총 두 개의 키가 생긴다.

### 4. 로컬에 배치

```bash
mkdir -p ~/.config/web-memo-bots
mv ~/Downloads/<intern-app>.<날짜>.private-key.pem ~/.config/web-memo-bots/intern.pem
mv ~/Downloads/<senior-app>.<날짜>.private-key.pem ~/.config/web-memo-bots/senior.pem
chmod 600 ~/.config/web-memo-bots/*.pem
```

**이 디렉터리는 절대 레포에 커밋하지 않는다.** `~/.config/` 아래 개인 홈
디렉터리에만 둔다. 레포는 public이다.

### 5. `config.json` 작성

`~/.config/web-memo-bots/config.json`:

```json
{
	"repo": "guesung/web-memo",
	"prAuthor": "guesung",
	"bots": {
		"intern": {
			"displayName": "이도현",
			"role": "인턴 개발자",
			"appId": "1234567",
			"installationId": "87654321",
			"privateKeyPath": "~/.config/web-memo-bots/intern.pem"
		},
		"senior": {
			"displayName": "박성우",
			"role": "시니어 개발자",
			"appId": "7654321",
			"installationId": "12345678",
			"privateKeyPath": "~/.config/web-memo-bots/senior.pem"
		}
	}
}
```

필드 설명:

- `repo` — `owner/repo` 형식. 슬래시가 없으면 거부된다.
- `prAuthor` — 미답변 스레드를 판별할 때 "작성자가 답했는지"를 가리는 기준이
  되는 GitHub 로그인. 보통 이 레포에 PR을 올리는 본인 계정.
- `bots.intern` / `bots.senior` — 각 봇의 App 정보. `appId`·`installationId`는
  숫자로 보이지만 문자열로 쓴다. `privateKeyPath`는 `~/`로 시작하면 자동으로
  홈 디렉터리로 확장된다.

다섯 필드(`displayName`/`role`/`appId`/`installationId`/`privateKeyPath`) 중
하나라도 빠지거나 공백이면, 어떤 필드가 문제인지 전부 모아 하나의 에러로
안내한다(`appToken.ts`의 `parseReviewerConfig`).

## 실행 방법

설정이 끝나면 PR이 있는 브랜치에서 슬래시 커맨드를 실행한다.

```bash
/ai-review          # 기본 3개씩 질문
/ai-review 5        # 페르소나별 5개씩 질문
/ai-review-reply    # 답변한 스레드에 재답변
```

`cli.ts`를 직접 실행할 수도 있다 (커맨드 문서가 실제로 하는 일과 동일하다):

```bash
node scripts/ai-reviewer/cli.ts pending  --pr <PR번호>
node scripts/ai-reviewer/cli.ts post     --pr <PR번호> --input <파일.json>
node scripts/ai-reviewer/cli.ts followup --pr <PR번호> --input <파일.json>
```

각 서브커맨드의 입력 스키마와 사전 검증 항목은 `.claude/commands/ai-review.md`
· `ai-review-reply.md`에 있다.

## 알려진 후속 개선 과제 (기록만, 미구현)

- **후속 작업 항목 중복 제거는 현재 "커맨드가 기존 문장을 그대로 재사용하는
  습관"에 의존한다.** `followup.ts`의 `upsertFollowupSection`은 공백·대소문자만
  정규화한 완전 일치 비교로 중복을 걸러내므로, 같은 논점이라도 문장이 조금이라도
  달라지면(모델이 "더 잘 다듬으면") 중복 제거를 그대로 통과해 같은 지적이 두 줄로
  남는다. `.claude/commands/ai-review-reply.md` 6-0단계가 이를 사람이/모델이
  주의해서 피하도록 안내하고 있지만, 결정적인 방식은 아니다. 모든 후속 작업 항목이
  이미 `— 스레드 #<rootId>` 접미사를 달고 있으므로, 이 `rootId`를 키로 삼아 "같은
  스레드에서 나온 항목인지"로 중복을 판정하면 문장이 달라져도 걸러낼 수 있다.
  아직 구현하지 않았다.
