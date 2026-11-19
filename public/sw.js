/**
 * Service Worker —— PWA 离线能力（零依赖，原生 JS）
 *
 * 缓存策略（与项目历史"缓存坑"对齐，宁可保守）：
 *  - 导航(HTML) 与 JS/CSS：network-first —— 代码更新永远优先取新，离线才回落缓存，避免"改了不生效"。
 *  - /data/materials.json：stale-while-revalidate —— 体积大，离线也能练，在线时后台静默更新。
 *  - 图标等静态资源：cache-first。
 *  - /api/*：仅走网络，不缓存（评分/录音/进度必须实时；离线返回 503 JSON）。
 *  - POST 请求一律不拦截（TTS 合成、录音上传）。
 */
const VERSION = 'v1';
const CACHE = `amread-shell-${VERSION}`;
const SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/style.css',
  '/js/main.js',
  '/js/pwa.js',
  '/js/util.js',
  '/js/state.js',
  '/js/api.js',
  '/js/tts.js',
  '/js/recorder.js',
  '/js/rec-worklet.js',
  '/js/materials.js',
  '/js/practice.js',
  '/js/progress.js',
  '/js/library.js',
  '/js/charts.js',
  '/data/materials.json',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 逐个加入，单个失败不阻断安装
    await Promise.all(SHELL.map((u) => cache.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function networkFirst(request, { fallback } = {}) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const hit = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
    if (hit) return hit;
    if (fallback) {
      const fb = await cache.match(fallback);
      if (fb) return fb;
    }
    throw new Error('offline');
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => { if (res && res.ok) cache.put(request, res.clone()); return res; })
    .catch(() => null);
  return hit || (await refresh) || Response.error();
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok && res.type === 'basic') cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // TTS/录音/评分等 POST 一律直连

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 第三方资源不拦截

  if (url.pathname.startsWith('/api/')) {
    // API 只走网络；离线时给结构化 503，前端能统一提示
    e.respondWith(fetch(req).catch(() => new Response(
      JSON.stringify({ ok: false, error: '当前离线，该功能需要联网' }),
      { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    )));
    return;
  }

  if (req.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    e.respondWith(networkFirst(req, { fallback: '/offline.html' }));
    return;
  }

  if (url.pathname === '/data/materials.json') {
    e.respondWith(staleWhileRevalidate(req));
    return;
  }

  if (/\.(js|css)$/.test(url.pathname)) {
    e.respondWith(networkFirst(req));
    return;
  }

  if (/\.(png|svg|jpg|jpeg|ico|webp|woff2|mp3|wav)$/.test(url.pathname) || url.pathname.startsWith('/icons/')) {
    e.respondWith(cacheFirst(req));
  }
});
