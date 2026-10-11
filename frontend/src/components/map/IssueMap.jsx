import { useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { MAP_DEFAULTS } from '../../data/dummyData.js'
import { STATUS_META } from '../../utils/statusUtils.js'
import IssueMarker from './IssueMarker.jsx'

function FitToPoints({ points }) {
  const map = useMap()
  const key = points.map((p) => p.id).join(',')
  useEffect(() => {
    if (!points.length) return
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 16)
      return
    }
    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]))
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 16 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map])
  return null
}

export function MapLegend() {
  const shown = ['submitted', 'assigned', 'in_progress', 'resolution_submitted', 'verified', 'reopened']
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-xl bg-white/95 px-3 py-2 shadow-lift">
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
        {shown.map((status) => (
          <li key={status} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_META[status].color }} />
            {STATUS_META[status].label}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[10px] text-slate-500">Larger dot = higher priority</p>
    </div>
  )
}

export default function IssueMap({
  points = [],
  center,
  zoom = MAP_DEFAULTS.zoom,
  height = 420,
  fitToPoints = true,
  linkBuilder,
  onSelect,
  showLegend = true,
  scrollWheelZoom = false,
  className = '',
  children,
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl ring-1 ring-slate-200 ${className}`} style={{ height }}>
      <MapContainer center={center || MAP_DEFAULTS.center} zoom={zoom} scrollWheelZoom={scrollWheelZoom} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {fitToPoints && <FitToPoints points={points} />}
        {points.map((issue) => (
          <IssueMarker key={issue.id} issue={issue} linkTo={linkBuilder ? linkBuilder(issue) : null} onSelect={onSelect} />
        ))}
        {children}
      </MapContainer>
      {showLegend && points.length > 0 && <MapLegend />}
    </div>
  )
}
