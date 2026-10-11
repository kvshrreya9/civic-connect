import { useState } from 'react'
import { Loader2, Lock, MessageSquarePlus } from 'lucide-react'
import { addInternalNote, updateComplaintStatus } from '../../services/municipalService.js'
import { getErrorMessage } from '../../services/api.js'
import { FIELD_WORKER_TRANSITIONS, OFFICER_TRANSITIONS, getStatusMeta } from '../../utils/statusUtils.js'
import useAuth from '../../hooks/useAuth.js'

export default function StatusUpdateForm({ complaint, onUpdated }) {
  const { user } = useAuth()
  const fieldWorker = user?.role === 'field_worker'
  let options = (fieldWorker ? FIELD_WORKER_TRANSITIONS : OFFICER_TRANSITIONS)[complaint.status] || []
  if (!fieldWorker && complaint.assigned_to && ['in_progress', 'reopened'].includes(complaint.status)) options = [...options, 'assigned']
  const [status, setStatus] = useState(options[0] || '')
  const [note, setNote] = useState('')
  const [internal, setInternal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const run = async (fn, okText) => {
    setBusy(true)
    setMessage(null)
    try {
      const updated = await fn()
      setNote('')
      setMessage({ type: 'ok', text: okText })
      onUpdated(updated)
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  const submit = (event) => {
    event.preventDefault()
    if (status === 'rejected' && note.trim().length < 10) {
      setMessage({ type: 'error', text: 'Explain the rejection to the citizen (10+ characters).' })
      return
    }
    run(() => updateComplaintStatus(complaint.id, { status, note, is_internal: internal }), `Status changed to ${getStatusMeta(status).label}`)
  }

  return (
    <form id="status" onSubmit={submit} className="card scroll-mt-24 space-y-4 p-5">
      <h3 className="font-display text-base font-bold">Update status</h3>
      {options.length === 0 ? (
        <p className="text-sm text-slate-500">
          {complaint.status === 'closed' ? 'This complaint is closed.'
            : complaint.status === 'resolution_submitted' && fieldWorker ? 'Evidence submitted. Waiting for the citizen to verify.'
              : 'No manual status change is available. Use the assignment or resolution sections.'}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="New status">
          {options.map((option) => (
            <button type="button" key={option} role="radio" aria-checked={status === option} onClick={() => setStatus(option)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ${status === option ? 'bg-navy-900 text-white ring-navy-900' : 'bg-white text-navy-700 ring-slate-200 hover:ring-navy-300'}`}>
              {getStatusMeta(option).label}
            </button>
          ))}
        </div>
      )}
      <div>
        <label htmlFor="status-note" className="label">Remarks</label>
        <textarea id="status-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} className="input"
                  placeholder="Citizens see this unless marked internal." />
      </div>
      <label className="flex items-center gap-2 text-sm text-navy-800">
        <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="h-4 w-4 accent-navy-900" />
        <Lock className="h-3.5 w-3.5 text-slate-500" /> Internal only (hidden from citizen)
      </label>
      {message && <p className={`text-sm font-medium ${message.type === 'ok' ? 'text-teal-700' : 'text-rose-600'}`} role="status">{message.text}</p>}
      <div className="flex flex-wrap gap-2">
        {options.length > 0 && (
          <button type="submit" className="btn-primary" disabled={busy || !status}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save status</button>
        )}
        <button type="button" className="btn-secondary" disabled={busy || note.trim().length < 2}
                onClick={() => run(() => addInternalNote(complaint.id, note), 'Internal note added')}>
          <MessageSquarePlus className="h-4 w-4" /> Add internal note
        </button>
      </div>
    </form>
  )
}
