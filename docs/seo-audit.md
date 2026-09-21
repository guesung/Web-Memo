# Web Memo SEO 감사

> 기준일: 2026-09-21
> 대상: `https://www.webmemo.xyz`의 한국어·영어 공개 페이지
> 목적: 확인된 검색 노출 문제와 아직 검증이 필요한 가설을 분리하고, 후속 개선 과제의 우선순위와 완료 조건을 정합니다.

## 요약

Web Memo에는 robots.txt, XML sitemap, 페이지별 canonical, 한국어·영어 hreflang, Open Graph, JSON-LD가 이미 구현되어 있습니다. 검색엔진이 페이지를 이해하기 위한 기본 장치는 대부분 갖춰져 있습니다.

그러나 Google Search Console의 최근 관측에서는 검색 노출 표본이 매우 작고, 제출된 sitemap을 가져오지 못한 상태였습니다. 공개 sitemap 자체는 정상 응답하므로, 코드 결함으로 단정하기 전에 Search Console 속성·제출 URL·리다이렉트·재수집 상태를 확인해야 합니다. 콘텐츠 측면에서는 기능·유스케이스 전체를 연결하는 허브가 없고 일부 페이지가 소개 페이지에서 직접 연결되지 않습니다. 메타데이터와 구조화 데이터도 여러 원천에 나뉘어 있어 페이지별 정보가 어긋날 위험이 있습니다.

우선순위는 다음과 같습니다.

1. Search Console sitemap 수집 실패를 해소합니다.
2. 기능·유스케이스 허브와 내부 링크를 강화합니다.
3. 메타데이터와 구조화 데이터의 원천을 통합합니다.
4. 공개 랜딩의 성능 비용을 실측하고 경계를 분리합니다.
5. sitemap 신선도와 SEO 계약을 자동 검증합니다.

## 감사 범위

- `www.webmemo.xyz`의 공개 색인 대상 24개 URL을 확인합니다.
  - 언어: `ko`, `en`
  - 페이지 유형: 소개 1개, 개인정보 처리방침 1개, 기능 3개, 유스케이스 7개
- 크롤링·색인 신호를 확인합니다.
  - robots.txt, sitemap, canonical, hreflang, noindex
- 페이지 단위 검색·공유 정보를 확인합니다.
  - title, description, Open Graph, Twitter Card, JSON-LD
- 콘텐츠 탐색 구조와 사용 시작 경로를 확인합니다.
- 공개 랜딩의 성능 위험을 코드 수준에서 식별합니다.
- Google Search Console에서 확인 가능한 최근 검색 성과와 sitemap 상태를 기준선으로 남깁니다.

## 제외 대상

- 실제 제품 코드 수정과 배포
- 유료 광고 집행, 외부 홍보 게시, 백링크 구매
- 검색 유입만을 위한 대량 콘텐츠 생성
- Chrome 웹스토어·App Store의 전체 최적화 감사
- 디자인 감사와 디자인 변경
- 검색 순위나 유입 증가 보장

## 조사 방법과 한계

### 확인한 근거

- 저장소의 Next.js 라우트, metadata, sitemap, robots, middleware, JSON-LD, 내부 링크 구현
- 공개 사이트의 HTTP 응답과 초기 HTML
- 로그인된 Google Search Console의 `https://www.webmemo.xyz/` 속성
- Google Search Central과 web.dev의 공식 문서

### 확인하지 못한 항목

- 전체 색인 URL 수와 페이지별 색인 제외 사유
  - Search Console의 페이지 색인 보고서가 감사 당시 404로 열려 확인하지 못했습니다.
- 상위 검색어 전체 목록
  - 현재 표본이 작고 감사에서 확보한 화면에는 전체 검색어 목록이 포함되지 않았습니다.
- Core Web Vitals 실측값
  - 코드에서 성능 위험 후보는 확인했지만 CrUX·PageSpeed Insights·RUM 수치는 확보하지 않았습니다.

이 세 항목에는 임의의 수치나 판정을 넣지 않습니다.

## 검색 성과 기준선

