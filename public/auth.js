// PKCE OAuth 2.0 client — chiyigo.com IAM
const CHIYIGO_AUTHORIZE = 'https://chiyigo.com/api/auth/oauth/authorize'
const CHIYIGO_TOKEN     = 'https://chiyigo.com/api/auth/oauth/token'
const REDIRECT_URI      = 'https://mbti.chiyigo.com/login.html'

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function startLogin() {
  const verifier  = b64url(crypto.getRandomValues(new Uint8Array(32)))
  const hash      = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = b64url(hash)
  const state     = b64url(crypto.getRandomValues(new Uint8Array(16)))

  sessionStorage.setItem('pkce_verifier', verifier)
  sessionStorage.setItem('pkce_state', state)

  const url = new URL(CHIYIGO_AUTHORIZE)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', state)

  window.location.href = url.toString()
}

function setStatus(msg, isError) {
  const el = document.getElementById('auth-status')
  if (!el) return
  el.textContent = msg
  el.style.color = isError ? '#ef4444' : '#94a3b8'
}

function showLoginBtn() {
  const btn     = document.getElementById('login-btn')
  const spinner = document.getElementById('auth-spinner')
  if (btn) btn.style.display = 'block'
  if (spinner) spinner.style.display = 'none'
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
  const verifier   = sessionStorage.getItem('pkce_verifier')

  if (!verifier || state !== savedState) {
    setStatus('狀態驗證失敗，請重試。', true)
    showLoginBtn()
    return
  }

  sessionStorage.removeItem('pkce_state')
  sessionStorage.removeItem('pkce_verifier')

  try {
    const res = await fetch(CHIYIGO_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: REDIRECT_URI })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}`)
    }

    const data = await res.json()
    sessionStorage.setItem('chiyigo_access_token', data.access_token)
    if (data.refresh_token) localStorage.setItem('chiyigo_refresh_token', data.refresh_token)

    window.history.replaceState({}, '', 'login.html')
    window.location.href = 'dashboard.html'
  } catch (err) {
    setStatus('登入失敗：' + err.message, true)
    showLoginBtn()
  }
})
