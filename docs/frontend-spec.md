# Frontend behavior specification

## Public experience

Home displays one chronological feed from `GET /posts`. Posts from all active groups are mixed together and identify their publisher with the group's public name, ID, and logo. Guests can open posts, search, discover groups, and view group profiles without authentication.

A group profile is identity-only: cover, logo, name, and description. It must not request or render a group-specific feed.

## Group accounts

Each group is one seeded account. Login establishes that group identity; there are no child administrator accounts, role selection, account creation, or public signup screens.

An active group session enables:

- creating a post in the global feed;
- managing only posts returned by `GET /me/posts`;
- editing only the current group's profile through `PATCH /me/group`;
- uploading and attaching only the current group's media;
- logging out or recovering the account password.

If session restoration fails, the app returns to guest capabilities and hides management actions.

## Composer

The composer accepts optional title and text plus zero or one image. Choosing an image replaces the visual placeholder. Choosing another image replaces the first selection. Videos and multiple images are not offered. A post must contain text or an image.

Preview uses the authenticated group's public identity. Successful create/edit invalidates the shared feed, discovery/search where applicable, and the current group's management list.

## Routing and data

- `/` and Home use the global post query.
- `/groups/[id]` reads a public profile only.
- the management screen uses `/me/posts`, never a public group-feed endpoint.
- post edit/delete controls appear only when `post.group.id` equals the authenticated group ID.
- all content is API-backed; no demo feed or hardcoded group profile is used.

## Acceptance criteria

1. Posts from two accounts appear in the same guest-visible Home feed.
2. Opening a group shows profile details without a separate post list.
3. A logged-in group sees management controls only for its own posts.
4. Text-only, image-only, and text-plus-one-image posts can be composed.
5. Selecting a second image replaces the previous image instead of adding another.
6. No UI describes the account as an admin or offers group/admin nesting.
