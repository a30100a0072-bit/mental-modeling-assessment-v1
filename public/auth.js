// OIDC PKCE client — chiyigo.com IAM
// scope=openid email：拿 id_token 含 email；nonce 防 replay
// refresh_token 不再存 localStorage — chiyigo 用 Domain=.chiyigo.com cookie 跨子網域共享
const CHIYIGO_AUTHORIZE = 'https://chiyigo.com/api/auth/oauth/authorize'
const CHIYIGO_TOKEN     = 'https://chiyigo.com/api/auth/oauth/token'
const REDIRECT_URI      = 'https://mbti.chiyigo.com/login.html'
const SCOPE             = 'openid email'

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function decodeJwtPayload(jwt) {
  const part = jwt.split('.')[1]
  if (!part) return null
  const pad = part.length % 4 === 0 ? '' : '='.repeat(4 - (part.length % 4))
  try {
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/') + pad))
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

  const url = new URL(CHIYIGO_AUTHORIZE)
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
  if (!guestId) return
  const res = await fetch('/api/v1/user/claim-guest-results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ guestIds: [guestId] })
  })
  if (res.ok) {
    localStorage.removeItem('mbti_guest_id')
    localStorage.removeItem('mbti_guest_report_id')
  }
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
    const res = await fetch(CHIYIGO_TOKEN, {
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

    // 驗 id_token nonce（OIDC 防 replay）；簽章驗證在 worker（resource server）做
    if (data.id_token) {
      const payload = decodeJwtPayload(data.id_token)
      if (!payload || payload.nonce !== savedNonce) {
        throw new Error('id_token nonce 不符')
      }
    }

    sessionStorage.setItem('chiyigo_access_token', data.access_token)
    if (data.id_token) sessionStorage.setItem('chiyigo_id_token', data.id_token)

    await claimGuestResults(data.access_token).catch(err => console.warn('claim guest failed:', err))

    window.history.replaceState({}, '', 'login.html')
    window.location.href = 'dashboard.html'
  } catch (err) {
    setStatus('登入失敗：' + err.message, true)
    showLoginBtn()
  }
})
