terraform {
  required_version = ">= 1.10"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.28"
    }
  }

  # grafana 스택과 같은 Oracle Object Storage 버킷, 다른 key. 옵션 설명은 ../grafana/versions.tf 참고
  backend "s3" {
    key                         = "cloudflare/terraform.tfstate"
    region                      = "ap-osaka-1"
    use_path_style              = true
    skip_region_validation      = true
    skip_credentials_validation = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
  }
}
