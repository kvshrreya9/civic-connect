import { priorityLevel } from '../../utils/statusUtils.js'

export default function PriorityBadge({ score = 0, showLabel = true, size = 'md' }) {
  const level = priorityLevel(score)
  const sizing = size === 'lg' ? 'h-12 min-w-12 text-lg' : 'h-7 min-w-7 text-xs'
  return (
    <span className="inline-flex items-center gap-2" title={`Priority score ${score} of 100 (${level.label})`}>
      <span className={`inline-grid place-items-center rounded-lg px-1.5 font-display font-bold tabular-nums ${sizing} ${level.className}`}>
        {score}
      </span>
      {showLabel && <span className="text-xs font-semibold text-slate-600">{level.label}</span>}
    </span>
  )
}