Google Search Console에서 2026-09-21 19:54 KST에 최근 28일 조건으로 확인했습니다. 실제 데이터가 존재한 기간은 2026-09-16부터 2026-09-19까지입니다.

| 지표 | 값 |
| --- | ---: |
| 클릭 | 2회 |
| 노출 | 11회 |
| CTR | 18.2% |
| 평균 게재순위 | 5.2 |

CTR은 `2 ÷ 11 × 100 = 18.18…%`를 소수점 첫째 자리로 반올림한 값과 일치합니다. 표본이 11회에 불과하므로 CTR과 평균 게재순위를 일반화하지 않습니다.

확인된 페이지별 표본은 다음과 같습니다.

| 페이지 | 클릭 | 노출 |
| --- | ---: | ---: |
| `https://www.webmemo.xyz/` | 1 | 10 |
| `/ko/use-cases/news-reading` | 1 | 1 |

## 확인된 사실

### 크롤링과 색인 신호

- `https://webmemo.xyz/sitemap.xml`은 308로 `https://www.webmemo.xyz/sitemap.xml`에 이동합니다.
- 최종 sitemap은 HTTP 200과 `application/xml`로 응답하며 `<loc>` 24개를 포함합니다.
- sitemap의 각 로케일 URL에는 `ko`, `en`, `x-default` alternate가 있습니다.
- robots.txt는 `/private/`, `/api/`, `/auth/`를 차단하고 최종 sitemap URL을 선언합니다.
- 인증·도구 화면은 middleware에서 `X-Robots-Tag: noindex, nofollow`를 적용합니다.
- Search Console에서는 최종 www sitemap이 2026-09-18 기준 `가져올 수 없음`, 발견된 페이지 0개로 표시되었습니다.

### 페이지 메타데이터와 구조화 데이터

- 24개 공개 URL에는 페이지별 title, description, canonical, hreflang, Open Graph가 있습니다.
- 상세 페이지의 Twitter Card는 페이지별 metadata가 아니라 공통 제목과 설명을 사용합니다.
- FAQ와 HowTo의 화면 문구와 JSON-LD가 서로 다른 데이터 원천에서 작성됩니다.
- 기능 페이지의 SoftwareApplication JSON-LD는 전역 SoftwareApplication의 `@id`를 참조하지 않고 별도 엔티티를 만듭니다.
- 전역 Organization·SoftwareApplication JSON-LD가 noindex 도구 화면에도 렌더링됩니다.

### 콘텐츠 탐색과 전환

- `/features`와 `/use-cases` 허브 페이지가 없습니다.
- 소개 페이지는 전체 유스케이스 중 developer와 tech-article을 직접 연결하지 않습니다.
- 공개 마케팅 화면의 브랜드 링크가 canonical 소개 페이지가 아니라 noindex 대상인 `/memos`로 이동합니다.
- 상세 기능·유스케이스 페이지에는 소개 페이지 수준의 전체 푸터와 언어 전환 경로가 없습니다.
- 검색 결과에는 Web Memo의 스토어 페이지와 여러 동명 서비스가 함께 노출되어 브랜드 구분이 필요합니다.

### 성능과 문서 정확성

- 공개 랜딩도 인증 앱과 같은 전역 QueryProvider와 사용자 추적 경계를 공유합니다.
- ChannelTalk 컴포넌트는 전역에 배치되지만 SDK 스크립트는 소개·메모 경로와 plugin key 조건을 만족할 때만 로드됩니다.
- 영어 소개 페이지의 초기 HTML도 `<html lang="ko">`로 응답하고 클라이언트에서만 `en`으로 교정합니다.
- sitemap은 실행 시각을 모든 URL의 `lastModified`로 사용하여 실제 콘텐츠 변경 여부와 관계없이 값이 갱신됩니다.

## 가설

아래 내용은 확인된 결함이 아니라 후속 측정이 필요한 가설입니다.

