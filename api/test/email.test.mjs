import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { handle, resolveSubject } from '../email/login.mjs';

test('email sign-in binds a short-lived PKCE transaction to the initiating browser', async () => {
  process.env.EMAIL_COOKIE_KEY = randomBytes(32).toString('base64');
  process.env.EMAIL_OIDC_SECRET = 'test-fixture';
  const origin = 'https://yellow-coast-010c33a0f.3.azurestaticapps.net';
  const post = {method:'POST',headers:{origin}};
  const a = await handle('start',post);
  assert.equal(a.status,200);
  const url = new URL(a.body.url);
  assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  assert.ok(url.searchParams.get('nonce'));
  assert.equal(a.cookies[0].httpOnly,true);
  assert.equal((await handle('start',{...post,headers:{origin:'https://example.invalid'}})).status,403);
  assert.equal((await handle('start',{...post,headers:{origin,'x-stillwater-link':'unconfirmed'}})).status,403);
  assert.equal((await handle('callback',{method:'GET',headers:{}})).status,403);
  assert.equal((await handle('profile',{method:'GET',headers:{cookie:`__Host-stillwater-email=${a.cookies[0].value}`}})).status,401);
});

test('email link requires a new or already matching association; it never replaces a different journal', async () => {
  let value;
  const blob = { async uploadData(data,{conditions}) {
    assert.equal(conditions.ifNoneMatch,'*');
    if (value) throw Object.assign(new Error(),{statusCode:412});
    value=data;
  },async downloadToBuffer(){return value;} };
  assert.equal(await resolveSubject(blob,'subject','first'),'first');
  assert.equal(await resolveSubject(blob,'subject',null),'first');
  await assert.rejects(resolveSubject(blob,'subject','second'),/another journal/);
});
