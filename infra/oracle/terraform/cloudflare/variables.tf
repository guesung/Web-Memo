variable "cloudflare_api_token" {
  description = "Zone DNS·Zone Settings 편집(webmemo.xyz)과 Access 앱·정책 편집 권한만 가진 API 토큰"
  type        = string
  sensitive   = true
}

variable "account_id" {
  description = "Cloudflare 계정 ID"
  type        = string
}

variable "zone_id" {
  description = "webmemo.xyz zone ID"
  type        = string
}

variable "staging_allowed_emails" {
  description = "staging에 Access로 들어갈 수 있는 이메일. 공개 레포라 Secret으로 넘깁니다"
  type        = list(string)
  sensitive   = true
}

variable "staging_target" {
  description = <<-EOT
    staging이 가리킬 곳. "oracle"이면 VM(A 레코드), "vercel"이면 예전 Vercel CNAME(롤백).
  EOT
  type        = string
  default     = "oracle"

  validation {
    condition     = contains(["oracle", "vercel"], var.staging_target)
    error_message = "staging_target은 oracle 또는 vercel이어야 합니다."
  }
}

variable "staging_proxied" {
  description = "Cloudflare 프록시(=Access 적용) 여부. Caddy가 인증서를 처음 받을 때만 잠깐 false로 둡니다"
  type        = bool
  # VM을 새로 만들어 Caddy가 첫 인증서를 받아야 할 때만 잠깐 false로 바꿉니다(README 「staging」 참고)
  default = true
}

variable "oracle_vm_ip" {
  description = "Oracle VM 공인 IP"
  type        = string
  default     = "161.33.33.168"
}

variable "api_proxied" {
  description = "api.webmemo.xyz의 Cloudflare 프록시 여부. Caddy가 첫 인증서를 받을 때까지 false로 둡니다"
  type        = bool
  # 처음엔 false로 DNS만 VM으로 돌려 Caddy가 인증서를 받게 하고, 받은 뒤 true로 켭니다(README 「API」 참고).
  # false인 동안은 Caddy가 Cloudflare 밖 연결을 403으로 막으므로 외부에서 API를 부를 수 없습니다.
  default = false
}
