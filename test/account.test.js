import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createAccount, claimAccount, sessionKey, supportsAccounts } from '../src/account.js';
import { emptyState, sequence, STORAGE_KEY, validateState } from '../src/core.js';

function journal(text) {
  const state = emptyState();
  const when = '2026-03-01T18:00:00.000Z';
  state.progress = { set: 'joyful', fatima: true, step: sequence('joyful', true).findIndex(s => s.decade && s.prayer === 'father'), stage: 'mystery', startedAt: when };
  state.reading.selectedPlan = 'gospels';
  state.reading.gospels.progress = { ...state.reading.gospels.next, step: 3 };
  state.notes.push({ id: 'my-note', date: '2026-03-01', updatedAt: when, text });
  return validateState(state);
}

function device(t) {
  const values = new Map(), writes = [], cloud = new Map(), messages = [];
  const storage = {
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  const d = { id: 'A', online: true, changed: 0, writes, cloud, messages, storage };
  let version = 0;
  const send = async (path, opts) => {
    if (!d.online) throw new Error('Offline');
    if (path === '/.auth/me') return Response.json({ clientPrincipal: d.id && { userId: d.id } });
    assert.equal(path, '/api/profile');
    assert.equal(opts.headers['X-Stillwater-Account'], d.id);
    const saved = cloud.get(d.id) ?? { state: null, version: null };
    if (opts.method === 'GET') return Response.json(saved);
    const body = JSON.parse(opts.body);
    writes.push({ id: d.id, method: opts.method, ...body });
    assert.equal(opts.headers['Content-Type'], 'application/json');
    if (body.version !== saved.version) return new Response(null, { status: 409 });
    if (opts.method === 'DELETE') {
      cloud.delete(d.id);
      return new Response(null, { status: 204 });
    }
    assert.equal(opts.method, 'PUT');
    const etag = `"${++version}"`;
    cloud.set(d.id, { state: body.state, version: etag });
    if (d.hold) await d.hold;
    return Response.json({ version: etag });
  };
  d.open = (delay = 5000) => {
    const a = createAccount({ user: { id: d.id }, storage, session: storage.getItem(sessionKey),
      send, changed: () => { d.changed++; }, status: m => messages.push(m), delay });
    t.after(() => a.stop());
    return a;
  };
  return d;
}

test('enrollment separates guests and accounts, restores exact progress without creating completions', async t => {
  const d = device(t);
  const guest = journal('guest');
  d.storage.setItem(STORAGE_KEY, JSON.stringify(guest));
  const a = d.open();
  assert.equal(a.draft, null);
  await a.flush();
  assert.equal(d.writes.length, 0);
  await a.restore({ guest });
  await a.flush();
  assert.deepEqual(d.cloud.get('A').state, guest);
  d.id = 'B';
  const b = d.open();
  assert.equal(b.draft, null);
  const remote = journal('B only');
  d.cloud.set('B', { state: remote, version: '"remote"' });
  await assert.rejects(b.restore({ guest }), /already has a journal/);
  await b.restore();
  assert.deepEqual(b.draft.state, remote);
  await b.flush();
  assert.equal(d.writes.length, 1);
  assert.deepEqual(JSON.parse(d.storage.getItem(STORAGE_KEY)), guest);
});

test('debounces edits; edits during a PUT are sent with its acknowledged version', async t => {
  const d = device(t), a = d.open(5);
  await a.restore();
  a.save(journal('first'));
  a.save(journal('second'));
  let finish;
  d.hold = new Promise(resolve => { finish = resolve; });
  await t.waitFor(() => assert.equal(d.writes.length, 1));
  a.save(journal('third'));
  finish();
  await t.waitFor(() => assert.equal(a.draft.dirty, false));
  assert.deepEqual(d.writes.map(w => [w.state.notes[0].text, w.version]), [['second', null], ['third', '"1"']]);
});

test('offline draft survives reopening; 409 pauses retries without deleting either copy', async t => {
  const d = device(t), a = d.open();
  await a.restore({ guest: journal('start') });
  await a.flush();
  d.online = false;
  a.save(journal('offline draft'));
  await a.flush();
  assert.equal(a.draft.dirty, true);
  a.stop();
  const b = d.open();
  d.online = true;
  d.cloud.set('A', { state: journal('other device'), version: '"other"' });
  await b.restore();
  await b.flush();
  assert.equal(b.conflict, true);
  assert.equal(b.draft.state.notes[0].text, 'offline draft');
  assert.equal(b.draft.version, '"1"');
  await b.flush();
  assert.equal(d.writes.length, 2);
  await assert.rejects(b.remove(), /Cloud journal changed/);
  assert.equal(d.cloud.get('A').state.notes[0].text, 'other device');
  await b.restore({ discard: true });
  assert.deepEqual(b.draft.state, journal('other device'));
  assert.equal(b.draft.dirty, false);
  await b.remove();
  assert.equal(d.storage.getItem(b.key), null);
  assert.equal(d.cloud.has('A'), false);
});

test('stale tab, changed identity and sign-out during PUT cannot update another draft', async t => {
  for (const reason of ['tab', 'identity', 'during-put']) {
    const d = device(t), a = d.open();
    await a.restore({ guest: journal('private') });
    if (reason === 'tab') d.storage.setItem(a.key, 'another tab');
    if (reason === 'identity') d.id = 'B';
    let release;
    if (reason === 'during-put') d.hold = new Promise(resolve => { release = resolve; });
    const pending = a.flush();
    if (release) {
      await t.waitFor(() => assert.equal(d.writes.length, 1));
      d.storage.setItem(sessionKey, 'logout');
      release();
    }
    await pending;
    assert.equal(d.changed, 1);
    assert.equal(a.draft.dirty, true);
    assert.equal(d.writes.length, release ? 1 : 0);
    assert.equal(d.cloud.has('B'), false);
    assert.throws(() => a.save(journal('stale')), /changed/);
  }
});

test('invalid or deleted remote document cannot silently replace a saved account copy', async t => {
  const d = device(t), a = d.open();
  await a.restore({ guest: journal('saved') });
  await a.flush();
  d.cloud.set('A', { version: '"broken"', state: {} });
  await assert.rejects(a.restore());
  d.cloud.delete('A');
  await assert.rejects(a.restore(), /deleted/);
  assert.deepEqual(a.draft.state, journal('saved'));
  await a.restore({ discard: true });
  assert.equal(a.draft.state.progress, null);
  assert.deepEqual(a.draft.state.completions, []);
});

test('only the production PWA is eligible; a second account editor is refused', async () => {
  const origin = 'https://yellow-coast-010c33a0f.3.azurestaticapps.net';
  assert.equal(supportsAccounts(origin, false), true);
  for (const other of [origin + '.example', 'http://localhost', 'https://example.github.io']) assert.equal(supportsAccounts(other, false), false);
  assert.equal(supportsAccounts(origin, true), false);
  await assert.rejects(claimAccount({ request: async (_, opts, claim) => {
    assert.equal(opts.ifAvailable, true);
    return claim(null);
  } }, 'A'), /another tab/);
});

test('service worker bypasses auth and profile even on offline navigations', async () => {
  const listeners = {};
  const origin = 'https://example.test';
  const self = { location: { origin }, registration: { scope: origin + '/' }, addEventListener: (type, f) => { listeners[type] = f; } };
  vm.runInNewContext(await readFile(new URL('../sw.js', import.meta.url), 'utf8'), { self, URL });
  for (const path of ['/.auth/me', '/.auth/login/aad', '/.auth/logout', '/api/profile']) {
    for (const mode of ['navigate', 'same-origin']) {
      listeners.fetch({ request: { url: origin + path, method: 'GET', mode }, respondWith: () => assert.fail('intercepted private request') });
    }
  }
});
