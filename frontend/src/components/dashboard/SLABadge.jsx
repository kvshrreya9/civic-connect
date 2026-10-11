import { Clock } from 'lucide-react'
import { SLA_META } from '../../utils/statusUtils.js'
import { formatDateTime, formatHours } from '../../utils/formatters.js'

export default function SLABadge({ sla, showTime = true }) {
  if (!sla) return <span className="text-xs text-slate-400">No target</span>
  const meta = SLA_META[sla.state] || SLA_META.on_track
  let detail = ''
  if (showTime && sla.hours_remaining !== null && sla.hours_remaining !== undefined) {
    detail = sla.hours_remaining >= 0 ? `${formatHours(sla.hours_remaining)} left` : `${formatHours(sla.hours_remaining)} late`
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${meta.className}`}
      title={`Resolution target: ${formatDateTime(sla.due_at)}`}
    >
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      {meta.label}
      {detail && <span className="font-medium opacity-80">· {detail}</span>}
    </span>
  )
}
