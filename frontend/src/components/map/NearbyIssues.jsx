import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPinned } from 'lucide-react'
import { getNearby } from '../../services/locationService.js'
import { categoryLabel, formatDistance } from '../../utils/formatters.js'
import { complaintPath } from '../../utils/statusUtils.js'
import useAuth from '../../hooks/useAuth.js'
import StatusBadge from '../common/StatusBadge.jsx'
import { Skeleton } from '../common/Loader.jsx'

export default function NearbyIssues({ latitude, longitude, radius = 500, excludeId, title = 'Other reports nearby' }) {
  const { user } = useAuth()
  const [items, setItems] = useState(null)

  useEffect(() => {
    if (latitude == null || longitude == null) return undefined
    let active = true
    setItems(null)
    getNearby(latitude, longitude, radius)
      .then((data) => active && setItems(data.filter((i) => i.id !== excludeId)))
      .catch(() => active && setItems([]))
    return () => {
      active = false
    }
  }, [latitude, longitude, radius, excludeId])

  return (
    <section className="card p-5">
      <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
        <MapPinned className="h-4 w-4 text-electric-500" /> {title}
      </h3>
      {items === null && (
        <div className="space-y-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      )}
      {items && items.length === 0 && <p className="text-sm text-slate-500">No other reports within {formatDistance(radius)}.</p>}
      {items && items.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {items.slice(0, 6).map((item) => (
            <li key={item.id}>
              <Link to={complaintPath(user, item.id)} className="flex items-center justify-between gap-3 py-2.5 hover:text-electric-700">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{item.title}</span>
                  <span className="text-xs text-slate-500">
                    {categoryLabel(item.category)} · {formatDistance(item.distance_m)} away
                  </span>
                </span>
                <StatusBadge status={item.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
