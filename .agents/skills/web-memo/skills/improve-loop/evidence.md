# 측정과 증거

## 시간 측정 도구

`benchmark.mjs`는 같은 명령을 서로 다른 두 worktree에서 교대로 실행해 **프로세스 전체 wall time**을 비교한다. Node 표준 라이브러리만 사용한다. 빌드/정해진 배치 작업에 적합하며 웹 요청 지연·메모리·렌더링 시간은 각 대상의 별도 harness가 필요하다.

```bash
node <스킬경로>/scripts/benchmark.mjs \
  --baseline <baseline-worktree> --candidate <candidate-worktree> \
  --output <새로운-측정.json> \
  --samples 7 --warmup 1 --timeout-ms 120000 \
  --min-improvement-percent 5 \
  -- pnpm run build:web
```

- 전제: 같은 기기/Node/pnpm/lockfile/환경/입력. baseline과 candidate를 같은 SHA에서 분리하고 candidate만 수정한다. 의존성 설치/필수 준비는 따로 끝낸다. 동시에 두 측정 작업을 실행하지 않는다.
- cold 측정은 warmup 0만으로 충분하지 않다. 매 실행 전에 해당 worktree의 대상 캐시만 정리하는 동일 wrapper가 필요하다. warm 측정은 양쪽 모두 같은 준비와 warmup을 적용한다. Turbo 원격/공유 캐시 및 Next 빌드 캐시 hit가 다르면 결과를 채택하지 않는다.
- 최소 7쌍; 기본 warmup 1회(양쪽 각각). 실행 순서를 baseline→candidate / candidate→baseline으로 교대한다. 명령은 셸 없이 전달되므로 파이프/캐시 준비는 검사 가능한 별도 wrapper 파일로 작성한다.
- JSON에는 전 샘플, 순서, 중앙값, MAD(중앙 절대 편차), 전후·쌍별 중앙 개선율과 명령이 남는다. 홈 경로는 자동 기록하지 않지만 **명령 인자에 넣은 비밀은 기록될 수 있으므로** 비밀을 인자로 주지 않는다. 실행 실패/timeout은 전체 실패이며 샘플을 버리고 계속하지 않는다. 기존 output은 덮어쓰지 않는다.
- macOS/Linux의 POSIX process group으로 실행하며 timeout 또는 명령 종료 때 같은 group의 하위 프로세스도 정리한다. 부모가 코드 0으로 끝나도 하위 작업이 남으면 미완료 측정으로 실패 처리한다. SIGINT/SIGTERM으로 중단해도 현재 group을 정리한다(SIGKILL은 처리할 수 없음). 별도 세션으로 daemonize/detach하는 명령은 지원하지 않는다. 그런 작업은 후보에서 제외하고, 종료 뒤 잔존 프로세스가 발견되면 후속 측정 전에 `blocked`로 끝낸다.
- 종료 코드: `0` 시간 선별 기준 충족 / `2` 개선 미입증(회귀 포함) / `1` 실행·입력 오류. 도구는 명령 stdout/stderr를 저장하지 않는다. 오류 원인 진단은 별도로 같은 명령을 실행해 비밀을 제거한 로그를 남긴다.
- `improved`: 두 중앙 개선율이 사전 임계값 이상, 최소 80% 쌍에서 단축, 중앙 시간 차이가 양쪽 MAD 중 큰 값의 2배보다 큼. 이는 **선별 휴리스틱이지 통계적 유의성·인과관계 보증이 아니다.** 대표성·cache 정합성·제품 효과·회귀는 별도로 검증한다. 작은 개선을 보여주려고 측정 후 임계값을 낮추지 않는다.

## 다른 지표와 안정성

- 메모리/네트워크/요청 수: 같은 사용자 시나리오·데이터·관측 구간·정리 조건으로 전후를 실행한다. 측정 도구/버전, 모든 반복값, 변동과 성공 임계값을 기록한다. 성공 지표와 주요 보조 지표를 계약에서 먼저 정한다.
- 오류/경쟁 상태/누수: 고정된 fixture/seed 또는 가상 시간으로 baseline 실패를 재현한다. 동일 harness와 assertion이 candidate에서 통과해야 한다. 플래키한 문제는 전후 같은 반복 횟수와 실패 수를 공개하며 1회 통과로 해결이라 하지 않는다.
- 재현 테스트를 candidate에만 추가하고 baseline에서는 아예 실행하지 않는 방식은 전후 증거가 아니다. baseline은 **새 테스트만** 적용하고 구현 수정은 가져오지 않는다. 기존 baseline 회귀 검사는 별도로 정상이어야 한다.
- 모든 결과는 최종 diff와 연결한다. verifier 이후 코드가 바뀌면 기존 증거는 최종 PR의 증거가 아니므로 다시 검증한다.

## 공개 report.md 최소 항목

1. 문제, 후보 선정 근거와 유지한 동작
2. baseline/final SHA, 시도별 가설·변경·결과(실패 포함, 최대 3회)
3. 기기/런타임/명령/fixture/cache/warmup/반복 횟수/사전 임계값
4. 원시 측정 파일과 전후 요약 또는 baseline 실패→candidate 통과 로그
5. lint/typecheck/build/테스트·E2E의 실제 실행 결과, 독립 검증 여부
6. 재현 방법, 보조 지표 회귀, 적용 범위와 한계

경로·명령·결과를 채워 완성한다. 실행하지 않은 항목을 PASS로 채우지 않는다. 사용자 데이터와 시크릿은 증거 자료에 포함하지 않는다.
