# Branch Strategy

This document outlines our Git branch strategy and merging conventions.

## Main Branches

### `master`
- Production-ready branch that users can rely on
- Contains stable, tested code
- Base branch for `develop`

### `develop`
- Main development branch
- Branched from `master`
- When merging to `master`, use **recursive merge**
  - This preserves the commit history in `master`
  - Makes it easier to track feature additions in the commit history

### `feature/*`
- Feature development branches
- Branched from `develop`
- When merging to `develop`, use **Squash & Merge**
- Naming convention: `feature/feature-name`

## Merging Conventions

### feature/* → develop
```bash
# When merging a feature branch to develop
git checkout develop
git merge --squash feature/xx-yy-zz
git commit -m "feat: Add xx-yy-zz feature"
```

### develop → master
```bash
# When merging develop to master
git checkout master
git merge develop
```

## Special Cases

### Hotfix Synchronization
When `master` receives hotfixes or critical updates that need to be synchronized with `develop`:
1. Apply the hotfix to `master`
2. Merge `master` into `develop` using a regular merge
```bash
git checkout develop
git merge master
```

This ensures that `develop` stays up-to-date with any critical fixes in `master` while maintaining the commit history.