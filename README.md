# Scout des Apôtres mobile app

React Native app built with Expo 58, TypeScript, Expo Router, and TanStack Query.
Guests can browse the group's journal. Admins can publish/manage posts and edit
the single group profile. The theme follows the red, green, yellow, white, and
gray palette of [scoutsdesapotres.org](https://www.scoutsdesapotres.org).

## Run locally

Requirements: Node.js 24 and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm start
```

The app defaults to the hosted Scout backend through the temporary HTTPS beta
tunnel. If the tunnel URL changes, update the API URL and rebuild the app.
To use a different backend, copy `.env.example` to `.env` and set
`EXPO_PUBLIC_API_URL` to the reachable API URL, including `/api/v1`.

- Physical phone: use your computer's LAN address, not `localhost`.
- Android emulator: the host machine is normally `10.0.2.2`.
- iOS simulator / browser preview: `localhost` can be used when the backend runs
  on the same computer.
- Restart Metro after changing public environment variables.
- Production needs a deployed HTTPS API. Public environment variables are built
  into the app; never put database/SMTP credentials or other secrets in them.

Open the project in a compatible Expo Go client, or use an iOS/Android development
build. The `ios`/`android` scripts open available simulators/emulators; they require
the relevant native development tools. `pnpm web` runs a browser preview of the same
React Native components, not a separately developed website.

For the web preview, configure the backend's `CORS_ORIGINS` to include the preview
origin, for example `http://localhost:8081`. The backend's published media route
must include the cross-origin resource header provided by its current `main` branch.

## Included

- Public feed, category filters, pull-to-refresh, cursor pagination, and post detail.
- Search/discover with category/content filters and stale-request cancellation.
- Single group profile, Posts/Videos tabs, editable logo/cover/name/description.
- Image viewing with zoom/previous/next controls; inline video with native controls.
- Admin login, secure native token storage, session rotation, logout, password recovery.
- Post creation/editing, local preview, image/video picker, attachment ordering,
  sequential uploads, delete confirmation, and unsaved-change protection.
- Device-local autoplay preference, app information, configured contact/privacy links.
- Loading, empty, unavailable, validation, recovery, and retry states.

There are no likes, comments, reposts, following, messages, competition, reader
accounts, signup screens, default admins, push notifications, or background publishing.
Real admin provisioning remains an open product decision. The backend must already
contain an agreed active admin account before real admin login can be used.

## Backend contract

The app uses `/api/v1` endpoints from the backend spec. Guest reads always omit
Authorization. All active admins can manage the group's posts. Media URLs are
resolved against the API origin; they are never used as post-sharing URLs.

Key limits match the backend: title 200 characters, text 20,000, 10 unique ordered
attachments, images up to 10 MiB, MP4 up to 100 MiB. HEIC/HEIF images are converted
to JPEG before upload. MOV and other unsupported video formats receive a clear
error; renaming a file does not convert it. No video transcoding service is included.

New attachments stay local until Publish/Save. Successful upload IDs are retained
for retries. Only newly uploaded unused assets are candidates for discard cleanup;
referenced assets are left intact. Uploads show states, not fabricated percentage
progress. A current upload response is already `ready` on the server.

Publication is never silently retried after a lost/ambiguous response. The app
preserves the form and offers to check Group posts. The backend has no idempotency
keys or concurrent-edit version checks. Existing post media order is preserved
and PATCH sends the complete resulting `mediaIds` list.

## Sessions and recovery

Native iOS/Android credentials use Expo SecureStore. The browser preview keeps
credentials only in memory and intentionally signs out on a full browser reload.
Passwords and bearer/reset tokens are never logged or placed in query parameters
for media. Reset tokens arrive in incoming password-reset links only.

Concurrent protected requests share one token refresh; the entire replacement
token pair is stored before waiting requests resume. Refresh calls are not replayed
after an ambiguous network result, because the backend may already have rotated
the token. Logout ignores late results from the previous session and clears local
admin state. Offline logout cannot guarantee immediate server-side revocation.

Guest content remains available while a stored native session is being restored.
Unverified sessions do not expose admin actions. There is no account-creation UI,
account-editing endpoint, or role-granting flow hidden in Settings.

Forgot password follows the backend's generic acknowledgement. Without configured
SMTP, the app displays the actual recovery-unavailable state. Reset passwords
currently require 12-256 characters plus local confirmation. Email delivery/domain
setup is required for an end-to-end production recovery flow.

## Links, language, and branding

- Native app links use the configured `scoutapotres://` scheme, including
  `scoutapotres://posts/<id>` and `scoutapotres://reset-password?token=<token>`.
- `EXPO_PUBLIC_SHARE_URL`, when configured, supplies a public HTTPS frontend link
  base. Without it, Share uses the installed app's scheme. Web preview copies the
  link; native builds use the system share sheet.
- HTTPS universal/app links and a browser fallback require a real domain and
  association-file setup. No fake hosted frontend or production URL is configured.
- English is the initial implementation language. Additional launch languages,
  Arabic RTL, dark mode, and final group logo/app-store assets remain open.
- The SA monogram is a fallback. The group's configured logo/cover replace it in
  content/profile views. Color tokens and contrast details are in
  [the design system](docs/design-system.md).
- Notification controls are omitted while notification delivery is out of scope.
  Local preferences contain autoplay only; no nonfunctional language selector is shown.

## Verify and export

```sh
pnpm typecheck
pnpm test
pnpm exec expo install --check
pnpm export
```

`pnpm test` runs 19 core tests: public/authenticated request separation, session
restore, concurrent refresh, logout races, ambiguous writes, multipart handling,
media URL restrictions, validation, and pagination deduplication. Tests are
self-contained and need no running backend or real credentials.

Expo export produces iOS/Android Hermes bundles and a web preview in `dist/`.
These are bundle checks, not signed IPA/APK builds. Select app identifiers,
signing credentials, deployment targets, and store assets before release.

Browser integration verification was also performed against a disposable real
MongoDB/Express backend: guest browsing/filtering/search, post detail, image zoom,
group videos, admin login, preview/publish/edit/delete, mixed image/video upload
and ordering, group editing, discard confirmation, logout, recovery-unavailable
feedback, and protected/invalid deep links. No fixtures or credentials are seeded
by the shipped app. See [verification notes](docs/verification.md).

## Structure

- `app/`: Expo Router tabs, route wrappers, and admin layout.
- `src/screens/`: journal, settings, auth, composer, group editor, media/detail screens.
- `src/api/`: DTO validation, public/protected clients, trusted-origin media URLs.
- `src/auth/`: refresh coordination and secure-storage-independent session state.
- `src/features/`: queries, post rows, media playback, attachments, discard guard.
- `src/ui/`: shared controls, accessible dialogs, theme tokens.
- `tests/`: pure core/session tests.

## Current verification limits

No iOS/Android simulator or signed device build was available in this environment.
Native device checks remain necessary for OS photo permissions, HEIC conversion,
video codecs, backgrounding, secure storage behavior, safe areas, accessibility,
and real app links. Production API/SMTP hosting and admin provisioning are not
created by this frontend task.

The current dependency audit reports two moderate transitive tooling advisories
in `glob` and `minimatch`; no high/critical advisories were reported in that check.
Their patched versions require major dependency changes, so they have not been
forced across Expo's build toolchain. Recheck them when updating the SDK/toolchain.
