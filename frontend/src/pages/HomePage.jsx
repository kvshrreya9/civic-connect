import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeCheck, Bell, Building2, CloudOff, Copy, Gauge, ImageDown, LineChart, MapPinned, ShieldCheck, Timer, Users,
} from 'lucide-react'
import IssueMap from '../components/map/IssueMap.jsx'
import PublicStats from '../components/dashboard/PublicStats.jsx'
import CategoryChart from '../components/dashboard/CategoryChart.jsx'
import { getMapPoints } from '../services/complaintService.js'
import { getPublicStats } from '../services/dashboardService.js'
import { FALLBACK_STATS, HOW_IT_WORKS, MAP_DEFAULTS, PROBLEMS } from '../data/dummyData.js'
import useAuth from '../hooks/useAuth.js'
import { complaintPath, homePathFor } from '../utils/statusUtils.js'
import { formatNumber, formatPercent } from '../utils/formatters.js'

const FEATURES = [
  { icon: MapPinned, title: 'Pin-point reporting', text: 'Drop a pin on OpenStreetMap, attach photos and get an address suggested automatically.' },
  { icon: Gauge, title: 'Open priority score', text: 'Severity, safety, people affected, nearby reports and waiting time - every point shown.' },
  { icon: Copy, title: 'Duplicate awareness', text: 'See similar reports nearby and add your support instead. Your report is never thrown away.' },
  { icon: Building2, title: 'Automatic routing', text: 'Each category goes straight to the responsible department, which can transfer if needed.' },
  { icon: Timer, title: 'Deadlines that escalate', text: 'Every issue gets a resolution target. Missed targets are flagged and escalated.' },
  { icon: BadgeCheck, title: 'Citizen-verified fixes', text: 'After photos are required, and you confirm or dispute before a case closes.' },
  { icon: CloudOff, title: 'Works offline', text: 'Reports save on your phone and send themselves when signal returns - never twice.' },
  { icon: ShieldCheck, title: 'Privacy by default', text: 'Photo location data is stripped, faces are blurred, and your name is never public.' },
]

