# Pull Request Convention

This document outlines our Pull Request (PR) naming conventions.

## PR Title Format

All PR titles should start with a capitalized prefix to distinguish them from regular commits.

### Prefixes

1. `Feature`: New feature addition
   - Example: `Feature: Add dark mode support`

2. `Fix`: Bug fixes
   - Example: `Fix: Resolve login page redirect issue`

3. `Chore`: Maintenance tasks
   - Example: `Chore: Update dependencies`

4. `Refactor`: Code restructuring
   - Example: `Refactor: Improve authentication flow`

## PR Template

```markdown
## Description
[Detailed description of the changes]

## Related Issue
[Link to related issue if applicable]

## Type of Change
- [ ] Feature (new feature)
- [ ] Fix (bug fix)
- [ ] Chore (maintenance, dependencies)
- [ ] Refactor (code restructuring)

## How Has This Been Tested?
[Describe the tests you ran]

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
```