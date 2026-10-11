import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Circle, MapContainer, Marker, Polygon, TileLayer, Tooltip, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { AlertOctagon, Building2, ClipboardList, Clock3, History, LayoutDashboard, Loader2, MapPinned, Route, Users } from 'lucide-react'
import * as admin from '../services/adminService.js'
import { getMunicipalSummary, listMunicipalComplaints } from '../services/municipalService.js'
import { getErrorMessage, getFieldErrors } from '../services/api.js'
import { MAP_DEFAULTS } from '../data/dummyData.js'
import { categoryLabel, formatDateTime } from '../utils/formatters.js'
import StatusBadge from '../components/common/StatusBadge.jsx'
import RiskBadge from '../components/common/RiskBadge.jsx'
import { EmptyState, ErrorState, Skeleton } from '../components/common/Loader.jsx'

const pin = L.divIcon({ className: '', html: '<div class="cc-pin"></div>', iconSize: [30, 30], iconAnchor: [15, 30] })
const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'offices', label: 'Offices', icon: Building2 },
  { key: 'wards', label: 'Wards & boundaries', icon: MapPinned },
  { key: 'staff', label: 'Staff accounts', icon: Users },
  { key: 'unrouted', label: 'Unassigned queue', icon: Route },
  { key: 'audit', label: 'Audit log', icon: History },
]

function OverviewTab({ offices, setTab }) {
  const [summary, setSummary] = useState(null)
  const [issues, setIssues] = useState(null)
  const [error, setError] = useState(null)
  const load = useCallback(() => {
    setError(null)
    Promise.all([
      getMunicipalSummary(),
      listMunicipalComplaints({ status: 'all', sort: 'created:desc', per_page: 6 }),
    ]).then(([nextSummary, nextIssues]) => {
      setSummary(nextSummary)
      setIssues(nextIssues.items)
    }).catch((err) => setError(getErrorMessage(err)))
  }, [])
  useEffect(() => { load() }, [load])

  const metrics = [
    { label: 'Citizen issues', value: summary?.total, icon: ClipboardList, href: '/municipality/complaints' },
    { label: 'New reports', value: summary?.new, icon: Clock3, href: '/municipality/complaints?status=submitted' },
    { label: 'Critical issues', value: summary?.critical, icon: AlertOctagon, href: '/municipality/complaints?risk=critical' },
    { label: 'Open, assigned to staff', value: summary?.assigned_to_staff, icon: Users, href: '/municipality/complaints?assigned_to=assigned' },
    { label: 'Active field workers', value: summary?.active_field_workers, icon: Users, href: '/admin?tab=staff' },
    { label: 'Unrouted', value: summary?.unrouted, icon: Route, href: '/admin?tab=unrouted' },
  ]

  return (
    <div className="space-y-6">
      {error && <ErrorState message={error} onRetry={load} />}
      <section aria-label="Administrator summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} to={href} className="card flex items-center gap-4 p-4 transition hover:border-electric-300">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-electric-50 text-electric-700"><Icon className="h-5 w-5" /></span>
            <span>
              <span className="block text-sm font-medium text-slate-500">{label}</span>
              <span className="block font-display text-2xl font-bold tabular-nums">{value ?? <span className="text-base text-slate-300">Loading</span>}</span>
            </span>
          </Link>
        ))}
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold">Recent citizen issues</h2>
            <p className="text-sm text-slate-500">Reports from across all offices, newest first.</p>
          </div>
          <Link to="/municipality/complaints" className="btn-secondary py-2">View all issues</Link>
        </div>
        {!issues && !error && <div className="space-y-3 p-5"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>}
        {issues?.length === 0 && <EmptyState icon={ClipboardList} title="No citizen issues yet" text="New citizen reports will appear here and in the Citizen issues queue." />}
        {issues?.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">Issue</th><th className="px-5 py-3">Reported</th><th className="px-5 py-3">Risk</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Office</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {issues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link to={`/municipality/complaints/${issue.id}`} className="font-semibold text-navy-900 hover:text-electric-700">{issue.reference} · {issue.title}</Link>
                      <p className="mt-0.5 text-xs text-slate-500">{categoryLabel(issue.category)}{issue.address ? ` · ${issue.address}` : ''}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-600">{formatDateTime(issue.created_at)}</td>
                    <td className="px-5 py-3"><RiskBadge level={issue.risk_level} size="sm" /></td>
                    <td className="px-5 py-3"><StatusBadge status={issue.status} /></td>
                    <td className="px-5 py-3 text-xs text-slate-600">{issue.office?.name || 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Administration</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { tab: 'offices', title: 'Offices', detail: `${offices.length} configured`, icon: Building2 },
            { tab: 'wards', title: 'Wards & boundaries', detail: 'Configure location routing', icon: MapPinned },
            { tab: 'staff', title: 'Staff accounts', detail: 'Create and manage staff', icon: Users },
            { tab: 'audit', title: 'Audit log', detail: 'Review administrative activity', icon: History },
          ].map(({ tab: key, title, detail, icon: Icon }) => (
            <button key={key} type="button" onClick={() => setTab(key)} className="card flex items-center gap-3 p-4 text-left transition hover:border-electric-300">
              <Icon className="h-5 w-5 shrink-0 text-electric-600" />
              <span><span className="block font-semibold">{title}</span><span className="text-xs text-slate-500">{detail}</span></span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function PickMap({ point, onPick, wards = [], offices = [], height = 280 }) {
  function Click() {
    useMapEvents({ click: (e) => onPick({ lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) }) })
    return null
  }
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-slate-200" style={{ height }}>
      <MapContainer center={point ? [point.lat, point.lng] : MAP_DEFAULTS.center} zoom={12} className="h-full w-full">
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Click />
        {wards.map((w) => (w.boundary_type === 'polygon'
          ? <Polygon key={w.id} positions={w.polygon} pathOptions={{ color: '#2f6bff', weight: 1 }}><Tooltip>{w.name} · {w.office?.name}</Tooltip></Polygon>
          : <Circle key={w.id} center={[w.center_lat, w.center_lng]} radius={w.radius_m} pathOptions={{ color: '#2f6bff', weight: 1 }}><Tooltip>{w.name} · {w.office?.name}</Tooltip></Circle>))}
        {offices.filter((o) => o.latitude != null).map((o) => <Marker key={o.id} position={[o.latitude, o.longitude]} icon={pin}><Tooltip>{o.name}</Tooltip></Marker>)}
        {point && <Circle center={[point.lat, point.lng]} radius={30} pathOptions={{ color: '#14b8a6' }} />}
      </MapContainer>
    </div>
  )
}

function useSave(onDone) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})
  const run = async (fn) => {
    setBusy(true)
    setError(null)
    setFields({})
    try {
      await fn()
      onDone?.()
      return true
    } catch (err) {
      setError(getErrorMessage(err))
      setFields(getFieldErrors(err))
      return false
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, fields, run }
}

