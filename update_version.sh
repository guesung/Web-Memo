#!/bin/bash
# 사용법: ./update_version.sh <새버전>
# 버전 형식: <0.0.0>

if [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  find . -name 'package.json' -not -path '*/node_modules/*' -exec bash -c '
    current_version=$(grep -o "\"version\": \"[^\"]*" "$0" | cut -d"\"" -f4)
    perl -i -pe"s/$current_version/'$1'/" "$0"
  '  {} \;

  echo "버전을 $1로 업데이트했습니다"

  git add .
  git commit -m "chore: v$1"

  echo "태그 v$1 생성 중..."
  if ! git tag -f "v$1"; then
    echo "태그 생성 실패"
    git reset HEAD^
    exit 1
  fi

  echo "태그를 원격 저장소에 푸시 중..."
  if ! git push -f origin "v$1"; then
    echo "태그 푸시 실패"
    git tag -d "v$1"
    git reset HEAD^
    exit 1
  fi
else
  echo "버전 형식이 잘못되었습니다. 올바른 형식: <0.0.0>"
fi
