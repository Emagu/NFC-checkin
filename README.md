# Vue 3 + Vite PWA NFC Checkin (Mock)

Features:
- Vue 3 + Vite
- TailwindCSS
- PWA manifest + service worker
- Login page (mock)
- Access token stored in localStorage
- Refresh token stored in HttpOnly cookie (mock server sets it)
- Axios with interceptors to auto-refresh when access token expires
- Mock server (Express) to simulate /auth/login and /auth/refresh

Quick start:
1. npm install
2. Run mock API: `npm run mock` (starts on http://localhost:3000)
3. In another terminal run dev: `npm run dev` (Vite on http://localhost:5173)
4. Login with username: `user` password: `pass`
Notes:
- For cookie to be set by mock server in browsers, you may need to run over https or adjust browser settings.
- Access token expiry in mock is short for demo (10s). Adjust mock-server.js ACCESS_EXPIRES value for longer tests.
