import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, PlusCircle, X } from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../services/dashboardService.js'
import { complaintPath, homePathFor, isStaff } from '../../utils/statusUtils.js'
import { timeAgo } from '../../utils/formatters.js'
import SyncStatus from './SyncStatus.jsx'

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="CivicConnect home">
      <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="#2f6bff" />
        <path d="M32 12c-8.3 0-15 6.5-15 14.6C17 37.5 32 52 32 52s15-14.5 15-25.4C47 18.5 40.3 12 32 12z" fill="#0a1433" />
        <circle cx="32" cy="26.5" r="6.5" fill="#2dd4bf" />
      </svg>
      <span className="font-display text-lg font-bold tracking-tight text-white">CivicConnect</span>
    </Link>
  )
}

function NotificationBell({ user }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState({ items: [], unread: 0 })
  const navigate = useNavigate()
  const ref = useRef(null)

  const load = useCallback(() => {
    getNotifications().then(setData).catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [load])

  useEffect(() => {
    const close = (event) => ref.current && !ref.current.contains(event.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const openItem = async (item) => {
    setOpen(false)
    if (!item.is_read) markNotificationRead(item.id).then(load).catch(() => {})
    if (item.complaint_id) navigate(complaintPath(user, item.complaint_id))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-10 w-10 place-items-center rounded-xl text-navy-100 hover:bg-white/10"
        aria-label={`Notifications, ${data.unread} unread`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {data.unread > 0 && (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-signal-400 px-1 text-[10px] font-bold text-navy-950">
            {data.unread > 9 ? '9+' : data.unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-navy-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="font-display font-bold">Notifications</p>
            {data.unread > 0 && (
              <button type="button" className="text-xs font-semibold text-electric-600 hover:underline" onClick={() => markAllNotificationsRead().then(load)}>
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {data.items.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-500">You are all caught up.</li>}
            {data.items.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => openItem(item)} className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 ${item.is_read ? '' : 'bg-electric-50/60'}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.is_read ? 'bg-slate-200' : 'bg-electric-500'}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{item.title}</span>
                    <span className="block text-xs text-slate-600">{item.message}</span>
                    <span className="mt-1 block text-[11px] text-slate-400">{timeAgo(item.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const links = [
    { to: '/', label: 'Home', end: true },
    { to: '/transparency', label: 'City performance' },
  ]
  if (user) links.push({ to: homePathFor(user), label: 'My dashboard', end: true })

  const handleLogout = () => {
    const staff = isStaff(user)
    logout()
    setMenuOpen(false)
    navigate(staff ? '/municipality/login' : '/')
  }

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-white/10 text-white' : 'text-navy-100 hover:text-white'}`

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-900/95 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4" aria-label="Main">
        <Logo />
        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'citizen' && <SyncStatus compact />}
          {user ? (
            <>
              {user.role === 'citizen' && (
                <Link to="/citizen/report" className="btn-teal hidden py-2 sm:inline-flex">
                  <PlusCircle className="h-4 w-4" /> Report an issue
                </Link>
              )}
              <NotificationBell user={user} />
              <div className="hidden text-right lg:block">
                <p className="text-sm font-semibold leading-tight text-white">{user.name}</p>
                <p className="text-[11px] text-navy-200">{user.office?.name || user.department?.name || user.role_label || user.role}</p>
              </div>
              <button type="button" onClick={handleLogout} className="hidden h-10 w-10 place-items-center rounded-xl text-navy-100 hover:bg-white/10 md:grid" aria-label="Log out">
                <LogOut className="h-5 w-5" />
              </button>
            </>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/municipality/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-navy-200 hover:text-white">Staff login</Link>
              <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-navy-100 hover:text-white">Log in</Link>
              <Link to="/signup" className="btn-primary py-2">Create account</Link>
            </div>
          )}
          <button type="button" className="grid h-10 w-10 place-items-center rounded-xl text-white hover:bg-white/10 md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu" aria-expanded={menuOpen}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>
      {menuOpen && (
        <div className="border-t border-white/10 px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-3">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={linkClass} onClick={() => setMenuOpen(false)}>
                {link.label}
              </NavLink>
            ))}
            {user?.role === 'citizen' && (
              <Link to="/citizen/report" className="btn-teal mt-2" onClick={() => setMenuOpen(false)}>
                <PlusCircle className="h-4 w-4" /> Report an issue
              </Link>
            )}
            {user ? (
              <button type="button" onClick={handleLogout} className="btn mt-2 bg-white/10 text-white">
                <LogOut className="h-4 w-4" /> Log out
              </button>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link to="/municipality/login" className="btn col-span-2 bg-white/5 text-white" onClick={() => setMenuOpen(false)}>Municipal staff login</Link>
                <Link to="/login" className="btn bg-white/10 text-white" onClick={() => setMenuOpen(false)}>Log in</Link>
                <Link to="/signup" className="btn-primary" onClick={() => setMenuOpen(false)}>Sign up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
