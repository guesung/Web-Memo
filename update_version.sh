#!/bin/bash
# Usage: ./update_version.sh <new_version>
# FORMAT IS <0.0.0>

if [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  # Update version in all package.json files
  find . -name 'package.json' -not -path '*/node_modules/*' -exec bash -c '
    # Parse the version from package.json
    current_version=$(grep -o "\"version\": \"[^\"]*" "$0" | cut -d"\"" -f4)

    # Update the version
    perl -i -pe"s/$current_version/'$1'/" "$0"
  '  {} \;

  echo "Updated versions to $1"

  git add .
  git commit -m "chore: v$1"

  echo "Creating tag v$1..."
  if ! git tag -f "v$1"; then
    echo "Failed to create tag"
    exit 1
  fi

  echo "Pushing tag to remote..."
  if ! git push -f origin "v$1"; then
    echo "Failed to push tag"
    exit 1
  fi

  # git push
else
  echo "Version format <$1> isn't correct, proper format is <0.0.0>"
fi
