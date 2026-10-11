import { Outlet } from 'react-router-dom'
import { ClipboardList, LayoutDashboard, PlusCircle, UploadCloud } from 'lucide-react'
import Navbar from '../components/common/Navbar.jsx'
import Sidebar from '../components/common/Sidebar.jsx'
import useOfflineQueue from '../hooks/useOfflineQueue.js'

export default function CitizenLayout() {
  const { pendingCount, failedCount } = useOfflineQueue()
  const waiting = pendingCount + failedCount
  const links = [
    { to: '/citizen', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/citizen/report', label: 'Report an issue', icon: PlusCircle },
    { to: '/citizen/complaints', label: 'My reports', icon: ClipboardList },
    { to: '/citizen/offline', label: 'Saved offline', icon: UploadCloud, badge: waiting || null },
  ]
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6 lg:py-8">
        <Sidebar links={links} title="Citizen" />
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
