// Sends an uploaded iOS build to the public TestFlight group and submits it for Beta App Review.
// Run by .github/workflows/eas-release.yml after the EAS release workflow finishes.
//
// Env: ASC_API_KEY_P8 (contents of the .p8), ASC_KEY_ID, ASC_ISSUER_ID, ASC_APP_ID,
//      BUILD_NUMBER (CFBundleVersion), PUBLIC_GROUP (TestFlight group name), WHATS_NEW (optional)
import { createPrivateKey, sign } from 'node:crypto';

const env = (name, fallback) => {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const key = createPrivateKey(env('ASC_API_KEY_P8'));
const keyId = env('ASC_KEY_ID');
const issuerId = env('ASC_ISSUER_ID');
const appId = env('ASC_APP_ID');
const buildNumber = env('BUILD_NUMBER');
const groupName = env('PUBLIC_GROUP', 'Public Testers');
const whatsNew = (process.env.WHATS_NEW || 'Bug fixes and improvements.').slice(0, 4000);

const b64url = (input) => Buffer.from(input).toString('base64url');

function token() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const body = b64url(JSON.stringify({ iss: issuerId, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' }));
  const signature = sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' });
  return `${head}.${body}.${b64url(signature)}`;
}

async function asc(path, { method = 'GET', body } = {}) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const error = new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 800)}`);
    error.status = res.status;
    throw error;
  }
  return json;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForProcessedBuild() {
  const deadline = Date.now() + 60 * 60 * 1000;
  while (Date.now() < deadline) {
    const { data } = await asc(
      `/v1/builds?filter[app]=${appId}&filter[version]=${encodeURIComponent(buildNumber)}` +
        '&filter[preReleaseVersion.platform]=IOS&fields[builds]=version,processingState',
    );
    const build = data[0];
    const state = build?.attributes.processingState;
    console.log(`Build ${buildNumber}: ${state ?? 'not uploaded yet'}`);
    if (state === 'VALID') return build;
    if (state === 'FAILED' || state === 'INVALID') throw new Error(`Build ${buildNumber} processing ${state}`);
    await sleep(30_000);
  }
  throw new Error(`Build ${buildNumber} was not processed by App Store Connect within 60 minutes`);
}

const build = await waitForProcessedBuild();

const groups = await asc(`/v1/apps/${appId}/betaGroups?limit=200`);
const group = groups.data.find((g) => g.attributes.name === groupName);
if (!group) throw new Error(`TestFlight group "${groupName}" not found`);

const localizations = await asc(`/v1/builds/${build.id}/betaBuildLocalizations`);
const existing = localizations.data.find((l) => l.attributes.locale === 'en-US') ?? localizations.data[0];
if (existing) {
  await asc(`/v1/betaBuildLocalizations/${existing.id}`, {
    method: 'PATCH',
    body: { data: { type: 'betaBuildLocalizations', id: existing.id, attributes: { whatsNew } } },
  });
} else {
  await asc('/v1/betaBuildLocalizations', {
    method: 'POST',
    body: {
      data: {
        type: 'betaBuildLocalizations',
        attributes: { locale: 'en-US', whatsNew },
        relationships: { build: { data: { type: 'builds', id: build.id } } },
      },
    },
  });
}

await asc(`/v1/betaGroups/${group.id}/relationships/builds`, {
  method: 'POST',
  body: { data: [{ type: 'builds', id: build.id }] },
});
console.log(`Added build ${buildNumber} to "${groupName}"`);

const previous = await asc(`/v1/builds/${build.id}/betaAppReviewSubmission`).catch((error) => {
  if (error.status === 404) return { data: null };
  throw error;
});
if (previous.data) {
  console.log(`Already submitted for Beta App Review: ${previous.data.attributes.betaReviewState}`);
} else {
  const submission = await asc('/v1/betaAppReviewSubmissions', {
    method: 'POST',
    body: { data: { type: 'betaAppReviewSubmissions', relationships: { build: { data: { type: 'builds', id: build.id } } } } },
  });
  console.log(`Submitted for Beta App Review: ${submission.data.attributes.betaReviewState}`);
}
