import api from './http'

export function loginApi(username, password){
  return api.post('/auth/login', { username, password }).then(r => r.data)
}

export function refreshApi(){
  // refresh endpoint uses cookie; no body required
  return api.post('/auth/refresh').then(r => r.data)
}