function OfficesTab({ offices, reload }) {
  const empty = { name: '', code: '', office_type: 'municipality', latitude: '', longitude: '', address: '', contact_email: '', contact_phone: '', critical_alert_phone: '', critical_response_minutes: 60, high_response_minutes: 240 }
  const [form, setForm] = useState(empty)
  const [phoneValues, setPhoneValues] = useState({})
  useEffect(() => {
    setPhoneValues(Object.fromEntries(offices.flatMap((office) => [
      [`critical:${office.id}`, office.critical_alert_phone || ''],
      [`contact:${office.id}`, office.contact_phone || ''],
    ])))
  }, [offices])
  const save = useSave(() => { setForm(empty); reload() })
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-2">Office</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Wards</th><th className="px-4 py-2">Public contact phone</th><th className="px-4 py-2">Critical alert phone</th><th className="px-4 py-2">Alert response</th><th className="px-4 py-2">Active</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {offices.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-2"><p className="font-semibold">{o.name}</p><p className="text-xs text-slate-500">{o.code} · {o.latitude?.toFixed(4)}, {o.longitude?.toFixed(4)}</p></td>
                <td className="px-4 py-2 capitalize">{o.office_type}</td>
                <td className="px-4 py-2">{o.ward_count}</td>
                <td className="min-w-64 px-4 py-2">
                  <div className="flex gap-2">
                    <input className="input min-w-0 py-1.5 text-xs" type="tel" aria-label={`${o.name} public contact phone`}
                           placeholder="+91 44 1234 5678" value={phoneValues[`contact:${o.id}`] ?? ''}
                           onChange={(e) => setPhoneValues((values) => ({ ...values, [`contact:${o.id}`]: e.target.value }))} />
                    <button type="button" className="btn-secondary shrink-0 px-2 py-1.5 text-xs" disabled={save.busy}
                            onClick={() => save.run(() => admin.updateOffice(o.id, { contact_phone: phoneValues[`contact:${o.id}`] || '' }))}>
                      Save
                    </button>
                  </div>
                </td>
                <td className="min-w-64 px-4 py-2">
                  <div className="flex gap-2">
                    <input className="input min-w-0 py-1.5 text-xs" type="tel" aria-label={`${o.name} critical alert phone`}
                           placeholder="+91 98765 43210" value={phoneValues[`critical:${o.id}`] ?? ''}
                           onChange={(e) => setPhoneValues((values) => ({ ...values, [`critical:${o.id}`]: e.target.value }))} />
                    <button type="button" className="btn-secondary shrink-0 px-2 py-1.5 text-xs" disabled={save.busy}
                            onClick={() => save.run(() => admin.updateOffice(o.id, { critical_alert_phone: phoneValues[`critical:${o.id}`] || '' }))}>
                      Save
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2 text-xs">Critical {o.critical_response_minutes}m · High {o.high_response_minutes}m</td>
                <td className="px-4 py-2">
                  <button type="button" className="text-xs font-bold text-electric-600 hover:underline" onClick={() => save.run(() => admin.updateOffice(o.id, { is_active: !o.is_active }))}>
                    {o.is_active ? 'Active - deactivate' : 'Inactive - activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {save.error && <p className="field-error px-4 pb-3">{save.error} {Object.values(save.fields).join(' ')}</p>}
        {offices.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No offices yet. Add the first municipality or panchayat.</p>}
      </div>
      <form className="card space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); save.run(() => admin.createOffice(form)) }}>
        <h3 className="font-display text-lg font-bold">Add office</h3>
        <input className="input" placeholder="Office name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Code e.g. CCM" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <select className="input" value={form.office_type} onChange={(e) => setForm({ ...form, office_type: e.target.value })}>
            <option value="municipality">Municipality</option><option value="panchayat">Panchayat</option><option value="corporation">Corporation</option>
          </select>
        </div>
        <p className="text-xs text-slate-500">Click the map to set the office location (used for distance sorting).</p>
        <PickMap point={form.latitude !== '' ? { lat: Number(form.latitude), lng: Number(form.longitude) } : null}
                 onPick={(p) => setForm({ ...form, latitude: p.lat, longitude: p.lng })} offices={offices} height={220} />
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
          <input className="input" placeholder="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
        </div>
        <input className="input" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <input className="input" placeholder="Contact email (optional)" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
        <input className="input" type="tel" placeholder="Public contact phone (optional)" value={form.contact_phone}
               onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
        <label className="block">
          <span className="label">Critical alert call number (optional)</span>
          <input className="input" type="tel" placeholder="+91 98765 43210" value={form.critical_alert_phone}
                 onChange={(e) => setForm({ ...form, critical_alert_phone: e.target.value })} />
          <span className="mt-1 block text-xs text-slate-500">Alert cards include a tap-to-call link for the municipal contact number.</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold text-slate-500">Critical response (min)<input type="number" className="input mt-1" value={form.critical_response_minutes} onChange={(e) => setForm({ ...form, critical_response_minutes: e.target.value })} /></label>
          <label className="text-xs font-semibold text-slate-500">High response (min)<input type="number" className="input mt-1" value={form.high_response_minutes} onChange={(e) => setForm({ ...form, high_response_minutes: e.target.value })} /></label>
        </div>
        {save.error && <p className="field-error">{save.error} {Object.values(save.fields).join(' ')}</p>}
        <button type="submit" className="btn-primary w-full" disabled={save.busy}>{save.busy && <Loader2 className="h-4 w-4 animate-spin" />} Create office</button>
      </form>
    </div>
  )
}

