import { useRef, useState } from 'react'
import { Camera, ShieldCheck, X } from 'lucide-react'
import ImageCompressor from './ImageCompressor.jsx'
import { MAX_IMAGES, validateImageFile } from '../../utils/validators.js'
import { formatBytes, createClientId } from '../../utils/formatters.js'

export default function ImageUpload({ images = [], onAdd, onRemove, label = 'Photos', max = MAX_IMAGES, hint }) {
  const inputRef = useRef(null)
  const [pending, setPending] = useState([])
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)

  const addFiles = (fileList) => {
    setError(null)
    const room = max - images.length - pending.length
    const files = Array.from(fileList || [])
    if (files.length > room) setError(`You can add ${max} photos in total.`)
    const accepted = []
    files.slice(0, Math.max(0, room)).forEach((file) => {
      const problem = validateImageFile(file)
      if (problem) setError(`${file.name}: ${problem}`)
      else accepted.push({ id: createClientId(), file })
    })
    if (accepted.length) setPending((prev) => [...prev, ...accepted])
  }

  const finish = (pendingId, result) => {
    setPending((prev) => prev.filter((p) => p.id !== pendingId))
    onAdd({ id: pendingId, ...result })
  }

  const fail = (pendingId) => {
    setTimeout(() => setPending((prev) => prev.filter((p) => p.id !== pendingId)), 3000)
  }

  return (
    <div>
      <p className="label">{label}</p>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          addFiles(e.dataTransfer.files)
        }}
        className={`grid grid-cols-3 gap-2 rounded-2xl border-2 border-dashed p-3 transition sm:grid-cols-5 ${dragging ? 'border-electric-400 bg-electric-50' : 'border-slate-200 bg-white'}`}
      >
        {images.map((img) => (
          <figure key={img.id} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100">
            <img src={img.preview} alt="Selected" className="h-full w-full object-cover" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/80 to-transparent px-2 pb-1 pt-4 text-[10px] font-semibold text-white">
              {formatBytes(img.size)}
              {img.originalSize ? <span className="opacity-70"> from {formatBytes(img.originalSize)}</span> : null}
            </figcaption>
            <button type="button" onClick={() => onRemove(img.id)} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-navy-800 shadow" aria-label="Remove photo">
              <X className="h-3.5 w-3.5" />
            </button>
          </figure>
        ))}
        {pending.map((p) => (
          <ImageCompressor
            key={p.id}
            file={p.file}
            onComplete={(result) => finish(p.id, result)}
            onError={() => fail(p.id)}
            onCancel={() => setPending((prev) => prev.filter((x) => x.id !== p.id))}
          />
        ))}
        {images.length + pending.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl bg-slate-50 text-slate-500 transition hover:bg-electric-50 hover:text-electric-700"
          >
            <Camera className="h-6 w-6" />
            <span className="text-xs font-semibold">Add photo</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
        {hint || `Up to ${max} photos. They are compressed on your device; location data inside photos is removed and faces are blurred on upload.`}
      </p>
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
