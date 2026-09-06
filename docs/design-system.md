# 디자인 시스템

> `/gs` 파이프라인의 `gs:designer`가 와이어프레임을 그리기 전에 읽는 문서입니다.
> [`docs/project-identity.md`](project-identity.md)의 `톤·태도`를 색·간격·모서리로 번역한 판입니다.
> **값의 원천은 코드입니다.** 이 문서와 코드가 어긋나면 코드가 맞고, 이 문서를 고쳐야 합니다.

## 토큰

정의 위치는 두 곳입니다. **역할 이름(semantic token)만 쓰고, 색상 코드를 컴포넌트에 직접 적지 않습니다.**

| 항목 | 내용 |
| --- | --- |
| 정의 위치 | CSS 변수 원천 → `packages/ui/global.css` (`:root` / `.dark`)<br>Tailwind 매핑 → `packages/tailwind-config/tailwind.config.js`<br>웹 전용 유틸 클래스 → `apps/web/src/app/globals.css` |
| 컬러 | 역할 이름으로만 씁니다 — `background` / `foreground` / `card` / `popover` / `primary` / `secondary` / `muted` / `accent` / `destructive` / `border` / `input` / `ring`. 각각 `-foreground` 짝이 있습니다. 사이드바는 별도 계열(`sidebar-*`), 차트는 `chart-1~5`.<br>강조색은 파랑 계열(`--primary`: 라이트 `221 83% 53%`, 다크 `217 91% 60%`), 위험은 빨강(`--destructive`) |
| 타이포 | 본문 폰트는 **Pretendard**(`font-pretendard`, `apps/web/src/fonts/output/`에서 서브셋 로드). 그 외 `font-sans`(Inter) / `font-serif`(Lora) / `font-mono`(JetBrains Mono)는 CSS 변수로 열려 있으나 실제로는 거의 쓰지 않습니다.<br>크기 단계는 Tailwind 기본 스케일(`text-sm`~`text-4xl`)을 그대로 씁니다. 자간은 `--tracking-normal`(0rem) |
| 간격 | Tailwind 기본 4px 스케일. 실제로 쓰는 단계는 `1·2·3·4·6·8·12·16`(=4~64px)이며 그 밖의 임의 값(`p-[13px]`)은 쓰지 않습니다 |
| 모서리 | `--radius: 0.5rem` 하나가 원천. `rounded-lg`(=8px) / `rounded-md`(6px) / `rounded-sm`(4px)이 여기서 파생됩니다. 카드류에 `rounded-2xl`을 쓰는 자리가 소개 페이지에 있습니다 |
| 그림자 | `shadow-2xs`~`shadow-2xl` 7단계가 CSS 변수로 정의돼 있습니다. **매우 얕은 그림자**(불투명도 0.03~0.13)라 입체감보다 경계 보조에 가깝습니다. 다크 모드에서는 값이 따로 정의돼 있습니다 |
| 다크 모드 | **지원합니다.** `next-themes` + Tailwind `darkMode: ["class"]`, 토글은 `packages/ui`의 `ToggleTheme`. 색을 하드코딩하면 다크에서 깨지므로 반드시 역할 토큰을 씁니다 |
| 애니메이션 | `packages/tailwind-config`에 프리셋이 있습니다 — `fade-in` / `fade-in-up` / `scale-in` / `slide-in-*` / `pulse-soft` / `shimmer` / `float` / `heart-pop` 등. 새 keyframe을 컴포넌트에서 만들기 전에 여기를 먼저 봅니다 |

## 컴포넌트 인벤토리

**공용 컴포넌트는 `packages/ui`(shadcn/ui + Radix 기반)가 원천입니다.** 웹에서는 `apps/web/src/components/ui`가 `"use client"`를 붙여 그대로 재export합니다. 새 UI 프리미티브는 여기에 추가하고 `packages/ui/src/components/index.ts`에서 export합니다.

