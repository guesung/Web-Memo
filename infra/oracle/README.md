# Oracle Cloud 직접 배포 (이전 중)

웹(`apps/web`)을 Vercel 대신 Oracle Cloud VM에서 돌리기 위한 서버 구성입니다.
지금은 **트래픽을 받지 않습니다.** 단계별 계획과 결정 근거는 노션 작업 카드
[DB-1327 「웹 서버 Vercel → 직접 배포 설계」](https://app.notion.com/p/Vercel-41c89de02fde815fa965ea236271d42a)에 있습니다.

## 구성

```
Cloudflare(프록시) → VM:80/443 Caddy ─┬─ web-blue:3000
                                      └─ web-green:3000
```

| 항목 | 값 |
| --- | --- |
| 리전 | `ap-osaka-1` (Japan Central). 무료 계층 홈 영역에 서울·춘천이 없어서 골랐습니다 |
| 셰이프 | `VM.Standard.A1.Flex` 1 OCPU · 6GB (Always Free) |
| 이미지 | Canonical Ubuntu 24.04 (aarch64) |
| 네트워크 | `webmemo-vcn`의 `public subnet-webmemo-vcn`, 공인 IPv4 |
| 접속 | `deploy@<VM 공인 IP>`, 키 `~/.ssh/webmemo_oci` (레포에 두지 않음) |

## 파일

| 파일 | 하는 일 | 어디서 실행 |
| --- | --- | --- |
| `cloud-init.yaml` | 첫 부팅 때 한 번: 방화벽, Docker, `deploy` 사용자, `/opt/webmemo` | VM 생성 시 콘솔의 Initialization script |
| `compose.yaml` | Caddy + `web-blue` + `web-green` | VM `/opt/webmemo` |
| `caddy/Caddyfile` | 프록시, Cloudflare 신뢰 대역, 활성 색 import | VM (compose가 마운트) |
| `scripts/sync.sh` | 위 두 파일을 VM에 보내고 `docker compose up` | 로컬·CI |

VM에만 있고 레포에 없는 것: `/opt/webmemo/.env`(사이트 주소·이미지 태그), `env/web.env`(앱 런타임 환경변수),
`state/active/upstream.caddy`(지금 트래픽을 받는 색). `sync.sh`는 이 셋을 덮어쓰지 않습니다.

## 왜 이렇게 했나

- **방화벽을 Docker보다 먼저 저장한다.** Oracle Ubuntu 이미지는 `/etc/iptables/rules.v4` 끝의 REJECT로
  22번 외 인바운드를 막습니다. VCN Security List와 별개라 둘 다 열어야 합니다. Docker를 설치한 뒤에
  `netfilter-persistent save`를 하면 Docker가 만든 체인까지 저장돼 재부팅 때 충돌하므로 순서를 고정했습니다.
- **cloud-init은 ASCII만 쓴다.** 설명은 이 README에 둡니다.
- **SSH 키를 레포에 두지 않는다.** 콘솔에서 넣은 키를 `ubuntu` 사용자에서 `deploy`로 복사합니다.
- **클라이언트 IP는 `CF-Connecting-IP`에서 꺼낸다.** Cloudflare 대역만 `trusted_proxies`로 믿습니다.
  안 그러면 앱(`api/openai`)의 rate limit이 모든 사용자를 Cloudflare 엣지 IP 하나로 묶습니다.
  대역이 바뀌면 https://www.cloudflare.com/ips-v4/ , `/ips-v6/` 기준으로 `Caddyfile`을 갱신합니다.
- **활성 색은 파일 하나다.** blue-green 전환은 `state/active/upstream.caddy`를 바꾸고 `caddy reload`만 하면 됩니다.
- **회수 대비.** 7일간 CPU·네트워크·메모리 95백분위가 모두 20% 미만이면 Oracle이 회수할 수 있습니다.
  1 OCPU·6GB로 작게 잡아 상시 메모리 사용률이 20%를 넘게 하고, 회수돼도 아래 절차로 다시 만듭니다.

## VM을 처음부터 다시 만들기

1. 콘솔 → Compute → Create instance
   - 이미지 Ubuntu 24.04, 셰이프 Ampere `VM.Standard.A1.Flex` 1 OCPU · 6GB
   - Advanced options → Initialization script에 `cloud-init.yaml` 업로드
   - 네트워크 `webmemo-vcn` / `public subnet-webmemo-vcn`, 공인 IPv4 자동 할당
   - SSH 키 `~/.ssh/webmemo_oci.pub` 업로드
   - 화면에 "API Error"만 나오면 대부분 `Out of host capacity`(무료 A1 자리 없음)입니다. 시간을 두고 다시 시도합니다
2. VCN 기본 Security List에 인바운드 TCP 80·443(소스 `0.0.0.0/0`) 추가
3. cloud-init 완료 확인: `ssh -i ~/.ssh/webmemo_oci ubuntu@<IP> cloud-init status --wait`
4. `infra/oracle/scripts/sync.sh deploy@<IP>`
5. `curl http://<IP>/` 가 확인용 whoami 응답을 돌려주면 끝입니다
