const { createHash } = require('node:crypto');

const LIMIT = 2_000_000;
class RequestError extends Error {
  constructor(status) { super(); this.status = status; }
}
const fail = status => { throw new RequestError(status); };
const reply = (status, body, extraHeaders) => ({
  status,
  headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json', ...extraHeaders },
  body
});

function accountKey(headers) {
  let principal;
  try {
    principal = JSON.parse(Buffer.from(headers['x-ms-client-principal'], 'base64').toString('utf8'));
  } catch { fail(401); }
  if (typeof principal?.identityProvider !== 'string' || !principal.identityProvider.trim() ||
      typeof principal.userId !== 'string' || !principal.userId.trim() ||
      !Array.isArray(principal.userRoles) || !principal.userRoles.includes('authenticated')) fail(401);
  if (headers['x-stillwater-account'] !== principal.userId) fail(403);
  return createHash('sha256').update(JSON.stringify([principal.identityProvider, principal.userId])).digest('hex');
}

function payload(req, headers) {
  if (headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') fail(415);
  // Measure the wire representation, not a re-serialized body (which drops whitespace).
  const raw = req.bufferBody ?? req.rawBody;
  if (Number(headers['content-length']) > LIMIT) fail(413);
  if (!Buffer.isBuffer(raw) && typeof raw !== 'string') fail(400);
  if (Buffer.byteLength(raw) > LIMIT) fail(413);
  let value;
  try { value = JSON.parse(Buffer.isBuffer(raw) ? new TextDecoder('utf-8', { fatal: true }).decode(raw) : raw); }
  catch { fail(400); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400);
  return value;
}

// Accept one strong, quoted entity tag, never a wildcard or list of validators.
function validTag(tag) {
  return typeof tag === 'string' && tag.length <= 256 && tag.endsWith('"') && /^"[A-Za-z0-9._:-]+"$/.test(tag);
}

async function readProfile(blob, validateState) {
  const download = await blob.download();
  const stream = download.readableStreamBody;
  const chunks = [];
  let bytes = 0;
  try {
    if (!validTag(download.etag) || download.contentLength > LIMIT) throw new Error();
    for await (const chunk of stream) {
      bytes += chunk.length;
      if (bytes > LIMIT) throw new Error();
      chunks.push(chunk);
    }
    const state = validateState(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    return { state, version: download.etag };
  } finally { stream?.destroy(); }
}

function makeHandler(getBlob, validateState) {
  return async req => {
    const method = req.method;
    try {
      const headers = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k.toLowerCase(), v]));
      const key = accountKey(headers);
      if (method === 'GET') return reply(200, await readProfile(getBlob(key), validateState));
      if (method !== 'PUT' && method !== 'DELETE') {
        return reply(405, { error: 'method_not_allowed' }, { Allow: 'GET, PUT, DELETE' });
      }

      const { state, version } = payload(req, headers);
      if (!(method === 'PUT' && version === null) && !validTag(version)) fail(400);
      if (method === 'DELETE') {
        await getBlob(key).delete({ conditions: { ifMatch: version } });
        return reply(200, { state: null, version: null });
      }
      let clean;
      try { clean = validateState(state); } catch { fail(400); }
      const data = Buffer.from(JSON.stringify(clean));
      if (data.length > LIMIT) fail(413);
      const result = await getBlob(key).upload(data, data.length, {
        conditions: version === null ? { ifNoneMatch: '*' } : { ifMatch: version },
        blobHTTPHeaders: { blobContentType: 'application/json' }
      });
      if (!validTag(result.etag)) throw new Error();
      return reply(200, { state: clean, version: result.etag });
    } catch (error) {
      if (error instanceof RequestError) return reply(error.status, { error: 'request_rejected' });
      if (error.code === 'BlobNotFound' && error.statusCode === 404) {
        return method === 'GET' ? reply(200, { state: null, version: null }) : reply(409, { error: 'conflict' });
      }
      if (method !== 'GET' && (error.statusCode === 412 ||
          (error.statusCode === 409 && error.code === 'BlobAlreadyExists'))) return reply(409, { error: 'conflict' });
      return reply(500, { error: 'storage_unavailable' });
    }
  };
}

module.exports = { makeHandler };
