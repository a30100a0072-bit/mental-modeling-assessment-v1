// OIDC PKCE client — chiyigo.com IAM
// 全合規：Discovery + PKCE + state + nonce + id_token 完整驗證（簽章/iss/aud/exp/nonce）
const ISSUER       = 'https://chiyigo.com'
const DISCOVERY    = `${ISSUER}/.well-known/openid-configuration`
const REDIRECT_URI = 'https://mbti.chiyigo.com/login.html'
const SCOPE        = 'openid email'
const AUD          = 'mbti'

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
function b64urlToBytes(s) {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad), c => c.charCodeAt(0))
}

let _discoveryPromise = null
function getDiscovery() {
  if (!_discoveryPromise) {
    _discoveryPromise = fetch(DISCOVERY)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('discovery failed')))
      .catch(e => { _discoveryPromise = null; throw e })
  }
  return _discoveryPromise
}

const _jwksKeyCache = new Map()
const _JWKS_TTL_MS  = 60 * 60 * 1000
async function getPublicKey(kid) {
  const cacheKey = kid || '__default__'
  const cached = _jwksKeyCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.key
  const disc = await getDiscovery()
  const res = await fetch(disc.jwks_uri)
  if (!res.ok) return null
  const { keys } = await res.json()
  if (!Array.isArray(keys) || keys.length === 0) return null
  const jwk = kid ? keys.find(k => k.kid === kid) : keys[0]
  if (!jwk) return null
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
  _jwksKeyCache.set(cacheKey, { key, expiresAt: Date.now() + _JWKS_TTL_MS })
  return key
}

// 完整驗 id_token：ES256 簽章 + iss + aud + exp + nonce
async function verifyIdToken(idToken, expectedNonce) {
  try {
    const parts = idToken.split('.')
    if (parts.length !== 3) return null
    const [h64, p64, s64] = parts
    const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h64)))
    if (header.alg !== 'ES256') return null
    const key = await getPublicKey(header.kid)
    if (!key) return null
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      b64urlToBytes(s64),
      new TextEncoder().encode(`${h64}.${p64}`)
    )
    if (!valid) return null
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(p64)))
    if (payload.iss !== ISSUER) return null
    const audOk = Array.isArray(payload.aud) ? payload.aud.includes(AUD) : payload.aud === AUD
    if (!audOk) return null
    if (payload.exp && payload.exp * 1000 < Date.now()) return null
    if (expectedNonce && payload.nonce !== expectedNonce) return null
    return payload
  } catch { return null }
}

async function startLogin() {
  const verifier  = b64url(crypto.getRandomValues(new Uint8Array(32)))
  const hash      = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = b64url(hash)
  const state     = b64url(crypto.getRandomValues(new Uint8Array(16)))
  const nonce     = b64url(crypto.getRandomValues(new Uint8Array(16)))

  sessionStorage.setItem('pkce_verifier', verifier)
  sessionStorage.setItem('pkce_state', state)
  sessionStorage.setItem('pkce_nonce', nonce)

  const disc = await getDiscovery()
  const url = new URL(disc.authorization_endpoint)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', state)
  url.searchParams.set('scope', SCOPE)
  url.searchParams.set('nonce', nonce)

  window.location.href = url.toString()
}

async function claimGuestResults(token) {
  const guestId = localStorage.getItem('mbti_guest_id')
  if (!guestId) return null
  const res = await fetch('/api/v1/user/claim-guest-results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ guestIds: [guestId] })
  })
  if (res.ok) {
    localStorage.removeItem('mbti_guest_id')
    localStorage.removeItem('mbti_guest_report_id')
    try { return await res.json() } catch (_) { return null }
  }
  return null
}

function setStatus(msg, isError) {
  const el = document.getElementById('auth-status')
  if (!el) return
  el.textContent = msg
  el.classList.toggle('is-error', !!isError)
}

function showLoginBtn() {
  const btn     = document.getElementById('login-btn')
  const spinner = document.getElementById('auth-spinner')
  if (btn) btn.hidden = false
  if (spinner) spinner.hidden = true
}

window.addEventListener('DOMContentLoaded', async () => {
  if (sessionStorage.getItem('chiyigo_access_token')) {
    window.location.href = 'dashboard.html'
    return
  }

  const params = new URLSearchParams(window.location.search)
  const code   = params.get('code')
  const state  = params.get('state')

  if (!code) {
    showLoginBtn()
    return
  }

  setStatus('正在完成登入...')

  const savedState = sessionStorage.getItem('pkce_state')
  const savedNonce = sessionStorage.getItem('pkce_nonce')
  const verifier   = sessionStorage.getItem('pkce_verifier')

  if (!verifier || state !== savedState) {
    setStatus('狀態驗證失敗，請重試。', true)
    showLoginBtn()
    return
  }

  sessionStorage.removeItem('pkce_state')
  sessionStorage.removeItem('pkce_nonce')
  sessionStorage.removeItem('pkce_verifier')

  try {
    // credentials:'include' → 接收 chiyigo 種的 Domain=.chiyigo.com refresh cookie
    const disc = await getDiscovery()
    const res = await fetch(disc.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: REDIRECT_URI })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}`)
    }

    const data = await res.json()

    // OIDC 完整驗 id_token：ES256 簽章 + iss + aud + exp + nonce
    if (data.id_token) {
      const payload = await verifyIdToken(data.id_token, savedNonce)
      if (!payload) throw new Error('id_token 驗證失敗')
    }

    sessionStorage.setItem('chiyigo_access_token', data.access_token)
    if (data.id_token) sessionStorage.setItem('chiyigo_id_token', data.id_token)

    const claim = await claimGuestResults(data.access_token).catch(err => { console.warn('claim guest failed:', err); return null })

    // [埋碼] 登入 / 註冊完成（OIDC PKCE 回跳成功）— 後驗證 token + claim guest 結果之後
    if (window.track) window.track('login_success', { merged_count: (claim && claim.merged_count) || 0 })

    window.history.replaceState({}, '', 'login.html')
    window.location.href = 'dashboard.html'
  } catch (err) {
    setStatus('登入失敗：' + err.message, true)
    showLoginBtn()
  }
})
