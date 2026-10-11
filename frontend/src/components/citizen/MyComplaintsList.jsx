import { Link } from 'react-router-dom'
import { Camera, Clock3, ImageIcon, MapPin, ThumbsUp } from 'lucide-react'
import { assetUrl } from '../../services/api.js'
import { categoryLabel, formatDateTime, timeAgo } from '../../utils/formatters.js'
import { VERIFICATION_META } from '../../utils/statusUtils.js'
import StatusBadge from '../common/StatusBadge.jsx'
import SLABadge from '../dashboard/SLABadge.jsx'

function ResolutionCell({ complaint, verifyLink }) {
  const resolution = complaint.resolution
  if (!resolution || !resolution.photos?.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center">
        <Camera className="h-5 w-5 text-slate-400" />
        <p className="text-xs font-semibold text-slate-500">Awaiting Resolution Photo</p>
      </div>
    )
  }
  const photo = resolution.photos[0]
  const verification = VERIFICATION_META[resolution.verification_status] || VERIFICATION_META.pending
  return (
    <div className="space-y-1.5">
      <a href={assetUrl(photo.url)} target="_blank" rel="noreferrer" className="block h-24 overflow-hidden rounded-xl bg-slate-100">
        <img src={assetUrl(photo.url)} alt="Completed work" loading="lazy" className="h-full w-full object-cover" />
      </a>
      <a href={assetUrl(photo.url)} target="_blank" rel="noreferrer" className="text-xs font-bold text-electric-600 hover:underline">View Photo</a>
      <p className="line-clamp-2 text-xs text-navy-800">{resolution.description}</p>
      <p className="flex items-center gap-1 text-[11px] text-slate-500"><Clock3 className="h-3 w-3" /> {formatDateTime(resolution.completed_at)}</p>
      <p className="text-[11px] text-slate-500">{resolution.department?.name || resolution.office?.name || 'Responsible department'}</p>
      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${verification.className}`}>{verification.label}</span>
      {resolution.verification_status === 'awaiting_verification' && verifyLink && (
        <Link to={verifyLink} className="block text-xs font-bold text-teal-700 hover:underline">Confirm or dispute</Link>
      )}
    </div>
  )
}

export default function MyComplaintsList({ complaints = [], linkBuilder }) {
  return (
    <div className="card overflow-hidden">
      <div className="hidden grid-cols-[minmax(0,1fr)_200px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 md:grid">
        <span>Complaint</span><span>Resolution Photo</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {complaints.map((c) => (
          <li key={c.id} className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_200px]">
            <Link to={linkBuilder(c)} className="flex gap-4 hover:text-electric-700">
              <div className="hidden h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:block">
                {c.images?.[0] ? <img src={assetUrl(c.images[0].url)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  : <span className="grid h-full place-items-center text-slate-300"><ImageIcon className="h-6 w-6" /></span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500">{c.reference} · {categoryLabel(c.category)}</p>
                <p className="mt-0.5 truncate font-display text-base font-bold text-navy-900">{c.title}</p>
                <p className="flex items-center gap-1 truncate text-xs text-slate-500"><MapPin className="h-3 w-3 shrink-0" /> {c.address || 'Pinned location'} · {timeAgo(c.created_at)}</p>
                <p className="text-xs text-slate-500">{c.office ? c.office.name : 'Awaiting routing to an office'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={c.status} />
                  <SLABadge sla={c.sla} />
                  {c.support_count > 0 && <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600"><ThumbsUp className="h-3.5 w-3.5" /> {c.support_count}</span>}
                </div>
              </div>
            </Link>
            <div><p className="mb-1 text-xs font-semibold text-slate-500 md:hidden">Resolution Photo</p><ResolutionCell complaint={c} verifyLink={`/citizen/verify/${c.id}`} /></div>
          </li>
        ))}
      </ul>
    </div>
  )
}
