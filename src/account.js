import { emptyState, validateState } from './core.js';

const production = 'https://yellow-coast-010c33a0f.3.azurestaticapps.net';
export const supportsAccounts = (origin, native) => !native && origin === production;
export const sessionKey = 'stillwater-account-session';
const validVersion = value => typeof value === 'string' && !!value.trim() && value.trim() !== '*';
const cacheKey = id => `stillwater-account:${encodeURIComponent(id)}`;

async function request(path, options = {}) {
  return fetch(path, {
    credentials: 'same-origin', cache: 'no-store', redirect: 'error',
    signal: AbortSignal.timeout(10000), ...options,
  });
}

export async function identity(send = request, email = false) {
  const response = await send(email ? '/api/email/me' : '/.auth/me');
  if (!response.ok) throw new Error('Could not check your sign-in session. Reconnect and retry.');
  const { clientPrincipal } = await response.json();
  if (clientPrincipal === null) return null;
  if (!clientPrincipal || typeof clientPrincipal.userId !== 'string' || !clientPrincipal.userId)
    throw new Error('Unrecognized sign-in response. No account data was opened.');
  return { id: clientPrincipal.userId, name: clientPrincipal.userDetails || clientPrincipal.userId };
}

// Hold this origin-wide lock until navigation. A second tab must not advance
// the same local draft's base version while the first tab is editing it.
export function claimAccount(locks, id) {
  if (!locks) throw new Error('This browser cannot safely sync across tabs. Use the device journal instead.');
  return new Promise((resolve, reject) => {
    locks.request(cacheKey(id), { ifAvailable: true }, lock => {
      if (!lock) return reject(new Error('Account journal open in another tab. Close it and retry here.'));
      return new Promise(release => resolve(release));
    }).catch(reject);
  });
}

export function createAccount({ user, storage, session, send = request, status, changed, delay = 1000 }) {
  const key = cacheKey(user.id);
  let raw = storage.getItem(key), draft = null;
  let timer, busy = false, conflict = false, stopped = false;
  if (raw !== null) {
    const saved = JSON.parse(raw);
    if (typeof saved.dirty !== 'boolean' || !(saved.version === null || validVersion(saved.version)))
      throw new Error('Unreadable account draft. Existing storage was not changed.');
    draft = { ...saved, state: validateState(saved.state) };
  }
  function guard() {
    if (stopped || storage.getItem(sessionKey) !== session || storage.getItem(key) !== raw) {
      invalidate();
      throw new Error('Account or tab changed. Reopen before continuing.');
    }
  }
  function stop() { stopped = true; clearTimeout(timer); }
  function invalidate() {
    if (!stopped) { stop(); changed(); }
  }
  function persist(value) {
    guard();
    const next = JSON.stringify(value);
    storage.setItem(key, next);
    raw = next;
    draft = value;
  }
  async function check() {
    guard();
    if ((await identity(send, session?.startsWith('email:')))?.id !== user.id) invalidate();
    guard();
  }
  async function api(method, body) {
    await check();
    guard();
    const headers = { 'X-Stillwater-Account': user.id };
    if (body) headers['Content-Type'] = 'application/json';
    const response = await send(session?.startsWith('email:') ? '/api/email/profile' : '/api/profile', { method, headers, ...(body && { body: JSON.stringify(body) }) });
    guard();
    if ([401, 403].includes(response.status)) {
      await check();
      throw new Error('Access to the cloud journal was denied. Sign out and sign in again.');
    }
    if (response.status === 409) {
      conflict = true;
      throw new Error('Cloud journal changed. Your device copy was kept. Export it in Your journal, then choose Restore cloud copy.');
    }
    if (!response.ok) throw new Error(`Account request failed (${response.status}). Retry when connected.`);
    return response;
  }
  async function readCloud() {
    const { state, version } = await (await api('GET')).json();
    guard();
    if (state === null && version === null) return { state: null, version };
    if (!validVersion(version)) throw new Error('Invalid cloud version. No data was replaced.');
    return { state: validateState(state), version };
  }
  // Called before showing the journal, or with editing disabled. Never merge
  // snapshots: a null progress pointer and a last-prayer pointer are distinct.
  async function restore({ guest, discard = false } = {}) {
    if (busy) throw new Error('Wait for the current sync to finish.');
    if (draft?.dirty && !discard) return;
    busy = true;
    clearTimeout(timer);
    try {
      const cloud = await readCloud();
      if (cloud.state && guest) throw new Error('This account already has a journal. Open it separately; no device entries were uploaded.');
      if (!cloud.state && draft?.version && !discard) {
        conflict = true;
        throw new Error('The cloud copy was deleted. Export this device copy before choosing Restore cloud copy.');
      }
      persist({ state: cloud.state ?? (guest ? validateState(guest) : emptyState()), version: cloud.version, dirty: !!guest });
      conflict = false;
    } finally { busy = false; }
  }
  function schedule() {
    clearTimeout(timer);
    if (!stopped && !conflict && draft?.dirty) timer = setTimeout(flush, delay);
  }
  async function flush() {
    if (busy || stopped || conflict || !draft?.dirty) return;
    clearTimeout(timer);
    busy = true;
    const sent = draft;
    try {
      status('Syncing…');
      const { version } = await (await api('PUT', { state: sent.state, version: sent.version })).json();
      if (!validVersion(version)) throw new Error('Cloud save not confirmed. Your device copy was kept.');
      // Edits made during the PUT belong on top of its acknowledged version.
      persist({ ...draft, version, dirty: sent !== draft });
      status(draft.dirty ? 'Changes waiting to sync.' : 'Synced.');
      schedule();
    } catch (error) {
      if (!stopped) status(`${error.message} Your changes are saved on this device.`);
    } finally { busy = false; }
  }
  function save(state) {
    if (!draft) throw new Error('Account sync has not been enabled.');
    persist({ ...draft, state: validateState(state), dirty: true });
    if (!conflict) status('Saved on this device; waiting to sync.');
    schedule();
  }
  async function remove() {
    if (busy) throw new Error('Wait for the current sync to finish.');
    clearTimeout(timer);
    busy = true;
    try {
      if (draft.version === null) {
        const cloud = await readCloud();
        if (cloud.version !== null) throw new Error('Cloud journal changed. Restore it before deleting.');
      } else await api('DELETE', { version: draft.version });
      guard();
      storage.removeItem(key);
      raw = draft = null;
      stop();
    } finally { busy = false; }
  }
  return { get draft() { return draft; }, get busy() { return busy; }, get key() { return key; },
    get conflict() { return conflict; }, check, restore, save, schedule, flush, remove, stop, invalidate };
}
