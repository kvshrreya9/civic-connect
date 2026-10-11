import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, EyeOff, Loader2, ThumbsUp } from 'lucide-react'
import useAuth from '../hooks/useAuth.js'
import { getComplaint, toggleSupport } from '../services/complaintService.js'
import { getComplaintActivity, getMunicipalComplaint } from '../services/municipalService.js'
import { getComplaintDuplicates, resolveDuplicate } from '../services/duplicateService.js'
import { getErrorMessage } from '../services/api.js'
import ComplaintDetails, { ActivityLog, PriorityBreakdown, RiskBreakdown, StatusTimeline } from '../components/employee/ComplaintDetails.jsx'
import StatusUpdateForm from '../components/employee/StatusUpdateForm.jsx'
import AssignmentPanel from '../components/employee/AssignmentPanel.jsx'
import ResolutionProofForm from '../components/employee/ResolutionProofForm.jsx'
import VerificationPanel from '../components/verification/VerificationPanel.jsx'
import NearbyIssues from '../components/map/NearbyIssues.jsx'
import Loader, { ErrorState } from '../components/common/Loader.jsx'
import StatusBadge from '../components/common/StatusBadge.jsx'
import { complaintPath, isOfficer, isStaff } from '../utils/statusUtils.js'
import { formatDistance } from '../utils/formatters.js'

function DuplicatePanel({ complaint, canManage, user }) {
  const [items, setItems] = useState(null)
  useEffect(() => {
    getComplaintDuplicates(complaint.id).then(setItems).catch(() => setItems([]))
  }, [complaint.id])
  if (!items || items.length === 0) return null
  const act = async (id, action) => {
    const updated = await resolveDuplicate(id, action)
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)))
  }
  return (
    <section className="card p-5">
      <h3 className="font-display text-base font-bold">Possible duplicates</h3>
      <p className="text-xs text-slate-500">Flagged automatically. Reports are never discarded; staff can link them.</p>
      <ul className="mt-3 space-y-2">
        {items.map((d) => (
          <li key={d.id} className="rounded-xl bg-slate-50 p-3">
            <Link to={complaintPath(user, d.candidate.id)} className="text-sm font-semibold hover:text-electric-700">{d.candidate.title}</Link>
            <p className="text-xs text-slate-500">{Math.round(d.score * 100)}% match · {formatDistance(d.distance_m)} away</p>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={d.candidate.status} />
              {d.status !== 'pending' && <span className="text-xs font-semibold capitalize text-slate-600">{d.status}</span>}
              {canManage && d.status === 'pending' && (
                <>
                  <button type="button" onClick={() => act(d.id, 'confirm')} className="text-xs font-bold text-electric-600 hover:underline">Link as duplicate</button>
                  <button type="button" onClick={() => act(d.id, 'reject')} className="text-xs font-bold text-slate-500 hover:underline">Not a duplicate</button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function ComplaintDetailsPage() {
  const { id } = useParams()
  const location = useLocation()
  const { user } = useAuth()
  const staff = isStaff(user)
  const [complaint, setComplaint] = useState(null)
  const [activity, setActivity] = useState(null)
  const [error, setError] = useState(null)
  const [supportBusy, setSupportBusy] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(() => {
    setError(null)
    const fetcher = staff ? getMunicipalComplaint : getComplaint
    fetcher(id).then(setComplaint).catch((err) => setError(getErrorMessage(err)))
    if (staff) getComplaintActivity(id).then(setActivity).catch(() => setActivity(null))
  }, [id, staff])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (complaint && location.hash) {
      setTimeout(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    }
  }, [complaint, location.hash])

  const applyUpdate = (updated) => {
    if (updated) setComplaint((prev) => ({ ...prev, ...updated }))
    setRefreshKey((k) => k + 1)
    if (staff) getComplaintActivity(id).then(setActivity).catch(() => {})
  }

  const support = async () => {
    setSupportBusy(true)
    try {
      const result = await toggleSupport(complaint.id)
      setComplaint((c) => ({ ...c, supported_by_me: result.supported, support_count: result.support_count }))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSupportBusy(false)
    }
  }

  if (error && !complaint) return <ErrorState message={error} onRetry={load} />
  if (!complaint) return <Loader label="Loading complaint" fullScreen />

  const isPublicView = complaint.visibility === 'public'
  const canManage = staff && complaint.can_manage
  const backTo = staff ? '/municipality/complaints' : user?.role === 'citizen' ? '/citizen/complaints' : '/'
  const hasEvidence = !isPublicView && (['resolution_submitted', 'verified', 'closed', 'reopened'].includes(complaint.status) || complaint.resolution)

  const citizenActions = user?.role === 'citizen' && !complaint.is_mine && !['verified', 'closed', 'rejected'].includes(complaint.status) && (
    <button type="button" onClick={support} disabled={supportBusy} className={complaint.supported_by_me ? 'btn-teal' : 'btn-primary'}>
      {supportBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
      {complaint.supported_by_me ? 'You support this' : 'I see this too'}
    </button>
  )

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-electric-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      {location.state?.created && (
        <div className="flex items-start gap-3 rounded-2xl bg-teal-50 p-4 text-teal-900 ring-1 ring-teal-200" role="status">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">{location.state?.replay ? 'Already received - this is your existing report.' : 'Report submitted.'}</p>
            <p className="text-sm">
              Reference {complaint.reference}.{' '}
              {complaint.office ? `Routed to ${complaint.office.name}${complaint.ward ? ` (${complaint.ward.name})` : ''}.`
                : 'No office covers this exact location yet, so the city administration will route it manually.'}
            </p>
          </div>
        </div>
      )}
      {isPublicView && (
        <p className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-700">
          <EyeOff className="h-4 w-4" /> You are viewing another citizen's report. Photos and progress details are private to the reporter and the responsible office.
        </p>
      )}
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-5">
          <ComplaintDetails complaint={complaint} actions={citizenActions} />
          {hasEvidence && <VerificationPanel complaintId={complaint.id} refreshKey={refreshKey} onUpdated={applyUpdate} />}
          {!isPublicView && <StatusTimeline history={complaint.history} />}
          {staff && <ActivityLog activity={activity} />}
        </div>
        <div className="space-y-5">
          {staff && <StatusUpdateForm key={`status-${complaint.status}`} complaint={complaint} onUpdated={applyUpdate} />}
          {canManage && isOfficer(user) && <AssignmentPanel key={`assign-${complaint.assigned_to?.id}-${complaint.office?.id}`} complaint={complaint} onUpdated={applyUpdate} />}
          {staff && <ResolutionProofForm complaint={complaint} onSubmitted={applyUpdate} />}
          {staff && <RiskBreakdown complaint={complaint} />}
          {!isPublicView && <PriorityBreakdown breakdown={complaint.priority_breakdown} score={complaint.priority_score} />}
          {!isPublicView && <DuplicatePanel complaint={complaint} canManage={canManage} user={user} />}
          <NearbyIssues latitude={complaint.latitude} longitude={complaint.longitude} excludeId={complaint.id} />
        </div>
      </div>
    </div>
  )
}
