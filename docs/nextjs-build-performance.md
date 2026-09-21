# Next.js 14 → 16 빌드 성능 측정

> **한 줄 결론:** Next.js 16 webpack에서는 개선을 관측하지 못했고, Next.js 16 Turbopack은 Next.js 14 webpack 대비 warm CI `Vercel Build` 중앙값을 **55.4% 단축**했습니다.

이 결과는 변수를 통제한 벤치마크가 아니라, `master` 배포 과정에서 수집한 **운영 CI 관측치**입니다. 프레임워크와 번들러 전환이 빌드 시간 차이를 단독으로 유발했다고 해석해서는 안 됩니다.

## 측정 정의

- 주 지표는 GitHub Actions `ci.yml` 워크플로의 `cd-web` job에서 **Vercel Build step이 성공하는 데 걸린 시간**입니다.
- 전체 job 시간은 의존성 설치, 대기, 배포 등을 포함하므로 비교에서 제외했습니다.
- `Turbo` 시간은 동일 step 로그에 표시된 Turbo task 소요 시간으로, 주 지표를 보조하는 값입니다.
- `warm`은 해당 Next.js 버전·번들러 조합의 캐시를 복원한 성공 실행을 뜻합니다. 전환 첫 실행은 이전 Next.js 버전 또는 번들러의 캐시를 복원했으므로 별도 표본으로 분리했습니다.
- 표준편차는 표본 표준편차입니다. 소수점 표본 중앙값은 두 값의 평균을 쓰고, 표에서는 초 단위로 표시했습니다.

## 비교 구간과 전환 이력

