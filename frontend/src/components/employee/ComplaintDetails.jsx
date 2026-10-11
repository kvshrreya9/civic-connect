import { AlertTriangle, Building2, CalendarClock, Flame, Lock, MapPin, ThumbsUp, Users } from 'lucide-react'
import { assetUrl } from '../../services/api.js'
import { categoryLabel, formatDateTime, timeAgo } from '../../utils/formatters.js'
import { SEVERITY_META, getStatusMeta } from '../../utils/statusUtils.js'
import StatusBadge from '../common/StatusBadge.jsx'
import PriorityBadge from '../common/PriorityBadge.jsx'
import RiskBadge from '../common/RiskBadge.jsx'
import SLABadge from '../dashboard/SLABadge.jsx'
import IssueMap from '../map/IssueMap.jsx'

export function PriorityBreakdown({ breakdown, score }) {
  if (!breakdown?.factors) return null
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold">Why this priority</h3>
        <PriorityBadge score={score} />
      </div>
      <ul className="mt-4 space-y-3">
        {breakdown.factors.map((f) => (
          <li key={f.key}>
            <div className="flex justify-between text-sm"><span className="font-semibold text-navy-800">{f.label}</span><span className="tabular-nums text-slate-500">{f.points} / {f.max}</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-electric-500 to-teal-400" style={{ width: `${(f.points / f.max) * 100}%` }} /></div>
            <p className="mt-0.5 text-xs text-slate-500">{f.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-slate-400">Score = severity + safety + people affected + nearby reports + time open (max 100). Recalculated automatically.</p>
    </section>
  )
}

export function RiskBreakdown({ complaint }) {
  const breakdown = complaint.risk_breakdown
  if (!breakdown?.factors) return null
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold">Risk classification</h3>
        <RiskBadge level={complaint.risk_level} />
      </div>
      <ul className="mt-3 divide-y divide-slate-100 text-sm">
        {breakdown.factors.map((f) => (
          <li key={f.key} className="flex items-center justify-between py-1.5">
            <span><span className="font-semibold text-navy-800">{f.label}</span><span className="block text-xs text-slate-500">{f.detail}</span></span>
            <span className="font-bold tabular-nums">+{f.points}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-slate-400">
        Rule-based ({breakdown.points} points): Critical at {breakdown.thresholds?.critical}+, High at {breakdown.thresholds?.high}+,
        Medium at {breakdown.thresholds?.medium}+. Separate from the priority score.
      </p>
    </section>
  )
}

export function ActivityLog({ activity }) {
  if (!activity) return null
  const labels = {
    'complaint.submitted': 'Complaint submitted', 'complaint.routed': 'Routed by location', 'complaint.unmapped': 'No office mapping - sent to admin queue',
    'complaint.status_changed': 'Status changed', 'complaint.assigned': 'Worker assigned', 'complaint.office_transferred': 'Office transferred',
    'complaint.note_added': 'Internal note', 'resolution.submitted': 'Resolution evidence uploaded', 'resolution.feedback': 'Citizen feedback',
    'complaint.overdue_escalated': 'Overdue - escalated', 'alert.created': 'Risk alert created', 'complaint.department_transferred': 'Department transferred',
  }
  return (
    <section className="card p-5">
      <h3 className="font-display text-base font-bold">Audit trail</h3>
      <ol className="mt-3 space-y-2 text-sm">
        {[...activity.audit].reverse().map((a) => (
          <li key={a.id} className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="font-semibold text-navy-800">{labels[a.action] || a.action}</p>
            <p className="text-xs text-slate-500">
              {a.actor?.name} · {formatDateTime(a.created_at)}
              {a.details?.from_status && ` · ${getStatusMeta(a.details.from_status).label} → ${getStatusMeta(a.details.to_status).label}`}
              {a.details?.note ? ` · "${a.details.note}"` : ''}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function StatusTimeline({ history = [] }) {
  return (
    <section className="card p-5">
      <h3 className="font-display text-base font-bold">Timeline</h3>
      <ol className="relative mt-4 space-y-5 border-l-2 border-slate-100 pl-5">
        {[...history].reverse().map((h) => (
          <li key={h.id} className="relative">
            <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white" style={{ background: h.is_internal ? '#94a3b8' : getStatusMeta(h.to_status).color }} />
            <div className="flex flex-wrap items-center gap-2">
              {h.is_internal ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600"><Lock className="h-3 w-3" /> Staff note</span>
              ) : (
                <StatusBadge status={h.to_status} />
              )}
              <span className="text-xs text-slate-500">{formatDateTime(h.created_at)}</span>
            </div>
            {h.note && <p className="mt-1 text-sm text-navy-800">{h.note}</p>}
            <p className="text-xs text-slate-400">by {h.changed_by?.name || 'System'}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function ComplaintDetails({ complaint, actions }) {
  const severity = SEVERITY_META[complaint.severity]
  return (
    <div className="space-y-5">
      <section className="card overflow-hidden">
        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <span>{complaint.reference}</span>
            <span>·</span>
            <span>{categoryLabel(complaint.category)}</span>
            <span>·</span>
            <span>{complaint.department?.name || 'No department'}</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">{complaint.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={complaint.status} />
            {complaint.visibility !== 'public' && <RiskBadge level={complaint.risk_level} />}
            <SLABadge sla={complaint.sla} />
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severity?.className}`}>{severity?.label} severity</span>
            {complaint.safety_risk && <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold text-white"><AlertTriangle className="h-3.5 w-3.5" /> Safety risk</span>}
            {complaint.escalated && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-200"><Flame className="h-3.5 w-3.5" /> Escalated</span>}
          </div>
          {complaint.escalation_reason && complaint.escalated && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">{complaint.escalation_reason}</p>}
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-navy-800">{complaint.description}</p>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-electric-500" /><div><dt className="text-xs text-slate-500">Location</dt><dd className="font-semibold">{complaint.address || 'Pinned on map'}</dd></div></div>
            <div className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 text-electric-500" /><div><dt className="text-xs text-slate-500">Affected / supporters</dt><dd className="font-semibold">{complaint.affected_count} people · <ThumbsUp className="inline h-3.5 w-3.5" /> {complaint.support_count}</dd></div></div>
            <div className="flex items-start gap-2"><CalendarClock className="mt-0.5 h-4 w-4 text-electric-500" /><div><dt className="text-xs text-slate-500">Reported</dt><dd className="font-semibold">{timeAgo(complaint.created_at)} by {complaint.reporter?.name}</dd></div></div>
            <div className="flex items-start gap-2"><Building2 className="mt-0.5 h-4 w-4 text-electric-500" /><div><dt className="text-xs text-slate-500">Responsible office</dt><dd className="font-semibold">{complaint.office ? `${complaint.office.name}${complaint.ward ? ` · ${complaint.ward.name}` : ''}` : 'Awaiting manual routing'}</dd></div></div>
            <div className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 text-electric-500" /><div><dt className="text-xs text-slate-500">Reports of this issue</dt><dd className="font-semibold">{complaint.report_count} citizen{complaint.report_count === 1 ? '' : 's'} · {complaint.related_count} related</dd></div></div>
            {complaint.assigned_to && <div className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 text-electric-500" /><div><dt className="text-xs text-slate-500">Assigned to</dt><dd className="font-semibold">{complaint.assigned_to.name}</dd></div></div>}
          </dl>
          {actions}
        </div>
        {complaint.images?.length > 0 && (
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 sm:grid-cols-4">
            {complaint.images.map((img) => (
              <a key={img.id} href={assetUrl(img.url)} target="_blank" rel="noreferrer" className="block overflow-hidden">
                <img src={assetUrl(img.url)} alt="Reported issue" loading="lazy" className="h-36 w-full object-cover transition hover:scale-105" />
              </a>
            ))}
          </div>
        )}
      </section>
      <IssueMap points={[complaint]} height={260} showLegend={false} />
    </div>
  )
}
