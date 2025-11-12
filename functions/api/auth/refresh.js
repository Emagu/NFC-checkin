function jsonResponse(data, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { ...init, headers })
}

function genToken(prefix = 'at') {
  return prefix + Math.random().toString(36).slice(2)
}

function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || ''
  const map = Object.fromEntries(cookie.split(';').map(kv => kv.trim().split('=')))
  return map[name]
}

export async function onRequestPost({ request }) {
  const rt = getCookie(request, 'refreshToken')
  if (!rt) {
    return jsonResponse({ message: 'no refresh' }, { status: 401 })
  }

  const accessToken = genToken('access_')
  const headers = new Headers()
  headers.append('Set-Cookie',
    `refreshToken=${rt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 3}`)

  return jsonResponse({ accessToken, expiresIn: 10 }, { headers })
}



