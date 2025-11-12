/**
 * Simple mock API server for testing login + refresh logic.
 * - POST /api/auth/login  -> returns accessToken + sets refreshToken cookie (HttpOnly)
 * - POST /api/auth/refresh -> if cookie exists, returns new accessToken and resets cookie expiry
 * - GET /api/protected -> requires Authorization: Bearer <accessToken>
 *
 * Note: Cookies use Secure + SameSite=None. For local http testing they may not be set in some browsers.
 */
const express = require('express')
const cookieParser = require('cookie-parser')
const app = express()

// CORS 設定 - 允許前端跨域請求
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  
  // 處理 preflight 請求
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

app.use(express.json())
app.use(cookieParser())

const ACCESS_EXPIRES = 10 // seconds for quick demo; change to 10800 for 3 hours
const REFRESH_EXPIRES = 60*60*24*3 // 3 days in seconds

function genToken(prefix='at'){ return prefix + Math.random().toString(36).slice(2) }

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body
  if (username === 'user' && password === 'pass') {
    const accessToken = genToken('access_')
    const refreshToken = genToken('refresh_')
    // set HttpOnly cookie for refresh token
    // 在 localhost http 環境下，secure 設為 false
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: false, sameSite: 'Lax', maxAge: REFRESH_EXPIRES*1000, path: '/'
    })
    return res.json({ accessToken, expiresIn: ACCESS_EXPIRES })
  }
  res.status(401).json({ message: 'invalid' })
})

app.post('/api/auth/refresh', (req, res) => {
  const rt = req.cookies.refreshToken
  if (!rt) return res.status(401).json({ message: 'no refresh' })
  const accessToken = genToken('access_')
  // refresh cookie expiry
  // 在 localhost http 環境下，secure 設為 false
  res.cookie('refreshToken', rt, {
    httpOnly: true, secure: false, sameSite: 'Lax', maxAge: REFRESH_EXPIRES*1000, path: '/'
  })
  return res.json({ accessToken, expiresIn: ACCESS_EXPIRES })
})

app.get('/api/protected', (req, res) => {
  const auth = req.headers.authorization || ''
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ message: 'no token' })
  // in mock, any Bearer token accepted
  return res.json({ ok: true, data: 'protected content' })
})

app.use('/api', (req,res) => {
  res.status(404).json({ message: 'not found' })
})

const port = 3000
app.listen(port, () => console.log('Mock API server listening on http://localhost:' + port))
