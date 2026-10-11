import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { reverseGeocode } from '../../services/locationService.js'

export default function AddressPreview({ latitude, longitude, value, onChange }) {
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState(null)
  const editedRef = useRef(false)

  useEffect(() => {
    if (latitude == null || longitude == null) return undefined
    let active = true
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const result = await reverseGeocode(latitude, longitude)
        if (active && !editedRef.current) {
          onChange(result.address)
          setSource(result.source)
        }
      } catch {
        if (active && !editedRef.current && !value) onChange(`Near ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
      } finally {
        if (active) setLoading(false)
      }
    }, 500)
    return () => {
      active = false
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude])

  if (latitude == null || longitude == null) return null

  return (
    <div>
      <label htmlFor="address" className="label">Address or landmark</label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-electric-500" />
        <input
          id="address"
          className="input pl-9 pr-9"
          value={value || ''}
          maxLength={500}
          onChange={(e) => {
            editedRef.current = true
            onChange(e.target.value)
          }}
          placeholder="Street, landmark or nearby shop"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {source === 'nominatim' ? 'Suggested from OpenStreetMap. Edit it if a landmark helps crews find the spot.' : 'Add a landmark so crews can find the spot.'}
      </p>
    </div>
  )
}
