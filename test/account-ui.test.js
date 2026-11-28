import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { openHostedJournal } from '../src/account-ui.js';
import { emptyState, validateState } from '../src/core.js';

// Each visit gets a fresh document, as it would after the auth redirect.
test('hosted account controls: opt-in, sync, sign out, switch, restore, delete', async t => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const ids = [...html.matchAll(/id="(account-[^"]+)"/g)].map(m => m[1]);
  const data = new Map(), profiles = new Map(), requests = [], redirects = [];
  let id, confirmed = false, journal, controls;
  const guest = emptyState();
  guest.notes.push({ id: 'guest', date: '2026-03-01', updatedAt: '2026-03-01T10:00:00.000Z', text: 'shared device entry' });
  const localStorage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
  const replaceGlobal = (key, value) => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]);
  };
  const window = { addEventListener() {}, confirm: () => confirmed };
  replaceGlobal('window', window);
  replaceGlobal('document', { body: {}, getElementById: key => controls[key], addEventListener() {} });
  replaceGlobal('location', { replace: url => redirects.push(url), reload: () => redirects.push('reload') });
  replaceGlobal('navigator', { locks: { request: async (_, __, fn) => fn({}) } });
  replaceGlobal('localStorage', localStorage);
  replaceGlobal('fetch', async (path, opts) => {
    assert.equal(opts.credentials, 'same-origin');
    assert.equal(opts.cache, 'no-store');
    if (path === '/.auth/me') return Response.json({ clientPrincipal: id ? { userId: id, userDetails: `${id}@example.invalid` } : null });
    assert.equal(path, '/api/profile');
    assert.equal(opts.headers['X-Stillwater-Account'], id);
    requests.push(opts.method);
    if (opts.method === 'GET') return Response.json(profiles.get(id) ?? { state: null, version: null });
    const body = JSON.parse(opts.body);
    assert.equal(body.version, profiles.get(id)?.version ?? null);
    if (opts.method === 'DELETE') {
      profiles.delete(id);
      return new Response(null, { status: 204 });
    }
    profiles.set(id, { state: body.state, version: '"saved"' });
    return Response.json({ version: '"saved"' });
  });
  const visit = async () => {
    journal?.stop();
    document.body = {};
    controls = Object.fromEntries(ids.map(key => [key, { hidden: true, addEventListener(_, fn) { this.click = fn; } }]));
    journal = await openHostedJournal(() => guest);
    assert.equal(document.body.inert, false);
  };
  const click = async name => {
    assert.equal(controls['account-' + name].hidden, false, `${name} should be visible`);
    await controls['account-' + name].click();
  };
  t.after(() => journal?.stop());
  await visit();
  await click('login');
  assert.match(redirects.at(-1), /^\/\.auth\/login\/aad/);
  id = 'A';
  await visit();
  await click('copy');
  assert.deepEqual(requests, [], 'sign-in and declined consent must not touch the private API');
  confirmed = true;
  await click('copy');
  assert.equal(redirects.at(-1), 'reload', controls['account-status'].textContent);
  await visit();
  await journal.flush();
  assert.deepEqual(profiles.get(id).state, validateState(guest));
  assert.match(controls['account-workspace'].textContent, /Account journal · A.*Synced/);
  const edited = { ...guest, notes: [] };
  journal.save(edited);
  await click('logout');
  assert.match(redirects.at(-1), /^\/\.auth\/logout/);
  await visit(); // Logout request failed: cookie still says A.
  assert.equal(journal, undefined);
  assert.equal(controls['account-login'].hidden, true);
  id = null;
  await visit();
  await click('login');
  id = 'B';
  await visit();
  await click('enable');
  await visit();
  assert.deepEqual(journal.draft.state.notes, []);
  assert.equal(profiles.has('B'), false, 'no account A or guest data uploaded');
  profiles.set('B', { state: validateState(guest), version: '"B"' });
  await click('restore');
  await visit();
  assert.equal(journal.draft.version, '"B"');
  await click('delete');
  assert.equal(profiles.has('B'), false);
  id = 'A';
  await visit();
  assert.equal(journal.draft.dirty, true, 'signout preserved A’s unsynced draft');
  await journal.flush();
  assert.deepEqual(profiles.get('A').state.notes, []);
  assert.equal(guest.notes.length, 1);
});
