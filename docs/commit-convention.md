# 커밋 컨벤션

이 문서는 커밋 메시지 작성 규칙을 설명합니다.

## 커밋 메시지 형식

```
<prefix>: <설명>

[본문(선택)]

[푸터(선택)]
```

## 커밋 접두사(prefix)

1. `feat`: 새로운 기능
   - 예시: `feat: 사용자 인증 추가`

2. `fix`: 버그 수정
   - 예시: `fix: 비디오 플레이어의 메모리 누수 해결`

3. `chore`: 유지보수 작업
   - 예시: `chore: npm 의존성 업데이트`

4. `style`: 코드 스타일 변경(포매팅, 누락된 세미콜론 등)
   - 예시: `style: user service 코드 포매팅`

5. `design`: UI/UX 변경
   - 예시: `design: 버튼 스타일 수정`

6. `refactor`: 버그 수정도 기능 추가도 아닌 코드 변경
   - 예시: `refactor: 인증 로직 구조 개선`

## 추가 컨벤션

더 세부적인 커밋 메시지 규칙은 아래 가이드라인을 따릅니다.

### 타입(Type)

- `docs`: 문서 변경
- `test`: 누락된 테스트 추가 또는 기존 테스트 수정
- `build`: 빌드 시스템이나 외부 의존성에 영향을 주는 변경
- `ci`: CI 설정 파일 및 스크립트 변경
- `perf`: 성능 개선
- `revert`: 이전 커밋 되돌리기

### 설명(Description)

- 명령형 현재 시제를 사용합니다: "changed"나 "changes"가 아니라 "change"
- 첫 글자를 대문자로 쓰지 않습니다
- 끝에 마침표(.)를 붙이지 않습니다
- 첫 줄은 72자 이내로 제한합니다

### 본문(Body)

- 명령형 현재 시제를 사용합니다
- 변경의 동기와 이전 동작과의 차이를 함께 적습니다
- 72자 기준으로 줄바꿈합니다

### 푸터(Footer)

- 이슈와 Pull Request를 참조합니다
- 호환성이 깨지는 변경은 `BREAKING CHANGE:`로 시작합니다

## 예시

```bash
feat: 이메일 알림 기능 추가

사용자 액션에 대한 이메일 알림을 구현:
- 가입 확인
- 비밀번호 재설정
- 계정 삭제

Resolves: #123
```

```bash
fix: 요청 경쟁 상태(racing) 방지

요청 id와 최신 요청에 대한 참조를 도입.
최신 요청이 아닌 응답은 무시하도록 처리.

Resolves: #123
```

```bash
refactor!: Node 6 지원 중단

BREAKING CHANGE: Node 6에서 사용할 수 없는 JavaScript 기능을 쓰도록 리팩터링.
```

더 자세한 예시와 가이드라인은 [Conventional Commits](https://www.conventionalcommits.org/)와 [Angular 커밋 메시지 가이드라인](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#commit)을 참고하세요.
