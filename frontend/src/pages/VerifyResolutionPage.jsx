import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getComplaint } from '../services/complaintService.js'
import { getErrorMessage } from '../services/api.js'
import VerificationPanel from '../components/verification/VerificationPanel.jsx'
import StatusBadge from '../components/common/StatusBadge.jsx'
import Loader, { ErrorState } from '../components/common/Loader.jsx'

export default function VerifyResolutionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [complaint, setComplaint] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getComplaint(id).then(setComplaint).catch((err) => setError(getErrorMessage(err)))
  }, [id])

  if (error) return <ErrorState message={error} />
  if (!complaint) return <Loader label="Loading" fullScreen />

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to={`/citizen/complaints/${id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-electric-700">
        <ArrowLeft className="h-4 w-4" /> Full report
      </Link>
      <div>
        <p className="text-xs font-semibold text-slate-500">{complaint.reference}</p>
        <h1 className="page-title">{complaint.title}</h1>
        <div className="mt-2"><StatusBadge status={complaint.status} /></div>
      </div>
      <VerificationPanel
        complaintId={complaint.id}
        onUpdated={(updated) => {
          setComplaint(updated)
          navigate(`/citizen/complaints/${id}`)
        }}
      />
    </div>
  )
}