function WardsTab({ offices, wards, reload }) {
  const empty = { office_id: '', name: '', code: '', boundary_type: 'circle', center_lat: '', center_lng: '', radius_m: 1500, polygon: '' }
  const [form, setForm] = useState(empty)
  const [test, setTest] = useState(null)
  const save = useSave(() => { setForm(empty); reload() })
  const submit = (e) => {
    e.preventDefault()
    let payload = { ...form, office_id: Number(form.office_id) }
    if (form.boundary_type === 'polygon') {
      try { payload.polygon = JSON.parse(form.polygon) } catch { payload.polygon = null }
    }
    save.run(() => admin.createWard(payload))
  }
  const testPoint = async (p) => {
    const result = await admin.testRouting(p.lat, p.lng)
    setTest({ ...p, ...result })
  }
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-3">
        <p className="text-sm text-slate-600">Routing uses only these boundaries. Demo wards are illustrative, not real Chennai boundaries. Configure each municipality’s real service area here; reports outside every configured boundary remain in the Unassigned queue until routed.</p>
        <PickMap point={test} onPick={testPoint} wards={wards.filter((w) => w.is_active)} offices={offices} height={420} />
        {test && <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm">{test.lat}, {test.lng} → <strong>{test.office ? `${test.office.name} · ${test.ward.name}` : 'No office (would go to the admin queue)'}</strong></p>}
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-2">Ward</th><th className="px-4 py-2">Office</th><th className="px-4 py-2">Boundary</th><th className="px-4 py-2">Active</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {wards.map((w) => (
                <tr key={w.id}>
                  <td className="px-4 py-2 font-semibold">{w.name} <span className="text-xs text-slate-500">{w.code}</span></td>
                  <td className="px-4 py-2">{w.office?.name}</td>
                  <td className="px-4 py-2 text-xs">{w.boundary_type === 'circle' ? `Circle ${Math.round(w.radius_m)} m` : `Polygon ${w.polygon?.length} points`}</td>
                  <td className="px-4 py-2"><button type="button" className="text-xs font-bold text-electric-600 hover:underline" onClick={() => save.run(() => admin.updateWard(w.id, { is_active: !w.is_active }))}>{w.is_active ? 'Deactivate' : 'Activate'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <form className="card space-y-3 p-5" onSubmit={submit}>
        <h3 className="font-display text-lg font-bold">Add ward / jurisdiction</h3>
        <select className="input" value={form.office_id} onChange={(e) => setForm({ ...form, office_id: e.target.value })}>
          <option value="">Responsible office</option>{offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Ward name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Code e.g. W01" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </div>
        <select className="input" value={form.boundary_type} onChange={(e) => setForm({ ...form, boundary_type: e.target.value })}>
          <option value="circle">Circle (centre + radius)</option><option value="polygon">Polygon (boundary points)</option>
        </select>
        {form.boundary_type === 'circle' ? (
          <>
            <p className="text-xs text-slate-500">Click the map to place the centre.</p>
            <PickMap point={form.center_lat !== '' ? { lat: Number(form.center_lat), lng: Number(form.center_lng) } : null}
                     onPick={(p) => setForm({ ...form, center_lat: p.lat, center_lng: p.lng })} wards={wards} height={200} />
            <div className="grid grid-cols-3 gap-2">
              <input className="input" placeholder="Lat" value={form.center_lat} onChange={(e) => setForm({ ...form, center_lat: e.target.value })} />
              <input className="input" placeholder="Lng" value={form.center_lng} onChange={(e) => setForm({ ...form, center_lng: e.target.value })} />
              <input className="input" placeholder="Radius m" type="number" value={form.radius_m} onChange={(e) => setForm({ ...form, radius_m: e.target.value })} />
            </div>
          </>
        ) : (
          <textarea className="input font-mono text-xs" rows={5} value={form.polygon} onChange={(e) => setForm({ ...form, polygon: e.target.value })}
                    placeholder='[[13.08, 80.26], [13.08, 80.28], [13.10, 80.28], [13.10, 80.26]]' />
        )}
        {save.error && <p className="field-error">{save.error} {Object.values(save.fields).join(' ')}</p>}
        <button type="submit" className="btn-primary w-full" disabled={save.busy}>{save.busy && <Loader2 className="h-4 w-4 animate-spin" />} Create ward</button>
      </form>
    </div>
  )
}

function StaffTab({ offices }) {
  const empty = { name: '', email: '', role: 'officer', office_id: '', ward_id: '', phone: '', password: '' }
  const [staff, setStaff] = useState(null)
  const [wards, setWards] = useState([])
  const [form, setForm] = useState(empty)
  const [phoneValues, setPhoneValues] = useState({})
  const load = useCallback(() => admin.listStaff().then((rows) => {
    setStaff(rows)
    setPhoneValues(Object.fromEntries(rows.map((user) => [user.id, user.phone || ''])))
  }).catch(() => setStaff([])), [])
  const save = useSave(() => { setForm(empty); load() })
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (form.office_id) admin.listWards(form.office_id).then(setWards).catch(() => setWards([]))
    else setWards([])
  }, [form.office_id])
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Jurisdiction</th><th className="px-4 py-2">Contact number</th><th className="px-4 py-2">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {(staff || []).map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2"><p className="font-semibold">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></td>
                <td className="px-4 py-2 text-xs">{u.role_label}</td>
                <td className="px-4 py-2 text-xs">{u.office?.name || (u.role === 'admin' ? 'All offices' : u.department?.name || '-')}{u.ward ? ` · ${u.ward.name}` : ''}</td>
                <td className="min-w-64 px-4 py-2">
                  <div className="flex gap-2">
                    <input className="input min-w-0 py-1.5 text-xs" type="tel" aria-label={`${u.name} contact number`}
                           placeholder="+1 555 010 1234" value={phoneValues[u.id] || ''}
                           onChange={(e) => setPhoneValues((values) => ({ ...values, [u.id]: e.target.value }))} />
                    <button type="button" className="btn-secondary shrink-0 px-2 py-1.5 text-xs"
                            disabled={save.busy} onClick={() => save.run(() => admin.updateStaff(u.id, { phone: phoneValues[u.id] || '' }))}>
                      Save
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2"><button type="button" className="text-xs font-bold text-electric-600 hover:underline" onClick={() => save.run(() => admin.updateStaff(u.id, { is_active: !u.is_active }))}>{u.is_active ? 'Active - deactivate' : 'Inactive - activate'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {save.error && <p className="field-error px-4 pb-3">{save.error} {Object.values(save.fields).join(' ')}</p>}
      </div>
      <form className="card space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); save.run(() => admin.createStaff({ ...form, office_id: form.office_id ? Number(form.office_id) : null, ward_id: form.ward_id ? Number(form.ward_id) : null })) }}>
        <h3 className="font-display text-lg font-bold">Create municipal login</h3>
        <p className="text-xs text-slate-500">Create a unique officer account for each municipality. Use a different password for each account and assign it to the matching office; reports inside that office’s wards will route to its queue.</p>
        <input className="input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input" type="email" placeholder="Work email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="officer">Municipal / Panchayat Officer</option><option value="field_worker">Field Worker</option><option value="admin">Administrator</option>
        </select>
        {form.role !== 'admin' && (
          <>
            <select className="input" value={form.office_id} onChange={(e) => setForm({ ...form, office_id: e.target.value, ward_id: '' })}>
              <option value="">Office (required)</option>{offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <select className="input" value={form.ward_id} onChange={(e) => setForm({ ...form, ward_id: e.target.value })} disabled={!wards.length}>
              <option value="">Whole office (no ward restriction)</option>{wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </>
        )}
        <input className="input" placeholder="Phone (optional, for SMS alerts)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="input" type="password" autoComplete="new-password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {save.error && <p className="field-error">{save.error} {Object.values(save.fields).join(' ')}</p>}
        <button type="submit" className="btn-primary w-full" disabled={save.busy}>{save.busy && <Loader2 className="h-4 w-4 animate-spin" />} Create account</button>
      </form>
    </div>
  )
}

function UnroutedTab({ offices }) {
  const [items, setItems] = useState(null)
  const [choice, setChoice] = useState({})
  const [message, setMessage] = useState(null)
  const load = useCallback(() => listMunicipalComplaints({ unrouted: 'true', status: 'all', sort: 'risk:desc,created:asc', per_page: 50 })
    .then((d) => setItems(d.items)).catch((err) => setMessage(getErrorMessage(err))), [])
  useEffect(() => { load() }, [load])
  const route = async (id) => {
    try {
      await admin.routeComplaint(id, { office_id: Number(choice[id]), note: 'Manually routed by administrator' })
      load()
    } catch (err) { setMessage(getErrorMessage(err)) }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">Complaints whose location is not inside any configured ward. Route them manually, or add a ward and re-run routing.</p>
        <button type="button" className="btn-secondary" onClick={async () => { const n = await admin.rerouteUnmapped(); setMessage(`${n} complaint(s) routed`); load() }}>Re-run location routing</button>
      </div>
      {message && <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm">{message}</p>}
      {items && items.length === 0 && <EmptyState icon={Route} title="Queue is empty" text="Every complaint is mapped to an office." />}
      <ul className="space-y-2">
        {(items || []).map((c) => (
          <li key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <Link to={`/municipality/complaints/${c.id}`} className="font-semibold hover:text-electric-700">{c.reference} · {c.title}</Link>
              <p className="text-xs text-slate-500">{categoryLabel(c.category)} · {c.address} · {c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}</p>
              <div className="mt-1 flex gap-2"><StatusBadge status={c.status} /><RiskBadge level={c.risk_level} size="sm" /></div>
            </div>
            <div className="flex gap-2">
              <select className="input w-56 py-2" value={choice[c.id] || ''} onChange={(e) => setChoice({ ...choice, [c.id]: e.target.value })} aria-label="Office">
                <option value="">Choose office</option>{offices.filter((o) => o.is_active).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <button type="button" className="btn-primary py-2" disabled={!choice[c.id]} onClick={() => route(c.id)}>Route</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AuditTab() {
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  useEffect(() => { admin.listAudit({ page }).then(setData).catch(() => setData({ items: [], pages: 1 })) }, [page])
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-2">When</th><th className="px-4 py-2">Who</th><th className="px-4 py-2">Action</th><th className="px-4 py-2">Details</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {(data?.items || []).map((a) => (
            <tr key={a.id}>
              <td className="whitespace-nowrap px-4 py-2 text-xs">{formatDateTime(a.created_at)}</td>
              <td className="px-4 py-2 text-xs">{a.actor?.name}</td>
              <td className="px-4 py-2 font-mono text-xs">{a.action}</td>
              <td className="max-w-md truncate px-4 py-2 font-mono text-[11px] text-slate-500">{a.complaint_id ? `complaint #${a.complaint_id} ` : ''}{JSON.stringify(a.details)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data && data.pages > 1 && (
        <div className="flex justify-center gap-3 p-3">
          <button type="button" className="btn-secondary py-1.5" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="text-sm">Page {page} of {data.pages}</span>
          <button type="button" className="btn-secondary py-1.5" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'overview'
  const [offices, setOffices] = useState([])
  const [wards, setWards] = useState([])
  const [error, setError] = useState(null)
  const reload = useCallback(() => {
    admin.listOffices().then(setOffices).catch((err) => setError(getErrorMessage(err)))
    admin.listWards().then(setWards).catch(() => setWards([]))
  }, [])
  useEffect(() => { reload() }, [reload])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Administrator workspace</h1>
        <p className="text-slate-600">Monitor citizen issues, manage municipal operations, and review staff activity across all offices.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setParams({ tab: key })}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ${tab === key ? 'bg-navy-900 text-white' : 'bg-white text-navy-700 ring-1 ring-slate-200'}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      {error && <ErrorState message={error} onRetry={reload} />}
      {tab === 'overview' && <OverviewTab offices={offices} setTab={(key) => setParams({ tab: key })} />}
      {tab === 'offices' && <OfficesTab offices={offices} reload={reload} />}
      {tab === 'wards' && <WardsTab offices={offices} wards={wards} reload={reload} />}
      {tab === 'staff' && <StaffTab offices={offices} />}
      {tab === 'unrouted' && <UnroutedTab offices={offices} />}
      {tab === 'audit' && <AuditTab />}
    </div>
  )
}
