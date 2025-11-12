export async function onRequest(context) {
  const { request, next } = context
  const response = await next()

  const origin = request.headers.get('Origin') || ''
  const allowedOrigins = [
    'http://localhost:5173',
    'https://localhost:5173'
  ]
  const isAllowed = allowedOrigins.includes(origin)

  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Vary', 'Origin')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')

  return response
}

export async function onRequestOptions({ request }) {
  const origin = request.headers.get('Origin') || ''
  const allowedOrigins = [
    'http://localhost:5173',
    'https://localhost:5173'
  ]
  const isAllowed = allowedOrigins.includes(origin)

  const headers = new Headers()
  if (isAllowed) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Vary', 'Origin')
    headers.set('Access-Control-Allow-Credentials', 'true')
  }
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  headers.set('Access-Control-Max-Age', '86400')

  return new Response(null, { status: 204, headers })
}



