// chiyigo-token-verify.js
// 跨站 SSO 接收端 token 驗證：ES256 簽章 + iss + aud + exp
// 防止攻擊者透過 URL fragment 塞偽造 token 進 sessionStorage
// 用於 index.html / login.html / dashboard.html 的接收 inline script
(function () {
  var ISSUER = 'https://chiyigo.com';
  var AUD = 'mbti';
  var JWKS_URL = ISSUER + '/.well-known/jwks.json';
  var _jwksKeyCache = new Map();
  var _JWKS_TTL_MS = 60 * 60 * 1000;

  function b64urlToBytes(s) {
    var pad = s.length % 4 === 0 ? '' : new Array(5 - (s.length % 4)).join('=');
    return Uint8Array.from(
      atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad),
      function (c) { return c.charCodeAt(0); }
    );
  }

  async function getPublicKey(kid) {
    var cacheKey = kid || '__default__';
    var cached = _jwksKeyCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.key;
    var res = await fetch(JWKS_URL);
    if (!res.ok) return null;
    var data = await res.json();
    if (!Array.isArray(data.keys) || data.keys.length === 0) return null;
    var jwk = kid ? data.keys.find(function (k) { return k.kid === kid; }) : data.keys[0];
    if (!jwk) return null;
    var key = await crypto.subtle.importKey(
      'jwk', jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, ['verify']
    );
    _jwksKeyCache.set(cacheKey, { key: key, expiresAt: Date.now() + _JWKS_TTL_MS });
    return key;
  }

  async function verifyChiyigoToken(token) {
    try {
      var parts = token.split('.');
      if (parts.length !== 3) return false;
      var header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
      if (header.alg !== 'ES256') return false;
      var key = await getPublicKey(header.kid);
      if (!key) return false;
      var valid = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        key,
        b64urlToBytes(parts[2]),
        new TextEncoder().encode(parts[0] + '.' + parts[1])
      );
      if (!valid) return false;
      var payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
      if (payload.iss !== ISSUER) return false;
      var audOk = Array.isArray(payload.aud) ? payload.aud.indexOf(AUD) !== -1 : payload.aud === AUD;
      if (!audOk) return false;
      // chiyigo 端確認 100% 簽 exp（functions/utils/jwt.js:127），缺 exp 視為偽造
      if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return false;
      return true;
    } catch (_) {
      return false;
    }
  }

  window.verifyChiyigoToken = verifyChiyigoToken;
})();