- 공개 랜딩의 전역 Provider와 사용자 추적이 초기 JavaScript 실행 비용을 늘릴 수 있습니다.
- 소개 페이지의 조건부 ChannelTalk SDK가 Core Web Vitals에 영향을 줄 수 있습니다.
- 기능·유스케이스 허브 부재와 일부 직접 링크 누락이 페이지 발견성과 내부 중요도 전달을 약화할 수 있습니다.
- 동명 서비스가 많은 상황에서 일반적인 `Web Memo` 표현만으로는 브랜드 검색 결과를 구분하기 어려울 수 있습니다.
- Search Console sitemap 실패는 제출 URL, 속성 범위, 리다이렉트 처리 또는 일시적인 재수집 상태와 관련될 수 있습니다. 현재 근거만으로 원인을 확정하지 않습니다.

## 상위 개선 과제

### 1. Search Console sitemap 수집 실패 진단

- **Issue**: Search Console에서 최종 www sitemap을 가져오지 못하고 발견 URL이 0개로 표시됩니다.
- **Impact**: sitemap을 통한 24개 공개 URL의 발견·갱신 신호를 확인할 수 없고, 색인 상태 진단의 출발점이 불안정합니다.
- **Evidence**: GSC의 `https://www.webmemo.xyz/` 속성에서 2026-09-18 기준 `가져올 수 없음`, 발견 URL 0개를 확인했습니다. 같은 URL은 공개 네트워크에서 HTTP 200과 유효한 XML로 응답하며 `<loc>` 24개를 포함합니다.
- **Recommendation**: GSC 속성과 제출 URL이 최종 www 호스트로 일치하는지 확인하고, 비-www 308 체인을 거치지 않는 최종 URL을 제출합니다. 재수집 후에도 실패하면 URL 검사와 Google Search 상태를 확인하고, 응답 헤더·본문·접근 로그를 대조합니다.
- **Priority**: P0
- **Done**: GSC sitemap 상태가 `성공`이고 발견된 페이지가 24개 이상으로 표시됩니다.
- **Verify**: GSC의 Sitemaps 화면에서 최종 URL의 상태와 발견 페이지 수를 확인하고, 같은 시각에 `curl -I`와 XML `<loc>` 개수를 다시 확인합니다.

### 2. 콘텐츠 허브와 내부 링크 강화

- **Issue**: 기능과 유스케이스의 전체 허브가 없고, 일부 유스케이스는 소개 페이지에서 직접 연결되지 않습니다. 공개 헤더의 브랜드 링크도 noindex 앱 화면으로 이동합니다.
- **Impact**: 검색엔진과 사용자가 공개 콘텐츠의 전체 구조와 페이지 간 관계를 파악하기 어렵습니다. 검색 방문자가 다른 기능을 탐색하거나 설치 경로로 이동할 기회도 줄어듭니다.
- **Evidence**: `apps/web/src/app/[lng]/(no-auth)/introduce/_components/UseCases/index.tsx`의 소개 링크 목록과 `apps/web/src/app/[lng]/(no-auth)/_constants/landingPage.ts`의 전체 명부가 다릅니다. `apps/web/src/components/Header/HeaderLeft.tsx`의 브랜드 링크는 `/memos`를 사용합니다.
- **Recommendation**: 로케일별 `/features`, `/use-cases` 허브 또는 동일한 역할의 전체 탐색 영역을 추가합니다. 공개 마케팅 화면의 브랜드 링크는 canonical 소개 페이지로 보내고, 상세 페이지에 전체 콘텐츠 탐색과 언어 전환을 제공합니다. 링크는 설명적인 anchor text를 가진 `<a href>` 형태로 유지합니다.
- **Priority**: P1
- **Done**: 24개 색인 대상 URL이 소개 또는 허브에서 3클릭 이내에 도달 가능하고, 각 URL에는 최소 하나의 문맥 있는 내부 링크가 있으며, 공개 헤더의 브랜드 링크가 로케일별 소개 페이지로 이동합니다.
- **Verify**: 크롤러로 공개 링크 그래프를 생성해 고아 페이지가 0개인지 확인하고, 한국어·영어에서 소개→허브→상세 경로와 브랜드 링크를 브라우저로 확인합니다.

### 3. 메타데이터·구조화 데이터 단일 원천화

