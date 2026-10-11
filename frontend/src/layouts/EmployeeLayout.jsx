import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { BarChart3, BellRing, ClipboardList, LayoutDashboard, Settings } from 'lucide-react'
import Navbar from '../components/common/Navbar.jsx'
import Sidebar from '../components/common/Sidebar.jsx'
import useAuth from '../hooks/useAuth.js'
import { getAlertCount } from '../services/municipalService.js'
import { isAdmin, isOfficer } from '../utils/statusUtils.js'

/** Municipality / Panchayat staff layout (officers, field workers, administrators). */
export default function EmployeeLayout() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState(0)

  useEffect(() => {
    if (!isOfficer(user)) return undefined
    const load = () => getAlertCount().then(setAlerts).catch(() => {})
    load()
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [user])

  const links = [
    { to: '/municipality/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/municipality/complaints', label: user?.role === 'field_worker' ? 'My tasks' : user?.role === 'admin' ? 'Citizen issues' : 'Complaints', icon: ClipboardList },
  ]
  if (isOfficer(user)) links.push({ to: '/municipality/alerts', label: 'High-risk alerts', icon: BellRing, badge: alerts || null })
  if (isAdmin(user)) links.push({ to: '/admin', label: 'Administration', icon: Settings })
  links.push({ to: '/transparency', label: 'City performance', icon: BarChart3 })

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto flex max-w-[1600px] gap-8 px-4 py-6 lg:py-8">
        <Sidebar
          links={links}
          title={user?.role_label || 'Municipal staff'}
          footer={(user?.office || user?.role === 'admin') && (
            <div className="rounded-xl bg-navy-900 p-4 text-white">
              <p className="text-xs text-navy-200">Jurisdiction</p>
              <p className="font-display font-bold">{user.office?.name || 'All offices'}</p>
              {user.ward && <p className="text-xs text-navy-200">{user.ward.name}</p>}
            </div>
          )}
        />
        <main className="min-w-0 flex-1"><Outlet /></main>
      </div>
    </div>
  )
}
