import { formatHours, formatNumber, formatPercent } from '../../utils/formatters.js'

export default function PublicStats({ totals, loading = false, variant = 'light' }) {
  const t = totals || {}
  const items = [
    { label: 'Issues reported', value: formatNumber(t.total), note: `${formatNumber(t.reported_last_7_days)} in the last 7 days` },
    { label: 'Fixed', value: formatNumber(t.resolved), note: `${formatNumber(t.verified)} confirmed by citizens` },
    { label: 'Resolution rate', value: formatPercent(t.resolution_rate), note: 'of valid reports' },
    { label: 'Typical fix time', value: formatHours(t.avg_resolution_hours), note: 'report to resolution' },
    { label: 'Met the deadline', value: formatPercent(t.sla_compliance), note: 'of resolved issues' },
    { label: 'Past deadline', value: formatNumber(t.overdue), note: `${formatNumber(t.escalated)} escalated` },
  ]
  const dark = variant === 'dark'
  return (
    <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-2xl md:grid-cols-3 xl:grid-cols-6 ${dark ? 'bg-white/10' : 'bg-slate-200'}`}>
      {items.map((item) => (
        <div key={item.label} className={`p-5 ${dark ? 'bg-navy-900' : 'bg-white'}`}>
          <dt className={`text-xs font-semibold ${dark ? 'text-navy-200' : 'text-slate-500'}`}>{item.label}</dt>
          <dd className={`mt-1 font-display text-3xl font-bold tabular-nums ${dark ? 'text-white' : 'text-navy-900'}`}>
            {loading ? <span className="skeleton inline-block h-8 w-16 align-middle" /> : item.value}
          </dd>
          <dd className={`mt-1 text-xs ${dark ? 'text-navy-300' : 'text-slate-500'}`}>{item.note}</dd>
        </div>
      ))}
    </dl>
  )
}
