# Branch Strategy

This document outlines our Git branch strategy and merging conventions.

## Main Branch

### `master`
- Production-ready branch that users can rely on
- Contains stable, tested code
- The single base branch: all branches are created from `master`, and all work is merged back into `master`

### `feature/*` (and `fix/*`, etc.)
- Feature/bugfix development branches
- Branched from `master`
- Merged back into `master` via a Pull Request targeting `master`
- When merging, use a **merge commit** (do **NOT** use Squash & Merge)
  - This preserves the individual commit history in `master`
  - Makes it easier to track feature additions in the commit history
- Naming convention: `feature/feature-name`, `fix/bug-name`

## Pull Request & Merging Conventions

- **Base branch (target)**: always `master`
- **Merge method**: **Create a merge commit** — never Squash & Merge, never Rebase & Merge

```bash
# Create a feature branch from master
git checkout master
git pull
git checkout -b feature/xx-yy-zz

# ...work, commit...

# Open a PR targeting master, then merge with a merge commit
gh pr create --base master
gh pr merge --merge
```
