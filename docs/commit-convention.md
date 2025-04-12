# Commit Convention

This document outlines our commit message conventions.

## Commit Message Format

```
<prefix>: <description>

[optional body]

[optional footer]
```

## Commit Prefixes

1. `feat`: New feature
   - Example: `feat: add user authentication`

2. `fix`: Bug fixes
   - Example: `fix: resolve memory leak in video player`

3. `chore`: Maintenance tasks
   - Example: `chore: update npm dependencies`

4. `style`: Code style changes (formatting, missing semi colons, etc)
   - Example: `style: format user service code`

5. `design`: UI/UX changes
   - Example: `design: update button styles`

6. `refactor`: Code changes that neither fixes a bug nor adds a feature
   - Example: `refactor: restructure authentication logic`

## Additional Conventions

For more detailed commit message conventions, refer to the following guidelines:

### Type

- `docs`: Documentation changes
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `perf`: Performance improvements
- `revert`: Revert a previous commit

### Description
- Use the imperative, present tense: "change" not "changed" nor "changes"
- Don't capitalize the first letter
- No dot (.) at the end
- Limit the first line to 72 characters or less

### Body
- Use the imperative, present tense
- Include motivation for the change and contrast with previous behavior
- Wrap lines at 72 characters

### Footer
- Reference issues and pull requests
- Breaking changes should start with `BREAKING CHANGE:`

## Examples

```bash
feat: add email notification feature

Implement email notifications for user actions:
- Sign up confirmation
- Password reset
- Account deletion

Resolves: #123
```

```bash
fix: prevent racing of requests

Introduce a request id and a reference to latest request.
Dismiss incoming responses other than from latest request.

Resolves: #123
```

```bash
refactor!: drop support for Node 6

BREAKING CHANGE: refactor to use JavaScript features not available in Node 6.
```

For more detailed examples and guidelines, refer to [Conventional Commits](https://www.conventionalcommits.org/) and the [Angular Commit Message Guidelines](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#commit).