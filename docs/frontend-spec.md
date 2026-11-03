# Groupe Scout des Apôtres - Frontend specification

Status: specification with an initial implementation in this repository.
Date: 2026-11-03
Frontend repository: https://github.com/selimellieh72/scoutapotresapp_frontend
Backend repository: https://github.com/selimellieh72/scoutapotresapp_backend
Backend contract reviewed: commit `2605366c0cb6bee28c02898f29c05d456f5a3ab4`.

## 1. Scope and decision status

### Confirmed by the user

- React Native frontend with an X / Twitter-style look and a post feed.
- Theme based on https://www.scoutsdesapotres.org (user clarification during
  implementation): red `#CA3737`, green `#0D9523`, yellow `#FFEE14`, white and grays.
- One Scout group, Groupe Scout des Apôtres, with several admin accounts.
- Guests can see posts without logging in. Login is for admin actions.
- Admins can publish posts.
- Keep the editable singleton group profile: name, description, logo, and cover.
- No likes, comments, reposts, following, or direct messages. Exclude related
  controls, counters, routes, and empty placeholders.
- Leave account creation/provisioning undecided. No signup flow is specified.
- Exclude the entire competition module from the first version.

### Proposed defaults for review

All screen layouts, navigation, libraries, and interaction details below are
proposals unless identified above as confirmed or imposed by the implemented API.

- Target iOS and Android phones, with layouts that also remain usable on tablets.
- Use TypeScript and Expo. Expo Router is the proposed navigation option.
- Bottom tabs: Home, Search, Settings. Access the single group profile from the
  group logo/name in posts and the Home header.
- Admins manage posts and the group through Settings and contextual actions.
- Use a light, text-first interface initially with the website palette above.
  Final assets, dark mode, supported languages, and platform minimum versions remain open.

### Included screens

Home feed; Search/Discover; Group Profile; Post Detail; full-screen media viewer;
Admin Login; Forgot Password; Reset Password; Create/Edit Post; Post Preview;
Manage Posts; Edit Group Profile; Settings; About; Contact and Privacy Policy links.

### Excluded or deferred

Competition; social interaction features; reader accounts; registration and admin
invitations; multiple-group management; dedicated Reels/TikTok feed; push delivery;
background upload queues; server-side unpublished drafts; a guaranteed offline mode;
and a separate web frontend. Video posts remain part of the normal feed/profile.

## 2. User modes and navigation

| Mode | Available behavior |
| --- | --- |
| Guest | Feed, search, post details, group profile, published media, sharing, settings |
| Admin session being restored | Guest browsing continues; admin controls wait for validation |
| Active admin | Guest features plus publishing, post management, profile editing, own account details, logout |
| Session expired/revoked | Return to guest capabilities; offer login when an admin action is requested |

Do not gate app launch or public content behind a login screen. Navigation guards
improve the client experience; server authorization remains authoritative.

### Proposed navigation structure

| Destination | Entry point | Presentation |
| --- | --- | --- |
| Home | Bottom tab; initial destination | Feed stack |
| Search | Bottom tab | Discover followed by search results |
| Settings | Bottom tab | Preferences and admin/account links |
| Group Profile | Group logo/name or Home header | Stack screen |
| Post Detail | Post body/title or Read more | Stack screen |
| Media Viewer | Image or full-screen video control | Full-screen viewer |
| Admin Login / Forgot Password | Settings / login link | Authentication stack |
| Reset Password | Configured reset link | Authentication stack |
| Create Post | Admin floating + button or Manage Posts | Full-screen composer |
| Edit Post | Admin overflow menu or Manage Posts | Same composer in edit mode |
| Post Preview | Composer preview action | Preview screen; preserve form on return |
| Manage Posts / Edit Group | Settings; Edit Group also from profile | Admin screens |

The floating + button is visible only to a validated active admin and must not
cover content or native bottom navigation. No Competition tab is shown. Preserve
feed position and filters when returning from detail/profile screens. Android
Back and iOS back gestures follow normal stack behavior; leaving a changed form
requires a discard confirmation.

## 3. Visual and interaction direction

- Build a compact, text-first timeline with group avatars, clear typography,
  subtle row separators, category chips, and inline images/videos.
- Each post has the group identity rather than an individual admin as its public
  author. Do not invent usernames, follower counts, badges, or engagement numbers.
- Proposed foundation: light surfaces, dark readable text, muted metadata, and
  one accent color selected from the final group branding.
