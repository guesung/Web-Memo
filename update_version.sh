#!/bin/bash
# 사용법: ./update_version.sh <app> <새버전>
# app: extension | web | app
# 버전 형식: <0.0.0>
#
# 예시:
#   ./update_version.sh extension 1.11.0
#   ./update_version.sh web 2.0.0
#   ./update_version.sh app 1.0.0

APP="$1"
VERSION="$2"

if [[ -z "$APP" || -z "$VERSION" ]]; then
  echo "사용법: ./update_version.sh <app> <버전>"
  echo "  app: extension | web | app"
  echo "  버전 형식: 0.0.0"
  echo ""
  echo "예시:"
  echo "  ./update_version.sh extension 1.11.0"
  echo "  ./update_version.sh web 2.0.0"
  echo "  ./update_version.sh app 1.0.0"
  exit 1
fi

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "버전 형식이 잘못되었습니다. 올바른 형식: <0.0.0>"
  exit 1
fi

update_version() {
  local file="$1"
  if [[ -f "$file" ]]; then
    perl -i -pe"s/\"version\": \"[^\"]+\"/\"version\": \"$VERSION\"/" "$file"
    echo "  ✓ $file"
  else
    echo "  ✗ $file (파일 없음)"
  fi
}

case "$APP" in
  extension)
    echo "Extension 버전을 $VERSION으로 업데이트합니다..."
    update_version "./apps/chrome-extension/package.json"
    update_version "./pages/side-panel/package.json"
    update_version "./pages/options/package.json"
    update_version "./pages/content-ui/package.json"
    TAG_PREFIX="extension"
    COMMIT_MSG="chore(extension): v$VERSION"
    ;;
  web)
    echo "Web 버전을 $VERSION으로 업데이트합니다..."
    update_version "./apps/web/package.json"
    TAG_PREFIX="web"
    COMMIT_MSG="chore(web): v$VERSION"
    ;;
  app)
    echo "App 버전을 $VERSION으로 업데이트합니다..."
    update_version "./apps/app/package.json"
    TAG_PREFIX="app"
    COMMIT_MSG="chore(app): v$VERSION"
    ;;
  *)
    echo "알 수 없는 앱: $APP"
    echo "사용 가능한 앱: extension | web | app"
    exit 1
    ;;
esac

echo ""
echo "버전을 $VERSION으로 업데이트했습니다"

git add .
git commit -m "$COMMIT_MSG"

TAG_NAME="$TAG_PREFIX/v$VERSION"

echo "태그 $TAG_NAME 생성 중..."
if ! git tag -f "$TAG_NAME"; then
  echo "태그 생성 실패"
  git reset HEAD^
  exit 1
fi

echo "태그를 원격 저장소에 푸시 중..."
if ! git push -f origin "$TAG_NAME"; then
  echo "태그 푸시 실패"
  git tag -d "$TAG_NAME"
  git reset HEAD^
  exit 1
fi

echo ""
echo "완료: $APP v$VERSION (태그: $TAG_NAME)"
