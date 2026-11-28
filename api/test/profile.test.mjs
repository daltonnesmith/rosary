import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { emptyState, validateState } from '../../src/core.js';
import handler from '../profile/profile.cjs';

const user = { userId: 'account-a', identityProvider: 'github', userRoles: ['authenticated'] };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64');
const empty = { state: null, version: null };
const storageError = (statusCode, code) => Object.assign(new Error('private storage detail'), { statusCode, code });

// Model Blob's atomic preconditions. An unconditional call is a test failure.
function fixture() {
  const rows = new Map(), keys = [];
  let generation = 0;
  const getBlob = key => {
    keys.push(key);
    const current = () => {
      if (!rows.has(key)) throw storageError(404, 'BlobNotFound');
      return rows.get(key);
    };
    const compare = tag => {
      assert.equal(typeof tag, 'string');
      if (current().etag !== tag) throw storageError(412, 'ConditionNotMet');
    };
    return {
      async download() {
        const { etag, data } = current();
        return { etag, readableStreamBody: Readable.from([data]), contentLength: data.length };
      },
      async upload(data, length, { conditions }) {
        assert.equal(data.length, length);
        if (conditions.ifNoneMatch === '*') {
          if (rows.has(key)) throw storageError(409, 'BlobAlreadyExists');
        } else compare(conditions.ifMatch);
        const etag = `"v${++generation}"`;
        rows.set(key, { data, etag });
        return { etag };
      },
      async delete({ conditions }) {
        compare(conditions.ifMatch);
        rows.delete(key);
      }
    };
  };
  return { rows, keys, request: client(getBlob) };
}

function client(getBlob) {
  const handle = handler.makeHandler(getBlob, validateState);
  return async (method, body, overrides, raw = JSON.stringify(body)) => {
    const res = await handle({
      method, rawBody: raw,
      headers: { 'X-MS-CLIENT-PRINCIPAL': encode(user), 'X-Stillwater-Account': user.userId,
        'Content-Type': 'application/json; charset=utf-8', ...overrides }
    });
    assert.equal(res.headers['Cache-Control'], 'no-store');
    return res;
  };
}

test('create, update and delete use storage preconditions and expose the matching ETag', async () => {
  const { request } = fixture();
  assert.deepEqual((await request('GET')).body, empty);
  const create = { state: { ...emptyState(), ignored: 'not persisted' }, version: null };
  const race = await Promise.all([request('PUT', create), request('PUT', create)]);
  assert.deepEqual(race.map(r => r.status).sort(), [200, 409]);
  const first = race.find(r => r.status === 200).body;
  assert.deepEqual(first.state, emptyState());
  assert.deepEqual((await request('GET')).body, first);
  const update = { ...first, state: { ...first.state, fatima: false } };
  const second = await request('PUT', update);
  assert.equal(second.status, 200);
  assert.notEqual(second.body.version, first.version);
  assert.equal((await request('PUT', first)).status, 409);
  assert.equal((await request('DELETE', { version: first.version })).status, 409);
  assert.deepEqual((await request('GET')).body, second.body);
  const del = { version: second.body.version };
  assert.deepEqual((await request('DELETE', del)).body, empty);
  assert.equal((await request('DELETE', del)).status, 409);
  assert.equal((await request('PUT', second.body)).status, 409);
  assert.deepEqual((await request('GET')).body, empty);
});

test('every method requires the SWA authenticated role and matching account before storage access', async () => {
  const { request, keys } = fixture();
  for (const method of ['GET', 'PUT', 'DELETE', 'POST']) {
    for (const principal of ['', 'bad', encode({ ...user, userRoles: ['anonymous'] }), encode({ ...user, identityProvider: '' })]) {
      assert.equal((await request(method, {}, { 'X-MS-CLIENT-PRINCIPAL': principal })).status, 401);
    }
    for (const account of [undefined, 'account-b']) {
      assert.equal((await request(method, {}, { 'X-Stillwater-Account': account })).status, 403);
    }
  }
  assert.equal((await request('POST')).status, 405);
  assert.deepEqual(keys, []);
});

test('client fields cannot select a blob; the provider and user both isolate profiles', async () => {
  const { request, keys } = fixture();
  await request('PUT', { state: emptyState(), version: null, userId: 'account-b' });
  for (const principal of [{ ...user, userId: 'account-b' }, { ...user, identityProvider: 'aad' }]) {
    assert.deepEqual((await request('GET', undefined, { 'X-MS-CLIENT-PRINCIPAL': encode(principal),
      'X-Stillwater-Account': principal.userId })).body, empty);
  }
  assert.equal(new Set(keys).size, 3);
  for (const key of keys) assert.match(key, /^[a-f0-9]{64}$/);
});

test('writes reject invalid state, missing or unsafe versions, media type, and malformed JSON', async () => {
  const { request, keys } = fixture();
  for (const method of ['PUT', 'DELETE']) {
    assert.equal((await request(method, {}, { 'Content-Type': 'text/plain' })).status, 415);
    assert.equal((await request(method, {}, {}, '{')).status, 400);
    for (const version of [undefined, '*', '"one", "two"', 'W/"weak"', '"ok"\n']) {
      assert.equal((await request(method, { state: emptyState(), version })).status, 400);
    }
  }
  assert.equal((await request('DELETE', { version: null })).status, 400);
  assert.equal((await request('PUT', { version: null, state: { ...emptyState(), notes: [1] } })).status, 400);
  assert.deepEqual(keys, []);
});

test('2 MB cap counts actual UTF-8 bytes including whitespace on both write methods', async () => {
  const { request } = fixture();
  const body = JSON.stringify({ state: emptyState(), version: null, extra: 'é' });
  const exact = body.padEnd(2_000_000 - 1);
  assert.equal((await request('PUT', {}, {}, Buffer.from(exact))).status, 200);
  for (const method of ['PUT', 'DELETE']) {
    assert.equal((await request(method, {}, { 'Content-Length': '1' }, exact + ' ')).status, 413);
  }
});

test('corrupt data and missing containers fail closed without leaking storage details', async () => {
  const { request, rows } = fixture();
  await request('PUT', { version: null, state: emptyState() });
  const [row] = rows.values();
  for (const data of ['{"private-note":true}', ' '.repeat(2_000_001)]) {
    row.data = Buffer.from(data);
    assert.equal((await request('GET')).status, 500);
  }
  const broken = client(() => { throw storageError(404, 'ContainerNotFound'); });
  for (const method of ['GET', 'PUT', 'DELETE']) {
    const response = await broken(method, { state: emptyState(), version: '"v1"' });
    assert.equal(response.status, 500);
    assert.doesNotMatch(JSON.stringify(response), /private|ContainerNotFound/);
  }
});