- Proposed spacing scale: 4, 8, 12, 16, 24, 32 logical units. Use reusable spacing,
  color, type, and radius tokens rather than per-screen arbitrary values.
- Use system fonts initially, comfortable body text, scalable headings, safe-area
  insets, and keyboard-aware forms. Empty logo/cover fields use neutral placeholders.
- Keep the actions footer focused on external Share. Admin edit/delete actions
  appear in an overflow menu. No blank social-action row is reserved.
- Loading, empty, error, offline, upload, and confirmation states must be designed
  alongside successful screens. Avoid layout jumps as media loads.

The website palette now supplies the colors. Red is the initial primary action
color, green supports the theme, and yellow highlights the brand stripe. Exact
assets, final language scope, and dark mode remain open.

## 4. Home feed and post details

### Home

- Display the group identity and category filters: All, Article, Atelier,
  Installation, Jeux. API values are `article`, `atelier`, `installation`, `jeux`.
- Display published posts newest first, matching the backend's ordering.
- Each row shows group logo/name, publication date, category, optional title,
  text, ordered media, Share, and admin overflow actions when authorized.
- Proposed long-text preview: four lines with Read more leading to Post Detail.
- Pull-to-refresh reloads the first page. Infinite scrolling requests the next
  cursor once at a time; deduplicate rows by post ID.
- Selecting a category resets pagination and uses a distinct query/cache key.
- Initial loading uses skeleton rows; loading another page uses an inline footer.
- No posts, no posts in a category, failed initial load, and failed next-page load
  have separate messages/actions. Keep existing rows when a later page fails.

### Post Detail

- Show the complete title/text, full publication date, category, group identity,
  ordered media, and Share. Empty optional titles occupy no space.
- Text selection is supported. Render plain text; do not render stored text as HTML.
- Tap a group identity to open its profile. Media taps operate the viewer/player
  without accidentally triggering navigation on the surrounding post row.
- A `404` displays Post unavailable with a return action and invalidates stale
  cached references. A connectivity error offers Retry instead.
- An admin can edit/delete through the same management actions used elsewhere.

Use server UTC timestamps and format them for the user's locale/time zone. Do
not re-sort an edited post to the top: its original `publishedAt` is retained.

## 5. Search and group profile

### Search / Discover

- An empty search shows recent posts and a card for the single group, from
  `GET /discover`. It does not imply a directory of multiple Scout groups.
- Search has a clear action, keyboard submit, and a proposed 350 ms debounce.
- Send searches for 2-200 characters. For a single character, prompt the user to
  enter at least two; avoid sending requests the backend will reject.
- Cancel or ignore stale results when the query changes. Clear restarts Discover.
- Results have a group section (zero or one result) and a paginated posts section.
- Category and content-type filters affect post results. Content types are All,
  Text, Images, Videos; All omits `contentType` from the request.
- Show no-results, loading, error, and next-page retry states. Search history,
  personalization, and relevance ranking are outside the first version.

### Group Profile

- Display cover, logo, name, short description, and Posts / Videos tabs.
- Posts uses `/posts`; Videos uses `/posts?contentType=video`. All content belongs
  to this one group, so no client group ID filter is required.
- Category filters combine with the selected tab and reset pagination.
- Active admins see Edit Group. Guests do not see editing controls.
- Missing logo/cover/description must produce a complete, usable layout.

## 6. Admin login, recovery, and settings

### Login

- Entry point: Admin Login in Settings. No public signup link or reader-login prompt.
- Fields: email/username and password, with password visibility toggle, submit
  progress, validation, generic invalid-credentials feedback, and Forgot password.
- Login success establishes the admin session and reveals admin controls without
  forcing the user to restart or leave public browsing.
- Account provisioning is unresolved; do not add test/default credentials to the
  app or imply that readers can register to become admins.

### Password recovery

- Forgot Password submits an identifier and displays the same acknowledgement
  for known and unknown accounts, matching the backend response.
- `503 EMAIL_UNAVAILABLE` shows that recovery is temporarily unavailable; do not
  falsely claim an email was sent. `429` shows a retry-later message.
- Reset Password opens from a configured link carrying a `token` parameter.
  Fields: new password and confirmation. Current backend rule: 12-256 characters.
- Validate confirmation locally; submit only `{ token, password }`.
- Expired/invalid/used tokens offer a new recovery request. Success clears this
  device's old admin session and returns to login; do not automatically sign in.
