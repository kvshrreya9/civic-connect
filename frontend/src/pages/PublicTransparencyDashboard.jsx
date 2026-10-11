import { useCallback, useEffect, useMemo, useState } from 'react'
import { Circle, Tooltip } from 'react-leaflet'
import { Download, RefreshCw } from 'lucide-react'
import { getPublicStats } from '../services/dashboardService.js'
import { getMapPoints } from '../services/complaintService.js'
import { getErrorMessage } from '../services/api.js'
import PublicStats from '../components/dashboard/PublicStats.jsx'
import CategoryChart from '../components/dashboard/CategoryChart.jsx'
import ResolutionTimeline from '../components/dashboard/ResolutionTimeline.jsx'
import IssueMap from '../components/map/IssueMap.jsx'
import StatusBadge from '../components/common/StatusBadge.jsx'
import { ErrorState } from '../components/common/Loader.jsx'
import { CATEGORIES } from '../data/dummyData.js'
import { formatDateTime, formatHours, formatNumber, formatPercent } from '../utils/formatters.js'
import { STATUS_META } from '../utils/statusUtils.js'
import useAuth from '../hooks/useAuth.js'
import { complaintPath } from '../utils/statusUtils.js'

function Rate({ value }) {
  if (value === null || value === undefined) return <span className="text-slate-400">-</span>
  const tone = value >= 75 ? 'bg-teal-400' : value >= 50 ? 'bg-amber-400' : 'bg-rose-500'
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full ${tone}`} style={{ width: `${value}%` }} /></span>
      <span className="tabular-nums">{formatPercent(value)}</span>
    </span>
  )
}

function getHotspotStyle(count, maxCount) {
  const intensity = maxCount > 0 ? Math.min(1, count / maxCount) : 0
  if (intensity >= 0.9) return { color: '#dc2626', fillColor: '#ef4444', opacity: 0.9, fillOpacity: 0.42 + intensity * 0.38 }
  if (intensity >= 0.7) return { color: '#f97316', fillColor: '#f97316', opacity: 0.82, fillOpacity: 0.32 + intensity * 0.28 }
  if (intensity >= 0.45) return { color: '#f59e0b', fillColor: '#f59e0b', opacity: 0.75, fillOpacity: 0.24 + intensity * 0.22 }
  if (intensity >= 0.2) return { color: '#38bdf8', fillColor: '#38bdf8', opacity: 0.7, fillOpacity: 0.18 + intensity * 0.18 }
  return { color: '#60a5fa', fillColor: '#60a5fa', opacity: 0.6, fillOpacity: 0.12 }
}

export default function PublicTransparencyDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [points, setPoints] = useState([])
  const [category, setCategory] = useState('')
  const [mode, setMode] = useState('issues')
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setError(null)
    getPublicStats().then(setStats).catch((err) => setError(getErrorMessage(err)))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    getMapPoints(category ? { category } : {}).then(setPoints).catch(() => setPoints([]))
  }, [category])

  const statusRows = useMemo(() => {
    const byStatus = stats?.by_status || {}
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0) || 1
    return Object.keys(STATUS_META).map((s) => ({ status: s, count: byStatus[s] || 0, pct: ((byStatus[s] || 0) / total) * 100 }))
  }, [stats])

  const exportCsv = () => {
    if (!stats) return
    const header = 'department,total,open,resolved,overdue,resolution_rate,avg_resolution_hours,sla_compliance'
    const rows = stats.departments.map((d) => [d.name, d.total, d.open, d.resolved, d.overdue, d.resolution_rate ?? '', d.avg_resolution_hours ?? '', d.sla_compliance ?? ''].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'civicconnect-department-performance.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-slate-50">
      <section className="bg-navy-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h1 className="font-display text-4xl font-extrabold sm:text-5xl">How is the city doing?</h1>
              <p className="mt-3 text-navy-200">Live figures from every report on CivicConnect. No personal information is shown.</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-navy-200">
              {stats && <span>Updated {formatDateTime(stats.generated_at)}</span>}
              <button type="button" onClick={load} className="btn bg-white/10 py-2 text-white hover:bg-white/15"><RefreshCw className="h-4 w-4" /> Refresh</button>
            </div>
          </div>
          <div className="mt-8"><PublicStats totals={stats?.totals} loading={!stats} variant="dark" /></div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
        {error && <ErrorState message={error} onRetry={load} />}

        <div className="grid gap-6 lg:grid-cols-2">
          <ResolutionTimeline data={stats?.timeline || []} />
          <CategoryChart data={stats?.by_category || []} />
        </div>

        <section className="card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">Where issues are</h2>
            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-xl bg-slate-100 p-1">
                {[['issues', 'Individual issues'], ['hotspots', 'Hotspots']].map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setMode(key)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === key ? 'bg-white text-navy-900 shadow' : 'text-slate-600'}`}>{label}</button>
                ))}
              </div>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input w-auto py-1.5 text-xs" aria-label="Filter map by category">
                <option value="">All categories</option>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          {mode === 'issues' ? (
            <IssueMap points={points} height={460} linkBuilder={user ? (p) => complaintPath(user, p.id) : null} />
          ) : (
            <>
              <IssueMap points={[]} height={460} showLegend={false} fitToPoints={false}>
                {(stats?.hotspots || []).map((h) => {
                  const maxCount = Math.max(1, ...((stats?.hotspots || []).map((item) => item.count)))
                  const style = getHotspotStyle(h.count, maxCount)
                  return (
                    <Circle
                      key={`${h.latitude},${h.longitude}`}
                      center={[h.latitude, h.longitude]}
                      radius={180 + h.count * 100}
                      pathOptions={{
                        color: style.color,
                        fillColor: style.fillColor,
                        fillOpacity: style.fillOpacity,
                        opacity: style.opacity,
                        weight: 1,
                      }}
                    >
                      <Tooltip>{h.count} reports · {h.open} open</Tooltip>
                    </Circle>
                  )
                })}
              </IssueMap>
              <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-700">Recurring issue heat</span>
                <div className="flex items-center gap-2">
                  <span>Low</span>
                  <div className="h-2 w-28 rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-red-500" />
                  <span>High</span>
                </div>
              </div>
            </>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between p-5">
              <h2 className="font-display text-lg font-bold">Department performance</h2>
              <button type="button" onClick={exportCsv} className="btn-secondary py-2 text-xs" disabled={!stats}><Download className="h-4 w-4" /> CSV</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3">Department</th>
                    <th scope="col" className="px-3 py-3">Reports</th>
                    <th scope="col" className="px-3 py-3">Open</th>
                    <th scope="col" className="px-3 py-3">Overdue</th>
                    <th scope="col" className="px-3 py-3">Resolution rate</th>
                    <th scope="col" className="px-3 py-3">Met deadline</th>
                    <th scope="col" className="px-3 py-3">Typical fix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(stats?.departments || []).map((d) => (
                    <tr key={d.id}>
                      <td className="px-5 py-3 font-semibold text-navy-900">{d.name}</td>
                      <td className="px-3 py-3 tabular-nums">{formatNumber(d.total)}</td>
                      <td className="px-3 py-3 tabular-nums">{formatNumber(d.open)}</td>
                      <td className={`px-3 py-3 tabular-nums ${d.overdue ? 'font-bold text-rose-600' : ''}`}>{formatNumber(d.overdue)}</td>
                      <td className="px-3 py-3"><Rate value={d.resolution_rate} /></td>
                      <td className="px-3 py-3"><Rate value={d.sla_compliance} /></td>
                      <td className="px-3 py-3 tabular-nums">{formatHours(d.avg_resolution_hours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="card p-5">
            <h2 className="font-display text-lg font-bold">Status breakdown</h2>
            <ul className="mt-4 space-y-3">
              {statusRows.map((row) => (
                <li key={row.status}>
                  <div className="mb-1 flex items-center justify-between"><StatusBadge status={row.status} /><span className="text-sm font-semibold tabular-nums">{row.count}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: STATUS_META[row.status].color }} /></div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {stats?.recent_resolved?.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Recently fixed</h2>
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {stats.recent_resolved.map((c) => (
                <li key={c.id} className="card p-4">
                  <p className="text-xs font-semibold text-slate-500">{c.reference} · {c.department?.name}</p>
                  <p className="mt-1 font-semibold text-navy-900">{c.title}</p>
                  <div className="mt-2"><StatusBadge status={c.status} /></div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
