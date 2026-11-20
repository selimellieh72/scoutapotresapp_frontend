# Scout Apôtres app

Expo/React Native client for the Scout Apôtres public feed and seeded group accounts.

## Product model

- Anyone can browse one shared public feed containing posts from every group.
- Each group is its own account and logs in with seeded credentials.
- There are no nested administrator accounts and no signup flow.
- Group pages show public profile information only; they do not contain separate feeds.
- A logged-in group can manage only its own profile and posts.
- A post supports text with zero or one image. Selecting an image replaces the composer placeholder.

## Development

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm start
```

The API base URL is configured through `EXPO_PUBLIC_API_URL`. Secure native storage is used for session tokens; web storage is limited to the browser implementation.

## Main flows

- Home: the global chronological feed and public group directory.
- Search/Discover: posts across the global feed plus matching group profiles.
- Group profile: identity, description, logo, and cover only.
- Group login: seeded username/password, recovery, session refresh, and logout.
- Composer: create or edit the current group's post with an optional single image.
- Manage posts: the authenticated group's own posts, even though all published results appear on Home.
- Edit profile: the authenticated group's own public identity.

The frontend does not include demo posts or hardcoded account data. It relies on the API for groups, posts, ownership, and authentication.