- The reset domain, app-link configuration, and live SMTP setup are release
  dependencies. Do not log reset tokens or place them in analytics events.

### Settings

| Guest | Active admin additions |
| --- | --- |
| Language, once launch languages are chosen | Own read-only account information |
| Video autoplay preference | Manage Posts |
| About / Contact / Privacy Policy | Edit Group Profile |
| Admin Login | Logout |

Language and autoplay preferences stay on the device. Proposed autoplay default:
Off. Notification delivery is deferred; proposed first-version UI omits an active
notification toggle and permission prompt. This defers the PDF's notification
preferences until a functioning notification feature is scoped.

About/contact/privacy content comes from `/app-info`. Hide unavailable contact
or URL actions instead of inventing addresses/links. Open valid contact/privacy
destinations with native system handlers. `/me` supplies account details; the
backend has no account-editing endpoint, so no editable account settings are promised.

## 7. Create, preview, edit, and delete posts

### Composer

- Admin-only screen with required category, optional title, plain-text editor,
  ordered media attachments, Preview, and Publish / Save Changes.
- Match current backend limits: title 200 characters; text 20,000 characters;
  at most 10 unique media assets. A title alone is not sufficient content.
- Support text-only, image-only, video-only, and mixed posts. Trim blank text for
  validation; preserve intentional internal formatting and line breaks.
- Attach from the system photo/video picker. Show per-file preview, removal,
  order controls, upload progress/state, and retry for failed uploads.
- Local previews can be shown before upload. Publishing waits until all selected
  attachments have successful server responses and `state: ready`.
- Disable duplicate submission while a mutation is pending. Keep form values
  through validation/network failures and during a successful session refresh.
- Preview uses the same post rendering components as the feed/detail and clearly
  remains unpublished. It does not need a backend preview endpoint.
- Form state is in memory for this version; persistent/background drafts are not
  promised. Confirm discard when leaving an edited form.

### Manage Posts and edit

- List all of the group's posts with category filters, pagination, and create,
  edit, delete actions. Label them Group posts, not My posts.
- All active admins can manage any post. Fetch current post details when opening
  edit; preserve existing asset IDs and order.
- PATCH sends supported content fields. When attachments change, `mediaIds`
  contains the complete resulting ordered list, including retained existing IDs.
- After success, refresh/invalidate affected feed, search, discover, profile, and
  detail queries. Group edits also invalidate group identity displayed in posts.
- Delete requires confirmation; remove the post only after server confirmation.
  A failure leaves it available with Retry. A concurrent `404` means it is unavailable.
- The backend does not expose document versions or edit-conflict detection.
  Concurrent edits can overwrite previous edits; stricter conflict handling would
  require an agreed API change.

### Ambiguous write results

The backend has no idempotency-key support. Do not automatically repeat a create
or upload request after a timeout/lost connection that may have happened after
server success. Explain that publishing could not be confirmed and offer to
refresh Group posts before trying again. Never claim a timeout guarantees failure.

## 8. Media selection, upload, and playback

| Current backend input | Limit / behavior |
| --- | --- |
| JPEG, PNG, WebP image | 10 MiB maximum input; returned as WebP |
| MP4 video | 100 MiB maximum input; dimensions/duration verified by server |
| Attachments per post | 10; images/videos can be mixed |
| Group logo/cover | Ready image assets only |

- Request photo-library permissions when needed; cancellation leaves the form
  unchanged. Denied/limited access has a useful explanation and Settings action
  where supported. Camera capture is optional and not required for this draft.
- Check file size/type where available for fast feedback. Server validation is
  authoritative; renaming HEIC/MOV files does not make them JPEG/MP4.
- iOS HEIC/MOV selection and Android codec compatibility need device verification.
  Unsupported files receive a clear error; automatic conversion/transcoding is
  not promised without selecting and testing a conversion path.
- Upload one file at a time initially using multipart field `file`, preserving
  the native filename/MIME metadata. Let the networking layer set multipart boundaries.
- Retain IDs for successfully uploaded files during a form session; retry only
  failed files. A successful current upload response is already `ready`.
- Only assets newly uploaded for this form are candidates for cleanup on discard.
  Do not delete existing post/profile assets. A cleanup `409` means the asset is
  referenced; leave it intact. Automated orphan cleanup remains a backend decision.
- The backend's current media URL is relative, such as
  `/api/v1/media/<id>/file`; resolve it against the API origin exactly once.
