import { identity, sessionKey, createAccount, claimAccount } from './account.js';

const byId = id => document.getElementById(id);

// Changing workspaces always navigates: dialogs, note drafts, reading and
// chapel controllers from the old workspace must never commit to the new one.
export async function openHostedJournal(getGuest) {
  const panel = byId('account-panel'), banner = byId('account-workspace');
  panel.hidden = banner.hidden = false;
  banner.textContent = 'Checking which journal to open…';
  document.body.inert = true;
  let user, account, session, releaseLock, leaving = false, active = false;
  function status(message) {
    byId('account-status').textContent = message;
    banner.textContent = active ? `Account journal · ${user.name} · ${message}` : 'Device journal · not synced · Account settings in Profile';
  }
  function leave(url) {
    leaving = true;
    account?.stop();
    document.body.inert = true;
    document.body.hidden = true;
    if (url) location.replace(url); else location.reload();
  }
  function action(id, handler) {
    const button = byId(`account-${id}`);
    button.hidden = false;
    button.addEventListener('click', async () => {
      document.body.inert = true;
      try { await handler(); }
      catch (error) { status(error.message); }
      finally { if (!leaving) document.body.inert = false; }
    });
  }
  async function redirect(logout) {
    if (logout && !window.confirm('Sign out and return to the shared device journal? Unsynced saved changes will stay on this browser for this account. Unsaved form text will be lost.')) return;
    if (logout && session?.startsWith('email:')) {
      const res = await fetch('/api/email/logout',{method:'POST',credentials:'same-origin',cache:'no-store'});
      if (!res.ok) throw new Error('Reconnect to sign out of email before sharing this browser.');
    }
    localStorage.setItem(sessionKey, `${logout ? 'out' : 'in'}:${crypto.randomUUID()}`);
    if (logout && navigator.onLine === false) leave();
    else leave(logout ? '/.auth/logout?post_logout_redirect_uri=/' : '/.auth/login/aad?post_login_redirect_uri=/');
  }
  async function startEmail(link = false) {
    if (link && !window.confirm(`Allow a verified email address to open the existing journal for ${user.name}? Use only an inbox you control.`)) return;
    const res = await fetch('/api/email/start',{method:'POST',credentials:'same-origin',cache:'no-store',
      headers:link ? {'X-Stillwater-Link':user.id} : {}});
    if (!res.ok) throw new Error('Could not start email sign-in. If Microsoft is still signed in, sign out first.');
    const {url} = await res.json();
    if (new URL(url).origin !== 'https://stillwaterjournaldn.ciamlogin.com') throw new Error('Unexpected sign-in address.');
    localStorage.setItem(sessionKey, `email:${crypto.randomUUID()}`);
    leave(url);
  }
  window.addEventListener('pageshow', event => { if (event.persisted) leave(); });
  window.addEventListener('pagehide', () => { document.body.hidden = true; account?.stop(); releaseLock?.(); });
  window.addEventListener('storage', event => {
    if (event.key === null || event.key === sessionKey || (account && event.key === account.key)) leave();
  });
  try {
    session = localStorage.getItem(sessionKey);
    user = await identity(undefined,session?.startsWith('email:'));
    if (session !== localStorage.getItem(sessionKey)) { leave(); return; }
    if (user) action('logout', () => redirect(true));
    if (!user || session?.startsWith('out:')) {
      status(user ? 'Account journal closed. Finish signing out before sharing this browser.' : 'No account needed. Sign in only if you want to sync.');
      if (!user) {
        action('login', () => redirect(false));
        action('email', () => startEmail());
      }
      return;
    }
    byId('account-user').textContent = `Signed in as ${user.name}.`;
    if (!session?.startsWith('email:')) action('link', () => startEmail(true));
    releaseLock = await claimAccount(navigator.locks, user.id);
    account = createAccount({ user, storage: localStorage, session, status, changed: () => leave() });
    if (!account.draft) {
      status('Sync is off. Choose which journal to use below.');
      const enable = async copy => {
        const prompt = copy
          ? `Upload a copy of the shared device journal, including private notes and history, to ${user.name}? Only do this if all its entries are yours.`
          : `Enable private journal sync for ${user.name}? New activity in the account journal will upload. Existing device entries will not.`;
        if (!window.confirm(prompt)) return;
        await account.restore(copy ? { guest: getGuest() } : {});
        leave();
      };
      action('enable', () => enable(false));
      action('copy', () => enable(true));
      return;
    }
    active = true;
    try {
      await account.restore();
      status(account.draft.dirty ? 'Changes waiting to sync.' : 'Cloud copy checked.');
    } catch (error) { status(`${error.message} Using the saved account copy.`); }
    action('restore', async () => {
      if (!window.confirm('Replace this account’s device copy with its current cloud journal? This discards unsynced changes. Export a backup first if you need them.')) return;
      await account.restore({ discard: true });
      leave();
    });
    action('delete', async () => {
      if (!window.confirm(`Permanently delete the cloud journal and this browser’s account copy for ${user.name}? Export a backup first. The shared device journal is not affected.`)) return;
      await account.remove();
      localStorage.removeItem(`${account.key}:appearance`);
      leave();
    });
    action('retry', async () => {
      if (account.conflict) return status('Export your device copy, then choose Restore cloud copy to resolve the conflict.');
      if (account.draft.dirty) await account.flush(); else leave();
    });
    async function recheck() {
      try { await account.check(); account.schedule(); }
      catch (error) { if (!leaving) status(`${error.message} Saved edits will wait for reconnection.`); }
    }
    window.addEventListener('online', recheck);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) recheck(); });
    account.schedule();
    return account;
  } catch (error) {
    status(`${error.message} Only the shared device journal is open.`);
    if (!user) action('logout', () => redirect(true));
    action('retry', () => leave());
  } finally { if (!leaving) document.body.inert = false; }
}
