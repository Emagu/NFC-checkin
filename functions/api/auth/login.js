function jsonResponse(data, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { ...init, headers })
}

function genToken(prefix = 'at') {
  return prefix + Math.random().toString(36).slice(2)
}

export async function onRequestPost({ request, env }) {
  const { username, password } = await request.json().catch(() => ({}))

  if (!username || !password) {
    return jsonResponse({ message: 'invalid' }, { status: 401 })
  }

  if (!env?.DB) {
    return jsonResponse({ message: 'database unavailable' }, { status: 500 })
  }

  let userRecord
  try {
    userRecord = await env.DB
      .prepare('SELECT "ID" AS id, "Pd" AS pd, "SN" AS sn FROM user WHERE "ID" = ? LIMIT 1')
      .bind(username)
      .first()
  } catch (error) {
    return jsonResponse({ message: 'database error' }, { status: 500 })
  }

  if (!userRecord || userRecord.pd !== password) {
    return jsonResponse({ message: 'invalid' }, { status: 401 })
  }

  const accessToken = genToken('access_')
  const refreshToken = genToken('refresh_')

  const headers = new Headers()
  // Cloudflare Pages/Workers 皆為 HTTPS，安全性上可設定 Secure
  // SameSite 設為 Lax；若需要跨站，改為 None 並保留 Secure
  headers.append('Set-Cookie',
    `refreshToken=${refreshToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 3}`)

  return jsonResponse({ accessToken, expiresIn: 10, UserSN: userRecord.sn }, { headers })
}