- Published media loads without an admin token. A preview of an unattached server
  asset requires an authenticated image/video source, or use its local picker URI.
  Never place bearer tokens in URL query parameters.
- Show media at an intentional aspect ratio with a bounded feed height; the
  full-screen viewer shows the full image and permits zoom/swiping in attachment order.
- Videos have visible play/pause, mute, seek, and full-screen controls. Pause when
  leaving the screen or backgrounding the app; permit only one playing feed video.
- Autoplay, when enabled, is muted and limited to the visible video. Off requires
  a deliberate play action. Avoid preloading every video in a long feed.
- Media failures offer retry without breaking the surrounding post. Backend video
  thumbnails/transcoding/caption tracks are unavailable; do not assume they exist.

## 9. Edit Group Profile

- Admin-only form for name, description, logo, and cover.
- Current limits: name 1-120 characters, description up to 2,000 characters.
- New logo/cover images use the same upload pipeline, followed by PATCH `/group`.
- Omitting an image field keeps it; sending `null` removes it. Use returned media
  IDs rather than local file URIs in profile updates.
- Save progress, image-upload failures, inline errors, retry, and unsaved-change
  confirmation follow the composer conventions.
- Proposed logo crop is square and cover crop is wide; final aspect ratios and
  cropping controls remain design choices. Validate images before submitting.

## 10. API mapping and client data boundaries

All API paths below are prefixed by `/api/v1`; configure origin/environment
separately. Public reads omit Authorization even when the viewer is an admin.

| Frontend behavior | Backend method/path | Response/use |
| --- | --- | --- |
| Feed, profile Posts/Videos, Manage Posts | GET `/posts` | `{ data: Post[], page }`; category/contentType/cursor/limit |
| Post detail/editor loading | GET `/posts/:postId` | `{ data: Post }` |
| Group profile | GET `/group` | `{ data: GroupProfile }` |
| Search | GET `/search` | `{ data: { groups, posts }, page }`; q plus post filters |
| Discover | GET `/discover` | `{ data: { group, posts }, page }` |
| Login | POST `/auth/login` | `{ identifier, password }` -> session bundle and admin |
| Refresh | POST `/auth/refresh` | `{ refreshToken }` -> replacement session bundle |
| Logout | POST `/auth/logout` | `{ refreshToken }` -> 204 |
| Restore/read admin profile | GET `/me` | Authenticated `{ data: Admin }` |
| Request/reset password | POST `/auth/forgot-password`, `/auth/reset-password` | Generic message or reset result |
| Upload | POST `/media` | Authenticated multipart file -> `{ data: Media }` |
| Asset status/unused cleanup | GET / DELETE `/media/:mediaId` | Guest access only when published; deletion admin-only |
| Media bytes | GET `/media/:mediaId/file` | Access checked per request; supports byte ranges |
| Publish/edit/delete | POST `/posts`; PATCH / DELETE `/posts/:postId` | Admin-only; create/edit return `{ data: Post }`, delete 204 |
| Save group | PATCH `/group` | Admin-only `{ data: GroupProfile }` |
| About/contact/languages | GET `/app-info` | `{ data: { about, contactEmail, privacyPolicyUrl, supportedLanguages } }` |

Use explicit DTOs for Post, GroupProfile, Media, Admin, SessionBundle, Page, and
ApiError. Public post DTOs expose group identity, category/title/text, ordered
media, `publishedAt`, and `updatedAt`; they do not expose admin attribution.
The group DTO has `logo`/`cover` media objects, while group writes use media IDs.

Cursor pagination is opaque: return `page.nextCursor` unchanged. Page size defaults
to 20 and cannot exceed 100. Changing category, content type, or search query
starts a new first page. Mixed posts may match both image and video filters;
`contentType=text` means posts with no media.

Validate API shapes at the client boundary and map error codes/field errors to
useful UI. Handle empty arrays, null images/contact fields, and 204 bodies without
assuming JSON is present. Do not add unsupported fields to strict request schemas.

## 11. Session handling and application state

This section specifies technical client behavior, not additional product screens.

- Keep public queries separate from authenticated requests. Public browsing must
  remain usable when admin login/session restoration fails.
- Store the session bundle in platform secure storage, not plain preferences,
  source code, logs, or analytics. Treat access tokens as opaque, not JWTs.
- Current API lifetimes: access 15 minutes; session at most 30 days. Both tokens
  rotate on refresh and the previous access token becomes invalid.
