import { useRef, useState } from 'react'
import { CheckCheck, Crosshair, Loader2 } from 'lucide-react'
import ImageUpload from '../citizen/ImageUpload.jsx'
import { submitResolutionProof } from '../../services/verificationService.js'
import { assetUrl, getErrorMessage } from '../../services/api.js'
import useAuth from '../../hooks/useAuth.js'
import useGeolocation from '../../hooks/useGeolocation.js'
import { createClientId } from '../../utils/formatters.js'

function nowLocal() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export default function ResolutionProofForm({ complaint, onSubmitted }) {
  const { user } = useAuth()
  const { locate, loading: locating, error: geoError } = useGeolocation()
  const [description, setDescription] = useState('')
  const [completedAt, setCompletedAt] = useState(nowLocal())
  const [coords, setCoords] = useState(null)
  const [images, setImages] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const requestId = useRef(null)

  const allowed = complaint.can_work && ['reviewed', 'assigned', 'in_progress', 'reopened'].includes(complaint.status)
    && !(user?.role === 'field_worker' && complaint.status === 'reviewed')
  if (!allowed) return null

  const submit = async (event) => {
    event.preventDefault()
    if (description.trim().length < 10) return setError('Describe the completed work (10+ characters).')
    if (images.length === 0) return setError('A resolution photo of the completed work is required.')
    setBusy(true)
    setError(null)
    if (!requestId.current) requestId.current = createClientId()
    try {
      const result = await submitResolutionProof(complaint.id, {
        description: description.trim(),
        completed_at: new Date(completedAt).toISOString().replace('Z', ''),
        completion_lat: coords?.lat, completion_lng: coords?.lng,
      }, images, requestId.current)
      images.forEach((img) => URL.revokeObjectURL(img.preview))
      setImages([])
      setDescription('')
      requestId.current = null
      onSubmitted(result.complaint)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form id="resolve" onSubmit={submit} className="card scroll-mt-24 space-y-4 border-teal-200 p-5">
      <div>
        <h3 className="font-display text-base font-bold">Submit resolution evidence</h3>
        <p className="text-sm text-slate-500">Complaint {complaint.reference}. The citizen will see these photos and confirm or dispute the fix.</p>
      </div>
      {complaint.images?.[0] && (
        <div>
          <p className="mb-1 text-xs font-semibold text-slate-500">Original complaint photo</p>
          <img src={assetUrl(complaint.images[0].url)} alt="Original complaint" className="h-28 w-full rounded-xl object-cover" />
        </div>
      )}
      <div>
        <label htmlFor="proof-desc" className="label">Resolution description</label>
        <textarea id="proof-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} className="input"
                  placeholder="e.g. Pothole filled with hot-mix asphalt and compacted, area cleaned" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Completed at</span>
          <input type="datetime-local" value={completedAt} max={nowLocal()} onChange={(e) => setCompletedAt(e.target.value)} className="input" />
        </label>
        <div>
          <span className="label">Completion location (optional)</span>
          <button type="button" className="btn-secondary w-full" disabled={locating}
                  onClick={async () => { const p = await locate(); if (p) setCoords({ lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)) }) }}>
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
            {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Add my location'}
          </button>
          {geoError && <p className="field-error">{geoError}</p>}
        </div>
      </div>
      <ImageUpload label="Resolution photo (required) + up to 4 additional" images={images} max={5}
                   hint="Take the main photo from the same angle as the citizen's photo. Location data inside photos is removed."
                   onAdd={(img) => setImages((prev) => [...prev, img])}
                   onRemove={(id) => setImages((prev) => prev.filter((i) => i.id !== id))} />
      <p className="text-xs text-slate-500">Submitted by <strong>{user?.name}</strong> ({user?.role_label || user?.role})</p>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button type="submit" className="btn-teal w-full" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />} Submit evidence
      </button>
    </form>
  )
}
