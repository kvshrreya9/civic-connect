import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import { loginPathFor } from '../utils/statusUtils.js'
import Navbar from '../components/common/Navbar.jsx'
import Loader from '../components/common/Loader.jsx'
import CitizenLayout from '../layouts/CitizenLayout.jsx'
import EmployeeLayout from '../layouts/EmployeeLayout.jsx'
import HomePage from '../pages/HomePage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import SignupPage from '../pages/SignupPage.jsx'
import CitizenDashboard from '../pages/CitizenDashboard.jsx'
import RaiseComplaint from '../pages/RaiseComplaint.jsx'
import MyComplaints from '../pages/MyComplaints.jsx'
import EmployeeDashboard from '../pages/EmployeeDashboard.jsx'
import MunicipalLoginPage from '../pages/MunicipalLoginPage.jsx'
import MunicipalComplaintsPage from '../pages/MunicipalComplaintsPage.jsx'
import AlertsPage from '../pages/AlertsPage.jsx'
import AdminPage from '../pages/AdminPage.jsx'
import PublicTransparencyDashboard from '../pages/PublicTransparencyDashboard.jsx'
import ComplaintDetailsPage from '../pages/ComplaintDetailsPage.jsx'
import OfflineQueuePage from '../pages/OfflineQueuePage.jsx'
import VerifyResolutionPage from '../pages/VerifyResolutionPage.jsx'
import Unauthorized from '../pages/Unauthorized.jsx'
import NotFound from '../pages/NotFound.jsx'
import { reverseGeocode, searchPlaces } from '../services/locationService.js'

function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Loader label="Checking your session" fullScreen />
  if (!user) return <Navigate to={loginPathFor(location.pathname)} replace state={{ from: location }} />
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />
  return children
}

const STAFF = ['officer', 'employee', 'field_worker', 'admin']
const OFFICERS = ['officer', 'employee', 'admin']

function LegacyComplaintRedirect() {
  const { id } = useParams()
  return <Navigate to={`/municipality/complaints/${id}`} replace />
}

function PublicShell() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  )
}

function ThozhanRouteSync() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    window.__THOZHAN_ROUTE__ = location.pathname
    window.__THOZHAN_OPEN_REPORT__ = () => {
      if (user?.role !== 'citizen') return false
      navigate('/citizen/report')
      return true
    }
    window.__THOZHAN_SEARCH_PLACE__ = searchPlaces
    window.__THOZHAN_REVERSE_GEOCODE__ = reverseGeocode
    window.dispatchEvent(new CustomEvent('thozhan:route', {
      detail: { path: location.pathname, role: user?.role || null, userId: user?.id || null },
    }))
    return () => {
      delete window.__THOZHAN_OPEN_REPORT__
      delete window.__THOZHAN_SEARCH_PLACE__
      delete window.__THOZHAN_REVERSE_GEOCODE__
    }
  }, [location.pathname, navigate, user?.id, user?.role])

  return null
}

export default function AppRouter() {
  return (
    <>
      <ThozhanRouteSync />
      <Routes>
      <Route element={<PublicShell />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="municipality/login" element={<MunicipalLoginPage />} />
        <Route path="transparency" element={<PublicTransparencyDashboard />} />
        <Route path="unauthorized" element={<Unauthorized />} />
        <Route
          path="complaints/:id"
          element={
            <ProtectedRoute>
              <div className="px-4 py-6"><ComplaintDetailsPage /></div>
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="/citizen"
        element={
          <ProtectedRoute roles={['citizen']}>
            <CitizenLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CitizenDashboard />} />
        <Route path="report" element={<RaiseComplaint />} />
        <Route path="complaints" element={<MyComplaints />} />
        <Route path="complaints/:id" element={<ComplaintDetailsPage />} />
        <Route path="offline" element={<OfflineQueuePage />} />
        <Route path="verify/:id" element={<VerifyResolutionPage />} />
      </Route>

      <Route
        path="/municipality"
        element={
          <ProtectedRoute roles={STAFF}>
            <EmployeeLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<EmployeeDashboard />} />
        <Route path="complaints" element={<MunicipalComplaintsPage />} />
        <Route path="complaints/:id" element={<ComplaintDetailsPage />} />
        <Route path="alerts" element={<ProtectedRoute roles={OFFICERS}><AlertsPage /></ProtectedRoute>} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <EmployeeLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminPage />} />
      </Route>

      {/* Legacy staff URLs */}
      <Route path="/employee" element={<Navigate to="/municipality/dashboard" replace />} />
      <Route path="/employee/complaints/:id" element={<LegacyComplaintRedirect />} />

      <Route element={<PublicShell />}>
        <Route path="*" element={<NotFound />} />
      </Route>
      </Routes>
    </>
  )
}