- Use one shared refresh operation for concurrent requests. Queue waiting admin
  requests and persist the complete new token pair before releasing them. Parallel
  refreshes using the same refresh token revoke the session on the backend.
- A protected `401` can trigger one refresh and one retry. Auth/refresh/logout
  endpoints bypass that interceptor; do not recurse or refresh indefinitely.
- Authentication calls that use refresh/reset tokens omit an expired access header.
- Refresh rejection means clear admin state and return to guest capabilities.
  A temporary network failure leaves credentials unverified rather than proving
  revocation. Disable protected actions until validation succeeds.
- Do not blindly retry a refresh after an ambiguous network result: the server
  may already have rotated the token. Reauthentication may be required.
- Logout serializes with refresh, attempts server revocation, then clears local
  credentials/private cache and ignores late results from the old session. Guest
  browsing continues. Offline logout clears this device; server revocation cannot
  be guaranteed while disconnected.
- A logged-out/deactivated session cannot regain admin UI from stale `/me` or
  queued request results. Use a session-generation guard for late async responses.
- Keep server content in a query cache keyed by filters; transient form state is
  separate. Store ordinary device preferences separately from credentials.
- In-memory cached public content may remain visible during a temporary connection
  failure with a stale/offline indicator. No persistent offline cache/write queue
  is promised. Never enqueue a publish operation to run silently later.

## 12. Sharing, links, accessibility, and performance

### Sharing and incoming links

- Use the native share sheet with a configured public post link and optional title.
  Sharing creates no in-app repost or engagement count.
- Link opening supports a post ID and password-reset token on app cold/warm start.
  Public post links open without a login requirement; missing posts show unavailable.
- Validate incoming IDs/parameters. Attach bearer credentials only to the trusted
  API origin, including private media requests; never forward them to external URLs.
- The sharing domain, app scheme, universal/app-link association, and browser
  fallback are open. Do not ship fake placeholder share URLs or expose raw media
  storage URLs as the post link. These are release dependencies, not existing APIs.

### Accessibility and localization

- Support VoiceOver/TalkBack, meaningful control labels/roles/selected states,
  logical focus, scalable text, reduced-motion preferences, and readable contrast.
- Proposed interactive targets are at least 48 x 48 logical units. Selection and
  errors must be understandable without relying on color alone.
- Label media position/type without inventing descriptive alt text the API does
  not supply. A future alt-text/caption feature would need an agreed content model.
- Extract UI strings for localization. Choose launch languages and fallback before
  release; if Arabic is selected, include full RTL layout/device checks.
- Test large text with category chips, navigation, forms, and long group/post text.

### Performance

- Use a virtualized list with stable post IDs, bounded pages, and reusable rows.
  Keep media fetching/player lifetimes tied to visibility and screen lifecycle.
- Reserve media space from server dimensions. Avoid rendering the full feed inside
  an unbounded scroll view or holding ten video files as JS base64 strings.
- Debounce search, guard overlapping page requests, and stop playback/observers
  when a screen loses focus. Define measured performance targets on agreed test
  devices before release; this spec does not claim existing frame-rate results.

## 13. Proposed technical structure

| Area | Proposal / status |
| --- | --- |
| UI | React Native confirmed; TypeScript proposed |
| App workflow | Expo proposed; bare React Native remains an option until repo review |
| Navigation | Expo Router if Expo is adopted; tabs plus stack/modal screens |
| Server state | Shared query/cache layer with filter-aware keys; library not locked |
| API | Typed service layer with separate public/authenticated clients |
| Credentials | Platform secure storage; Expo SecureStore if using Expo |
| Device preferences | Local nonsecret persistence; library not locked |
| Media | Native picker, image component, and video player; Expo modules if Expo |
| Components | PostRow, PostMedia, GroupIdentity, CategoryFilters, Loading/Empty/ErrorState, Composer, FormField |

Organize screens/routes, features, reusable UI, API/DTOs, session management,
preferences, design tokens, and tests separately. Pin compatible library versions
when implementation begins; no SDK/version upgrade is authorized by this draft.

Provide environment examples, setup/run instructions, mock fixtures for component
tests, and documented iOS/Android build steps during implementation. Production
API URLs are configuration; database and SMTP secrets never belong in the app.

## 14. Acceptance criteria for eventual implementation

1. A fresh install opens usable public content without login or signup.
2. Guests can browse/filter/page posts, search/discover, open the group profile,
   read full posts, and view published images/videos.
