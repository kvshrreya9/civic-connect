import { categoryMeta } from '../../utils/formatters.js'

export default function CategoryChart({ data = [], title = 'Reports by category' }) {
  const max = Math.max(1, ...data.map((d) => d.total))
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h3 className="font-display text-lg font-bold">{title}</h3>
        <div className="flex gap-3 text-[11px] font-semibold text-slate-500">
          <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-teal-400" /> Fixed</span>
          <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-electric-500" /> Open</span>
        </div>
      </div>
      {data.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No reports yet.</p>}
      <ul className="space-y-3">
        {data.map((row) => {
          const meta = categoryMeta(row.category)
          const resolvedPct = (row.resolved / max) * 100
          const openPct = (row.open / max) * 100
          const otherPct = ((row.total - row.resolved - row.open) / max) * 100
          return (
            <li key={row.category}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-semibold text-navy-800">{meta.label}</span>
                <span className="tabular-nums text-slate-500">
                  {row.resolved}/{row.total} fixed
                </span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${meta.label}: ${row.total} reports, ${row.resolved} fixed, ${row.open} open`}>
                <span className="bg-teal-400 transition-all duration-700" style={{ width: `${resolvedPct}%` }} />
                <span className="bg-electric-500 transition-all duration-700" style={{ width: `${openPct}%` }} />
                <span className="bg-slate-300" style={{ width: `${Math.max(0, otherPct)}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
