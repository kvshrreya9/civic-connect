import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Crosshair, Loader2, Search } from 'lucide-react'
import useGeolocation from '../../hooks/useGeolocation.js'
import { searchPlaces } from '../../services/locationService.js'
import { MAP_DEFAULTS } from '../../data/dummyData.js'

const pinIcon = L.divIcon({ className: '', html: '<div class="cc-pin"></div>', iconSize: [30, 30], iconAnchor: [15, 30] })

function ClickToPlace({ onPick }) {
  useMapEvents({ click: (event) => onPick(event.latlng.lat, event.latlng.lng) })
  return null
}

function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 17), { duration: 0.8 })
  }, [target, map])
  return null
}

export default function LocationPicker({ latitude, longitude, onChange, error }) {
  const { locate, loading, error: geoError } = useGeolocation()
  const [flyTarget, setFlyTarget] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const hasPin = latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined

  const place = (lat, lng, fly = false) => {
    const rounded = [Number(lat.toFixed(6)), Number(lng.toFixed(6))]
    onChange({ latitude: rounded[0], longitude: rounded[1] })
    if (fly) setFlyTarget(rounded)
  }

  const useMyLocation = async () => {
    const position = await locate()
    if (position) place(position.lat, position.lng, true)
  }

  const runSearch = async (event) => {
    event.preventDefault()
    if (query.trim().length < 3) return
    setSearching(true)
    try {
      setResults(await searchPlaces(query))
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <div>
      <p className="label">Where is it?</p>
      <div className="mb-2 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={useMyLocation} className="btn-secondary shrink-0" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
          Use my location
        </button>
        <form onSubmit={runSearch} className="relative flex-1" role="search">
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="input pr-10" placeholder="Search a street or landmark" aria-label="Search location" />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500" aria-label="Search">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
          {results.length > 0 && (
            <ul className="absolute z-[500] mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lift">
              {results.map((r) => (
                <li key={`${r.latitude},${r.longitude}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-electric-50"
                    onClick={() => {
                      place(r.latitude, r.longitude, true)
                      setResults([])
                      setQuery(r.display_name.split(',').slice(0, 2).join(','))
                    }}
                  >
                    {r.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
      </div>
      <div className={`relative h-72 overflow-hidden rounded-2xl ring-1 ${error ? 'ring-rose-400' : 'ring-slate-200'}`}>
        <MapContainer center={hasPin ? [latitude, longitude] : MAP_DEFAULTS.center} zoom={hasPin ? 17 : MAP_DEFAULTS.zoom} className="h-full w-full">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickToPlace onPick={(lat, lng) => place(lat, lng)} />
          <FlyTo target={flyTarget} />
          {hasPin && (
            <Marker
              position={[latitude, longitude]}
              icon={pinIcon}
              draggable
              eventHandlers={{ dragend: (e) => place(e.target.getLatLng().lat, e.target.getLatLng().lng) }}
            />
          )}
        </MapContainer>
        {!hasPin && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-[400] mx-auto w-fit rounded-full bg-navy-900/90 px-3 py-1.5 text-xs font-semibold text-white">
            Tap the map to drop a pin
          </div>
        )}
      </div>
      {hasPin && <p className="mt-1.5 text-xs text-slate-500">Pinned at {latitude.toFixed(5)}, {longitude.toFixed(5)}. Drag the pin to adjust.</p>}
      {(error || geoError) && <p className="field-error">{error || geoError}</p>}
    </div>
  )
}