3. No competition, likes, comments, reposts, following, or messaging controls/routes
   exist. No hidden signup flow or hardcoded admin account is introduced.
4. Admin session restoration does not block guest browsing or expose admin controls
   before validation; logout/revocation returns to guest capabilities.
5. Concurrent protected requests share one refresh; the token pair is persisted
   consistently. Refresh replay/errors never cause an infinite login/refresh loop.
6. Feed filters reset cursors; returning from a post preserves position; tied dates
   and repeated page triggers do not render duplicate rows.
7. Search ignores stale responses and handles empty, one-character, no-result,
   error, and paginated-result states correctly.
8. An admin can publish/edit text-only, image-only, video-only, and mixed posts,
   preview them, reorder attachments, and receive useful validation feedback.
9. Duplicate submit taps cannot produce multiple concurrent creates. Ambiguous
   writes offer verification rather than automatic duplicate publishing.
10. Private uploaded media previews work without leaking tokens into URLs; guests
    cannot access unattached uploads. Media URLs are resolved against the correct origin.
11. Delete confirmation, failures, shared-media cleanup conflicts, and removed posts
    leave caches/forms in a recoverable and accurate state.
12. Group edits update profile and post identity; image removal uses explicit nulls.
13. Recovery handles generic acknowledgement, unavailable email, expired links,
    password confirmation, reset success, and clearing the previous admin session.
14. Autoplay preferences, background pausing, and one-player-at-a-time behavior work
    on both target platforms. Unsupported media formats fail clearly.
15. Large text, screen readers, native Back/keyboard behavior, photo permissions,
    and network failures are verified on agreed iOS/Android devices.
16. Client code ships no credentials/provider secrets and does not promise push,
    registration, offline publishing, or other unsupported backend capabilities.

These are acceptance targets. The initial implementation has core automated tests,
cross-platform bundle checks, and browser integration verification. See
`docs/verification.md` for evidence and remaining native device checks.

## 15. Open decisions and dependencies

| Decision / dependency | Current status |
| --- | --- |
| Existing frontend source | Correct repository discovered as scoutapotresapp_frontend; it was empty before implementation |
| Expo/bare workflow, TypeScript, navigation/cache libraries | Initial implementation uses Expo 58, TypeScript, Expo Router, and TanStack Query |
| iOS/Android targets, OS minimums, test devices | Both phone platforms proposed; final baselines open |
| Brand assets, final layouts, dark mode | Website palette applied; final assets and dark mode remain open |
| Launch languages and fallback | Open; RTL testing required if applicable |
| Real admin provisioning | Explicitly undecided; required to use real admin features |
| Reachable development/production API and HTTPS | Backend code exists; no production deployment has been performed |
| Share/reset domains and app-link setup | Open; required for complete external sharing/recovery |
| SMTP live configuration | Optional backend capability; needed for real reset email delivery |
| HEIC/MOV conversion and mobile MP4 codecs | Verify before promising supported picker/export behavior |
| Push and notification preferences | Delivery deferred; inactive toggle omitted in this proposal |
| App identifiers, signing, store assets, release distribution | Open; app-store publishing is outside this task |

## 16. Sources and precedence

- Direct user decisions in this chat take precedence over the original PDF.
- Project context from the user records those decisions. The original PDF remains
  reference material; its competition and multiple-group navigation are superseded.
- [Backend specification](https://github.com/selimellieh72/scoutapotresapp_backend/blob/main/docs/backend-spec.md), [backend setup](https://github.com/selimellieh72/scoutapotresapp_backend/blob/main/README.md),
  and implemented routes/DTOs were reviewed at the backend commit identified above.
  Integration details in this document describe that code, not hypothetical endpoints.
- The originally recorded frontend URL was truncated. Repository discovery later
  resolved the actual `scoutapotresapp_frontend` repository, which was empty.
- [Group website](https://www.scoutsdesapotres.org) supplies the user-requested
  color palette. The implementation records its tokens in `src/ui/theme.ts`.
- [React Native FlatList](https://reactnative.dev/docs/flatlist) and
  [accessibility documentation](https://reactnative.dev/docs/accessibility) support
  the proposed list/accessibility implementation approaches.
- If Expo is adopted, consult [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/),
  [ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/), and
  [Video](https://docs.expo.dev/versions/latest/sdk/video/) for current platform
  behavior. Their availability does not imply this project has already adopted Expo.
