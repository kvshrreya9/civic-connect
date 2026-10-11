import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Search } from 'lucide-react'
import { listMyComplaints } from '../services/complaintService.js'
import { getErrorMessage } from '../services/api.js'
import MyComplaintsList from '../components/citizen/MyComplaintsList.jsx'
import { CardSkeleton, EmptyState, ErrorState } from '../components/common/Loader.jsx'

const TABS = [
  { key: '', label: 'All' },
  { key: 'submitted,reviewed,assigned,in_progress,reopened', label: 'In progress' },
  { key: 'resolution_submitted', label: 'Needs your confirmation' },
  { key: 'verified,closed', label: 'Fixed' },
  { key: 'rejected', label: 'Rejected' },
]

export default function MyComplaints() {
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setError(null)
    const params = { page, per_page: 10 }
    if (status) params.status = status
    if (query.trim()) params.q = query.trim()
    listMyComplaints(params).then(setData).catch((err) => setError(getErrorMessage(err)))
  }, [status, query, page])

  useEffect(() => {
    const timer = setTimeout(load, query ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, query])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">My reports</h1>
        <p className="text-slate-600">Track status, deadlines and repair evidence for everything you reported.</p>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={status === tab.key}
              onClick={() => {
                setStatus(tab.key)
                setPage(1)
              }}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${status === tab.key ? 'bg-navy-900 text-white' : 'bg-white text-navy-700 ring-1 ring-slate-200'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} className="input pl-9" placeholder="Search your reports" aria-label="Search your reports" />
        </div>
      </div>
      {error && <ErrorState message={error} onRetry={load} />}
      {!data && !error && <CardSkeleton rows={5} />}
      {data && data.items.length === 0 && (
        <EmptyState icon={ClipboardList} title="Nothing here" text="No reports match this view." action={<Link to="/citizen/report" className="btn-primary">Report an issue</Link>} />
      )}
      {data && data.items.length > 0 && <MyComplaintsList complaints={data.items} linkBuilder={(c) => `/citizen/complaints/${c.id}`} />}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button type="button" className="btn-secondary py-2" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="text-sm font-semibold text-slate-600">Page {data.page} of {data.pages}</span>
          <button type="button" className="btn-secondary py-2" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  )
}
