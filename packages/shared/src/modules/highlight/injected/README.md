# injected

`entry.ts`는 WebView에 주입되는 스크립트의 엔트리다. esbuild가 이를 IIFE로 번들해
`highlightScript.ts`(`export const HIGHLIGHT_SCRIPT`)를 생성한다.

`highlightScript.ts`는 **생성 파일이지만 저장소에 커밋한다.** `packages/shared`는 빌드 없이
raw TypeScript로 소비되므로, 커밋하지 않으면 클론 직후 소비자 빌드가 깨진다.

`entry.ts` 또는 그것이 import하는 모듈을 고쳤다면 반드시 다시 생성해서 함께 커밋한다.

    pnpm -F @web-memo/shared build:injected
