const CACHE = 'stillwater-shell-v31';
// Profile artwork and the tester are local, just like the prayer windows.
const FILES = ['./', './index.html', './src/style.css', './src/app.js', './src/core.js', './src/dates.js', './src/platform.js', './src/rosary-ui.js', './src/reading.js', './src/reading-ui.js', './src/scripture.js', './src/liturgical.js', './src/liturgical-ui.js', './src/liturgical-data.js', './SCRIPTURE-LICENSE.txt', './CALENDAR-LICENSE.txt', './NATIVE-LICENSE.txt', './APACHE-2.0.txt', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
FILES.push('./src/fasting.js');
FILES.push('./src/profile.js', './icons/profile-windows.svg', './src/mystery-passages.js', './chapel/chapel.html', './chapel/chapel.css', './chapel/chapel.js', './chapel/medals.js', './chapel/windows.svg');
FILES.push('./icons/awards.svg', './icons/1952.110.jpg', './icons/1954.834.jpg', './icons/1916.802.jpg', './icons/1950.251.jpg', './icons/1931.449.jpg');
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('stillwater-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  const relative = url.pathname.slice(new URL(self.registration.scope).pathname.length);
  // Only serve the app shell; never intercept unrelated same-origin resources.
  if (request.mode !== 'navigate' && !FILES.some(file => file.slice(2) === relative)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    try { return await fetch(request); }
    catch (error) {
      if (request.mode === 'navigate') {
        const shell = await cache.match(new URL('./index.html', self.registration.scope));
        if (shell) return shell;
      }
      throw error;
    }
  }));
});
