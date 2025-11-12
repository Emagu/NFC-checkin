function jsonResponse(data, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { ...init, headers })
}

export async function onRequestGet({ request }) {
  const auth = request.headers.get('Authorization') || ''
  if (!auth.startsWith('Bearer ')) {
    return jsonResponse({ message: 'no token' }, { status: 401 })
  }
  return jsonResponse({ ok: true, data: 'protected content' })
}