| 분류 | 컴포넌트 | 위치 |
| --- | --- | --- |
| 입력 | `Button`(variant: default/destructive/outline/secondary/ghost/link) · `Input` · `Textarea` · `Checkbox` · `RadioGroup` · `Select` · `Switch` · `Slider` · `Toggle` · `ToggleGroup` · `InputOTP` · `Form`(react-hook-form 연동) · `Label` | `packages/ui/src/components/` |
| 오버레이 | `Dialog` · `AlertDialog` · `Sheet` · `Drawer`(vaul) · `Popover` · `HoverCard` · `Tooltip` · `DropdownMenu` · `ContextMenu` · `Command`(cmdk) | 〃 |
| 표시 | `Card` · `Badge` · `Alert` · `Avatar` · `Separator` · `Table` · `Progress` · `Chart`(recharts) · `Calendar`(react-day-picker) · `Carousel`(embla) | 〃 |
| 구조 | `Tabs` · `Accordion` · `Collapsible` · `Sidebar` · `NavigationMenu` · `Menubar` · `Breadcrumb` · `Pagination` · `ScrollArea` · `Resizable` · `AspectRatio` | 〃 |
| 상태 | `Skeleton` · `Loading` · `Toast` + `Toaster` · `ErrorBoundary` · `ErrorFallback` · `ToggleTheme` | 〃 |
| 웹 전용 | `Header` · `DragBox` · `YoutubeEmbed` · `HydrationBoundaryWrapper` | `apps/web/src/components/` |
| 페이지 전용 | 해당 라우트의 `_components/` (예: `memos/_components/MemoView`, `highlights/_components/HighlightListSkeleton`) | `apps/web/src/app/[lng]/...` |

> `sonner`는 의존성에 있으나 `index.ts`에서 주석 처리돼 있습니다. **토스트는 `Toast`/`Toaster`(Radix)를 씁니다.**

아이콘은 항상 `lucide-react`를 씁니다. 인라인 `<svg>`를 새로 만들지 않습니다.

## 레이아웃

| 항목 | 내용 |
| --- | --- |
| 반응형 기준 | Tailwind 기본 브레이크포인트를 그대로 씁니다(커스텀 없음). 실제 쓰이는 것은 **`sm`(640) · `lg`(1024) · `md`(768)** 순이고 `xl` 이상은 거의 쓰지 않습니다. 모바일 우선으로 쓰고, 첫 분기를 `sm`에 두는 것이 이 레포의 관행입니다 |
| 페이지 골격 | 웹은 `[lng]` 아래 두 갈래입니다.<br>· `(no-auth)` — 헤더 + 본문(소개·기능·유스케이스·로그인·개인정보). 마케팅 성격이라 여백이 넓고 애니메이션이 있습니다<br>· `(auth)/(sidebar)` — 좌측 사이드바 + 본문(메모·하이라이트·설정·휴지통). 도구 성격이라 정보 밀도가 높고 장식을 줄입니다<br>확장 사이드 패널은 폭이 좁은(≈400px) 단일 컬럼이라 **데스크톱 레이아웃을 그대로 옮기지 않습니다** |
| 시각 인상 | 도구 화면은 담백하게 — 넓은 여백보다 스캔 가능한 밀도, 얕은 그림자, 파랑 강조 한 색.<br>소개/마케팅 화면만 예외적으로 그라디언트·글래스모피즘 유틸(`gradient-mesh` · `glass-card` · `gradient-text` · `glow-*`)을 씁니다. **이 유틸을 `(auth)` 화면으로 끌고 오지 않습니다** |
| 빈 화면 | 안내 문구 + 다음 행동 버튼 하나. 일러스트를 만들지 않고 `lucide-react` 아이콘 + 텍스트로 처리합니다 |
| 로딩 | **스켈레톤이 기본입니다.** 목록·그리드는 실제 레이아웃과 같은 모양의 `Skeleton`(예: `HighlightListSkeleton`), 버튼 등 국소 작업만 스피너(`Loading`). 클라이언트 컴포넌트는 `Suspense` + fallback으로 감쌉니다 |
| 에러 | 화면 단위는 `error.tsx` / `not-found.tsx` / `ErrorBoundary` + `ErrorFallback`(재시도 버튼 포함), 동작 단위 실패는 `Toast`. 사용자에게 스택이나 원문 에러 메시지를 노출하지 않고, Sentry로 보냅니다 |

## 카피

- 모든 사용자 노출 문구는 **번역 키**로 씁니다. `lng === "ko" ? ... : ...` 분기를 쓰지 않습니다
- 키 위치: `apps/web/src/modules/i18n/locales/{ko,en}/translation.json` (중첩 객체, 관련 문구는 공통 prefix로 묶음)
- 확장은 `_locales/`
- 문구를 추가·수정한 뒤에는 `/i18n-check`로 ko/en 양쪽 완전성을 확인합니다
