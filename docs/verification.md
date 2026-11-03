# Verification record

Date: 2026-11-03. Verification covers this initial frontend implementation and the
existing Express/MongoDB API. Production deployment and app-store publication
are not part of this record.

## Automated core checks

- TypeScript checking.
- 19 Vitest tests covering request/session boundaries and content validation.
- SDK dependency compatibility check.
- Expo exports for iOS, Android, and web.

## Browser integration checks

The React Native web preview was exercised at a 390 x 844 viewport with Chromium
against the real Express service and a disposable MongoDB replica set. Admin
fixtures, test images/video, and sample posts existed only in that test backend.

- Guest has no create/manage controls.
- Category filtering, search, and opening complete posts.
- Image viewing and zoom controls.
- Group profile and its Videos tab.
- Admin login through the actual authentication endpoint.
- Composer preview, closing preview, and publishing.
- Editing and confirmed deletion.
- Editing the single group profile.
- System file picker, image/video uploads, reordering, and mixed post publication.
- Discard confirmation; Cancel retains the draft; Discard returns to management.
- Logout removes admin controls while public browsing continues.
- Correct UI when the backend has no configured recovery email provider.
- Guest access to a protected composer link is guarded.
- Invalid password-reset link has a recovery action.

The media integration check exposed the backend's default same-origin resource
policy. Its file endpoint was adjusted to permit rendering from the frontend origin,
after the existing publication/admin check. The backend's 22 integration tests,
type checking, and build passed with that change. Private assets remain protected.

## Remaining native/release checks

Physical iOS/Android device checks have not been performed here. Verify picker
permissions, HEIC conversion, MP4 codecs, video focus/background behavior, secure
storage, large text/screen readers, gestures/safe areas, and real app links.
Choose bundle/package IDs, language scope, signing, deployment URLs, and the real
admin-provisioning process before a production release.

Dependency audit: two moderate transitive tooling advisories (`glob`, `minimatch`)
were reported, with no high/critical findings in that run. They remain recorded
rather than forcing incompatible major overrides into Expo's toolchain.