| 구간 | 기준 SHA·PR | 실행 방식 |
| --- | --- | --- |
| Next.js 14 webpack | 마지막 `master` SHA `634ae91d8` (Next.js 14.2.10) | `next build` |
| Next.js 16 webpack | 핵심 `432d28376`, [PR #511](https://github.com/guesung/Web-Memo/pull/511), merge `665a8acb8`; stacked PR #511을 포함한 [PR #510](https://github.com/guesung/Web-Memo/pull/510) merge `c5cd9336e`가 `master`의 Next.js 16 결과 | Next.js 16.3.5 + `next build --webpack` |
| Next.js 16 Turbopack | 개발 서버 Turbopack 전환 `40b18bfc7`([PR #513](https://github.com/guesung/Web-Memo/pull/513)), 프로덕션 빌드 전환 `2be36a1f7`, [PR #514](https://github.com/guesung/Web-Memo/pull/514), merge `d685ad5bb` | Next.js 16.3.5 기본 Turbopack 빌드 |

PR #511은 Next.js 16 업그레이드를 webpack으로 고정했고, PR #514는 프로덕션 빌드를 Turbopack으로 전환했습니다. 따라서 Next.js 버전 전환과 번들러 전환을 세 구간으로 나누어 관측했습니다.

## 결과

### 주 통계

| 구간 | 표본 | Vercel Build 중앙값 | 범위 | 표본 표준편차 |
| --- | ---: | ---: | ---: | ---: |
| Next.js 14 webpack warm | 3 | 56초 | 46–57초 | 6.08초 |
| Next.js 16 webpack warm, attempt 1만 | 2 | 71초 | 70–72초 | 1.41초 |
| Next.js 16 webpack warm, 재실행 포함 | 3 | 70초 | 67–72초 | 2.52초 |
| Next.js 16 Turbopack warm | 5 | 25초 | 22–30초 | 3.78초 |

attempt 1 기준의 주 비교는 다음과 같습니다.

- Next.js 14 webpack → Next.js 16 webpack: `56초 → 71초`, **26.8% 증가**했습니다. 이 표본에서는 Next.js 16 webpack의 개선을 관측하지 못했습니다.
- Next.js 14 webpack → Next.js 16 Turbopack: `56초 → 25초`, **55.4% 단축**됐습니다.
- Next.js 16 webpack → Next.js 16 Turbopack: `71초 → 25초`, **64.8% 단축**됐습니다.
- Next.js 16 webpack에 재실행을 포함하면 중앙값은 70초입니다. 이 보조 분석에서도 Turbopack 25초와의 차이는 크게 유지됩니다.

증감률은 `(Next.js 16 - 비교 기준) / 비교 기준 × 100`으로 계산했습니다. 단축률은 같은 값의 부호를 반대로 표시했습니다.

### 원시 실행

| 구간 | GitHub Actions | Attempt | Vercel Build | Turbo | 비고 |
| --- | --- | ---: | ---: | ---: | --- |
| Next.js 14 webpack warm | [run 35413822269 / job 105818524390](https://github.com/guesung/Web-Memo/actions/runs/35413822269/job/105818524390) | 1 | 56초 | 49.914초 | 기존 Next.js 14 캐시 |
| Next.js 14 webpack warm | [run 35415192412 / job 105822449181](https://github.com/guesung/Web-Memo/actions/runs/35415192412/job/105822449181) | 1 | 57초 | 51.897초 | 기존 Next.js 14 캐시 |
| Next.js 14 webpack warm | [run 35415445448 / job 105825539506](https://github.com/guesung/Web-Memo/actions/runs/35415445448/job/105825539506) | 1 | 46초 | 42.443초 | 기존 Next.js 14 캐시 |
| Next.js 16 webpack 전환 | [run 35419998600 / job 105835845346](https://github.com/guesung/Web-Memo/actions/runs/35419998600/job/105835845346) | 1 | 104초 | 96.880초 | 이전 Next.js 14 캐시 복원; 전환 표본으로 별도 취급 |
| Next.js 16 webpack warm | [run 35420263880 / job 105839566658](https://github.com/guesung/Web-Memo/actions/runs/35420263880/job/105839566658) | 1 | 72초 | 65.709초 | attempt 1 주 표본 |
| Next.js 16 webpack warm | [run 35477379622 / job 105988969853](https://github.com/guesung/Web-Memo/actions/runs/35477379622/job/105988969853) | 1 | 70초 | 62.572초 | attempt 1 주 표본 |
| Next.js 16 webpack warm | [run 35477383899 / job 105993114987](https://github.com/guesung/Web-Memo/actions/runs/35477383899/job/105993114987) | 2 | 67초 | 59.829초 | 재실행; 민감도 분석용 보조 표본 |
| Next.js 16 Turbopack 전환 | [run 35478388757 / job 105992441498](https://github.com/guesung/Web-Memo/actions/runs/35478388757/job/105992441498) | 2 | 43초 | 37.552초 | webpack 캐시 복원; 전환 표본으로 별도 취급 |
| Next.js 16 Turbopack warm | [run 35479684723 / job 105995202382](https://github.com/guesung/Web-Memo/actions/runs/35479684723/job/105995202382) | 1 | 22초 | 15.400초 | warm 표본 |
| Next.js 16 Turbopack warm | [run 35480065849 / job 105996250378](https://github.com/guesung/Web-Memo/actions/runs/35480065849/job/105996250378) | 1 | 22초 | 17.900초 | warm 표본 |
| Next.js 16 Turbopack warm | [run 35481851991 / job 106001068782](https://github.com/guesung/Web-Memo/actions/runs/35481851991/job/106001068782) | 1 | 29초 | 24.492초 | warm 표본 |
| Next.js 16 Turbopack warm | [run 35482116909 / job 106001775811](https://github.com/guesung/Web-Memo/actions/runs/35482116909/job/106001775811) | 1 | 30초 | 24.218초 | warm 표본 |
| Next.js 16 Turbopack warm | [run 35482651900 / job 106003253638](https://github.com/guesung/Web-Memo/actions/runs/35482651900/job/106003253638) | 1 | 25초 | 20.009초 | warm 표본 |

Next.js 16 webpack 전환 표본 104초와 Next.js 16 Turbopack 전환 표본 43초는 cold build가 아닙니다. 각각 이전 Next.js 버전 또는 번들러의 캐시를 복원한 fallback 상태이므로, warm 중앙값 계산에서 제외했습니다.

## 통제된 조건과 표본 선정

비교 표본은 다음 조건을 공통으로 만족합니다.

- `master` push로 실행된 `ci.yml` 워크플로의 `cd-web` job입니다.
- Vercel Build step이 성공했으며, Next.js build cache가 복원됐습니다.
- Turbo 로그는 모두 `Cached 0/3`으로, Turbo task cache hit가 없었습니다.
- Node.js 24.20.0과 Vercel CLI 59.23.2를 사용했습니다.
- 대표 runner는 `ubuntu-24.04`, runner image는 `20260907.300.1`입니다.
- 실패·취소·skip 실행, Turbo task cache hit, Next.js·번들러 버전을 확인할 수 없는 실행은 제외했습니다.
- attempt 2 재실행은 주 비교에서 제외하고 전환 표본 또는 민감도 분석에만 표시했습니다.

## 교란 변수와 한계

세 구간은 같은 코드를 서로 다른 번들러로 반복 실행한 대조 실험이 아닙니다. 시간이 지나며 다음 요인도 함께 바뀌었습니다.

- 애플리케이션 코드와 lockfile이 달라졌습니다.
- Sentry 설정과 소스맵 처리가 변경됐습니다.
- `optimizePackageImports`를 포함한 Next.js 설정이 변경됐습니다.
- GitHub-hosted runner의 실제 하드웨어·네트워크 부하를 고정하지 못했고, 구간별 표본 수도 2–5건으로 적습니다.
- Next.js 16 webpack의 첫 실행 표본은 2건이며, 재실행을 포함하는지에 따라 집계가 달라집니다.

따라서 수치는 이 저장소의 실제 CI에서 Turbopack 전환 이후 빌드 step이 빨라졌다는 운영 신호로 볼 수 있습니다. 다만 Next.js 16이나 Turbopack의 순수한 인과 효과 크기로 일반화할 수는 없습니다.

## 해석과 후속 권고

1. **Next.js 16 업그레이드만으로는 빌드 개선을 확인하지 못했습니다.** webpack 구간의 warm 중앙값은 56초에서 71초로 늘었습니다.
2. **현재 운영 CI에서는 Next.js 16 Turbopack을 유지할 근거가 충분합니다.** 5건의 warm 표본이 모두 Next.js 14 webpack의 46–57초 범위보다 짧은 22–30초였습니다.
3. 효과를 번들러의 인과로 분리해야 한다면 동일 SHA와 lockfile에서 `next build --webpack`과 기본 Turbopack 빌드를 각각 여러 번 실행해야 합니다. 두 빌드 사이에서는 생성물과 번들러 캐시를 분리하고, runner·Node.js·Vercel CLI·환경 변수를 고정해야 합니다.
4. 운영 추세를 계속 볼 때는 각 배포의 `Vercel Build` 시간과 번들러·캐시 상태를 구조화해 남기고, 최근 여러 건의 중앙값을 이동 기준으로 추적하는 방법이 적합합니다.
