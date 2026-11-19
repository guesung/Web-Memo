# staging.webmemo.xyz를 Oracle VM으로 돌리고 Cloudflare Access로 막습니다. 노션 DB-1327 5단계.
# Vercel staging은 Vercel SSO(Deployment Protection) 뒤에 있었으므로, 옮긴 뒤에도 공개되지 않게 합니다.

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

locals {
  staging_host = "staging.webmemo.xyz"
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
#  - /.well-known/acme-challenge/: Caddy가 Let's Encrypt 인증서를 갱신(HTTP-01)
resource "cloudflare_zero_trust_access_application" "staging_bypass" {
  for_each = {
    version = "${local.staging_host}/api/version"
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
