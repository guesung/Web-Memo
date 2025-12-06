# pnpm Hoist 설정 가이드

## 배경

이 프로젝트는 pnpm workspace를 사용하는 모노레포 구조입니다. React Native/Expo 앱(`apps/mobile`)은 특정 패키지들이 `node_modules` 루트에 hoisted되어야 정상 작동합니다.

## 문제점

### `node-linker=hoisted` 전역 설정의 문제

```
# 이전 설정 (문제 있음)
node-linker=hoisted
```

- **모든 패키지**가 hoisted되어 pnpm의 장점(엄격한 의존성 관리, 디스크 효율성)이 사라짐
- 모노레포 내 다른 앱들(chrome-extension, web)도 영향을 받음
- phantom dependency 문제 발생 가능

## 해결책

### `public-hoist-pattern` 선택적 hoisting

```
# .npmrc
public-hoist-pattern[]=*react-native*
public-hoist-pattern[]=*expo*
public-hoist-pattern[]=@react-navigation/*
public-hoist-pattern[]=react
public-hoist-pattern[]=react-dom
```

- React Native/Expo 관련 패키지**만** 루트 `node_modules`로 hoist
- 다른 패키지들은 pnpm의 정상적인 symlink 구조 유지
- 모노레포의 패키지 공유 기능 정상 작동

## Hoist 패턴 설명

| 패턴 | 설명 |
|------|------|
| `*react-native*` | react-native 및 관련 라이브러리 |
| `*expo*` | Expo SDK 및 관련 패키지 |
| `@react-navigation/*` | React Navigation 라이브러리 |
| `react` | React 코어 (peer dependency 충돌 방지) |
| `react-dom` | React DOM (web 호환성) |

## 패키지 추가 시

새로운 React Native 라이브러리 설치 후 오류가 발생하면:

1. 오류 메시지에서 찾을 수 없는 모듈 확인
2. `.npmrc`에 해당 패턴 추가
3. `pnpm install` 재실행

```bash
# 예: react-native-svg 추가 시
echo 'public-hoist-pattern[]=react-native-svg' >> .npmrc
pnpm install
```

## 관련 명령어

```bash
# 의존성 재설치
pnpm install

# 캐시 정리 후 재설치
pnpm store prune
rm -rf node_modules
pnpm install
```

## 참고 자료

- [pnpm public-hoist-pattern](https://pnpm.io/npmrc#public-hoist-pattern)
- [pnpm과 React Native](https://pnpm.io/faq#pnpm-does-not-work-with-react-native)
