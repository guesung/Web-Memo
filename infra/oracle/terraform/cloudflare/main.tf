# staging.webmemo.xyz를 Oracle VM으로 돌리고 Cloudflare Access로 막습니다. 노션 DB-1327 5단계.
# Vercel staging은 Vercel SSO(Deployment Protection) 뒤에 있었으므로, 옮긴 뒤에도 공개되지 않게 합니다.

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

locals {
  staging_host = "staging.webmemo.xyz"
  edge_cache   = jsondecode(file("${path.module}/../../edge-cache-paths.json"))
  edge_cache_paths = sort(flatten([
    for lng in local.edge_cache.languages : [for p in local.edge_cache.paths : "/${lng}${p}"]
  ]))
  staging_record = {
    oracle = { type = "A", content = var.oracle_vm_ip }
    vercel = { type = "CNAME", content = "87eaac8c58fd77ba.vercel-dns-017.com" }
  }[var.staging_target]
}

# ---------- DNS ----------
# 원래 대시보드에서 만든 Vercel CNAME 레코드를 가져와 관리합니다.
import {
  to = cloudflare_dns_record.staging
  id = "${var.zone_id}/5ae4c0c1f8d8f48c134c76555fbdce9a"
}

resource "cloudflare_dns_record" "staging" {
  zone_id = var.zone_id
  name    = local.staging_host
  type    = local.staging_record.type
  content = local.staging_record.content
  # Vercel로 되돌릴 때는 Vercel이 인증서를 직접 받아야 해서 프록시를 끕니다
  proxied = var.staging_target == "oracle" ? var.staging_proxied : false
  ttl     = 1
  comment = "Terraform(infra/oracle/terraform/cloudflare)이 관리. 수동 수정 금지"
}

# 프록시를 켠 레코드는 Cloudflare→VM 구간도 인증서를 검증하게 합니다(Caddy가 Let's Encrypt 인증서를 가짐).
# 지금 프록시를 켠 레코드는 staging뿐이라 다른 레코드에는 영향이 없습니다.
# API 서버(apps/api). Supabase 웹훅만 부르므로 Access를 걸지 않습니다(호출자는 앱이 공유 비밀 헤더로 확인).
resource "cloudflare_dns_record" "api" {
  zone_id = var.zone_id
  name    = "api.webmemo.xyz"
  type    = "A"
  content = var.oracle_vm_ip
  proxied = var.api_proxied
  ttl     = 1
  comment = "Terraform(infra/oracle/terraform/cloudflare)이 관리. 수동 수정 금지"
}

resource "cloudflare_zone_setting" "ssl" {
  zone_id    = var.zone_id
  setting_id = "ssl"
  value      = "strict"
}

# ---------- Access ----------
resource "cloudflare_zero_trust_access_application" "staging" {
  account_id       = var.account_id
  name             = "webmemo staging"
  domain           = local.staging_host
  type             = "self_hosted"
  session_duration = "720h"
  # 확장(chrome-extension://)의 CORS preflight는 쿠키를 싣지 않아 Access에 막힙니다
  options_preflight_bypass = true

  policies = [
    {
      name       = "허용 이메일"
      decision   = "allow"
      precedence = 1
      include    = [for email in var.staging_allowed_emails : { email = { email = email } }]
    },
  ]
}

# Access를 거치지 않아도 되는 경로. 경로가 더 구체적인 앱이 우선합니다.
#  - /api/version: 외부 헬스체크(Synthetic Monitoring)가 로그인 없이 확인
#  - /api/health: 요청마다 함수가 실행되는 경로라 Vercel 운영과 유휴 후 첫 요청 지연을 같은 방식으로 비교. 응답은 ok와 blue/green 색뿐
#  - /.well-known/acme-challenge/: Caddy가 Let's Encrypt 인증서를 갱신(HTTP-01)
resource "cloudflare_zero_trust_access_application" "staging_bypass" {
  for_each = {
    version = "${local.staging_host}/api/version"
    health  = "${local.staging_host}/api/health"
    acme    = "${local.staging_host}/.well-known/acme-challenge/*"
  }

  account_id = var.account_id
  name       = "webmemo staging bypass (${each.key})"
  domain     = each.value
  type       = "self_hosted"

  policies = [
    {
      name       = "모두 통과"
      decision   = "bypass"
      precedence = 1
      include    = [{ everyone = {} }]
    },
  ]
}

