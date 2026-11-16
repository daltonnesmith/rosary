export function isAndroidApp(runtime = globalThis.Capacitor) {
  return runtime?.isNativePlatform?.() === true && runtime.getPlatform?.() === 'android';
}
export async function saveAndroidBackup(data, filename, runtime = globalThis.Capacitor) {
  if (!isAndroidApp(runtime) || typeof runtime.Plugins?.StillwaterBackup?.save !== 'function') {
    throw new Error('The Android backup file picker is unavailable. Keep the app open and try again.');
  }
  return runtime.Plugins.StillwaterBackup.save({ data, filename });
}
