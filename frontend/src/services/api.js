import axios from 'axios'

export const TOKEN_KEY = 'civicconnect_token'
export const USER_KEY = 'civicconnect_user'

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

const api = axios.create({ baseURL: API_BASE, timeout: 45000 })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY) && !url.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      window.dispatchEvent(new CustomEvent('auth:logout'))
    }
    return Promise.reject(error)
  },
)

export function isNetworkError(error) {
  return Boolean(error) && !error.response && error.code !== 'ERR_CANCELED'
}

export function isRetryableError(error) {
  if (isNetworkError(error)) return true
  const status = error?.response?.status
  return status === 408 || status === 429 || (status >= 500 && status < 600)
}

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (isNetworkError(error)) return 'Cannot reach the server. Check your connection.'
  return error?.response?.data?.error || error?.message || fallback
}

export function getFieldErrors(error) {
  return error?.response?.data?.errors || {}
}

export function assetUrl(path) {
  if (!path) return ''
  if (/^(https?:|blob:|data:)/.test(path)) return path
  const origin = API_BASE.startsWith('http') ? new URL(API_BASE).origin : ''
  return origin + path
}

export default api
