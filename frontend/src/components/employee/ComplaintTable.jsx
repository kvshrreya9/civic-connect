import { Link } from 'react-router-dom'
import { ExternalLink, Eye, Flame, ImageOff, Users } from 'lucide-react'
import { assetUrl } from '../../services/api.js'
import { categoryLabel, formatDateTime, formatDistance, timeAgo, truncate } from '../../utils/formatters.js'
import StatusBadge from '../common/StatusBadge.jsx'
import PriorityBadge from '../common/PriorityBadge.jsx'
import RiskBadge from '../common/RiskBadge.jsx'
import SLABadge from '../dashboard/SLABadge.jsx'

function Thumb({ url, label }) {
  if (!url) return <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><ImageOff className="h-3.5 w-3.5" /> None</span>
  return (
    <a href={assetUrl(url)} target="_blank" rel="noreferrer" className="block h-12 w-16 overflow-hidden rounded-lg bg-slate-100" title={label}>
      <img src={assetUrl(url)} alt={label} loading="lazy" className="h-full w-full object-cover" />
    </a>
  )
}

export default function ComplaintTable({ complaints = [], distanceMode = 'office', canManage = true }) {
  const base = '/municipality/complaints'
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1500px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
            <tr>
              {['Complaint ID', 'Issue', 'Original photo', 'Location', 'Risk', 'Priority', 'Reports',
                distanceMode === 'point' ? 'Distance (point)' : 'Distance (office)', 'Reported', 'Assigned to', 'Status',
                'Deadline', 'Resolution photo', 'Actions'].map((h) => <th key={h} scope="col" className="whitespace-nowrap px-3 py-3">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {complaints.map((c) => {
              const distance = distanceMode === 'point' ? c.distance_from_point_m : c.distance_from_office_m
              const resolutionPhoto = c.resolution?.photos?.[0]?.url
              return (
                <tr key={c.id} className={`align-top transition hover:bg-electric-50/40 ${c.risk_level === 'critical' ? 'bg-rose-50/50' : ''}`}>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-semibold text-navy-800">
                    {c.escalated && <Flame className="mb-0.5 mr-1 inline h-3.5 w-3.5 text-rose-600" aria-label="Escalated" />}
                    {c.reference}
                  </td>
                  <td className="min-w-[220px] max-w-[280px] px-3 py-3">
                    <p className="text-xs font-semibold text-slate-500">{categoryLabel(c.category)}</p>
                    <p className="font-semibold text-navy-900">{truncate(c.title, 60)}</p>
                    <p className="text-xs text-slate-500">{truncate(c.description, 70)}</p>
                  </td>
                  <td className="px-3 py-3"><Thumb url={c.thumbnail} label="Citizen photo" /></td>
                  <td className="min-w-[160px] max-w-[220px] px-3 py-3 text-xs">
                    <p className="text-navy-800">{truncate(c.address, 60) || 'Pinned location'}</p>
                    <p className="text-slate-500">{c.ward?.name || 'No ward'}</p>
                    <a href={`https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=18/${c.latitude}/${c.longitude}`}
                       target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-electric-600 hover:underline">
                      Map <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="px-3 py-3"><RiskBadge level={c.risk_level} /></td>
                  <td className="px-3 py-3"><PriorityBadge score={c.priority_score} showLabel={false} /></td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs">
                    <p className={`inline-flex items-center gap-1 font-bold ${c.widespread ? 'text-rose-700' : 'text-navy-800'}`}>
                      <Users className="h-3.5 w-3.5" /> {c.report_count} citizen{c.report_count === 1 ? '' : 's'}
                    </p>
                    <p className="text-slate-500">{c.related_count} related report{c.related_count === 1 ? '' : 's'}</p>
                    {c.widespread && <p className="font-bold text-rose-700">Widespread issue</p>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs font-semibold tabular-nums">{distance == null ? <span className="text-slate-400">n/a</span> : formatDistance(distance)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs" title={formatDateTime(c.created_at)}>
                    <p>{formatDateTime(c.created_at)}</p><p className="text-slate-400">{timeAgo(c.created_at)}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs">{c.assigned_to ? <span className="font-semibold">{c.assigned_to.name}</span> : <span className="font-semibold text-amber-700">Unassigned</span>}</td>
                  <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-3 py-3"><SLABadge sla={c.sla} /></td>
                  <td className="px-3 py-3">{resolutionPhoto ? <Thumb url={resolutionPhoto} label="Resolution photo" /> : <span className="text-[11px] text-slate-400">Awaiting</span>}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex flex-col gap-1 text-xs font-bold">
                      <Link to={`${base}/${c.id}`} className="inline-flex items-center gap-1 text-electric-600 hover:underline"><Eye className="h-3.5 w-3.5" /> View</Link>
                      {canManage && <Link to={`${base}/${c.id}#assign`} className="text-navy-700 hover:underline">Assign</Link>}
                      <Link to={`${base}/${c.id}#status`} className="text-navy-700 hover:underline">Update</Link>
                      <Link to={`${base}/${c.id}#resolve`} className="text-teal-700 hover:underline">Resolve</Link>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
