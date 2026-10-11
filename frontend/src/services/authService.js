import api, { TOKEN_KEY, USER_KEY } from './api.js'

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function storeSession(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  storeSession(data.access_token, data.user)
  return data.user
}

export async function municipalLogin(email, password, officeId) {
  const { data } = await api.post('/auth/municipal/login', { email, password, office_id: officeId })
  storeSession(data.access_token, data.user)
  return data.user
}

export async function register({ name, email, phone, password }) {
  const { data } = await api.post('/auth/register', { name, email, phone, password })
  storeSession(data.access_token, data.user)
  return data.user
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me')
  storeSession(null, data.user)
  return data.user
}

export async function updateProfile(payload) {
  const { data } = await api.put('/auth/me', payload)
  storeSession(null, data.user)
  return data.user
}
