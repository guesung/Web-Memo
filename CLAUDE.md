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
- **`chrome-extension/`** - Chrome Extension Manifest V3 core application
- **`pages/`** - Extension UI pages (popup, side-panel, options, content-ui)
- **`packages/shared/`** - Shared utilities, hooks, types, and business logic
- **`packages/ui/`** - Shared UI components library (shadcn/ui based)
- **`packages/web/`** - Next.js 14.2.10 web application
- **`e2e/`** - Playwright end-to-end testing suite
- **`supabase/`** - Database schema and configurations

### Core Technologies
- **Frontend**: React 18.3.1, TypeScript 5.5.3, TailwindCSS 3.4.x
- **State Management**: TanStack Query v5.59.0, React Hook Form 7.53.2
- **Build Tools**: Vite 5.3.3 (extension), Next.js 14.2.10 (web), Turbo 2.1.1
- **Backend**: Supabase (authentication, database, real-time)
- **Testing**: Playwright 1.47.0, Vitest 2.1.5
- **Code Quality**: Biome 2.0.0 (formatting/linting)

### Extension Architecture (Manifest V3)
The chrome extension consists of multiple entry points:
- **Background Script**: Service worker for background operations
- **Content Scripts**: Injected into web pages for memo collection
- **Side Panel**: Main memo interface (React app)
- **Popup**: Quick access interface
- **Options**: Settings and configuration page

### Shared Packages System
**`packages/shared/`** contains the core business logic:
- **hooks/** - TanStack Query hooks for Supabase operations
- **utils/** - Utility functions (extension-specific and web-specific)
- **types/** - TypeScript definitions including auto-generated Supabase types
- **modules/** - Reusable modules (chrome-storage, extension-bridge, local-storage)
- **constants/** - Application constants and configuration

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

When creating or modifying `page.tsx` files in Next.js App Router, separate code into appropriate folders:

```
app/[route]/
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

### Environment Configuration
Key environment variables:
- `__FIREFOX__`: Enable Firefox-specific build modifications
- `OPENAI_API_KEY`: OpenAI integration for page summarization
- `SENTRY_DSN`: Error tracking and monitoring
- `WEB_URL`: Web application base URL

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
1. Navigate to appropriate `pages/` directory
2. Components use shared packages and UI library
3. Build system handles hot module replacement

### Database Schema Changes
1. Update Supabase schema
2. Run `pnpm generate-supabase-type` to regenerate types
3. Update related queries and mutations

### Running Single Test
```bash
# Run specific E2E test
pnpm -F e2e test -- --grep "test name"

# Run single test file
pnpm test:jest -- path/to/test.ts
```