export const STATUS_META = {
  submitted: { label: 'Submitted', className: 'bg-slate-100 text-slate-700 ring-slate-200', color: '#64748b' },
  reviewed: { label: 'Reviewed', className: 'bg-sky-50 text-sky-800 ring-sky-200', color: '#0ea5e9' },
  assigned: { label: 'Assigned', className: 'bg-indigo-50 text-indigo-700 ring-indigo-200', color: '#6366f1' },
  in_progress: { label: 'In progress', className: 'bg-amber-50 text-amber-800 ring-amber-200', color: '#f59e0b' },
  resolution_submitted: { label: 'Resolution submitted', className: 'bg-teal-50 text-teal-800 ring-teal-200', color: '#14b8a6' },
  verified: { label: 'Verified', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200', color: '#10b981' },
  closed: { label: 'Closed', className: 'bg-emerald-100 text-emerald-800 ring-emerald-300', color: '#047857' },
  reopened: { label: 'Reopened', className: 'bg-rose-50 text-rose-700 ring-rose-200', color: '#f43f5e' },
  rejected: { label: 'Rejected', className: 'bg-zinc-100 text-zinc-600 ring-zinc-200', color: '#71717a' },
}

export const OPEN_STATUSES = ['submitted', 'reviewed', 'assigned', 'in_progress', 'reopened']
export const LIFECYCLE = ['submitted', 'reviewed', 'assigned', 'in_progress', 'resolution_submitted', 'verified', 'closed']

// Mirrors backend OFFICER_TRANSITIONS / FIELD_WORKER_TRANSITIONS. "assigned" comes from assigning
// a worker, "resolution_submitted" only from uploading evidence, verified/reopened only from the citizen.
export const OFFICER_TRANSITIONS = {
  submitted: ['reviewed', 'rejected'],
  reviewed: ['in_progress', 'rejected'],
  assigned: ['in_progress', 'reviewed', 'rejected'],
  in_progress: ['rejected'],
  reopened: ['reviewed', 'in_progress', 'rejected'],
  resolution_submitted: ['in_progress'],
  verified: ['closed'],
  rejected: ['reviewed'],
  closed: [],
}
export const FIELD_WORKER_TRANSITIONS = { assigned: ['in_progress'], reopened: ['in_progress'] }

export const SEVERITY_META = {
  low: { label: 'Low', className: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', className: 'bg-sky-50 text-sky-700' },
  high: { label: 'High', className: 'bg-orange-50 text-orange-700' },
  critical: { label: 'Critical', className: 'bg-rose-100 text-rose-700' },
}

export const RISK_META = {
  critical: { label: 'Critical', className: 'bg-rose-600 text-white ring-rose-700', rank: 4, color: '#e11d48' },
  high: { label: 'High', className: 'bg-orange-500 text-white ring-orange-600', rank: 3, color: '#f97316' },
  medium: { label: 'Medium', className: 'bg-amber-200 text-amber-900 ring-amber-300', rank: 2, color: '#f59e0b' },
  low: { label: 'Low', className: 'bg-slate-200 text-slate-700 ring-slate-300', rank: 1, color: '#94a3b8' },
}

export const SLA_META = {
  on_track: { label: 'On track', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  at_risk: { label: 'Due soon', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  overdue: { label: 'Overdue', className: 'bg-rose-100 text-rose-700 ring-rose-200' },
  met: { label: 'Met deadline', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  breached: { label: 'Missed deadline', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
  closed: { label: 'Closed', className: 'bg-zinc-100 text-zinc-600 ring-zinc-200' },
}

export const VERIFICATION_META = {
  awaiting_verification: { label: 'Awaiting your verification', className: 'bg-signal-400 text-navy-950' },
  confirmed: { label: 'Confirmed fixed', className: 'bg-emerald-100 text-emerald-800' },
  disputed: { label: 'Disputed - reopened', className: 'bg-rose-100 text-rose-700' },
  closed: { label: 'Closed', className: 'bg-emerald-100 text-emerald-800' },
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-600' },
  not_submitted: { label: 'Not submitted', className: 'bg-slate-100 text-slate-600' },
}

export const SORT_FIELDS = {
  risk: 'Risk level',
  priority: 'Priority score',
  reports: 'Number of reports',
  related: 'Related reports nearby',
  distance_office: 'Distance from office',
  distance_point: 'Distance from a location',
  created: 'Date reported',
  overdue: 'Most overdue',
  deadline: 'Deadline',
}

export const SORT_PRESETS = [
  { key: 'risk_crit', label: 'Risk: Critical to Low', sort: 'risk:desc,priority:desc' },
  { key: 'risk_low', label: 'Risk: Low to High', sort: 'risk:asc,priority:asc' },
  { key: 'priority', label: 'Highest priority score first', sort: 'priority:desc' },
  { key: 'reports_most', label: 'Most reported first', sort: 'reports:desc,risk:desc' },
  { key: 'reports_least', label: 'Least reported first', sort: 'reports:asc' },
  { key: 'related', label: 'Most related reports nearby', sort: 'related:desc,risk:desc' },
  { key: 'office_near', label: 'Nearest to office first', sort: 'distance_office:asc' },
  { key: 'office_far', label: 'Farthest from office first', sort: 'distance_office:desc' },
  { key: 'point_near', label: 'Nearest to selected location', sort: 'distance_point:asc', needsPoint: 'map' },
  { key: 'me_near', label: 'Nearest to me', sort: 'distance_point:asc', needsPoint: 'me' },
  { key: 'risk_reports', label: 'Critical first, then most reports', sort: 'risk:desc,reports:desc' },
  { key: 'reports_risk', label: 'Most reports, then highest risk', sort: 'reports:desc,risk:desc' },
  { key: 'risk_office', label: 'Highest risk, then nearest to office', sort: 'risk:desc,distance_office:asc' },
  { key: 'near_oldest', label: 'Nearest to office, then oldest', sort: 'distance_office:asc,created:asc' },
  { key: 'overdue', label: 'Most overdue, then priority', sort: 'overdue:desc,priority:desc' },
  { key: 'newest', label: 'Newest first', sort: 'created:desc' },
]

export function getStatusMeta(status) {
  return STATUS_META[status] || { label: status || 'Unknown', className: 'bg-slate-100 text-slate-600 ring-slate-200', color: '#94a3b8' }
}

export function priorityLevel(score = 0) {
  if (score >= 75) return { label: 'Very high', className: 'bg-navy-900 text-white', bar: 'bg-navy-900', color: '#0a1433' }
  if (score >= 50) return { label: 'High', className: 'bg-electric-600 text-white', bar: 'bg-electric-600', color: '#1a4ff5' }
  if (score >= 25) return { label: 'Moderate', className: 'bg-electric-100 text-electric-800', bar: 'bg-electric-300', color: '#8ebcff' }
  return { label: 'Low', className: 'bg-slate-200 text-slate-700', bar: 'bg-slate-400', color: '#94a3b8' }
}

export function isStaff(user) {
  return Boolean(user) && ['officer', 'employee', 'field_worker', 'admin'].includes(user.role)
}

export function isOfficer(user) {
  return Boolean(user) && ['officer', 'employee', 'admin'].includes(user.role)
}

export function isAdmin(user) {
  return user?.role === 'admin'
}

export function complaintPath(user, id) {
  if (isStaff(user)) return `/municipality/complaints/${id}`
  if (user?.role === 'citizen') return `/citizen/complaints/${id}`
  return `/complaints/${id}`
}

export function homePathFor(user) {
  if (!user) return '/'
  return isStaff(user) ? '/municipality/dashboard' : '/citizen'
}

export function loginPathFor(pathname = '') {
  return pathname.startsWith('/municipality') || pathname.startsWith('/admin') ? '/municipality/login' : '/login'
}