export default function HomePage() {
  const { user } = useAuth()
  const [points, setPoints] = useState([])
  const [stats, setStats] = useState(null)

  useEffect(() => {
    getMapPoints({ limit: 400 }).then(setPoints).catch(() => setPoints([]))
    getPublicStats().then(setStats).catch(() => setStats(FALLBACK_STATS))
  }, [])

  const reportLink = user?.role === 'citizen' ? '/citizen/report' : user ? homePathFor(user) : '/signup'
  const totals = stats?.totals || FALLBACK_STATS.totals

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden="true">
          <defs>
            <pattern id="streets" width="120" height="120" patternUnits="userSpaceOnUse">
              <path d="M0 60h120M60 0v120M0 20h40M80 100h40M20 0v40M100 80v40" stroke="#fff" strokeWidth="1.5" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#streets)" />
        </svg>
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pb-24 lg:pt-20">
          <div className="animate-rise">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-200 ring-1 ring-white/15">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping2 rounded-full bg-teal-300" /><span className="relative h-2 w-2 rounded-full bg-teal-300" /></span>
              {formatNumber(totals.open)} issues being worked on in {MAP_DEFAULTS.cityName}
            </p>
            <h1 className="mt-6 font-display text-[2.75rem] font-extrabold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              <span className="block">Your City.</span>
              <span className="block text-electric-300">Your Voice.</span>
              <span className="block text-teal-300">Real Change.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-100">
              Report a pothole, overflowing bin or dark street in under a minute. Follow it to the right department, watch the deadline, and confirm the fix yourself.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={reportLink} className="btn-teal px-6 py-3 text-base">Report an issue</Link>
              <Link to="/transparency" className="btn border border-white/20 px-6 py-3 text-base text-white hover:bg-white/10">See how the city is doing</Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-6">
              <div><dt className="text-xs text-navy-200">Fixed</dt><dd className="font-display text-2xl font-bold">{formatNumber(totals.resolved)}</dd></div>
              <div><dt className="text-xs text-navy-200">Resolution rate</dt><dd className="font-display text-2xl font-bold">{formatPercent(totals.resolution_rate)}</dd></div>
              <div><dt className="text-xs text-navy-200">Neighbours involved</dt><dd className="font-display text-2xl font-bold">{formatNumber(totals.citizens_engaged)}</dd></div>
            </dl>
          </div>
          <div className="relative animate-rise [animation-delay:150ms]">
            <div className="rounded-[28px] bg-white/5 p-2 ring-1 ring-white/15 backdrop-blur">
              <IssueMap points={points} height={460} linkBuilder={user ? (p) => complaintPath(user, p.id) : null} />
            </div>
            <p className="mt-3 text-center text-xs text-navy-200">Live map of reported issues. Reporter identities are never shown.</p>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Reporting a broken street should not feel like shouting into the void.</h2>
            <p className="mt-3 text-lg text-slate-600">Most civic complaints fail in the same three places.</p>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="border-l-4 border-rose-400 pl-5">
                <h3 className="font-display text-xl font-bold">{p.title}</h3>
                <p className="mt-2 text-slate-600">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution / how it works - a real sequence, so it is numbered */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:py-20">
          <h2 className="max-w-2xl font-display text-3xl font-bold sm:text-4xl">From pothole to verified repair, in the open.</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-4">
            {HOW_IT_WORKS.map((step, index) => (
              <li key={step.title} className="relative">
                <span className="font-display text-5xl font-extrabold text-electric-200">{index + 1}</span>
                <h3 className="mt-2 font-display text-lg font-bold">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 lg:grid-cols-[320px_1fr] lg:py-20">
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Built for the street and the control room.</h2>
            <p className="mt-3 text-slate-600">Citizens get a fast, honest reporting tool. Departments get a ranked queue, deadlines and proof of work.</p>
            <Link to={reportLink} className="btn-primary mt-6">Start a report</Link>
          </div>
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-teal-300"><Icon className="h-5 w-5" /></span>
                <div>
                  <h3 className="font-display text-lg font-bold">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community impact */}
      <section className="bg-navy-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">Community impact, counted live.</h2>
              <p className="mt-3 text-navy-200">Every number below is calculated from real reports on this platform - nothing is typed in by hand.</p>
            </div>
            <span className="inline-flex items-center gap-2 text-sm text-navy-200"><Users className="h-4 w-4" /> {formatNumber(totals.supports)} supports from neighbours</span>
          </div>
          <div className="mt-8"><PublicStats totals={totals} loading={!stats} variant="dark" /></div>
        </div>
      </section>

      {/* Transparency */}
      <section className="bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-2 lg:items-center lg:py-20">
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Department performance is public.</h2>
            <p className="mt-3 text-lg text-slate-600">
              Resolution rates, deadline compliance and hotspots for every department are published on the city performance page. Anyone can check - no login needed.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-navy-800">
              <li className="flex items-center gap-3"><LineChart className="h-5 w-5 text-electric-500" /> Daily reported vs fixed trend</li>
              <li className="flex items-center gap-3"><Timer className="h-5 w-5 text-electric-500" /> Deadline compliance by department</li>
              <li className="flex items-center gap-3"><Bell className="h-5 w-5 text-electric-500" /> Escalations when targets are missed</li>
              <li className="flex items-center gap-3"><ImageDown className="h-5 w-5 text-electric-500" /> Before and after photos on every fix</li>
            </ul>
            <Link to="/transparency" className="btn-secondary mt-8">Open city performance</Link>
          </div>
          <CategoryChart data={(stats?.by_category || []).slice(0, 6)} title="What people are reporting" />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-electric-500">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-14 md:flex-row md:items-center">
          <h2 className="max-w-xl font-display text-3xl font-bold text-white sm:text-4xl">Seen something broken on your way home?</h2>
          <div className="flex flex-wrap gap-3">
            <Link to={reportLink} className="btn bg-navy-950 px-6 py-3 text-base text-white hover:bg-navy-900">Report it now</Link>
            {!user && <Link to="/login" className="btn bg-white/15 px-6 py-3 text-base text-white hover:bg-white/25">Log in</Link>}
          </div>
        </div>
      </section>

      <footer className="bg-navy-950 text-navy-300">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-4 py-8 text-sm md:flex-row">
          <p>CivicConnect - community issue reporting and resolution.</p>
          <p>Map data © OpenStreetMap contributors.</p>
        </div>
      </footer>
    </div>
  )
}
