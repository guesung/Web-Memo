# Oracle VM(webmemo-1) 관측 알림. 노션 DB-1327 4단계.
# 수집은 infra/oracle/alloy/config.alloy(로그·지표)와 아래 Synthetic 체크(외부 헬스체크)가 하고,
# 여기서는 그 데이터로 알림 규칙을 만들어 Slack으로 보냅니다.

provider "grafana" {
  url             = var.grafana_url
  auth            = var.grafana_auth
  sm_url          = var.sm_url
  sm_access_token = var.sm_access_token
}

resource "grafana_folder" "webmemo" {
  uid   = "webmemo"
  title = "Web Memo"
}

resource "grafana_contact_point" "slack" {
  name = "webmemo-slack"

  slack {
    url   = var.slack_webhook_url
    title = "{{ if eq .Status \"firing\" }}🔴{{ else }}✅{{ end }} {{ .CommonLabels.alertname }}"
    text  = "{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}"
  }
}

# ---------- 외부 헬스체크 ----------
data "grafana_synthetic_monitoring_probes" "public" {}

resource "grafana_synthetic_monitoring_check" "staging" {
  job     = "webmemo-staging"
  target  = var.health_check_target
  enabled = true
  # 1분 간격 × 프로브 1개 ≈ 월 4.4만 회
  frequency          = 60000
  timeout            = 10000
  basic_metrics_only = true
  probes             = [for name in var.probe_names : data.grafana_synthetic_monitoring_probes.public.probes[name]]
  labels = {
    service = "webmemo"
  }

  settings {
    http {
      method             = "GET"
      ip_version         = "V4"
      valid_status_codes = [200]
    }
  }
}

# 비교 기준: 운영(Vercel) 응답 시간. 5단계 관찰 동안 VM(오사카)과 Vercel(서울 icn1)을 같은 프로브로 나란히 봅니다.
# 알림은 걸지 않습니다. 실행 횟수를 아끼려고 2분 간격입니다.
resource "grafana_synthetic_monitoring_check" "production_baseline" {
  job                = "webmemo-production-vercel"
  target             = "https://www.webmemo.xyz/api/version"
  enabled            = true
  frequency          = 120000
  timeout            = 10000
  basic_metrics_only = true
  probes             = [for name in var.probe_names : data.grafana_synthetic_monitoring_probes.public.probes[name]]
  labels = {
    service = "webmemo"
  }

  settings {
    http {
      method             = "GET"
      ip_version         = "V4"
      valid_status_codes = [200]
    }
  }
}

