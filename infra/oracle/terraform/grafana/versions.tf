terraform {
  required_version = ">= 1.10"

  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 4.35"
    }
  }

  # state는 Oracle Object Storage(Always Free)의 S3 호환 API에 둡니다.
  # 버킷·엔드포인트·키는 init 때 -backend-config로 넘깁니다(backend.hcl.example 참고).
  # OCI S3 호환 API는 AWS 전용 검증을 통과하지 못해 아래 skip 옵션이 필요합니다.
  # 잠금(use_lockfile)은 OCI의 조건부 쓰기 지원을 확인하지 못해 쓰지 않고,
  # 대신 워크플로의 concurrency로 동시에 한 실행만 돌게 합니다.
  backend "s3" {
    key                         = "grafana/terraform.tfstate"
    region                      = "ap-osaka-1"
    use_path_style              = true
    skip_region_validation      = true
    skip_credentials_validation = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
  }
}
