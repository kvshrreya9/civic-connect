import { CircleMarker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { categoryLabel, timeAgo } from '../../utils/formatters.js'
import { getStatusMeta } from '../../utils/statusUtils.js'
import StatusBadge from '../common/StatusBadge.jsx'

export default function IssueMarker({ issue, linkTo, onSelect }) {
  const meta = getStatusMeta(issue.status)
  const radius = 6 + Math.round((issue.priority_score || 0) / 14)
  return (
    <CircleMarker
      center={[issue.latitude, issue.longitude]}
      radius={radius}
      pathOptions={{ color: '#ffffff', weight: 2, fillColor: meta.color, fillOpacity: 0.9 }}
      eventHandlers={onSelect ? { click: () => onSelect(issue) } : undefined}
    >
      <Popup>
        <div className="w-56 space-y-2">
          <p className="text-[11px] font-semibold text-slate-500">
            {issue.reference} · {categoryLabel(issue.category)}
          </p>
          <p className="font-display text-sm font-bold leading-snug text-navy-900">{issue.title}</p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={issue.status} />
            <span className="text-[11px] font-semibold text-slate-600">Priority {issue.priority_score}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Reported {timeAgo(issue.created_at)}
            {issue.support_count ? ` · ${issue.support_count} supporters` : ''}
          </p>
          {linkTo && (
            <Link to={linkTo} className="inline-block text-xs font-bold text-electric-600 hover:underline">
              Open details
            </Link>
          )}
        </div>
      </Popup>
    </CircleMarker>
  )
}
