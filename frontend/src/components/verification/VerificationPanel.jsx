import { useCallback, useEffect, useState } from 'react'
import { BadgeCheck, ShieldAlert, Star } from 'lucide-react'
import { getVerification } from '../../services/verificationService.js'
import { getErrorMessage } from '../../services/api.js'
import { formatDateTime } from '../../utils/formatters.js'
import BeforeAfterPhotos from './BeforeAfterPhotos.jsx'
import ResolutionFeedback from '../citizen/ResolutionFeedback.jsx'
import Loader, { ErrorState } from '../common/Loader.jsx'

export default function VerificationPanel({ complaintId, onUpdated, refreshKey = 0 }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setError(null)
    getVerification(complaintId).then(setData).catch((err) => setError(getErrorMessage(err)))
  }, [complaintId])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  if (error) return <ErrorState message={error} onRetry={load} />
  if (!data) return <Loader label="Loading repair evidence" />

  const hasEvidence = data.after.length > 0 || data.proofs.length > 0

  return (
    <section className="card space-y-5 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold">Repair evidence</h3>
        {['verified', 'closed'].includes(data.status) && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <BadgeCheck className="h-4 w-4" /> Citizen confirmed
          </span>
        )}
        {data.status === 'reopened' && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
            <ShieldAlert className="h-4 w-4" /> Disputed
          </span>
        )}
      </div>

      {!hasEvidence && <p className="text-sm text-slate-500">Awaiting Resolution Photo. The field worker must upload a completion photo before this can be marked resolved.</p>}
      {hasEvidence && <BeforeAfterPhotos before={data.before} after={data.after} />}

      {data.proofs.map((proof) => (
        <div key={proof.id} className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">
            Work report by {proof.employee?.name || 'field staff'} · {formatDateTime(proof.created_at)}
          </p>
          <p className="mt-1 text-sm text-navy-800">{proof.notes}</p>
        </div>
      ))}

      {data.feedback.map((fb) => (
        <div key={fb.id} className={`rounded-xl p-4 ${fb.verdict === 'confirmed' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
          <p className="flex items-center gap-2 text-sm font-bold">
            {fb.verdict === 'confirmed' ? 'Citizen confirmed the fix' : 'Citizen disputed the fix'}
            {fb.rating ? (
              <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${fb.rating} of 5 stars`}>
                {Array.from({ length: fb.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
              </span>
            ) : null}
          </p>
          {fb.comment && <p className="mt-1 text-sm text-navy-800">{fb.comment}</p>}
          <p className="mt-1 text-xs text-slate-500">{formatDateTime(fb.created_at)}</p>
        </div>
      ))}

      {data.can_submit_feedback && (
        <ResolutionFeedback
          complaintId={complaintId}
          onSubmitted={(result) => {
            load()
            onUpdated?.(result.complaint)
          }}
        />
      )}
    </section>
  )
}
