# Branch Strategy

This document outlines our Git branch strategy and merging conventions.

`master` is the single base branch. Every branch — including `develop` — is
created from `master`, and only `master` accumulates permanent history.
`develop` is a disposable branch that exists solely to drive the test server.

## Branches

### `master`

- Production-ready branch and the single source of truth
- The base branch for every other branch, including `develop`
- The only branch that permanently accumulates history
- Updated exclusively through pull requests from working branches
- Pushing to `master` deploys production (see `.github/workflows/ci-cd.yml`)

### `develop`

- **Test-only branch** used to deploy the staging/test server
- Branched (reset) from `master`, and **never merged back into `master`**
- Working branches are merged here only to try them out on the test server
- Recreated from `master` after a release, discarding whatever test merges had
  piled up

### Working branches — `feature/*`, `feat/*`, `fix/*`, `chore/*`, `refactor/*`

- Branched from `master`
- Merged back into `master` via a Pull Request targeting `master`
- Optionally merged into `develop` first, for test-server verification
- Naming convention: `<type>/<kebab-case-name>` (e.g. `feat/memo-search`)

## Pull Request & Merging Conventions

- **Base branch (target)**: always `master`
- **Merge method**: **Create a merge commit** — never Squash & Merge, never
  Rebase & Merge
  - This preserves the individual commit history in `master`
  - Makes it easier to track feature additions in the commit history

```bash
# Create a working branch from master
git checkout master
git pull
git checkout -b feat/memo-search

# ...work, commit...

# Open a PR targeting master, then merge with a merge commit
gh pr create --base master
gh pr merge --merge
```

## Workflows

### Deploying to the test server

```bash
git checkout develop
git pull origin develop
git merge feat/memo-search
git push origin develop
git checkout feat/memo-search   # go back to the working branch
```

Merging into `develop` does **not** finish the work. The working branch still
needs its own pull request into `master`.

### Resetting `develop` (after a release)

```bash
git checkout master
git pull origin master
git branch -f develop master
git push --force-with-lease origin develop
```

This discards every test merge accumulated in `develop`. That is intended —
nothing should ever exist only in `develop`.

### Catching up a working branch

```bash
git checkout feat/memo-search
git merge master        # merge master, never develop
```

## Rules

| Rule                                | Value                                |
| ----------------------------------- | ------------------------------------ |
| Base branch for working branches    | `master`                             |
| PR base branch                      | `master`                             |
| PR merge method                     | Merge commit (never squash/rebase)   |
| `develop` → `master` merge          | **Forbidden**                        |
| `develop` → working branch merge    | **Forbidden**                        |
| `develop` force-push                | Allowed, and expected on reset       |
| Work that exists only in `develop`  | **Never** — always PR it to `master` |

## Special Cases

### Hotfixes

Handled like any other work: branch from `master`, PR into `master`. If the fix
needs test-server verification first, merge it into `develop` as usual.

### Long-lived working branches

If a branch lives long enough to fall behind, merge `master` into it. Never
merge `develop` into a working branch — `develop` contains unreviewed test
merges from other people's work.
