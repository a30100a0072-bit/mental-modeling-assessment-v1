// public/sw.js
// 認知幾何 V1 service worker
// 安全策略：
//   - 只快取**靜態資源**（CSS / JS / img / 字體 / 純內容 HTML）
//   - 完全 BYPASS：/api/*、所有跨域 fetch（chiyigo.com IAM）、login.html、dashboard.html、frontchannel-logout.html
//   - 不碰 Authorization header / cookie 流；不快取任何帶 Bearer 或 Set-Cookie 的請求
//   - bump CACHE_VERSION 即可讓所有用戶下次造訪自動更新
//
// 注意：此 SW 只 scope=/，不會攔截到 chiyigo.com 主站。

// ⚠️ 部署紀律：每次 css / js / html 改動上線前都要 bump 這個版號（建議 'mbti-v1-YYYY-MM-DD-NN'）。
//    不 bump 的話 cache-first 的舊使用者下次造訪不會拿到新版（除非檔名變動或他們手動清快取）。
//    SW activate 時會把所有舊版 cache 清掉，所以版號可放心遞增不必怕雪崩。
const CACHE_VERSION = 'mbti-v1-2026-05-03-10';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// 預先快取的核心資源（離線時也能看到首頁殼）
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/global.css',
    '/component.css',
    '/landing.css',
    '/toast.js',
    '/og-image.jpg',
    '/404.html'
];

// 完全不快取（必須走網路 / 跟 IAM 互動）
const NO_CACHE_PATHS = [
    '/login.html',
    '/dashboard.html',
    '/frontchannel-logout.html'
];
const NO_CACHE_PREFIXES = ['/api/'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
            .catch(() => { /* 預快取失敗不阻斷安裝（離線資源缺一兩個沒關係） */ })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys
                .filter(k => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
                .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

function shouldBypass(req, url) {
    // 跨域：直接走網路（chiyigo.com / cdn.jsdelivr.net 等）
    if (url.origin !== self.location.origin) return true;
    // 帶 Authorization 的請求：絕對不碰
    if (req.headers && req.headers.get('Authorization')) return true;
    // 非 GET：不快取
    if (req.method !== 'GET') return true;
    // /api/* 或會員 / 登出頁
    if (NO_CACHE_PREFIXES.some(p => url.pathname.startsWith(p))) return true;
    if (NO_CACHE_PATHS.includes(url.pathname)) return true;
    return false;
}

function isHtmlRequest(req, url) {
    if (req.destination === 'document') return true;
    if (url.pathname.endsWith('.html')) return true;
    if (url.pathname === '/' || url.pathname.endsWith('/')) return true;
    return false;
}

self.addEventListener('fetch', (event) => {
    const req = event.request;
    let url;
    try { url = new URL(req.url); } catch (_) { return; }

    if (shouldBypass(req, url)) return; // 不呼叫 respondWith → 走預設 fetch

    if (isHtmlRequest(req, url)) {
        // HTML：network-first，失敗才回 cache（避免認證 UI 過期）
        event.respondWith(
            fetch(req)
                .then(res => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(RUNTIME_CACHE).then(c => c.put(req, copy)).catch(() => {});
                    }
                    return res;
                })
                .catch(() => caches.match(req).then(c => c || caches.match('/404.html')))
        );
        return;
    }

    // 靜態資源（CSS / JS / 字體 / 圖）：cache-first，背景更新
    event.respondWith(
        caches.match(req).then(cached => {
            const fetchPromise = fetch(req).then(res => {
                if (res && res.ok && res.type !== 'opaque') {
                    const copy = res.clone();
                    caches.open(RUNTIME_CACHE).then(c => c.put(req, copy)).catch(() => {});
                }
                return res;
            }).catch(() => cached); // 離線時 fallback 到 cached
            return cached || fetchPromise;
        })
    );
});

// 接收主執行緒的 skipWaiting 訊號（部署時讓使用者立即拿到新版）
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
