import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BellRing, CheckCircle2, Loader2, Phone, RotateCcw } from 'lucide-react'
import { acknowledgeAlert, addAlertAction, getAlerts, getWards } from '../services/municipalService.js'
import { getErrorMessage } from '../services/api.js'
import RiskBadge from '../components/common/RiskBadge.jsx'
import StatusBadge from '../components/common/StatusBadge.jsx'
import { CardSkeleton, EmptyState, ErrorState } from '../components/common/Loader.jsx'
import { categoryLabel, formatDateTime, timeAgo } from '../utils/formatters.js'

const KIND_LABEL = { critical: 'Critical complaint', high_risk: 'High-risk complaint', escalation: 'Escalated High → Critical' }
const MUNICIPAL_ALERT_PHONE = '8883109023'

function AlertCard({ alert, onChange }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const c = alert.complaint

  const run = async (kind) => {
    setBusy(kind)
    setError(null)
    try {
      const updated = kind === 'ack' ? await acknowledgeAlert(alert.id, note) : await addAlertAction(alert.id, note)
      setNote('')
      onChange(updated)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <li className={`card overflow-hidden ${alert.acknowledged ? '' : 'ring-2 ring-rose-300'}`}>
      <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs font-bold ${alert.acknowledged ? 'bg-slate-50 text-slate-600' : 'bg-rose-600 text-white'}`}>
        <span>{KIND_LABEL[alert.kind]} {alert.previous_level && alert.kind === 'escalation' ? `(was ${alert.previous_level})` : ''}</span>
        <span>{alert.acknowledged ? `Acknowledged by ${alert.acknowledged_by?.name} · ${formatDateTime(alert.acknowledged_at)}` : 'NOT ACKNOWLEDGED'}</span>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <RiskBadge level={alert.risk_level} />
            <span className="font-mono text-xs font-semibold">{c.reference}</span>
            <span className="text-xs text-slate-500">{categoryLabel(c.category)}</span>
            <StatusBadge status={c.status} />
            <a
              href={`tel:${MUNICIPAL_ALERT_PHONE}`}
              className="btn-secondary py-1.5 text-xs"
              aria-label={`Call municipal alert contact at ${MUNICIPAL_ALERT_PHONE}`}
            >
              <Phone className="h-3.5 w-3.5" /> Call {MUNICIPAL_ALERT_PHONE}
            </a>
          </div>
          <Link to={`/municipality/complaints/${c.id}`} className="block font-display text-lg font-bold hover:text-electric-700">{c.title}</Link>
          <dl className="grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
            <div><dt className="inline font-semibold">Priority score: </dt><dd className="inline">{alert.priority_score ?? c.priority_score}</dd></div>
            <div><dt className="inline font-semibold">Reported: </dt><dd className="inline">{formatDateTime(c.created_at)}</dd></div>
            <div><dt className="inline font-semibold">Location: </dt><dd className="inline">{c.address || `${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`}{c.ward ? ` · ${c.ward.name}` : ''}</dd></div>
            <div><dt className="inline font-semibold">Assigned: </dt><dd className="inline">{c.assigned_to?.name || 'Nobody yet'}</dd></div>
            <div><dt className="inline font-semibold">Office: </dt><dd className="inline">{alert.office?.name || 'Unmapped (admin queue)'}</dd></div>
            <div className={alert.response_overdue ? 'font-bold text-rose-600' : ''}><dt className="inline font-semibold">Respond by: </dt><dd className="inline">{formatDateTime(alert.response_due_at)}</dd></div>
          </dl>
          {alert.actions?.length > 0 && (
            <ol className="mt-2 space-y-1 border-l-2 border-slate-100 pl-3 text-xs text-slate-600">
              {alert.actions.map((a) => (
                <li key={a.id}><span className="font-semibold">{a.actor?.name}</span> · {a.action.replace('alert.', '')}{a.details?.note ? `: ${a.details.note}` : ''} · {timeAgo(a.created_at)}</li>
              ))}
            </ol>
          )}
        </div>
        <div className="space-y-2">
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="input text-sm" placeholder="Action taken / acknowledgement note" maxLength={1000} />
          <div className="flex flex-wrap gap-2">
            {!alert.acknowledged && (
              <button type="button" className="btn-primary flex-1 py-2 text-xs" disabled={busy} onClick={() => run('ack')}>
                {busy === 'ack' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Acknowledge
              </button>
            )}
            <button type="button" className="btn-secondary flex-1 py-2 text-xs" disabled={busy || note.trim().length < 3} onClick={() => run('action')}>Record action</button>
            <Link to={`/municipality/complaints/${c.id}#assign`} className="btn-ghost flex-1 py-2 text-xs">Assign responsibility</Link>
          </div>
          {error && <p className="field-error">{error}</p>}
        </div>
      </div>
    </li>
  )
}

export default function AlertsPage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [wards, setWards] = useState([])
  const [error, setError] = useState(null)
  const filters = Object.fromEntries(['risk', 'status', 'ward_id', 'complaint_status', 'date_from', 'date_to', 'page'].map((k) => [k, params.get(k) || '']))

  const set = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const load = useCallback(() => {
    setError(null)
    const query = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    getAlerts(query).then(setData).catch((err) => setError(getErrorMessage(err)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    getWards().then(setWards).catch(() => setWards([]))
  }, [])

  const replace = (updated) => setData((d) => ({ ...d, items: d.items.map((a) => (a.id === updated.id ? updated : a)) }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title flex items-center gap-2"><BellRing className="h-7 w-7 text-rose-600" /> High-risk alerts</h1>
        <p className="text-slate-600">Created by the server whenever a complaint in your jurisdiction is classified High or Critical, or escalates.</p>
      </div>
      <section className="card grid grid-cols-2 gap-2 p-4 md:grid-cols-6">
        <select className="input py-2" value={filters.risk} onChange={(e) => set('risk', e.target.value)} aria-label="Risk">
          <option value="">High + Critical</option><option value="critical">Critical only</option><option value="high">High only</option>
        </select>
        <select className="input py-2" value={filters.status} onChange={(e) => set('status', e.target.value)} aria-label="Acknowledgement">
          <option value="">Any acknowledgement</option><option value="open">Not acknowledged</option><option value="acknowledged">Acknowledged</option>
        </select>
        <select className="input py-2" value={filters.ward_id} onChange={(e) => set('ward_id', e.target.value)} aria-label="Ward">
          <option value="">Any ward</option>{wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select className="input py-2" value={filters.complaint_status} onChange={(e) => set('complaint_status', e.target.value)} aria-label="Complaint status">
          <option value="">Any complaint status</option>
          <option value="submitted,reviewed,assigned,in_progress,reopened">Still open</option>
          <option value="resolution_submitted,verified,closed">Resolved</option>
        </select>
        <input type="date" className="input py-2" value={filters.date_from} onChange={(e) => set('date_from', e.target.value)} aria-label="From date" />
        <div className="flex gap-1">
          <input type="date" className="input py-2" value={filters.date_to} onChange={(e) => set('date_to', e.target.value)} aria-label="To date" />
          <button type="button" className="btn-ghost px-2" onClick={() => setParams(new URLSearchParams())} aria-label="Reset filters"><RotateCcw className="h-4 w-4" /></button>
        </div>
      </section>
      {error && <ErrorState message={error} onRetry={load} />}
      {!data && !error && <CardSkeleton rows={4} />}
      {data && data.items.length === 0 && <EmptyState icon={BellRing} title="No alerts" text="No High or Critical complaints match these filters." />}
      {data && data.items.length > 0 && <ul className="space-y-3">{data.items.map((a) => <AlertCard key={a.id} alert={a} onChange={replace} />)}</ul>}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button type="button" className="btn-secondary py-2" disabled={data.page <= 1} onClick={() => set('page', String(data.page - 1))}>Previous</button>
          <span className="text-sm font-semibold text-slate-600">Page {data.page} of {data.pages}</span>
          <button type="button" className="btn-secondary py-2" disabled={data.page >= data.pages} onClick={() => set('page', String(data.page + 1))}>Next</button>
        </div>
      )}
    </div>
  )
}
