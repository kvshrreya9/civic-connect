import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ClipboardList, Hourglass, PlusCircle, ThumbsUp } from 'lucide-react'
import useAuth from '../hooks/useAuth.js'
import { getCitizenSummary } from '../services/dashboardService.js'
import { getErrorMessage } from '../services/api.js'
import MyComplaintsList from '../components/citizen/MyComplaintsList.jsx'
import IssueMap from '../components/map/IssueMap.jsx'
import { CardSkeleton, EmptyState, ErrorState } from '../components/common/Loader.jsx'
import { formatNumber } from '../utils/formatters.js'

export default function CitizenDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setError(null)
    getCitizenSummary().then(setData).catch((err) => setError(getErrorMessage(err)))
  }, [])

  useEffect(() => {
    load()
    const onSync = () => load()
    window.addEventListener('complaint:synced', onSync)
    return () => window.removeEventListener('complaint:synced', onSync)
  }, [load])

  const cards = data
    ? [
        { label: 'Reports filed', value: data.total, icon: ClipboardList, tone: 'text-electric-600 bg-electric-50' },
        { label: 'Being worked on', value: data.open, icon: Hourglass, tone: 'text-amber-700 bg-amber-50' },
        { label: 'Fixed', value: data.resolved, icon: CheckCircle2, tone: 'text-teal-700 bg-teal-50' },
        { label: 'Reports you support', value: data.supports_given, icon: ThumbsUp, tone: 'text-indigo-700 bg-indigo-50' },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Hello, {user?.name?.split(' ')[0]}</h1>
          <p className="text-slate-600">Here is what is happening with the issues you reported.</p>
        </div>
        <Link to="/citizen/report" className="btn-primary"><PlusCircle className="h-4 w-4" /> Report an issue</Link>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!data && !error && <CardSkeleton rows={4} />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="card p-4">
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
                <p className="mt-3 font-display text-3xl font-bold tabular-nums">{formatNumber(value)}</p>
                <p className="text-xs font-semibold text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          {data.action_needed.length > 0 && (
            <section className="rounded-2xl bg-navy-900 p-5 text-white">
              <h2 className="font-display text-lg font-bold">Confirm these fixes</h2>
              <p className="text-sm text-navy-200">The department says these are fixed. Check the after photos and tell them if it is really done.</p>
              <ul className="mt-3 space-y-2">
                {data.action_needed.map((c) => (
                  <li key={c.id}>
                    <Link to={`/citizen/verify/${c.id}`} className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 hover:bg-white/15">
                      <span className="font-semibold">{c.title}</span>
                      <span className="text-sm font-bold text-teal-300">Review</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.total === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No reports yet"
              text="Spotted a pothole, a dark street or a leaking pipe? Report it and follow it to the fix."
              action={<Link to="/citizen/report" className="btn-primary">Report your first issue</Link>}
            />
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold">Recent reports</h2>
                  <Link to="/citizen/complaints" className="text-sm font-semibold text-electric-600 hover:underline">View all</Link>
                </div>
                <MyComplaintsList complaints={data.recent} linkBuilder={(c) => `/citizen/complaints/${c.id}`} />
              </section>
              <section>
                <h2 className="mb-3 font-display text-xl font-bold">On the map</h2>
                <IssueMap points={data.recent} height={420} linkBuilder={(c) => `/citizen/complaints/${c.id}`} />
              </section>
            </div>
          )}
        </>
      )}
    </div>
  )
}
