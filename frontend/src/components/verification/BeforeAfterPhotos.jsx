import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { assetUrl } from '../../services/api.js'

function Gallery({ title, images, tone }) {
  return (
    <div>
      <p className={`mb-2 text-sm font-bold ${tone}`}>{title}</p>
      {images.length === 0 ? (
        <div className="grid h-40 place-items-center rounded-xl bg-slate-100 text-slate-400">
          <span className="flex items-center gap-2 text-sm"><ImageOff className="h-4 w-4" /> No photo</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {images.map((img) => (
            <a key={img.id} href={assetUrl(img.url)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl">
              <img src={assetUrl(img.url)} alt={title} loading="lazy" className="h-32 w-full object-cover transition hover:scale-105" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default function BeforeAfterPhotos({ before = [], after = [] }) {
  const [position, setPosition] = useState(50)
  const canCompare = before.length > 0 && after.length > 0

  return (
    <div className="space-y-4">
      {canCompare && (
        <div>
          <div className="relative aspect-[16/10] w-full select-none overflow-hidden rounded-2xl bg-navy-950">
            <img src={assetUrl(after[0].url)} alt="After the repair" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
              <img
                src={assetUrl(before[0].url)}
                alt="Before the repair"
                className="absolute inset-0 h-full max-w-none object-cover"
                style={{ width: `${10000 / Math.max(position, 1)}%` }}
              />
            </div>
            <div className="absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${position}%` }} aria-hidden="true">
              <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-navy-900 shadow">
                ◀ ▶
              </span>
            </div>
            <span className="absolute left-3 top-3 rounded-full bg-navy-900/80 px-2.5 py-1 text-xs font-bold text-white">Before</span>
            <span className="absolute right-3 top-3 rounded-full bg-teal-400 px-2.5 py-1 text-xs font-bold text-navy-950">After</span>
          </div>
          <label className="mt-2 block">
            <span className="sr-only">Drag to compare before and after</span>
            <input type="range" min="0" max="100" value={position} onChange={(e) => setPosition(Number(e.target.value))} className="w-full accent-electric-500" />
          </label>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Gallery title="Before (reported)" images={before} tone="text-navy-700" />
        <Gallery title="After (repair evidence)" images={after} tone="text-teal-700" />
      </div>
    </div>
  )
}
