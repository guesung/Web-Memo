# Refactor Manifest Environment Variables

**Date**: 2025-12-07
**Type**: refactor
**Status**: completed

## Summary

Refactored `apps/chrome-extension/manifest.js` to eliminate hardcoded environment variables and centralize configuration management through the `packages/env` package, following frontend-fundamentals.com principles.

## Issues Identified

The original `manifest.js` contained several hardcoded values that should be managed as environment variables:

1. **Firefox build flag**: `process.env.__FIREFOX__` accessed directly
2. **Externally connectable URLs**: Hardcoded `http://localhost:3000/*` and `https://*.webmemo.site/*`
3. **OAuth2 Client ID**: Hardcoded Google OAuth client ID
4. **Extension Key**: Hardcoded Chrome extension public key

These hardcoded values violated DRY principles and made it difficult to manage different environments (development, staging, production).

## Changes Made

### 1. Enhanced Environment Package (`packages/env/`)

**File**: `packages/env/src/config.ts`
- Added `getOptionalConfig()` helper function for non-required environment variables
- Added new config properties:
  - `isFirefox`: Boolean flag for Firefox builds
  - `extensionKey`: Chrome extension public key (optional)
  - `oauth2ClientId`: OAuth2 client ID (optional)

**File**: `packages/env/.env.example`
- Added new environment variables:
  - `__FIREFOX__`: Browser build target flag
  - `EXTENSION_KEY`: Chrome extension public key
  - `OAUTH2_CLIENT_ID`: OAuth2 client ID

### 2. Created Manifest Configuration Helper

**New File**: `apps/chrome-extension/lib/manifestConfig.js`

Created dedicated helper functions to encapsulate manifest-specific configuration logic:

- **`getExternallyConnectableMatches()`**:
  - Dynamically generates externally_connectable URLs from `WEB_URL`
  - Handles localhost vs production domain patterns
  - Maintains backward compatibility with existing domain structure

- **`getManifestKey()`**:
  - Returns extension key from environment or fallback to default
  - Allows overriding for different builds

- **`getOAuth2ClientId()`**:
  - Returns OAuth2 client ID from environment or fallback to default
  - Enables different client IDs for staging/production

### 3. Refactored Manifest Generation

**File**: `apps/chrome-extension/manifest.js`

- Replaced direct `process.env.__FIREFOX__` access with `CONFIG.isFirefox`
- Replaced hardcoded externally_connectable URLs with `getExternallyConnectableMatches()`
- Replaced hardcoded extension key with `getManifestKey()`
- Replaced hardcoded OAuth2 client ID with `getOAuth2ClientId()`

## Technical Benefits

### Single Responsibility Principle
- Configuration logic separated into dedicated helper functions
- Each function has one clear purpose (URL generation, key retrieval, etc.)

### DRY (Don't Repeat Yourself)
- Environment variables defined once in `packages/env`
- Reusable configuration helpers prevent duplication
- WEB_URL used as single source of truth for domain configuration

### Separation of Concerns
- Environment management: `packages/env/src/config.ts`
- Manifest-specific logic: `apps/chrome-extension/lib/manifestConfig.js`
- Manifest composition: `apps/chrome-extension/manifest.js`

### Improved Maintainability
- Centralized configuration makes it easy to update URLs or credentials
- Environment-specific overrides via `.env` files
- Clear separation between development and production settings

## Verification

### Type Safety
```bash
pnpm type-check
# Result: 10 successful, 10 total
```

### Manifest Generation (Chrome)
```bash
# With __FIREFOX__=false
node -e "import('./manifest.js').then(m => console.log(JSON.stringify(m.default, null, 2)))"
# Result: Includes side_panel, correct OAuth2, dynamic URLs
```

### Manifest Generation (Firefox)
```bash
# With __FIREFOX__=true
# Result: Excludes side_panel (Firefox doesn't support it)
```

### Dynamic URL Generation
- `WEB_URL=http://localhost:3000` → `["http://localhost:3000/*", "https://*.webmemo.site/*"]`
- `WEB_URL=https://app.webmemo.site` → `["https://*.webmemo.site/*"]`

## Migration Notes

### For Developers

1. **Copy environment template**:
   ```bash
   cp packages/env/.env.example packages/env/.env
   ```

2. **Set required variables in `packages/env/.env`**:
   - `WEB_URL`: Your local or production web URL
   - `__FIREFOX__`: Set to `true` for Firefox builds
   - Optional overrides: `EXTENSION_KEY`, `OAUTH2_CLIENT_ID`

3. **Rebuild env package after .env changes**:
   ```bash
   cd packages/env && pnpm ready
   ```

### For Production Builds

The system maintains backward compatibility with default values:
- Extension key uses original production key if not overridden
- OAuth2 client ID uses original client ID if not overridden
- Firefox builds automatically exclude `side_panel`

### Environment-Specific Configuration

**Development** (`.env`):
```env
WEB_URL=http://localhost:3000
__FIREFOX__=false
```

**Production** (`.env.production`):
```env
WEB_URL=https://webmemo.site
__FIREFOX__=false
EXTENSION_KEY=<production_key>
OAUTH2_CLIENT_ID=<production_client_id>
```

**Firefox Build** (`.env.firefox`):
```env
WEB_URL=https://webmemo.site
__FIREFOX__=true
```

## Files Modified

### Modified Files
- `packages/env/src/config.ts` - Added new config properties and helper
- `packages/env/.env.example` - Added new environment variables
- `apps/chrome-extension/manifest.js` - Refactored to use centralized config

### New Files
- `apps/chrome-extension/lib/manifestConfig.js` - Manifest-specific helpers
- `packages/env/.env` - Local environment configuration (gitignored)

## Future Improvements

1. **Type Safety**: Convert `manifestConfig.js` to TypeScript for better type checking
2. **Validation**: Add runtime validation for required manifest fields
3. **Documentation**: Add JSDoc comments to helper functions
4. **Testing**: Add unit tests for `manifestConfig.js` functions

## Notes

- All existing functionality is preserved
- No breaking changes to the manifest structure
- Environment variables can be overridden per build environment
- Maintains backward compatibility with default values for sensitive credentials
