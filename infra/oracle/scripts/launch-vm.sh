#!/usr/bin/env bash
# Oracle Cloud에 A1 VM(webmemo-1)이 없으면 만듭니다. 이미 있으면 아무것도 하지 않습니다.
# .github/workflows/chore-oracle-vm-retry.yml이 10분마다 부르고, 로컬에서도 같은 명령으로 돌릴 수 있습니다.
#
# 사용: OCI_TENANCY=<tenancy OCID> SSH_PUBLIC_KEY_FILE=<공개키 경로> scripts/launch-vm.sh
#       (oci CLI 인증은 ~/.oci/config 또는 OCI_CLI_PROFILE을 따릅니다)
#
# 결과는 마지막 줄 RESULT=<값> 으로 알립니다.
#   exists   이미 있음(RUNNING·PROVISIONING·STARTING 등)
#   created  이번에 만들었음
#   capacity 무료 A1 자리가 없음(Out of host capacity). 다음 주기에 다시 시도하면 됩니다
# 그 밖의 오류는 종료 코드 1입니다.
set -euo pipefail

NAME=webmemo-1
SHAPE=VM.Standard.A1.Flex
T="${OCI_TENANCY:?OCI_TENANCY가 필요합니다}"
KEY="${SSH_PUBLIC_KEY_FILE:?SSH_PUBLIC_KEY_FILE이 필요합니다}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"

# shellcheck disable=SC2016 # JMESPath 백틱 리터럴이라 셸 확장이 아닙니다
EXISTING=$(oci compute instance list -c "$T" --display-name "$NAME" \
	--query 'data[?"lifecycle-state"!=`TERMINATED` && "lifecycle-state"!=`TERMINATING`].id | [0]' --raw-output)
if [ -n "$EXISTING" ] && [ "$EXISTING" != "null" ]; then
	echo "이미 있습니다: $EXISTING"
	echo "RESULT=exists"
	exit 0
fi

AD=$(oci iam availability-domain list -c "$T" --query 'data[0].name' --raw-output)
SUBNET=$(oci network subnet list -c "$T" --display-name "public subnet-webmemo-vcn" --query 'data[0].id' --raw-output)
# 무료 계층 Ubuntu 24.04 aarch64 중 가장 최근 이미지
IMAGE=$(oci compute image list -c "$T" --operating-system "Canonical Ubuntu" --operating-system-version "24.04" \
	--shape "$SHAPE" --sort-by TIMECREATED --sort-order DESC --limit 1 --query 'data[0].id' --raw-output)

set +e
OUT=$(oci compute instance launch -c "$T" --availability-domain "$AD" --display-name "$NAME" \
	--shape "$SHAPE" --shape-config '{"ocpus":1,"memoryInGBs":4}' \
	--image-id "$IMAGE" --subnet-id "$SUBNET" --assign-public-ip true \
	--ssh-authorized-keys-file "$KEY" --user-data-file "$DIR/cloud-init.yaml" \
	--query 'data.id' --raw-output 2>&1)
STATUS=$?
set -e

if [ $STATUS -eq 0 ]; then
	echo "생성했습니다: $OUT"
	echo "RESULT=created"
	exit 0
fi
if grep -q "Out of host capacity" <<<"$OUT"; then
	echo "무료 A1 자리가 없습니다(Out of host capacity)"
	echo "RESULT=capacity"
	exit 0
fi
echo "$OUT" >&2
exit 1
