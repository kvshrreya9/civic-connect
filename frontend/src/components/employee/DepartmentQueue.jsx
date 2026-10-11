import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Inbox, List, Map as MapIcon, RefreshCw } from 'lucide-react'
import { getWards, getWorkers, listMunicipalComplaints } from '../../services/municipalService.js'
import { getErrorMessage } from '../../services/api.js'
import useAuth from '../../hooks/useAuth.js'
import { isOfficer } from '../../utils/statusUtils.js'
import ComplaintFilters, { DEFAULT_FILTERS } from './ComplaintFilters.jsx'
import ComplaintTable from './ComplaintTable.jsx'
import SortControls from './SortControls.jsx'
import IssueMap from '../map/IssueMap.jsx'
import { CardSkeleton, EmptyState, ErrorState } from '../common/Loader.jsx'

const FILTER_KEYS = Object.keys(DEFAULT_FILTERS)

/** Jurisdiction-scoped municipal complaint queue. Filters, sort and page live in the URL,
 *  so they persist across pagination, refreshes and shared links. */
export default function DepartmentQueue({ presetFilters = {} }) {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list')
  const [wards, setWards] = useState([])
  const [workers, setWorkers] = useState([])

  const filters = useMemo(() => {
    const result = { ...DEFAULT_FILTERS, ...presetFilters }
    FILTER_KEYS.forEach((key) => {
      if (params.has(key)) result[key] = params.get(key)
    })
    return result
  }, [params, presetFilters])
  const page = Number(params.get('page') || 1)
  const refPoint = params.get('ref_lat') && params.get('ref_lng')
    ? { lat: Number(params.get('ref_lat')), lng: Number(params.get('ref_lng')), source: params.get('ref_source') || 'map' }
    : null

  const writeParams = useCallback((nextFilters, nextPage = 1, nextRef = refPoint) => {
    const next = new URLSearchParams()
    FILTER_KEYS.forEach((key) => {
      if (nextFilters[key] && nextFilters[key] !== DEFAULT_FILTERS[key]) next.set(key, nextFilters[key])
    })
    if (nextPage > 1) next.set('page', String(nextPage))
    if (nextRef) {
      next.set('ref_lat', String(nextRef.lat))
      next.set('ref_lng', String(nextRef.lng))
      next.set('ref_source', nextRef.source || 'map')
    }
    setParams(next, { replace: true })
  }, [refPoint, setParams])

  useEffect(() => {
    getWards().then(setWards).catch(() => setWards([]))
    if (isOfficer(user)) getWorkers().then(setWorkers).catch(() => setWorkers([]))
  }, [user])

  const needsPoint = (filters.sort || '').includes('distance_point')
  const load = useCallback(() => {
    if (needsPoint && !refPoint) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const query = { page, per_page: 20 }
    FILTER_KEYS.forEach((key) => {
      if (filters[key]) query[key] = filters[key]
    })
    if (refPoint) {
      query.ref_lat = refPoint.lat
      query.ref_lng = refPoint.lng
    }
    listMunicipalComplaints(query)
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()])

  useEffect(() => {
    const timer = setTimeout(load, filters.q ? 350 : 0)
    return () => clearTimeout(timer)
  }, [load, filters.q])

  useEffect(() => {
    const timer = setInterval(load, 60000)
    return () => clearInterval(timer)
  }, [load])

  const distanceMode = needsPoint ? 'point' : 'office'

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">
          {user?.role === 'field_worker' ? 'My assigned work' : 'Complaints'}
          {data && <span className="ml-2 text-base font-semibold text-slate-500">({data.total})</span>}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-white p-1 ring-1 ring-slate-200" role="tablist">
            {[['list', List, 'List'], ['map', MapIcon, 'Map']].map(([key, Icon, label]) => (
              <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${view === key ? 'bg-navy-900 text-white' : 'text-navy-700'}`}>
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={load} className="btn-secondary py-2" aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <SortControls
        sort={filters.sort}
        refPoint={refPoint}
        onChange={({ sort, refPoint: point }) => writeParams({ ...filters, sort }, 1, point)}
        onReset={() => setParams(new URLSearchParams(), { replace: true })}
      />
      <ComplaintFilters filters={filters} onChange={(next) => writeParams(next, 1)} wards={wards} workers={workers}
                        isFieldWorker={user?.role === 'field_worker'} />

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && needsPoint && !refPoint && (
        <EmptyState icon={MapIcon} title="Choose a reference location" text="Click the map above or use your location to sort by distance." />
      )}
      {!error && !(needsPoint && !refPoint) && !data && <CardSkeleton rows={6} />}
      {!error && data && data.items.length === 0 && (
        <EmptyState icon={Inbox} title="No complaints match" text="Try clearing a filter, or check back when new reports arrive." />
      )}
      {!error && data && data.items.length > 0 && (
        view === 'list'
          ? <ComplaintTable complaints={data.items} distanceMode={distanceMode} canManage={isOfficer(user)} />
          : <IssueMap points={data.items} height={540} linkBuilder={(c) => `/municipality/complaints/${c.id}`} scrollWheelZoom />
      )}

      {data && data.pages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Pagination">
          <button type="button" className="btn-secondary py-2" disabled={page <= 1} onClick={() => writeParams(filters, page - 1)}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-sm font-semibold text-slate-600">Page {data.page} of {data.pages}</span>
          <button type="button" className="btn-secondary py-2" disabled={page >= data.pages} onClick={() => writeParams(filters, page + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </section>
  )
}
