# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Package Manager**: This project uses `pnpm` (version 9.5.0) and requires Node.js >=18.12.0.

### Core Development Commands
```bash
# Install dependencies
pnpm i

# Development (all packages)
pnpm dev

# Development (extension only)
pnpm dev:extension

# Development (web app only) 
pnpm dev:web

# Production build
pnpm build

# Build extension only
pnpm build:extension

# Build web app only
pnpm build:web
```

### Quality & Testing
```bash
# Code formatting (Biome)
pnpm format

# Linting
pnpm lint
pnpm lint:fix

# Type checking
pnpm type-check

# Unit tests (Vitest)
pnpm test:jest

# E2E tests (Playwright)
pnpm test:e2e

# View E2E test report
pnpm test-report:e2e
```

### Extension Development
```bash
# Build extension for Firefox
pnpm build:extension -- --firefox

# Package extension for distribution
pnpm package

# Create distributable zip
pnpm zip

# Update version across all packages
pnpm update-version
```

### Database & Types
```bash
# Generate Supabase types
pnpm generate-supabase-type
```

## Project Architecture

### Monorepo Structure (Turborepo)

**Apps:**
- **`apps/chrome-extension/`** - Chrome Extension Manifest V3 core application
- **`apps/web/`** - Next.js 14.2.10 web application
- **`apps/mobile/`** - React Native/Expo mobile application

**Pages (Extension UI):**
- **`pages/`** - Extension UI pages (popup, side-panel, options, content-ui, devtools)

**Shared Packages:**
- **`packages/shared/`** - Shared utilities, hooks, types, and business logic
- **`packages/ui/`** - Shared UI components library (shadcn/ui based)
- **`packages/env/`** - Environment variable management
- **`packages/tailwind-config/`** - Shared TailwindCSS configuration
- **`packages/tsconfig/`** - Shared TypeScript configurations
- **`packages/vite-config/`** - Shared Vite build configuration
- **`packages/hmr/`** - Hot Module Replacement utilities for extension
- **`packages/zipper/`** - Extension packaging utilities
- **`packages/dev-utils/`** - Development utilities
- **`packages/supabase-edge-functions/`** - Supabase Edge Functions

**Testing & Infrastructure:**
- **`e2e/`** - Playwright end-to-end testing suite

### Core Technologies
- **Frontend**: React 18.3.1, TypeScript 5.5.3, TailwindCSS 3.4.x
- **State Management**: TanStack Query v5.59.0, React Hook Form 7.53.2
- **Build Tools**: Vite 5.3.3 (extension), Next.js 14.2.10 (web), Turbo 2.1.1
- **Backend**: Supabase (authentication, database, real-time)
- **Testing**: Playwright 1.47.0, Vitest 2.1.5
- **Code Quality**: Biome 2.0.0 (formatting/linting)

### Extension Architecture (Manifest V3)
The chrome extension (`apps/chrome-extension/`) consists of multiple entry points:
- **Background Script**: Service worker for background operations
- **Content Scripts**: Injected into web pages for memo collection
- **Side Panel**: Main memo interface (React app)
- **Popup**: Quick access interface
- **Options**: Settings and configuration page
- **DevTools**: Developer tools panel

