# Versioning

This repository has **three independent version tracks**, each owned by the
distribution channel that requires it. They are deliberately not kept in sync.

## The three tracks

| Track | Source of truth | Read by | Bumped when |
| --- | --- | --- | --- |
| **Extension** | `apps/chrome-extension/package.json` → `version` | `apps/chrome-extension/manifest.js` | You release the extension |
| **App** | `apps/app/app.json` → `version` | App Store / TestFlight | You release the iOS app |
| **Product release notes** | `apps/web/src/constants/Update.ts` → first entry | `/update` page, update notification modal | You have something worth telling users about |

Nothing else carries a version.

## Why they are separate

Each channel imposes its own constraint:

- **Chrome Web Store** rejects re-uploading the same version and requires
  monotonically increasing numbers. The extension version must move only when
  the extension itself ships.
- **App Store** has its own numbering. `ios.buildNumber` is *not* managed in the
  repo — `eas.json` sets `appVersionSource: "remote"` with `autoIncrement: true`,
  so EAS increments the build number server-side. Only `version` in `app.json`
  is edited by hand.
- **Web** has no version at all. It is a single continuously deployed instance;
  there is no such thing as "the version a user has installed". To identify a
  deployment, use the commit SHA or the Vercel deployment ID.

Previously a single number in the root `package.json` drove both the extension
manifest and the web update modal, so deploying the web bumped the extension's
store version and vice versa. That coupling is gone.

## `package.json` versions

Every package in this monorepo is `private` and referenced through
`workspace:*`. None of them is published to npm, so a `version` field would be
inert. Only `apps/chrome-extension/package.json` keeps one, because
`manifest.js` reads it.

Do not add `version` back to the other packages.

## Release notes

`UPDATE_LIST` in `apps/web/src/constants/Update.ts` is the single source of
truth for the product release version. Its first entry is exported as
`LATEST_RELEASE_VERSION` and drives the update notification modal.

Each entry's `version` string must exactly match a key under `updates.versions`
in both `ko` and `en` `translation.json`. Add an entry only when the change is
worth interrupting a user for — every entry triggers the modal once.

## Bumping

There is no script. Each track is a one-line edit:

```bash
# Extension — before releasing the extension
$EDITOR apps/chrome-extension/package.json     # "version": "1.10.15"

# App — before releasing the iOS app
$EDITOR apps/app/app.json                      # "version": "1.0.8"

# Product release notes — when users should be told
$EDITOR apps/web/src/constants/Update.ts                        # new entry at the top
$EDITOR apps/web/src/modules/i18n/locales/ko/translation.json   # updates.versions
$EDITOR apps/web/src/modules/i18n/locales/en/translation.json   # updates.versions
```

Use `/version-update` to do this with the release notes drafted for you.

Bumps go to `master` through a normal pull request — see
[branch-strategy.md](branch-strategy.md). Tag the release commit with
`v<product release version>` to create a GitHub Release; deploy afterwards via
Actions → **Release**.