# ---------- 엣지 캐시 ----------
# Cloudflare는 기본으로 HTML을 캐시하지 않습니다. 빌드 때 미리 만든 공개 페이지만 엣지에서 서빙해
# 오사카 VM·미들웨어를 거치지 않게 합니다. TTL은 앱이 보내는 s-maxage(1시간)를 따르고,
# 배포·롤백 뒤에는 cd-web-oracle.yml이 같은 URL을 비웁니다(옛 HTML이 없는 JS 파일을 부르지 않게).
# 쿼리가 있거나 RSC 요청(클라이언트 이동 시 같은 경로로 RSC 페이로드를 받음)은 캐시하지 않습니다.
resource "cloudflare_ruleset" "cache" {
  zone_id     = var.zone_id
  name        = "webmemo cache rules"
  description = "Terraform(infra/oracle/terraform/cloudflare)이 관리"
  kind        = "zone"
  phase       = "http_request_cache_settings"

  rules = [
    {
      ref         = "staging_static_html"
      description = "staging 공개 정적 페이지 HTML 캐시"
      expression = join(" and ", [
        "http.host eq \"${local.staging_host}\"",
        # PURGE를 넣지 않으면 비우기 요청이 이 규칙과 매칭되지 않아 API가 200이어도 캐시가 남습니다(Cloudflare 문서)
        "http.request.method in {\"GET\" \"HEAD\" \"PURGE\"}",
        "http.request.uri.query eq \"\"",
        "not any(http.request.headers[\"rsc\"][*] eq \"1\")",
        "http.request.uri.path in {${join(" ", [for p in local.edge_cache_paths : "\"${p}\""])}}",
      ])
      action = "set_cache_settings"
      action_parameters = {
        cache       = true
        edge_ttl    = { mode = "respect_origin" }
        browser_ttl = { mode = "respect_origin" }
      }
    },
    {
      # 경로에 확장자가 없어 Cloudflare 기본 규칙(확장자 기준)에서 빠집니다. 쿼리(url·w·q)가 캐시 키에 들어가
      # 크기별로 따로 저장됩니다. TTL은 앱이 보내는 max-age(4시간). Next가 Accept로 포맷을 고르지만
      # images.formats 기본값이 webp 하나라 Cloudflare가 Vary: Accept를 무시해도 영향이 작습니다.
      # URL이 원본마다 달라 배포 때 목록으로 비우지 않습니다 — 원본을 바꾸면 최대 4시간 옛 이미지가 보일 수 있습니다.
      ref         = "staging_next_image"
      description = "staging Next 이미지 최적화 응답 캐시"
      expression = join(" and ", [
        "http.host eq \"${local.staging_host}\"",
        "http.request.method in {\"GET\" \"HEAD\" \"PURGE\"}",
        "http.request.uri.path eq \"/_next/image\"",
      ])
      action = "set_cache_settings"
      action_parameters = {
        cache       = true
        edge_ttl    = { mode = "respect_origin" }
        browser_ttl = { mode = "respect_origin" }
      }
    },
  ]
}

# Cloudflare가 HTML의 이메일 주소를 __cf_email__로 바꾸고 email-decode 스크립트를 끼워 넣습니다.
# 서버 HTML과 React 렌더 결과가 달라질 수 있어 끕니다(2026-11-19 확인 시 hydration 오류는 없었음).
# 존 전체 설정이지만 지금 프록시를 켠 레코드는 staging뿐입니다.
resource "cloudflare_zone_setting" "email_obfuscation" {
  zone_id    = var.zone_id
  setting_id = "email_obfuscation"
  value      = "off"
}
