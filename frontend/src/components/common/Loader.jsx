import { Loader2 } from 'lucide-react'

export default function Loader({ label = 'Loading', fullScreen = false, className = '' }) {
  const content = (
    <div role="status" className={`flex flex-col items-center justify-center gap-3 py-10 text-navy-500 ${className}`}>
      <Loader2 className="h-7 w-7 animate-spin text-electric-500" aria-hidden="true" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
  if (!fullScreen) return content
  return <div className="flex min-h-[60vh] items-center justify-center">{content}</div>
}

export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function CardSkeleton({ rows = 3 }) {
  return (
    <div className="card space-y-3 p-5" aria-hidden="true">
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i % 2 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center">
      <p className="text-sm font-medium text-rose-700">{message}</p>
      {onRetry && (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      {Icon && (
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-electric-50 text-electric-600">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <h3 className="text-lg font-bold text-navy-900">{title}</h3>
      {text && <p className="max-w-sm text-sm text-slate-500">{text}</p>}
      {action}
    </div>
  )
}
