import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { ArrowDownUp, Crosshair, Loader2, MapPin, Plus, RotateCcw, X } from 'lucide-react'
import { MAP_DEFAULTS } from '../../data/dummyData.js'
import { SORT_FIELDS, SORT_PRESETS } from '../../utils/statusUtils.js'
import useGeolocation from '../../hooks/useGeolocation.js'

const pinIcon = L.divIcon({ className: '', html: '<div class="cc-pin"></div>', iconSize: [30, 30], iconAnchor: [15, 30] })

export function parseSort(value) {
  return (value || '')
    .split(',')
    .filter(Boolean)
    .map((part) => {
      const [field, direction = 'desc'] = part.split(':')
      return { field, direction }
    })
}

export function serializeSort(rules) {
  return rules.map((r) => `${r.field}:${r.direction}`).join(',')
}

function PointPicker({ point, onPick }) {
  function ClickHandler() {
    useMapEvents({ click: (e) => onPick({ lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) }) })
    return null
  }
  return (
    <div className="h-64 overflow-hidden rounded-xl ring-1 ring-slate-200">
      <MapContainer center={point ? [point.lat, point.lng] : MAP_DEFAULTS.center} zoom={13} className="h-full w-full">
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler />
        {point && <Marker position={[point.lat, point.lng]} icon={pinIcon} />}
      </MapContainer>
    </div>
  )
}

/**
 * Sort presets + custom multi-rule builder. Values are passed to the backend, which validates them and
 * sorts in the database across all pages.
 */
