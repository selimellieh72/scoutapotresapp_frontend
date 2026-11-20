# Verification

Run:

```sh
pnpm typecheck
pnpm test
```

Automated coverage includes DTO parsing, group-session state, validation, single-image attachment behavior, API error handling, pagination helpers, and public versus authenticated controls.

Backend integration coverage verifies the end-to-end contract: two seeded group accounts publish into one public feed, ownership blocks cross-group edits, profiles are independently editable, and only zero or one owned image can be attached.

Before release, smoke-test on a device:

1. Browse the shared feed while logged out.
2. Log in as two different group accounts and publish one post from each.
3. Confirm both posts appear together on Home.
4. Confirm each account's Manage Posts screen contains only its own post.
5. Create text-only and one-image posts; replace a selected image before publishing.
6. Open several group profiles and confirm they show identity information without post lists.
