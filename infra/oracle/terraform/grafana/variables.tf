variable "grafana_url" {
  description = "Grafana Cloud 스택 주소 (예: https://<stack>.grafana.net)"
  type        = string
}

variable "grafana_auth" {
  description = "알림 규칙·연락처·폴더를 쓸 수 있는 서비스 계정 토큰"
  type        = string
  sensitive   = true
}

variable "sm_url" {
  description = "Synthetic Monitoring API 주소 (스택 리전별, 예: https://synthetic-monitoring-api-<region>.grafana.net)"
  type        = string
}

variable "sm_access_token" {
  description = "Synthetic Monitoring 액세스 토큰"
  type        = string
  sensitive   = true
}

variable "slack_webhook_url" {
  description = "알림을 받을 Slack Incoming Webhook (기존 SLACK_WEBHOOK_URL)"
  type        = string
  sensitive   = true
}

variable "prometheus_datasource_uid" {
  description = "Grafana Cloud 기본 Prometheus 데이터 소스 UID (grafanacloud-<stack>-prom)"
  type        = string
}

variable "loki_datasource_uid" {
  description = "Grafana Cloud 기본 Loki 데이터 소스 UID (grafanacloud-<stack>-logs)"
  type        = string
}

variable "health_check_target" {
  description = "외부 헬스체크 대상. 5단계에서 staging 도메인으로 바꿉니다"
  type        = string
  default     = "http://161.33.33.168/api/version"
}

variable "probe_names" {
  description = "헬스체크를 돌릴 공개 프로브 이름 (VM이 오사카라 가까운 곳)"
  type        = list(string)
  default     = ["Tokyo"]
}
