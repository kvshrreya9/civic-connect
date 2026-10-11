import { useLocation } from 'react-router-dom'
import { CloudOff, Loader2, RefreshCw, Trash2, UploadCloud, Wifi } from 'lucide-react'
import useOfflineQueue from '../hooks/useOfflineQueue.js'
import useOnlineStatus from '../hooks/useOnlineStatus.js'
import { EmptyState } from '../components/common/Loader.jsx'
import { categoryLabel, formatDateTime, timeAgo } from '../utils/formatters.js'

const STATUS_TEXT = {
  pending: { label: 'Waiting to send', className: 'bg-amber-50 text-amber-800' },
  sending: { label: 'Sending…', className: 'bg-electric-50 text-electric-700' },
  failed: { label: 'Needs attention', className: 'bg-rose-50 text-rose-700' },
}

export default function OfflineQueuePage() {
  const location = useLocation()
  const online = useOnlineStatus()
  const { items, syncing, lastSyncAt, retry, remove, syncNow, error } = useOfflineQueue()

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Saved on this device</h1>
          <p className="text-slate-600">Reports made without a connection send automatically - each one exactly once.</p>
        </div>
        <button type="button" onClick={syncNow} disabled={!online || syncing || items.length === 0} className="btn-primary">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} Send now
        </button>
      </div>

      {location.state?.queued && items.length > 0 && (
        <p className="rounded-2xl bg-navy-900 p-4 text-sm text-white" role="status">
          {location.state.reason === 'offline'
            ? 'You are offline, so your report was saved here. It will send as soon as you reconnect.'
            : 'The server could not be reached, so your report was saved here and will retry automatically.'}
        </p>
      )}

      <div className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${online ? 'bg-teal-50 text-teal-800' : 'bg-slate-200 text-navy-800'}`}>
        {online ? <Wifi className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
        {online ? 'Online' : 'Offline - reports will wait here'}
        {lastSyncAt && <span className="ml-auto text-xs font-medium opacity-70">Last checked {timeAgo(lastSyncAt)}</span>}
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {items.length === 0 ? (
        <EmptyState icon={UploadCloud} title="Nothing waiting" text="All your reports have been delivered." />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const status = STATUS_TEXT[item.status] || STATUS_TEXT.pending
            return (
              <li key={item.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display font-bold text-navy-900">{item.payload.title}</p>
                    <p className="text-xs text-slate-500">
                      {categoryLabel(item.payload.category)} · {item.files.length} photo{item.files.length === 1 ? '' : 's'} · saved {formatDateTime(item.createdAt)}
                    </p>
                    {item.attempts > 0 && <p className="text-xs text-slate-500">Attempts: {item.attempts}</p>}
                    {item.lastError && <p className="mt-1 text-xs font-medium text-rose-600">{item.lastError}</p>}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => retry(item.id)} disabled={!online || item.status === 'sending'} className="btn-secondary py-1.5 text-xs">
                    <RefreshCw className="h-3.5 w-3.5" /> Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => window.confirm('Delete this saved report? It has not been sent.') && remove(item.id)}
                    disabled={item.status === 'sending'}
                    className="btn py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
