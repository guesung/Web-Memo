# Oracle Cloud 직접 배포 (이전 중)

웹(`apps/web`)을 Vercel 대신 Oracle Cloud VM에서 돌리기 위한 서버 구성입니다.
지금은 **트래픽을 받지 않습니다.** 단계별 계획과 결정 근거는 노션 작업 카드
[DB-1327 「웹 서버 Vercel → 직접 배포 설계」](https://app.notion.com/p/Vercel-41c89de02fde815fa965ea236271d42a)에 있습니다.

## 구성

```
Cloudflare(프록시) → VM:80/443 Caddy ─┬─ web-blue:3000
                                      └─ web-green:3000
                     VM alloy ── 컨테이너 로그·지표 ──→ Grafana Cloud (Loki·Prometheus)
Grafana Synthetic Monitoring ── 1분마다 /api/version ──┘ → Grafana Alerting → Slack
```

| 항목 | 값 |
| --- | --- |
| 리전 | `ap-osaka-1` (Japan Central). 무료 계층 홈 영역에 서울·춘천이 없어서 골랐습니다 |
| 셰이프 | `VM.Standard.A1.Flex` 1 OCPU · 4GB (Always Free). 처음엔 6GB였는데 메모리 사용률이 회수 기준 20% 아래(약 19%)로 나와 2026-11-19에 4GB로 줄였습니다 |
| 이미지 | Canonical Ubuntu 24.04 (aarch64) |
| 네트워크 | `webmemo-vcn`의 `public subnet-webmemo-vcn`, 공인 IPv4 |
| 접속 | `deploy@<VM 공인 IP>`, 키 `~/.ssh/webmemo_oci` (레포에 두지 않음) |

## 파일

| 파일 | 하는 일 | 어디서 실행 |
| --- | --- | --- |
| `cloud-init.yaml` | 첫 부팅 때 한 번: 방화벽, Docker, `deploy` 사용자, `/opt/webmemo` | VM 생성 시 콘솔의 Initialization script |
| `compose.yaml` | Caddy + `web-blue` + `web-green` | VM `/opt/webmemo` |
| `caddy/Caddyfile` | 프록시, Cloudflare 신뢰 대역, 두 색 + `/api/health` 헬스체크 | VM (compose가 마운트) |
| `scripts/sync.sh` | compose·Caddy·scripts를 VM에 보내고 `docker compose up` | 로컬 |
| `scripts/lib.sh` | 활성 색 읽기·쓰기, 컨테이너 안 HTTP 확인, 전환 대기 | VM (deploy·rollback이 source) |
| `scripts/deploy.sh` | 대기 색에 새 이미지 기동 → `/api/version` 커밋 확인 → Caddy 전환 | VM (CI가 SSH로 실행) |
| `scripts/rollback.sh` | 트래픽을 직전 색으로 되돌림 | VM (CI `action=rollback`) |
| `alloy/config.alloy` | 컨테이너 로그 → Loki, 호스트·컨테이너 지표 → Prometheus | VM (compose `alloy`, `observability` 프로필) |
| `terraform/grafana/` | 알림 규칙 6종·Slack 연락처·외부 헬스체크 | CI `cd-grafana.yml` (Grafana Cloud) |

VM에만 있고 레포에 없는 것: `/opt/webmemo/.env`(사이트 주소·이미지 태그), `env/web.env`(앱 런타임 환경변수),
`env/alloy.env`(Grafana Cloud 쓰기 자격 증명),
`state/color/active`(지금 트래픽을 받는 색 `blue`·`green`). `sync.sh`는 이 셋을 덮어쓰지 않습니다.

## 왜 이렇게 했나

- **방화벽을 Docker보다 먼저 저장한다.** Oracle Ubuntu 이미지는 `/etc/iptables/rules.v4` 끝의 REJECT로
  22번 외 인바운드를 막습니다. VCN Security List와 별개라 둘 다 열어야 합니다. Docker를 설치한 뒤에
  `netfilter-persistent save`를 하면 Docker가 만든 체인까지 저장돼 재부팅 때 충돌하므로 순서를 고정했습니다.
- **cloud-init은 ASCII만 쓴다.** 설명은 이 README에 둡니다.
- **SSH 키를 레포에 두지 않는다.** 콘솔에서 넣은 키를 `ubuntu` 사용자에서 `deploy`로 복사합니다.
- **클라이언트 IP는 `CF-Connecting-IP`에서 꺼낸다.** Cloudflare 대역만 `trusted_proxies`로 믿습니다.
  안 그러면 앱(`api/openai`)의 rate limit이 모든 사용자를 Cloudflare 엣지 IP 하나로 묶습니다.
  대역이 바뀌면 https://www.cloudflare.com/ips-v4/ , `/ips-v6/` 기준으로 `Caddyfile`을 갱신합니다.
- **활성 색은 파일 하나고, 전환에 `caddy reload`를 쓰지 않는다.** Caddy는 두 색을 모두 upstream으로 두고 1초마다
  `/api/health`를 확인해 200인 쪽으로만 보냅니다. 앱은 자기 `DEPLOY_COLOR`와 `state/color/active`가 같을 때만 200,
  아니면 503을 돌려줍니다. 처음엔 upstream 파일을 바꾸고 `caddy reload` 했는데, 리로드는 서버를 갈아끼우는 순간
  들어온 요청을 끊었습니다(전환마다 1건, `Empty reply from server`). 그래서 설정은 고정하고 파일만 바꿉니다.
  둘 다 준비 전인 짧은 순간은 `lb_try_duration 5s`가 기다려 줍니다.
- **회수 대비.** 7일간 CPU·네트워크·메모리 95백분위가 모두 20% 미만이면 Oracle이 회수할 수 있습니다.
  1 OCPU·4GB로 작게 잡아 상시 메모리 사용률이 20%를 넘게 하고(6GB에서는 약 19%였음, Grafana `회수 위험` 알림으로 감시), 회수돼도 아래 절차로 다시 만듭니다.

## VM을 처음부터 다시 만들기

1. 콘솔 → Compute → Create instance
   - 이미지 Ubuntu 24.04, 셰이프 Ampere `VM.Standard.A1.Flex` 1 OCPU · 4GB
   - Advanced options → Initialization script에 `cloud-init.yaml` 업로드
   - 네트워크 `webmemo-vcn` / `public subnet-webmemo-vcn`, 공인 IPv4 자동 할당
   - SSH 키 `~/.ssh/webmemo_oci.pub` 업로드
   - 화면에 "API Error"만 나오면 대부분 `Out of host capacity`(무료 A1 자리 없음)입니다. 시간을 두고 다시 시도합니다
   - 콘솔 대신 `scripts/launch-vm.sh`(OCI CLI)로도 만들 수 있습니다. 자리가 없으면 `RESULT=capacity`로 끝납니다.
     `.github/workflows/chore-oracle-vm-retry.yml`이 10분마다 이 스크립트를 불러, 만들어지면 Slack으로 공인 IP를 알리고
     스스로 꺼집니다. 회수돼 다시 만들 때는 Actions에서 이 워크플로를 다시 켭니다. 인증은 GitHub Secrets `OCI_CLI_*`·`ORACLE_SSH_PUBLIC_KEY`입니다
2. VCN 기본 Security List에 인바운드 TCP 80·443(소스 `0.0.0.0/0`) 추가
3. cloud-init 완료 확인: `ssh -i ~/.ssh/webmemo_oci ubuntu@<IP> cloud-init status --wait`
4. `infra/oracle/scripts/sync.sh deploy@<IP>`
5. `curl http://<IP>/` 가 확인용 whoami 응답을 돌려주면 끝입니다

## 배포 (CI)

`.github/workflows/cd-web-oracle.yml`이 맡습니다. 지금은 staging만 대상이고 도메인은 아직 VM을 가리키지 않습니다.

```
vercel pull(Preview) → arm64 이미지 빌드(ubuntu-24.04-arm) → ghcr.io/guesung/web-memo-web:staging-<sha>
  → compose·Caddy·scripts와 env/web.env를 VM에 rsync → scripts/deploy.sh
```

- **staged·promote**: `deploy.sh`가 대기 색만 새 이미지로 다시 띄우고, 컨테이너 안에서 `/api/version`의 `commit`이
  배포한 SHA와 같아질 때까지(최대 120초) 기다린 뒤 `state/color/active`를 바꿉니다. Caddy는 다음 헬스체크(1초)에서 따라옵니다.
  Caddyfile이 바뀐 배포에서만 한 번 `caddy reload` 합니다.
  확인이 안 되면 전환하지 않고 실패합니다. 트래픽은 이전 색에 그대로 있습니다.
- **이전 색은 멈추지 않습니다.** 롤백은 활성 색 파일만 되돌리면 되므로 즉시 끝나고, 이전 색은 다음 배포 때 교체됩니다.
  두 색이 함께 떠 있어도 4GB 안에 들어갑니다(두 색 합쳐 약 450MB).
- **롤백**: Actions에서 `CD - Web (Oracle Cloud)`를 `action=rollback`으로 실행합니다.
- **환경변수**: Vercel Preview 값을 받아 `VERCEL*` 표식만 빼고 빌드 secret과 VM `env/web.env`로 씁니다.
- **켜기**: VM을 만든 뒤 GitHub Secrets `ORACLE_SSH_HOST`·`ORACLE_SSH_KEY`·`ORACLE_SSH_KNOWN_HOSTS`를 등록하고,
  저장소 변수 `ORACLE_DEPLOY_ENABLED=true`로 두면 develop 푸시마다 `ci.yml`이 함께 부릅니다. 켜기 전에는
  Actions에서 수동 실행(`action=deploy`)으로 먼저 확인합니다.

## 관측·알림

Vercel 무료 플랜에서 받지 못하던 플랫폼 레벨 오류(타임아웃·크래시·서버 다운)를 Slack으로 받기 위한 구성입니다.

- **수집(`alloy`)**: docker 소켓으로 모든 컨테이너 로그를 Loki로 보냅니다(`service`·`color` 라벨). Caddy 접근 로그가
  JSON이라 앱이 죽어 Caddy가 낸 502·504도 `status`로 잡힙니다. 지표는 unix·cadvisor exporter에서 알림에 쓰는 것만
  남겨(`keep_metrics`) 무료 티어 시리즈 한도를 지킵니다. `env/alloy.env`가 없으면 `deploy.sh`가 alloy를 띄우지 않고,
  수집기가 실패해도 배포는 막지 않습니다.
- **알림(`terraform/grafana`)**: 5xx 급증, OOM, 메모리 85% 초과, 회수 위험(24시간 평균 메모리 22% 미만),
  외부 헬스체크 실패, 수집 끊김. 모두 `webmemo-slack` 연락처(기존 `SLACK_WEBHOOK_URL`)로 갑니다.
  회수 위험은 Oracle이 7일간 CPU·네트워크·메모리가 모두 20% 미만인 Always Free 인스턴스를 회수할 수 있어서 둡니다.
- **적용**: `cd-grafana.yml`이 PR에서는 `plan`만, develop 푸시·수동 실행에서 `apply` 합니다. state는 Oracle Object
  Storage 버킷(`TF_STATE_*`)에 있습니다. 잠금을 쓰지 않으니 로컬에서 apply 하지 말고 워크플로로 적용합니다.
- **UI에서 고치지 않습니다.** 고치면 다음 `plan`에서 코드 기준으로 되돌아갑니다.
