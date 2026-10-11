import { AlertOctagon } from 'lucide-react'
import { RISK_META } from '../../utils/statusUtils.js'

export default function RiskBadge({ level, size = 'md' }) {
  if (!level) return <span className="text-xs text-slate-400">Not rated</span>
  const meta = RISK_META[level] || RISK_META.low
  const sizing = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md font-bold ring-1 ring-inset ${sizing} ${meta.className}`}>
      {(level === 'critical' || level === 'high') && <AlertOctagon className="h-3.5 w-3.5" aria-hidden="true" />}
      {meta.label}
      <span className="sr-only"> risk</span>
    </span>
  )
}
