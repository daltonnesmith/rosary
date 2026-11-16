import test from 'node:test';
import assert from 'node:assert/strict';
import { isAndroidApp, saveAndroidBackup } from '../src/platform.js';

test('only the injected native Android runtime selects native behavior, never a normal Android browser', () => {
  assert.equal(isAndroidApp({}), false);
  assert.equal(isAndroidApp({ isNativePlatform: () => false, getPlatform: () => 'web' }), false);
  assert.equal(isAndroidApp({ isNativePlatform: () => true, getPlatform: () => 'ios' }), false);
  assert.equal(isAndroidApp({ isNativePlatform: () => true, getPlatform: () => 'android' }), true);
});
test('native backups pass complete JSON to the system picker and distinguish cancellation from failure', async () => {
  const data = '{"notes":[{"text":"A synthetic reflection."}],"version":2}';
  const filename = 'stillwater-backup-2026-11-16.json';
  const runtime = {
    isNativePlatform: () => true, getPlatform: () => 'android',
    Plugins: { StillwaterBackup: { save: async options => {
      assert.deepEqual(options, { data, filename });
      return { cancelled: false };
    } } },
  };
  assert.deepEqual(await saveAndroidBackup(data, filename, runtime), { cancelled: false });
  runtime.Plugins.StillwaterBackup.save = async () => ({ cancelled: true });
  assert.deepEqual(await saveAndroidBackup(data, filename, runtime), { cancelled: true });
  runtime.Plugins.StillwaterBackup.save = async () => { throw new Error('Storage denied'); };
  await assert.rejects(saveAndroidBackup(data, filename, runtime), /Storage denied/);
  await assert.rejects(saveAndroidBackup(data, filename, {}), /unavailable/);
  delete runtime.Plugins.StillwaterBackup;
  await assert.rejects(saveAndroidBackup(data, filename, runtime), /unavailable/);
});
