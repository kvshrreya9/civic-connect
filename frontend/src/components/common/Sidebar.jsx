import { NavLink } from 'react-router-dom'

export default function Sidebar({ links = [], title, footer }) {
  const itemClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
      isActive ? 'bg-navy-900 text-white shadow-lift' : 'text-navy-700 hover:bg-white hover:text-navy-900'
    }`

  return (
    <>
      <aside className="sticky top-24 hidden h-fit w-60 shrink-0 lg:block" aria-label="Section navigation">
        {title && <p className="mb-3 px-3 text-xs font-semibold text-slate-500">{title}</p>}
        <nav className="flex flex-col gap-1">
          {links.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink key={to} to={to} end={end} className={itemClass}>
              {Icon && <Icon className="h-4 w-4" />}
              <span className="flex-1">{label}</span>
              {badge ? <span className="rounded-full bg-signal-400 px-2 py-0.5 text-[11px] font-bold text-navy-950">{badge}</span> : null}
            </NavLink>
          ))}
        </nav>
        {footer && <div className="mt-6">{footer}</div>}
      </aside>
      <nav className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden" aria-label="Section navigation">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold ${
                isActive ? 'bg-navy-900 text-white' : 'bg-white text-navy-700 ring-1 ring-slate-200'
              }`
            }
          >
            {Icon && <Icon className="h-4 w-4" />}
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
