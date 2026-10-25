# 홍보 이미지 생성

`pnpm build:extension` 후 `pnpm -F e2e exec playwright test -c playwright.store.config.ts`를 실행합니다. 캡처 단계는 한국어판의 실제 메모 데이터와 영어판의 가상 데이터로 확장·웹 UI를 촬영합니다. 합성 단계는 같은 원본으로 다음 이미지를 만듭니다.

- `output/{ko,en}/screenshot-{1..5}.png`: 기존 크롬 웹스토어용 이미지(1280×800)
- `apps/web/public/images/webps/introduction/{ko,en}/{1..5}.webp`: 광고 헤드라인 없는 웹 이미지(1280×800)
- `apps/web/public/og-image.png`: 한국어 첫 장면의 공용 OG 이미지(1200×630)

`assets/`에서 이름순으로 첫 모바일 앱 이미지를 4번 장면에 사용합니다. 이미지가 없으면 자리표시자를 보여줍니다. 영어 앱 UI는 아직 제공되지 않으므로 양쪽 웹 이미지가 같은 앱 캡처를 사용합니다. 공개 전에는 메모 제목·본문·출처와 로그인 상태를 직접 확인합니다.

5번 장면은 웹 대시보드에서 언어별 첫 카테고리를 선택한 화면입니다. 원본을 최종 렌더 크기인 1160×586, 픽셀 밀도 1로 촬영해 합성 과정에서 축소하지 않습니다.
