import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { prepareImage } from '../../services/imageService.js'
import { formatBytes } from '../../utils/formatters.js'

/** Compresses one picked photo (resize, JPEG re-encode, metadata stripped) and reports the result. */
export default function ImageCompressor({ file, onComplete, onError, onCancel }) {
  const [state, setState] = useState({ status: 'working' })
  const handlers = useRef({ onComplete, onError })
  handlers.current = { onComplete, onError }

  useEffect(() => {
    let cancelled = false
    prepareImage(file)
      .then((result) => {
        if (cancelled) return
        const preview = URL.createObjectURL(result.blob)
        setState({ status: 'done' })
        handlers.current.onComplete({ ...result, preview })
      })
      .catch((error) => {
        if (cancelled) return
        setState({ status: 'error', message: error.message })
        handlers.current.onError?.(error)
      })
    return () => {
      cancelled = true
    }
  }, [file])

  return (
    <div className="relative grid aspect-square place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-2 text-center">
      {state.status === 'working' && (
        <span className="flex flex-col items-center gap-1 text-xs text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-electric-500" />
          Optimising {formatBytes(file.size)}
        </span>
      )}
      {state.status === 'error' && (
        <span className="flex flex-col items-center gap-1 text-xs font-medium text-rose-600">
          <AlertTriangle className="h-5 w-5" />
          {state.message}
        </span>
      )}
      {onCancel && (
        <button type="button" onClick={onCancel} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white text-slate-500 shadow" aria-label="Remove photo">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
