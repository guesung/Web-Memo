# 홍보 이미지 생성

`pnpm build:extension` 후 `pnpm -F e2e exec playwright test -c playwright.store.config.ts`를 실행합니다. 캡처 단계는 가상 기사·메모·요약 데이터로 실제 확장·웹 UI를 촬영합니다. 합성 단계는 같은 원본으로 다음 이미지를 만듭니다.

- `output/{ko,en}/screenshot-{1..5}.png`: 기존 크롬 웹스토어용 이미지(1280×800)
- `apps/web/public/images/pngs/introduction/{ko,en}/{1..5}.png`: 광고 헤드라인 없는 웹 이미지(1280×800)
- `apps/web/public/og-image.png`: 한국어 첫 장면의 공용 OG 이미지(1200×630)

`assets/mobileMemoList.png`는 4번 장면의 실제 한국어 앱 캡처입니다. 개인 계정의 화면을 재사용하지 않습니다. 별도 iOS 시뮬레이터에 현행 앱을 설치하고, 예약된 `example.com` 또는 `example.org` 주소와 가상 메모만 로컬 저장소에 넣어 촬영합니다. 촬영 전후에 메모 제목·본문·출처와 로그인 상태를 확인하고, 결과물에 이메일·개인 메모·자리표시자가 없는지 확인합니다. 영어 앱 UI는 아직 제공되지 않으므로 양쪽 웹 이미지가 같은 한국어 앱 캡처를 사용합니다.

5번 장면은 Blender Foundation의 *Big Buck Bunny*를 사용합니다. 템플릿 이미지 내부의 `© Blender Foundation · Big Buck Bunny · CC BY 3.0` 표기와 소개 페이지의 클릭 가능한 [원작 출처](https://peach.blender.org/about/)·[라이선스](https://creativecommons.org/licenses/by/3.0/) 링크를 함께 유지합니다.
