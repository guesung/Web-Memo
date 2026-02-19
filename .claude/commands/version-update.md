# Version Update Command

버전 업데이트 시 Update.ts와 translation 파일들을 함께 업데이트합니다.

## 사용법

```
/version-update [version] [description]
```

예시:
```
/version-update v1.8.24 "메모 그리드 스켈레톤 로딩 추가"
```

## 실행 절차

### 0단계: 브랜치 확인 및 머지

먼저 현재 브랜치를 확인하고 master 브랜치로 이동합니다:

```bash
git branch --show-current
```

**master 브랜치가 아닌 경우:**
1. master 브랜치로 이동
2. develop 브랜치를 master로 머지

```bash
git checkout master
git merge develop
```

### 1단계: 변경 내용 분석

먼저 최근 git 변경 내용을 분석하여 업데이트 내용을 파악합니다:

```bash
git log --oneline -10
git diff HEAD~5 --stat
```

### 2단계: 버전 정보 결정

다음 정보를 확인하거나 사용자에게 질문합니다:
- **버전 번호**: 현재 최신 버전에서 patch 버전 증가 (예: v1.8.23 → v1.8.24)
- **날짜**: 오늘 날짜 (YYYY.MM.DD 형식)
- **업데이트 제목 (ko/en)**: 변경 내용을 요약한 제목
- **업데이트 내용 (ko/en)**: 구체적인 변경 사항 목록

### 3단계: 파일 업데이트

아래 3개 파일을 수정합니다:

#### 1. `packages/web/src/constants/Update.ts`
배열 맨 앞에 새 버전 추가:
```typescript
{
    date: "YYYY.MM.DD",
    version: "vX.Y.Z",
},
```

#### 2. `packages/web/src/modules/i18n/locales/ko/translation.json`
`updates.versions` 객체에 새 버전 추가 (기존 버전들 위에):
```json
"vX.Y.Z": {
    "title": "업데이트 제목",
    "content": ["변경 내용 1", "변경 내용 2"]
},
```
- 사용자 관점에서 보는 업데이트 내용을 작성합니다.

#### 3. `packages/web/src/modules/i18n/locales/en/translation.json`
`updates.versions` 객체에 새 버전 추가 (기존 버전들 위에):
```json
"vX.Y.Z": {
    "title": "Update title",
    "content": ["Change 1", "Change 2"]
},
```
- 사용자 관점에서 보는 업데이트 내용을 작성합니다.

### 4단계: 검증

- 모든 파일이 올바른 JSON/TypeScript 문법인지 확인
- 버전 번호가 일관되게 적용되었는지 확인
- ko/en 번역 내용이 적절한지 확인

### 5단계: 패키지 버전 업데이트

package.json 파일들의 버전을 업데이트합니다:

```bash
pnpm run update-version vX.Y.Z
```

예시:
```bash
pnpm run update-version v1.8.24
```

## 업데이트 제목 가이드

| 변경 유형 | 한국어 | English |
|----------|--------|---------|
| 버그 수정 | 안정성 개선 | Stability improvements |
| 새 기능 | [기능명] 추가 | Added [feature] |
| 성능 개선 | 성능 최적화 | Performance optimization |
| UI 개선 | 디자인 개선 | Design improvements |
| 보안 수정 | 보안 개선 | Security improvements |

## 주의사항

- 버전은 semantic versioning을 따릅니다 (major.minor.patch)
- 날짜 형식은 반드시 `YYYY.MM.DD` 형식
- translation 파일의 JSON 문법 오류에 주의
- 새 버전은 항상 목록의 **맨 앞**에 추가
