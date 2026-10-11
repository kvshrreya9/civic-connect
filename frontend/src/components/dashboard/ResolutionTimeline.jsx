import { useMemo, useState } from 'react'
import { formatDate } from '../../utils/formatters.js'

const W = 640
const H = 220
const PAD = { top: 16, right: 12, bottom: 28, left: 30 }

function path(points) {
  return points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
}

export default function ResolutionTimeline({ data = [], title = 'Reported vs fixed, last 30 days' }) {
  const [hover, setHover] = useState(null)
  const chart = useMemo(() => {
    const max = Math.max(2, ...data.map((d) => Math.max(d.reported, d.resolved)))
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const x = (i) => PAD.left + (data.length <= 1 ? 0 : (i / (data.length - 1)) * innerW)
    const y = (v) => PAD.top + innerH - (v / max) * innerH
    const reported = data.map((d, i) => [x(i), y(d.reported)])
    const resolved = data.map((d, i) => [x(i), y(d.resolved)])
    const area = reported.length ? `${path(reported)} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : ''
    const ticks = [0, Math.round(max / 2), max]
    return { reported, resolved, area, ticks, x, y, innerW }
  }, [data])

  const totals = data.reduce((acc, d) => ({ reported: acc.reported + d.reported, resolved: acc.resolved + d.resolved }), { reported: 0, resolved: 0 })

  return (
    <section className="card p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h3 className="font-display text-lg font-bold">{title}</h3>
        <div className="flex gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-electric-700"><span className="h-0.5 w-4 bg-electric-500" /> Reported ({totals.reported})</span>
          <span className="flex items-center gap-1.5 text-teal-700"><span className="h-0.5 w-4 bg-teal-500" /> Fixed ({totals.resolved})</span>
        </div>
      </div>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No activity yet.</p>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Line chart of reported and fixed issues per day">
            {chart.ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={W - PAD.right} y1={chart.y(t)} y2={chart.y(t)} stroke="#e2e8f0" strokeDasharray="3 4" />
                <text x={PAD.left - 8} y={chart.y(t) + 4} textAnchor="end" className="fill-slate-400 text-[10px]">{t}</text>
              </g>
            ))}
            <path d={chart.area} fill="url(#reportedFill)" />
            <defs>
              <linearGradient id="reportedFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2f6bff" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#2f6bff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={path(chart.reported)} fill="none" stroke="#2f6bff" strokeWidth="2.5" strokeLinejoin="round" />
            <path d={path(chart.resolved)} fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinejoin="round" />
            {[0, Math.floor(data.length / 2), data.length - 1].map((i) => (
              <text key={i} x={chart.x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} className="fill-slate-400 text-[10px]">
                {formatDate(data[i].date)}
              </text>
            ))}
            {hover !== null && (
              <g>
                <line x1={chart.x(hover)} x2={chart.x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="#94a3b8" />
                <circle cx={chart.reported[hover][0]} cy={chart.reported[hover][1]} r="4" fill="#2f6bff" />
                <circle cx={chart.resolved[hover][0]} cy={chart.resolved[hover][1]} r="4" fill="#14b8a6" />
              </g>
            )}
            {data.map((d, i) => (
              <rect
                key={d.date}
                x={chart.x(i) - chart.innerW / data.length / 2}
                y={PAD.top}
                width={chart.innerW / data.length}
                height={H - PAD.top - PAD.bottom}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            ))}
          </svg>
          {hover !== null && (
            <div className="pointer-events-none absolute right-2 top-0 rounded-lg bg-navy-900 px-3 py-2 text-xs text-white shadow-lift">
              <p className="font-semibold">{formatDate(data[hover].date)}</p>
              <p>{data[hover].reported} reported · {data[hover].resolved} fixed</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
