import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Loader2, ThumbsUp } from 'lucide-react'
import { toggleSupport } from '../../services/complaintService.js'
import { getErrorMessage } from '../../services/api.js'
import { formatDistance, timeAgo } from '../../utils/formatters.js'
import StatusBadge from '../common/StatusBadge.jsx'

export default function DuplicateWarning({ candidates = [], checking = false, linkBuilder }) {
  const [supported, setSupported] = useState({})
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState(null)

  if (checking && candidates.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking for similar reports nearby…
      </p>
    )
  }
  if (candidates.length === 0) return null

  const support = async (id) => {
    setBusy(id)
    setMessage(null)
    try {
      const result = await toggleSupport(id)
      setSupported((s) => ({ ...s, [id]: result.supported }))
    } catch (error) {
      setMessage(getErrorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4" aria-live="polite">
      <h3 className="flex items-center gap-2 font-display text-base font-bold text-amber-900">
        <Copy className="h-4 w-4" /> This may already be reported
      </h3>
      <p className="mt-1 text-sm text-amber-900/80">
        Supporting an existing report raises its priority faster than a new one. You can still submit yours - it will be linked, not discarded.
      </p>
      <ul className="mt-3 space-y-2">
        {candidates.map(({ complaint, score, distance_m: distance }) => (
          <li key={complaint.id} className="rounded-xl bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {linkBuilder ? (
                  <Link to={linkBuilder(complaint)} className="block truncate text-sm font-bold text-navy-900 hover:text-electric-700">{complaint.title}</Link>
                ) : (
                  <p className="truncate text-sm font-bold text-navy-900">{complaint.title}</p>
                )}
                <p className="text-xs text-slate-500">
                  {formatDistance(distance)} away · {timeAgo(complaint.created_at)} · {Math.round(score * 100)}% match
                </p>
              </div>
              <StatusBadge status={complaint.status} />
            </div>
            <button
              type="button"
              onClick={() => support(complaint.id)}
              disabled={busy === complaint.id}
              className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                supported[complaint.id] ? 'bg-teal-400 text-navy-950' : 'bg-navy-900 text-white hover:bg-navy-800'
              }`}
            >
              {busy === complaint.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
              {supported[complaint.id] ? 'You support this' : `Support this (${complaint.support_count})`}
            </button>
          </li>
        ))}
      </ul>
      {message && <p className="field-error">{message}</p>}
    </section>
  )
}