export default function SortControls({ sort, refPoint, onChange, onReset }) {
  const rules = parseSort(sort)
  const [custom, setCustom] = useState(false)
  const [picking, setPicking] = useState(false)
  const [message, setMessage] = useState(null)
  const { locate, loading: locating } = useGeolocation()
  const needsPoint = rules.some((r) => r.field === 'distance_point')
  const presetKey = SORT_PRESETS.find((p) => p.sort === sort && (!p.needsPoint || refPoint))?.key || ''

  useEffect(() => {
    if (needsPoint && !refPoint) setPicking(true)
  }, [needsPoint, refPoint])

  const choosePreset = async (key) => {
    setMessage(null)
    const preset = SORT_PRESETS.find((p) => p.key === key)
    if (!preset) return
    if (preset.needsPoint === 'me') {
      // Location permission is requested only when the officer chooses "Nearest to me".
      const position = await locate()
      if (!position) {
        setMessage('Location permission was denied or is unavailable. Pick a point on the map, or sort by distance from your office instead.')
        onChange({ sort: preset.sort, refPoint: null })
        setPicking(true)
        return
      }
      onChange({ sort: preset.sort, refPoint: { lat: Number(position.lat.toFixed(6)), lng: Number(position.lng.toFixed(6)), source: 'me' } })
      setPicking(false)
      return
    }
    if (preset.needsPoint === 'map') {
      onChange({ sort: preset.sort, refPoint })
      setPicking(true)
      return
    }
    onChange({ sort: preset.sort, refPoint })
    setPicking(false)
  }

  const updateRule = (index, changes) => {
    const next = rules.map((r, i) => (i === index ? { ...r, ...changes } : r))
    onChange({ sort: serializeSort(next), refPoint })
  }
  const addRule = () => {
    const unused = Object.keys(SORT_FIELDS).find((f) => !rules.some((r) => r.field === f) && f !== 'distance_point')
    if (unused && rules.length < 3) onChange({ sort: serializeSort([...rules, { field: unused, direction: 'desc' }]), refPoint })
  }
  const removeRule = (index) => {
    const next = rules.filter((_, i) => i !== index)
    onChange({ sort: serializeSort(next.length ? next : [{ field: 'risk', direction: 'desc' }]), refPoint })
  }

  return (
    <section className="card space-y-3 p-4" aria-label="Sorting">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="block flex-1">
          <span className="label flex items-center gap-1.5"><ArrowDownUp className="h-4 w-4" /> Sort by</span>
          <select className="input" value={presetKey} onChange={(e) => choosePreset(e.target.value)}>
            {!presetKey && <option value="">Custom order</option>}
            {SORT_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => setCustom((v) => !v)} aria-expanded={custom}>
            {custom ? 'Hide' : 'Combine'} sort rules
          </button>
          <button type="button" className="btn-secondary" onClick={() => setPicking((v) => !v)}>
            <MapPin className="h-4 w-4" /> {refPoint ? 'Change' : 'Set'} reference point
          </button>
          <button type="button" className="btn-ghost" onClick={() => { setMessage(null); setPicking(false); onReset() }}>
            <RotateCcw className="h-4 w-4" /> Reset filters
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs" aria-live="polite">
        <span className="font-semibold text-slate-500">Active order:</span>
        {rules.map((r, i) => (
          <span key={r.field} className="inline-flex items-center gap-1 rounded-full bg-navy-900 px-2.5 py-1 font-semibold text-white">
            {i + 1}. {SORT_FIELDS[r.field] || r.field} {r.direction === 'desc' ? '↓' : '↑'}
          </span>
        ))}
        <span className="text-slate-400">then complaint ID</span>
        {refPoint && (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 font-semibold text-teal-800">
            <Crosshair className="h-3 w-3" /> {refPoint.source === 'me' ? 'Your location' : 'Selected point'} {refPoint.lat.toFixed(4)}, {refPoint.lng.toFixed(4)}
          </span>
        )}
      </div>

      {custom && (
        <div className="space-y-2 rounded-xl bg-slate-50 p-3">
          {rules.map((rule, index) => (
            <div key={`${rule.field}-${index}`} className="flex flex-wrap items-center gap-2">
              <span className="w-14 text-xs font-bold text-slate-500">{index === 0 ? 'Sort by' : 'then'}</span>
              <select className="input w-auto py-1.5" value={rule.field} onChange={(e) => updateRule(index, { field: e.target.value })} aria-label={`Sort rule ${index + 1} field`}>
                {Object.entries(SORT_FIELDS).map(([value, label]) => (
                  <option key={value} value={value} disabled={value !== rule.field && rules.some((r) => r.field === value)}>{label}</option>
                ))}
              </select>
              <select className="input w-auto py-1.5" value={rule.direction} onChange={(e) => updateRule(index, { direction: e.target.value })} aria-label={`Sort rule ${index + 1} direction`}>
                <option value="desc">{['distance_office', 'distance_point'].includes(rule.field) ? 'Farthest first' : rule.field === 'overdue' ? 'Most overdue first' : 'Highest first'}</option>
                <option value="asc">{['distance_office', 'distance_point'].includes(rule.field) ? 'Nearest first' : rule.field === 'overdue' ? 'Least overdue first' : 'Lowest first'}</option>
              </select>
              {rules.length > 1 && (
                <button type="button" onClick={() => removeRule(index)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white" aria-label="Remove rule">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {rules.length < 3 && (
            <button type="button" onClick={addRule} className="inline-flex items-center gap-1 text-xs font-bold text-electric-600 hover:underline">
              <Plus className="h-3.5 w-3.5" /> Add a tie-breaker
            </button>
          )}
        </div>
      )}

      {message && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">{message}</p>}
      {needsPoint && !refPoint && !message && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">Click the map to choose the location to measure distance from.</p>
      )}
      {picking && (
        <div className="space-y-2">
          <PointPicker point={refPoint} onPick={(p) => onChange({ sort: needsPoint ? sort : 'distance_point:asc', refPoint: { ...p, source: 'map' } })} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary py-1.5 text-xs" disabled={locating} onClick={() => choosePreset('me_near')}>
              {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />} Use my location instead
            </button>
            <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => setPicking(false)}>Done</button>
          </div>
        </div>
      )}
    </section>
  )
}
