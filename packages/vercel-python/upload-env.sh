#!/bin/bash

# Vercel에 환경 변수를 업로드하는 스크립트
# 사용법: ./upload-env.sh [production|preview|development]

ENV=${1:-production}

echo "Uploading environment variables to Vercel ($ENV environment)..."

# .env 파일에서 환경 변수 읽기
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    exit 1
fi

# 주석과 빈 줄을 제외하고 환경 변수 추출
grep -v '^#' .env | grep -v '^$' | while IFS='=' read -r key value; do
    # 앞뒤 공백 및 줄바꿈 제거
    key=$(echo "$key" | tr -d '\n\r' | xargs)
    value=$(echo "$value" | tr -d '\n\r' | xargs)

    if [ -n "$key" ] && [ -n "$value" ]; then
        echo "Setting $key..."
        # printf를 사용하여 줄바꿈 없이 전달
        printf "%s" "$value" | vercel env add "$key" "$ENV" 2>/dev/null || echo "  (already exists or failed)"
    fi
done

echo "Done! Environment variables uploaded to $ENV environment."
echo ""
echo "Redeploy to apply changes:"
echo "  vercel --prod"
