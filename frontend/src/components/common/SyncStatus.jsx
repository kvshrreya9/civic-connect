import { Link } from 'react-router-dom'
import { CloudOff, RefreshCw, UploadCloud, Wifi } from 'lucide-react'
import useOnlineStatus from '../../hooks/useOnlineStatus.js'
import useOfflineQueue from '../../hooks/useOfflineQueue.js'

export default function SyncStatus({ compact = false }) {
  const online = useOnlineStatus()
  const { pendingCount, failedCount, syncing } = useOfflineQueue()
  const queued = pendingCount + failedCount

  if (online && queued === 0) {
    if (compact) return null
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-300">
        <Wifi className="h-3.5 w-3.5" /> Online
      </span>
    )
  }

  const Icon = !online ? CloudOff : syncing ? RefreshCw : UploadCloud
  const text = !online
    ? queued ? `Offline - ${queued} waiting` : 'Offline'
    : syncing ? 'Sending reports…' : `${queued} report${queued === 1 ? '' : 's'} waiting`

  return (
    <Link
      to="/citizen/offline"
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        online ? 'bg-signal-400 text-navy-950' : 'bg-white/10 text-white ring-1 ring-white/20'
      }`}
      aria-live="polite"
    >
      <Icon className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
      {text}
    </Link>
  )
}
