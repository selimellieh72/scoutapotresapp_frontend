// Uploads an Android App Bundle built by EAS to Google Play and releases it on a testing track.
// Run by .github/workflows/eas-release.yml after the EAS build finishes.
//
// While the Play app is still a draft (never rolled out from Play Console), Google only accepts
// draft releases from the API. The script then creates a draft release instead, and someone has
// to press "Review release" / "Start rollout" in Play Console once. After that, releases go live
// on the track automatically.
//
// Env: PLAY_SERVICE_ACCOUNT_JSON (contents of the Google service account key)
//      PLAY_PACKAGE   application id (default com.chikirlik.app)
//      AAB_URL        download URL of the .aab from EAS
//      VERSION_CODE   Android versionCode of that build
//      PLAY_TRACK     internal | alpha (closed testing) | beta (open testing) | production; default alpha
//      WHATS_NEW      optional release notes (first line is used)
import { createSign } from 'node:crypto';

const env = (name, fallback) => {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const account = JSON.parse(env('PLAY_SERVICE_ACCOUNT_JSON'));
const packageName = env('PLAY_PACKAGE', 'com.chikirlik.app');
const aabUrl = env('AAB_URL');
const versionCode = String(env('VERSION_CODE'));
const track = env('PLAY_TRACK', 'alpha');
const language = env('PLAY_LANGUAGE', 'en-US');
const whatsNew = (process.env.WHATS_NEW || 'Bug fixes and improvements.').split('\n')[0].slice(0, 500);

const b64url = (input) => Buffer.from(input).toString('base64url');

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: account.token_uri,
      iat: now,
      exp: now + 3600,
    }),
  )}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(account.private_key).toString('base64url');
  const res = await fetch(account.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Google token request failed: ${JSON.stringify(json).slice(0, 500)}`);
  return json.access_token;
}

const token = await accessToken();
const api = 'https://androidpublisher.googleapis.com';
const app = `/androidpublisher/v3/applications/${packageName}`;

async function play(path, { method = 'GET', body, headers, upload = false } = {}) {
  const res = await fetch(`${api}${upload ? '/upload' : ''}${app}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...headers },
    body: body && !(body instanceof Uint8Array) ? JSON.stringify(body) : body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : {};
}

const edit = await play('/edits', { method: 'POST' });
const editPath = `/edits/${edit.id}`;

const { bundles = [] } = await play(`${editPath}/bundles`);
if (bundles.some((b) => String(b.versionCode) === versionCode)) {
  console.log(`versionCode ${versionCode} is already on Play, skipping upload`);
} else {
  console.log(`Downloading ${aabUrl}`);
  const download = await fetch(aabUrl);
  if (!download.ok) throw new Error(`AAB download failed: ${download.status}`);
  const aab = new Uint8Array(await download.arrayBuffer());
  console.log(`Uploading ${(aab.length / 1e6).toFixed(1)} MB to Play`);
  const uploaded = await play(`${editPath}/bundles?uploadType=media`, {
    method: 'POST',
    upload: true,
    headers: { 'Content-Type': 'application/octet-stream' },
    body: aab,
  });
  if (String(uploaded.versionCode) !== versionCode) {
    throw new Error(`Play read versionCode ${uploaded.versionCode} from the bundle, expected ${versionCode}`);
  }
}

const release = (status) =>
  play(`${editPath}/tracks/${track}`, {
    method: 'PUT',
    body: {
      track,
      releases: [{ versionCodes: [versionCode], status, releaseNotes: [{ language, text: whatsNew }] }],
    },
  }).then(() => play(`${editPath}:commit`, { method: 'POST' }));

try {
  await release('completed');
  console.log(`versionCode ${versionCode} released to "${track}".`);
} catch (error) {
  if (!/draft app/i.test(String(error.message))) throw error;
  await release('draft');
  console.log(
    `::warning::The Play app is still a draft, so versionCode ${versionCode} was saved as a DRAFT release on "${track}". ` +
      'Roll it out once from Play Console (Testing > Closed testing); later builds then go out automatically.',
  );
}