### Shared Packages System
**`packages/shared/`** contains the core business logic:
- **hooks/** - TanStack Query hooks for Supabase operations
- **utils/** - Utility functions (extension-specific and web-specific)
- **types/** - TypeScript definitions including auto-generated Supabase types
- **modules/** - Reusable modules (chrome-storage, extension-bridge, local-storage, analytics, search-params)
- **constants/** - Application constants and configuration

**`packages/env/`** manages environment variables:
- Centralized environment configuration
- `.env`, `.env.production`, `.env.example` files
- Built with tsup for distribution

### State Management Pattern
- **Server State**: TanStack Query for all Supabase operations
- **Form State**: React Hook Form for form management
- **Extension State**: Chrome Storage API with TypeScript wrappers
- **Local State**: React hooks for component-level state

### Browser Compatibility
- Primary: Chrome Extension Manifest V3
- Secondary: Firefox compatibility via `__FIREFOX__` environment flag
- Cross-browser build system with conditional logic

## Development Patterns

### Component Structure
Components follow functional programming principles:
- Use function declarations (not arrow functions)
- Interfaces/types at file end
- RORO pattern (Receive Object, Return Object)
- Named exports preferred

### Icons
- **Always use `lucide-react`** for icons instead of inline SVG
- Import icons from `lucide-react` package: `import { IconName } from "lucide-react"`
- Never write inline `<svg>` elements - find the equivalent lucide-react icon
- Common icons: `Check`, `X`, `ChevronDown`, `Globe`, `Star`, `Users`, `Sparkles`, etc.
- Browse available icons at https://lucide.dev/icons

### Error Handling
- Early returns for error cases
- Guard clauses for preconditions
- Services throw user-friendly errors for TanStack Query
- Error boundaries in React applications

### File Organization
- Keep files under 300 lines
- Structure: exports → subcomponents → helpers → types
- Use descriptive names with auxiliary verbs (isLoading, handleClick)
- Lowercase with dashes for directories
- **File names**: Use camelCase (e.g., `getMemoCount.ts`, `chromeStoreStats.ts`)

### Next.js Page File Separation

When creating or modifying `page.tsx` files in Next.js App Router (`apps/web/src/app/`), separate code into appropriate folders:

```
apps/web/src/app/[route]/
├── page.tsx              # Only component rendering and composition
├── _components/          # React components (with index.ts barrel export)
├── _constants/           # Static values, configuration objects (with index.ts)
├── _utils/               # Helper functions, data fetching, metadata (with index.ts)
└── _types/               # TypeScript interfaces if needed (with index.ts)
```

**Separation Rules**:
- **_constants/**: Hardcoded values, config objects, static arrays
- **_utils/**: Data fetching functions, transformations, validation, metadata
- **_components/**: Page-specific React components
- **page.tsx**: Only imports, generateMetadata export, and component composition

**Standards**:
- Do NOT write comments unless absolutely necessary for complex business logic
- Use camelCase for file names (not kebab-case)
- Create `index.ts` barrel exports in each folder
- Import from folder index (e.g., `from "./_constants"` not `from "./_constants/stats"`)
- Keep page.tsx focused on rendering only

### Testing Strategy
- **Unit Tests**: Utility functions and hooks (Vitest)
- **E2E Tests**: Critical user flows (Playwright)
  - Parallel tests for independent features
  - Serial tests for data-dependent operations
- **Test Environment**: Runs against local development server

### Extension-Specific Considerations
- Handle cross-origin restrictions gracefully
- Implement proper content script injection patterns
- Use webextension-polyfill for cross-browser compatibility
- Follow Chrome Extension security best practices

### Internationalization
- Support for Korean (ko) and English (en) locales
- Chrome extension i18n via `_locales/` directories
- Next.js i18n integration for web application

**IMPORTANT**: Never use `lng === "ko"` pattern for conditional text rendering. Always use `useTranslation` hook with translation keys.

**❌ Wrong Pattern**:
```tsx
{lng === "ko" ? "한글 텍스트" : "English Text"}
```

**✅ Correct Pattern**:
```tsx
import useTranslation from "@src/modules/i18n/util.client";

function Component({ lng }: { lng: Language }) {
  const { t } = useTranslation(lng);
  return <span>{t("some.translation.key")}</span>;
}
```

**Adding New Translations**:
1. Add translation key to `apps/web/src/modules/i18n/locales/ko/translation.json`
2. Add same key to `apps/web/src/modules/i18n/locales/en/translation.json`
3. Use `t("your.new.key")` in component

**Translation File Structure**:
- Use nested objects for organization: `"section.subsection.key"`
- Group related translations under common prefixes
- Example: `introduce.hero.title`, `introduce.hero.subtitle`

**Server vs Client Components** (in `apps/web/`):
- Client components: `import useTranslation from "@src/modules/i18n/util.client"`
- Server components: `import useTranslation from "@src/modules/i18n/util.server"` (async)

**Post-Task Validation**:
- After completing any task that modifies i18n-related code, always run `/i18n-check` to verify translation completeness
- This ensures all translation keys exist in both Korean and English locale files

### Environment Configuration
Environment variables are managed in `packages/env/`. Key variables:
- `__FIREFOX__`: Enable Firefox-specific build modifications
- `OPENAI_API_KEY`: OpenAI integration for page summarization
- `SENTRY_DSN`: Error tracking and monitoring
- `WEB_URL`: Web application base URL

Environment files:
- `packages/env/.env`: Development environment
- `packages/env/.env.production`: Production environment
- `packages/env/.env.example`: Template for required variables

## Common Tasks

### Adding New UI Components
1. Add to `packages/ui/src/components/`
2. Export from `packages/ui/src/index.ts`
3. Use in extension pages or web application

### Adding Supabase Operations
1. Create query/mutation hook in `packages/shared/src/hooks/supabase/`
2. Export from appropriate index file
3. Use in components via TanStack Query pattern

### Extension Page Development
1. Navigate to appropriate `pages/` directory (popup, side-panel, options, content-ui, devtools, devtools-panel)
2. Components use shared packages and UI library
3. Build system handles hot module replacement via `packages/hmr/`

### Database Schema Changes
1. Update Supabase schema (Edge Functions in `packages/supabase-edge-functions/`)
2. Run `pnpm generate-supabase-type` to regenerate types
3. Update related queries and mutations

### Running Single Test
```bash
# Run specific E2E test
pnpm -F e2e test -- --grep "test name"

# Run single test file
pnpm test:jest -- path/to/test.ts
```

## Work Documentation (claudedocs)

All development work should be documented in the `claudedocs/` folder for tracking and reference.

### File Naming Convention
```
claudedocs/
├── YYYY-MM-DD-feature-name.md        # Feature implementation
├── YYYY-MM-DD-bugfix-description.md  # Bug fixes
├── YYYY-MM-DD-refactor-target.md     # Refactoring work
├── YYYY-MM-DD-analysis-topic.md      # Analysis and research
└── YYYY-MM-DD-issue-troubleshooting.md # Troubleshooting guides
```

### Document Template
```markdown
# [Task Title]

**Date**: YYYY-MM-DD
**Type**: feature | bugfix | refactor | analysis | chore | troubleshooting
**Status**: completed | in-progress | blocked

## Summary
Brief description of what was done.

## Changes Made
- List of files modified
- Key changes and decisions

## Technical Details
Relevant implementation details, patterns used, etc.

## Related Issues/PRs
- Links to related GitHub issues or PRs

## Notes
Any additional context or follow-up items.
```

### When to Create Documentation
- New feature implementations
- Bug fixes with significant investigation
- Refactoring work affecting multiple files
- Architecture decisions
- Complex debugging sessions
- Research and analysis results
- **Troubleshooting sessions** (build failures, environment issues, dependency conflicts)

### Best Practices
- Use descriptive file names that indicate the work type
- Include the date prefix (YYYY-MM-DD) for chronological sorting
- Keep documentation concise but informative
- Link to relevant code files using relative paths
- Update status as work progresses

### Troubleshooting Documentation
When encountering and resolving build failures, environment issues, or other technical problems, **always create a troubleshooting document** with the following structure:

```markdown
# [Issue] Troubleshooting

**Date**: YYYY-MM-DD
**Type**: troubleshooting
**Status**: completed

## Summary
Brief description of the problem.

## Problem
### Error Message
[Exact error message or logs]

### Symptoms
[What happened, how to reproduce]

## Root Cause
[Why the problem occurred]

## Solution
[Step-by-step fix with commands]

## Prevention
[How to avoid this issue in the future]

## Verification
[How to confirm the fix worked]
```

This helps future debugging sessions by providing quick reference solutions.

## Task Completion Workflow

**IMPORTANT**: After completing any task, always execute the `/pr` command to create a pull request.

### Standard Workflow
1. Complete the assigned task
2. Verify changes with `pnpm type-check` and `pnpm lint`
3. Run `/pr` command to create a pull request

### PR Command Usage
The `/pr` command will:
- Create a new branch from develop (if not already on a feature branch)
- Commit all changes with a descriptive message
- Push to remote and create a pull request

This ensures all work is properly tracked and ready for review.