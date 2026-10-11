import { CATEGORIES } from '../data/dummyData.js'

const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const numberFmt = new Intl.NumberFormat()

export function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value) {
  const date = toDate(value)
  return date ? dateFmt.format(date) : '-'
}

export function formatDateTime(value) {
  const date = toDate(value)
  return date ? dateTimeFmt.format(date) : '-'
}

export function timeAgo(value) {
  const date = toDate(value)
  if (!date) return '-'
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 45) return 'just now'
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(-Math.round(seconds / size), unit)
  }
  return 'just now'
}

// With no data yet, numbers display as 0 rather than a dash.
export function formatHours(hours) {
  if (hours === null || hours === undefined) return '0 h'
  const abs = Math.abs(hours)
  if (abs < 1) return `${Math.round(abs * 60)} min`
  if (abs < 48) return `${Math.round(abs)} h`
  return `${Math.round(abs / 24)} days`
}

export function formatNumber(value) {
  return value === null || value === undefined ? '0' : numberFmt.format(value)
}

export function formatPercent(value) {
  return value === null || value === undefined ? '0%' : `${Math.round(value)}%`
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDistance(meters) {
  if (meters === null || meters === undefined) return '-'
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`
}

export function categoryLabel(value) {
  return CATEGORIES.find((c) => c.value === value)?.label || value || '-'
}

export function categoryMeta(value) {
  return CATEGORIES.find((c) => c.value === value) || CATEGORIES[CATEGORIES.length - 1]
}

export function truncate(text, length = 120) {
  if (!text) return ''
  return text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text
}

export function createClientId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'cc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12)
}
