function jsonResponse(data, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { ...init, headers })
}

function genToken(prefix = 'at') {
  return prefix + Math.random().toString(36).slice(2)
}

export async function onRequestPost({ request }) {
  const { username, password } = await request.json().catch(() => ({}))

  if (username === 'user' && password === 'pass') {
    const accessToken = genToken('access_')
    const refreshToken = genToken('refresh_')

    const headers = new Headers()
    // Cloudflare Pages/Workers 皆為 HTTPS，安全性上可設定 Secure
    // SameSite 設為 Lax；若需要跨站，改為 None 並保留 Secure
    headers.append('Set-Cookie',
      `refreshToken=${refreshToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 3}`)

    return jsonResponse({ accessToken, expiresIn: 10 }, { headers })
  }

  return jsonResponse({ message: 'invalid' }, { status: 401 })
}



