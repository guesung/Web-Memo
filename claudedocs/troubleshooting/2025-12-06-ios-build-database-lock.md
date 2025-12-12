# iOS Build Database Lock Error Troubleshooting

**Date**: 2025-12-06
**Type**: troubleshooting
**Status**: completed

## Summary
iOS 빌드 시 Xcode 빌드 데이터베이스 잠금 오류가 발생하여 `pnpm run ios` 명령이 실패하는 문제를 해결함.

## Problem

### Error Message
```
error: unable to attach DB: error: accessing build database
"/Users/home/Library/Developer/Xcode/DerivedData/WebMemo-dfabzisxprdirddiwbyeezhqmxzi/Build/Intermediates.noindex/XCBuildData/build.db":
database is locked
Possibly there are two concurrent builds running in the same filesystem location.
```

### Exit Code
- Exit code: 65

### Symptoms
- `pnpm run ios` 명령 실행 시 빌드 실패
- Xcode 빌드 프로세스가 시작되지만 데이터베이스 잠금으로 인해 중단
- 이전 빌드 프로세스가 비정상 종료되었거나 동시에 여러 빌드가 실행됨

## Root Cause
1. **이전 빌드 프로세스 충돌**: 이전에 실행된 Xcode 빌드가 정상적으로 종료되지 않고 데이터베이스 잠금을 유지
2. **동시 빌드 실행**: 두 개 이상의 빌드 프로세스가 동일한 DerivedData 위치에서 실행됨
3. **프로세스 좀비화**: xcodebuild 또는 Xcode 프로세스가 백그라운드에서 계속 실행 중

## Solution

### Step 1: Kill Related Processes
```bash
# xcodebuild 프로세스 강제 종료
pkill -9 xcodebuild

# Xcode 프로세스 강제 종료
pkill -9 Xcode
```

### Step 2: Clear DerivedData Cache
```bash
# WebMemo 관련 DerivedData 삭제
rm -rf ~/Library/Developer/Xcode/DerivedData/WebMemo-*
```

### Step 3: Retry Build
```bash
pnpm run ios
```

## Alternative Solutions

### Option A: Clear All DerivedData (더 강력한 방법)
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

### Option B: Xcode에서 수동 정리
1. Xcode 열기
2. Product → Clean Build Folder (Shift + Cmd + K)
3. Xcode 종료 후 다시 빌드

### Option C: 시스템 재시작
- 위 방법들이 모두 실패할 경우 시스템 재시작

## Prevention

1. **빌드 취소 시 주의**: Ctrl+C로 빌드 취소 시 프로세스가 완전히 종료되었는지 확인
2. **동시 빌드 금지**: 동일 프로젝트에서 여러 터미널에서 빌드하지 않기
3. **Xcode 상태 확인**: 빌드 전 Activity Monitor에서 xcodebuild 프로세스 확인

## Verification

빌드 성공 시 다음과 같은 출력 확인:
```
› Build Succeeded
› 0 error(s), and X warning(s)
› Installing on iPhone XX Pro
› Opening on iPhone XX Pro (com.webmemo.app)
```

## Related Files
- **Project Location**: `apps/mobile/`
- **DerivedData Location**: `~/Library/Developer/Xcode/DerivedData/WebMemo-*/`
- **Build Database**: `Build/Intermediates.noindex/XCBuildData/build.db`

## Environment
- Platform: macOS Darwin 25.0.0
- Framework: Expo/React Native
- Package Manager: pnpm
- Build Tool: Xcode (via expo run:ios)

## Notes
- 이 문제는 Expo/React Native 프로젝트에서 일반적으로 발생할 수 있음
- DerivedData는 캐시이므로 삭제해도 안전함 (다음 빌드 시 재생성)
- 빌드 시간이 처음에는 오래 걸릴 수 있음 (캐시 재생성 필요)