- **Issue**: 페이지별 metadata 생성이 반복되고 Twitter Card는 공통값에 머뭅니다. FAQ·HowTo 화면과 JSON-LD도 별도 데이터 원천을 사용합니다.
- **Impact**: 화면 문구, 검색 결과 정보, 소셜 공유 정보, 구조화 데이터가 서로 어긋날 수 있습니다. 페이지를 추가하거나 번역을 바꿀 때 누락 가능성이 커집니다.
- **Evidence**: 페이지 metadata 파일은 Open Graph를 재정의하지만 `apps/web/src/app/[lng]/_constants/MetaData.ts`의 공통 Twitter 정보를 그대로 사용합니다. FAQ·HowTo 화면은 번역 JSON을 사용하고 JSON-LD 컴포넌트는 문구를 별도로 보유합니다.
- **Recommendation**: canonical, hreflang, Open Graph, Twitter Card를 함께 만드는 metadata 팩토리를 도입합니다. FAQ·HowTo는 화면과 JSON-LD가 같은 로케일 데이터를 사용하게 하고, 기능 schema는 전역 SoftwareApplication `@id`를 참조합니다. 전역 schema는 공개 마케팅 레이아웃으로 한정합니다. FAQ·HowTo 정합성은 현재 Google 리치 결과 노출이 아니라 데이터 정확성과 유지보수성을 위한 기준으로 관리합니다.
- **Priority**: P1
- **Done**: 24개 공개 URL의 title·description·canonical·hreflang·Open Graph·Twitter Card가 페이지별로 일치하며, 화면 FAQ·HowTo와 JSON-LD의 질문·답변·단계가 동일합니다.
- **Verify**: 한국어·영어 대표 URL의 초기 HTML을 파싱하는 계약 테스트를 실행합니다. 일반 schema는 Schema Markup Validator와 JSON-LD 파싱·화면 대조로 검증하고, 현재 Google이 지원하는 유형만 Rich Results Test로 확인합니다.

### 4. 공개 랜딩 성능 경계 측정

- **Issue**: 공개 랜딩이 인증 앱과 전역 Provider·사용자 추적 경계를 공유하지만, 실제 성능 비용이 측정되지 않았습니다.
- **Impact**: 불필요한 JavaScript나 네트워크 요청이 있다면 검색 방문자의 초기 로딩과 상호작용 경험을 저하시킬 수 있습니다. 다만 현재 실측값이 없어 결함으로 확정할 수 없습니다.
- **Evidence**: `apps/web/src/app/[lng]/layout.tsx`가 공개·인증 라우트에 공통 Provider와 추적 컴포넌트를 배치합니다. ChannelTalk은 전역 마운트되지만 실제 SDK 로드는 소개·메모 경로와 키 조건에 한정됩니다. Core Web Vitals 수치는 미확인입니다.
- **Recommendation**: 소개와 대표 상세 페이지를 모바일 조건에서 측정하고, route별 JavaScript·네트워크 비용을 분석합니다. 비용이 확인된 Provider·추적·SDK만 마케팅 레이아웃에서 분리하거나 지연 로드합니다.
- **Priority**: P1
- **Done**: 소개와 대표 상세 페이지에 LCP ≤ 2.5초, INP ≤ 200ms, CLS ≤ 0.1의 75번째 백분위 목표와 JavaScript 예산이 정의되고, 측정 결과와 가장 큰 비용 항목이 문서화됩니다.
- **Verify**: Search Console 또는 CrUX의 현장 데이터를 우선 확인하고, 데이터가 부족하면 PageSpeed Insights와 Lighthouse의 모바일 반복 측정 및 번들 분석 결과를 비교합니다.

### 5. sitemap 신선도와 SEO 계약 검증

