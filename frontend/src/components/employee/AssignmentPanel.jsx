import { useEffect, useState } from 'react'
import { ArrowRightLeft, Loader2, UserPlus } from 'lucide-react'
import { assignWorker, getOffices, getWards, getWorkers, transferOffice } from '../../services/municipalService.js'
import { getErrorMessage } from '../../services/api.js'

export default function AssignmentPanel({ complaint, onUpdated }) {
  const [workers, setWorkers] = useState([])
  const [offices, setOffices] = useState([])
  const [wards, setWards] = useState([])
  const [workerId, setWorkerId] = useState(complaint.assigned_to?.id || '')
  const [deadline, setDeadline] = useState('')
  const [note, setNote] = useState('')
  const [transfer, setTransfer] = useState({ office_id: '', ward_id: '', note: '' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    getWorkers(complaint.office?.id).then(setWorkers).catch(() => setWorkers([]))
    getOffices().then(setOffices).catch(() => setOffices([]))
  }, [complaint.office?.id])

  useEffect(() => {
    if (transfer.office_id) getWards(transfer.office_id).then(setWards).catch(() => setWards([]))
    else setWards([])
  }, [transfer.office_id])

  const run = async (fn, success) => {
    setBusy(true)
    setMessage(null)
    try {
      const updated = await fn()
      setMessage({ type: 'ok', text: success })
      onUpdated(updated)
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  const locked = ['verified', 'closed', 'rejected', 'resolution_submitted'].includes(complaint.status)

  return (
    <section id="assign" className="card scroll-mt-24 space-y-4 p-5">
      <h3 className="font-display text-base font-bold">Assignment</h3>
      {!complaint.office && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">This complaint has no responsible office yet. Route it to an office below.</p>}
      <div>
        <label htmlFor="worker" className="label">Field worker</label>
        <select id="worker" value={workerId} onChange={(e) => setWorkerId(e.target.value)} className="input" disabled={locked || !complaint.office}>
          <option value="">Choose a field worker</option>
          {workers.map((w) => <option key={w.id} value={w.id}>{w.name}{w.ward ? ` · ${w.ward.name}` : ''} ({w.open_assignments} open)</option>)}
        </select>
        {complaint.office && workers.length === 0 && <p className="mt-1 text-xs text-slate-500">No field workers in this office yet. An administrator can add them.</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Resolution deadline (optional)</span>
          <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input" disabled={locked} />
        </label>
        <label className="block">
          <span className="label">Instructions (optional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="input" maxLength={1000} placeholder="e.g. Bring cold-mix" disabled={locked} />
        </label>
      </div>
      <button type="button" className="btn-primary w-full" disabled={busy || !workerId || locked}
              onClick={() => run(() => assignWorker(complaint.id, {
                worker_id: Number(workerId), note,
                deadline: deadline ? new Date(deadline).toISOString().replace('Z', '') : undefined,
              }), complaint.assigned_to ? 'Reassigned' : 'Assigned')}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} {complaint.assigned_to ? 'Reassign' : 'Assign'}
      </button>

      <details className="rounded-xl bg-slate-50 p-3">
        <summary className="cursor-pointer text-sm font-bold text-navy-800">Wrong office? Transfer jurisdiction</summary>
        <div className="mt-3 space-y-2">
          <select value={transfer.office_id} onChange={(e) => setTransfer({ ...transfer, office_id: e.target.value, ward_id: '' })} className="input" aria-label="Office">
            <option value="">Choose office</option>
            {offices.filter((o) => o.id !== complaint.office?.id).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <select value={transfer.ward_id} onChange={(e) => setTransfer({ ...transfer, ward_id: e.target.value })} className="input" aria-label="Ward" disabled={!wards.length}>
            <option value="">Ward (optional)</option>
            {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <input value={transfer.note} onChange={(e) => setTransfer({ ...transfer, note: e.target.value })} className="input" placeholder="Reason for transfer" />
          <button type="button" className="btn-secondary w-full" disabled={busy || !transfer.office_id}
                  onClick={() => run(() => transferOffice(complaint.id, {
                    office_id: Number(transfer.office_id), ward_id: transfer.ward_id ? Number(transfer.ward_id) : undefined, note: transfer.note,
                  }), 'Transferred. The new office has been notified.')}>
            <ArrowRightLeft className="h-4 w-4" /> Transfer
          </button>
          <p className="text-xs text-slate-500">The transfer is recorded in the audit trail and open risk alerts move with the complaint.</p>
        </div>
      </details>
      {message && <p className={`text-sm font-medium ${message.type === 'ok' ? 'text-teal-700' : 'text-rose-600'}`} role="status">{message.text}</p>}
    </section>
  )
}
