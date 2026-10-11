import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlarmClock, AlertOctagon, BellRing, CheckCircle2, Clock3, Hammer, Inbox, Sparkles, UserX } from 'lucide-react'
import useAuth from '../hooks/useAuth.js'
import { getAlerts, getMunicipalSummary } from '../services/municipalService.js'
import { getErrorMessage } from '../services/api.js'
import { ErrorState, Skeleton } from '../components/common/Loader.jsx'
import RiskBadge from '../components/common/RiskBadge.jsx'
import { formatHours, formatNumber, timeAgo } from '../utils/formatters.js'
import { isOfficer } from '../utils/statusUtils.js'

/** Municipality / Panchayat dashboard: every figure comes from the database, scoped to the user's jurisdiction. */
export default function EmployeeDashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [alerts, setAlerts] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getMunicipalSummary().then(setSummary).catch((err) => setError(getErrorMessage(err)))
    if (isOfficer(user)) getAlerts({ status: 'open', per_page: 5 }).then((d) => setAlerts(d.items)).catch(() => setAlerts([]))
  }, [user])

  const cards = summary ? [
    { label: 'Total received', value: summary.total, icon: Inbox, tone: 'bg-electric-50 text-electric-700', to: '/municipality/complaints?status=all' },
    { label: 'New', value: summary.new, icon: Sparkles, tone: 'bg-sky-50 text-sky-700', to: '/municipality/complaints?status=submitted' },
    { label: 'Unassigned', value: summary.unassigned, icon: UserX, tone: 'bg-amber-50 text-amber-700', to: '/municipality/complaints?assigned_to=unassigned' },
    { label: 'Open, assigned to staff', value: summary.assigned_to_staff, icon: Hammer, tone: 'bg-indigo-50 text-indigo-700', to: '/municipality/complaints?assigned_to=assigned' },
    { label: 'Active field workers', value: summary.active_field_workers, icon: UserX, tone: 'bg-slate-100 text-slate-700' },
    { label: 'High risk', value: summary.high_risk, icon: AlertOctagon, tone: 'bg-orange-50 text-orange-700', to: '/municipality/complaints?risk=high' },
    { label: 'Critical', value: summary.critical, icon: AlertOctagon, tone: 'bg-rose-100 text-rose-700', to: '/municipality/complaints?risk=critical' },
    { label: 'In progress', value: summary.in_progress, icon: Hammer, tone: 'bg-indigo-50 text-indigo-700', to: '/municipality/complaints?status=in_progress' },
    { label: 'Resolved', value: summary.resolved, icon: CheckCircle2, tone: 'bg-teal-50 text-teal-700', to: '/municipality/complaints?status=resolution_submitted,verified,closed' },
    { label: 'Overdue', value: summary.overdue, icon: AlarmClock, tone: 'bg-rose-50 text-rose-700', to: '/municipality/complaints?overdue=true&sort=overdue:desc,priority:desc' },
    { label: 'Avg resolution time', value: formatHours(summary.avg_resolution_hours), raw: true, icon: Clock3, tone: 'bg-slate-100 text-slate-700' },
  ] : []

  const scope = summary?.scope
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">
          {scope?.all_offices ? 'All offices' : scope?.office?.name || user?.department?.name || 'Municipal'} dashboard
        </h1>
        <p className="text-slate-600">
          {user?.role === 'field_worker' ? 'Work assigned to you.' : `Live figures for ${scope?.ward ? scope.ward.name : 'your jurisdiction'}.`}
        </p>
      </div>
      {error && <ErrorState message={error} />}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {!summary && !error && Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        {cards.map(({ label, value, raw, icon: Icon, tone, to }) => {
          const body = (
            <>
              <span className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></span>
              <p className="mt-2 font-display text-2xl font-bold tabular-nums">{raw ? value : formatNumber(value)}</p>
              <p className="text-xs font-semibold text-slate-500">{label}</p>
            </>
          )
          return to
            ? <Link key={label} to={to} className="card p-4 transition hover:border-electric-300">{body}</Link>
            : <div key={label} className="card p-4">{body}</div>
        })}
      </div>

      {summary?.unrouted ? (
        <Link to="/admin?tab=unrouted" className="block rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">
          {summary.unrouted} complaint{summary.unrouted === 1 ? '' : 's'} could not be matched to an office and need manual routing.
        </Link>
      ) : null}

      {isOfficer(user) && (
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold"><BellRing className="h-5 w-5 text-rose-600" /> Unacknowledged risk alerts</h2>
            <Link to="/municipality/alerts" className="text-sm font-semibold text-electric-600 hover:underline">All alerts</Link>
          </div>
          {alerts === null && <Skeleton className="mt-3 h-16" />}
          {alerts && alerts.length === 0 && <p className="mt-3 text-sm text-slate-500">No open alerts.</p>}
          <ul className="mt-3 divide-y divide-slate-100">
            {(alerts || []).map((a) => (
              <li key={a.id}>
                <Link to={`/municipality/complaints/${a.complaint.id}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 hover:text-electric-700">
                  <span className="flex items-center gap-2">
                    <RiskBadge level={a.risk_level} size="sm" />
                    <span className="font-semibold">{a.complaint.reference}</span>
                    <span className="text-sm text-slate-600">{a.complaint.title}</span>
                  </span>
                  <span className={`text-xs font-semibold ${a.response_overdue ? 'text-rose-600' : 'text-slate-500'}`}>
                    {a.response_overdue ? 'Response overdue · ' : ''}{timeAgo(a.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link to="/municipality/complaints" className="btn-primary">Open complaint management</Link>
    </div>
  )
}