# ---------- 알림 규칙 ----------
locals {
  # datasource: prom | loki, op: gt | lt, no_data: OK | Alerting, range: 쿼리 시간 범위(초)
  rules = {
    "webmemo-5xx" = {
      title      = "[webmemo] 5xx 급증"
      datasource = "loki"
      expr       = "sum(count_over_time({service=\"caddy\"} | json | status >= 500 [5m]))"
      op         = "gt"
      threshold  = 4
      for        = "0s"
      no_data    = "OK"
      range      = 600
      summary    = "최근 5분 Caddy 접근 로그에 5xx가 5건 이상입니다. 앱이 죽어 Caddy가 낸 502·504도 포함됩니다."
    }
    "webmemo-oom" = {
      title      = "[webmemo] 컨테이너 OOM"
      datasource = "prom"
      expr       = "sum(increase(container_oom_events_total{host=\"webmemo-1\"}[10m]))"
      op         = "gt"
      threshold  = 0
      for        = "0s"
      no_data    = "OK"
      range      = 600
      summary    = "최근 10분 안에 컨테이너가 메모리 부족(OOM)으로 죽었습니다."
    }
    "webmemo-memory-high" = {
      title      = "[webmemo] 메모리 85% 초과"
      datasource = "prom"
      expr       = "1 - node_memory_MemAvailable_bytes{host=\"webmemo-1\"} / node_memory_MemTotal_bytes{host=\"webmemo-1\"}"
      op         = "gt"
      threshold  = 0.85
      for        = "10m"
      no_data    = "OK"
      range      = 600
      summary    = "VM 메모리 사용률이 10분 넘게 85%를 넘습니다. OOM이 날 수 있습니다."
    }
    "webmemo-reclaim-risk" = {
      title      = "[webmemo] 회수 위험: 메모리 22% 미만"
      datasource = "prom"
      expr       = "avg_over_time((1 - node_memory_MemAvailable_bytes{host=\"webmemo-1\"} / node_memory_MemTotal_bytes{host=\"webmemo-1\"})[24h:5m])"
      op         = "lt"
      threshold  = 0.22
      for        = "0s"
      no_data    = "OK"
      range      = 90000
      summary    = "24시간 평균 메모리 사용률이 22% 미만입니다. Oracle은 7일간 CPU·네트워크·메모리가 모두 20% 미만이면 Always Free 인스턴스를 회수할 수 있습니다."
    }
    "webmemo-external-down" = {
      title      = "[webmemo] 외부 헬스체크 실패"
      datasource = "prom"
      expr       = "max(max_over_time(probe_success{job=\"webmemo-staging\"}[3m]))"
      op         = "lt"
      threshold  = 1
      for        = "0s"
      no_data    = "Alerting"
      range      = 600
      summary    = "Synthetic Monitoring이 3분 연속 /api/version에 접속하지 못했습니다. VM 다운·네트워크 단절·Caddy 중단을 의심하세요."
    }
    "webmemo-collector-down" = {
      title      = "[webmemo] 관측 수집 끊김"
      datasource = "prom"
      expr       = "sum(count_over_time(up{host=\"webmemo-1\"}[10m]))"
      op         = "lt"
      threshold  = 1
      for        = "0s"
      no_data    = "Alerting"
      range      = 600
      summary    = "10분 동안 VM의 Alloy가 지표를 보내지 않았습니다. 이 동안은 다른 알림도 오지 않을 수 있습니다."
    }
  }

  datasource_uid = {
    prom = var.prometheus_datasource_uid
    loki = var.loki_datasource_uid
  }
  expr_datasource = { type = "__expr__", uid = "__expr__" }
}

resource "grafana_rule_group" "webmemo" {
  name             = "webmemo-oracle"
  folder_uid       = grafana_folder.webmemo.uid
  interval_seconds = 60

  dynamic "rule" {
    for_each = local.rules
    content {
      uid            = rule.key
      name           = rule.value.title
      condition      = "C"
      for            = rule.value.for
      no_data_state  = rule.value.no_data
      exec_err_state = "Error"
      annotations = {
        summary = rule.value.summary
      }
      labels = {
        service = "webmemo"
      }

      # A: 원본 쿼리 (instant)
      data {
        ref_id         = "A"
        datasource_uid = local.datasource_uid[rule.value.datasource]
        relative_time_range {
          from = rule.value.range
          to   = 0
        }
        model = rule.value.datasource == "loki" ? jsonencode({
          refId     = "A"
          expr      = rule.value.expr
          queryType = "instant"
          }) : jsonencode({
          refId   = "A"
          expr    = rule.value.expr
          instant = true
        })
      }

      # B: 값 하나로 줄이기
      data {
        ref_id         = "B"
        datasource_uid = "__expr__"
        relative_time_range {
          from = 0
          to   = 0
        }
        model = jsonencode({
          refId      = "B"
          type       = "reduce"
          expression = "A"
          reducer    = "last"
          datasource = local.expr_datasource
        })
      }

      # C: 기준값 비교
      data {
        ref_id         = "C"
        datasource_uid = "__expr__"
        relative_time_range {
          from = 0
          to   = 0
        }
        model = jsonencode({
          refId      = "C"
          type       = "threshold"
          expression = "B"
          conditions = [{ evaluator = { type = rule.value.op, params = [rule.value.threshold] } }]
          datasource = local.expr_datasource
        })
      }

      notification_settings {
        contact_point = grafana_contact_point.slack.name
        group_by      = ["alertname", "grafana_folder"]
      }
    }
  }
}