- **Issue**: sitemap의 모든 `lastModified`가 실행 시각으로 바뀌고, 경로 명부와 실제 라우트·metadata·schema의 일치를 자동으로 검증하는 테스트가 없습니다.
- **Impact**: 변경되지 않은 URL도 매 배포마다 갱신된 것처럼 보이며, 새 경로 추가 시 404 URL·canonical·hreflang·schema 드리프트가 배포 전 발견되지 않을 수 있습니다.
- **Evidence**: `apps/web/src/app/sitemap.ts`가 한 번 만든 현재 시각을 모든 URL에 사용합니다. sitemap·robots·canonical·JSON-LD 계약을 검증하는 테스트는 현재 없습니다. `NOINDEX_PATHS`에는 실제 페이지가 없는 `/uninstall`도 남아 있습니다.
- **Recommendation**: 신뢰할 실제 변경일 원천이 없다면 `lastModified`를 생략하고, 필요하면 콘텐츠별 변경일을 명시적으로 관리합니다. sitemap URL 응답, self-canonical, hreflang 왕복, noindex 헤더, 화면과 schema의 일치를 검증하는 테스트를 추가합니다.
- **Priority**: P1
- **Done**: sitemap의 `lastModified`가 실제 변경일과 일치하거나 제거되고, 24개 URL의 200 응답·canonical·hreflang·noindex·schema 계약을 검증하는 테스트가 CI에서 통과합니다.
- **Verify**: sitemap을 두 번 생성해 코드 변경이 없을 때 결과가 동일한지 비교하고, 계약 테스트에 의도적인 404 또는 metadata 불일치를 넣었을 때 실패하는지 확인합니다.

## P2와 후속 점검

### 초기 HTML의 문서 언어 불일치

- **Priority**: P2
- 영어 URL의 초기 HTML도 `<html lang="ko">`로 응답하고 클라이언트에서만 교정됩니다.
- 접근성 도구와 JavaScript를 실행하지 않는 소비자에게 문서 언어가 부정확하게 전달됩니다.
- Google은 페이지 언어 판별에 `lang` 속성을 사용하지 않는다고 안내하므로 SEO P0으로 분류하지 않습니다.
- 후속 작업에서는 URL 로케일과 초기 HTML `lang`이 일치하도록 root layout 경계를 조정하고 응답 HTML 테스트를 추가합니다.

### 추가 점검 목록

- `user-scalable=no`를 제거해 확대를 막지 않도록 검토합니다.
- 전역 Organization·SoftwareApplication schema를 공개 마케팅 영역에 한정합니다.
- feature schema가 전역 SoftwareApplication `@id`를 참조하도록 정리합니다.
- 실제 라우트가 없는 `/uninstall` noindex 명부를 정리합니다.
- 대표 이미지와 OG 이미지의 원본 크기를 번들·네트워크 측정과 함께 점검합니다.

## 코드 근거 지도

| 영역 | 위치 |
| --- | --- |
| 최상위 viewport·정적 html lang | `apps/web/src/app/layout.tsx:20` |
| 로케일 레이아웃·전역 Provider | `apps/web/src/app/[lng]/layout.tsx:14` |
| 클라이언트 html lang 교정 | `apps/web/src/app/[lng]/_components/HtmlLang.tsx:7` |
| robots.txt | `apps/web/src/app/robots.ts:4` |
| sitemap | `apps/web/src/app/sitemap.ts:6` |
| 공통 metadata·Twitter | `apps/web/src/app/[lng]/_constants/MetaData.ts:4` |
| 전역 JSON-LD | `apps/web/src/app/_components/JsonLD/index.tsx:6` |
| FAQ JSON-LD | `apps/web/src/app/[lng]/(no-auth)/introduce/_components/QuestionAndAnswer/FaqJsonLD.tsx:10` |
| 상세 랜딩 내부 링크 | `apps/web/src/app/[lng]/(no-auth)/_components/LandingPageTemplate/index.tsx:186` |
| 브랜드 링크 | `apps/web/src/components/Header/HeaderLeft.tsx:14` |
| noindex 정책 | `apps/web/src/middleware.ts:26` |
| 공개·비공개 경로 명부 | `packages/shared/src/constants/Path.ts:10` |

## 참고 자료

- [Google Search Central: Google 검색의 작동 방식](https://developers.google.com/search/docs/fundamentals/how-search-works)
- [Google Search Central: 링크 권장사항](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
- [Google Search Central: 다국어·다지역 사이트 관리](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [web.dev: Core Web Vitals 기준](https://web.dev/articles/defining-core-web-vitals-thresholds)
- [web.dev: Web Vitals 측정 시작하기](https://web.dev/articles/vitals-measurement-getting-started)
