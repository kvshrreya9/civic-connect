import { Search } from 'lucide-react'
import { CATEGORIES } from '../../data/dummyData.js'
import { RISK_META, STATUS_META } from '../../utils/statusUtils.js'

export const DEFAULT_FILTERS = {
  q: '', status: '', risk: '', category: '', ward_id: '', assigned_to: '', overdue: '', min_reports: '',
  date_from: '', date_to: '', sort: 'risk:desc,priority:desc',
}

export default function ComplaintFilters({ filters, onChange, wards = [], workers = [], isFieldWorker = false }) {
  const set = (key, value) => onChange({ ...filters, [key]: value, page: 1 })

  const select = (key, label, options, extra = '') => (
    <label className={`block ${extra}`}>
      <span className="mb-1 block text-[11px] font-semibold text-slate-500">{label}</span>
      <select value={filters[key] || ''} onChange={(e) => set(key, e.target.value)} className="input py-2">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )

  return (
    <section className="card space-y-3 p-4" aria-label="Filters">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={filters.q || ''} onChange={(e) => set('q', e.target.value)} className="input pl-9"
               placeholder="Search complaint ID, title, description or address" aria-label="Search complaints" />
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        {select('status', 'Status', [{ value: '', label: 'Active (default)' }, { value: 'all', label: 'All statuses' },
          ...Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label }))])}
        {select('risk', 'Risk', [{ value: '', label: 'Any risk' }, { value: 'critical,high', label: 'High + Critical' },
          ...Object.entries(RISK_META).map(([value, m]) => ({ value, label: m.label }))])}
        {select('category', 'Category', [{ value: '', label: 'Any category' }, ...CATEGORIES])}
        {select('ward_id', 'Ward', [{ value: '', label: 'Any ward' }, ...wards.map((w) => ({ value: String(w.id), label: w.name }))])}
        {!isFieldWorker && select('assigned_to', 'Assigned to', [{ value: '', label: 'Anyone' }, { value: 'unassigned', label: 'Unassigned' },
          { value: 'me', label: 'Me' }, ...workers.map((w) => ({ value: String(w.id), label: w.name }))])}
        {select('overdue', 'Deadline', [{ value: '', label: 'Any' }, { value: 'true', label: 'Overdue only' }])}
        {select('min_reports', 'Reports', [{ value: '', label: 'Any count' }, { value: '2', label: '2+ citizens' },
          { value: '5', label: '5+ citizens' }, { value: '10', label: '10+ citizens' }])}
        <div className="grid grid-cols-2 gap-1">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">From</span>
            <input type="date" value={filters.date_from || ''} onChange={(e) => set('date_from', e.target.value)} className="input px-2 py-2 text-xs" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">To</span>
            <input type="date" value={filters.date_to || ''} onChange={(e) => set('date_to', e.target.value)} className="input px-2 py-2 text-xs" />
          </label>
        </div>
      </div>
    </section>
  )
}
