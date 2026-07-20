/* shavisia.ge service worker.
 *
 * Deliberately conservative: pages and API calls always go to the network
 * (a blacklist check must never serve stale data), so deploys take effect
 * immediately. Only same-origin static icons are cached, and navigations
 * get a small offline fallback page when the network is unreachable. */

const CACHE = "shavisia-v1";

const OFFLINE_HTML = `<!doctype html>
<html lang="ka"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>shavisia.ge</title>
<style>body{background:#000;color:#fff;font-family:sans-serif;display:flex;
align-items:center;justify-content:center;min-height:100vh;margin:0;
text-align:center;padding:24px}</style></head>
<body><div><h1>&#128246;</h1>
<p>ინტერნეტ კავშირი არ არის.<br>სცადეთ თავიდან, როცა ქსელი აღდგება.</p>
</div></body></html>`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // navigations: network first, offline fallback page
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(
        () =>
          new Response(OFFLINE_HTML, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          })
      )
    );
    return;
  }

  // static icons: cache first (they only change with a new filename)
  if (
    url.origin === self.location.origin &&
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(event.request).then(
          (hit) =>
            hit ||
            fetch(event.request).then((res) => {
              if (res.ok) cache.put(event.request, res.clone());
              return res;
            })
        )
      )
    );
  }
  // everything else (API, JS, CSS): straight to the network
});
