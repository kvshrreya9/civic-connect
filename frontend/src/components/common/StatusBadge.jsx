import { getStatusMeta } from '../../utils/statusUtils.js'

export default function StatusBadge({ status, className = '' }) {
  const meta = getStatusMeta(status)
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${meta.className} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
      {meta.label}
    </span>
  )
}
