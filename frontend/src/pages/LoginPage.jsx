import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react'
import useAuth from '../hooks/useAuth.js'
import { getErrorMessage } from '../services/api.js'
import { validateLogin, hasErrors } from '../utils/validators.js'
import { homePathFor } from '../utils/statusUtils.js'
import { DEMO_ACCOUNTS } from '../data/dummyData.js'

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  if (user) return <Navigate to={homePathFor(user)} replace />

  const submit = async (event) => {
    event.preventDefault()
    const validation = validateLogin(form)
    setErrors(validation)
    if (hasErrors(validation)) return
    setBusy(true)
    setError(null)
    try {
      const loggedIn = await login(form.email.trim(), form.password)
      const from = location.state?.from?.pathname
      navigate(from && from !== '/login' ? from : homePathFor(loggedIn), { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-2">
      <div className="hidden lg:block">
        <h1 className="font-display text-5xl font-extrabold leading-tight text-navy-900">Welcome back.</h1>
        <p className="mt-4 max-w-md text-lg text-slate-600">Check on your reports, confirm fixes, and see what is happening in your neighbourhood.</p>
        <div className="mt-8 rounded-2xl bg-navy-900 p-5 text-sm text-navy-100">
          <p className="font-semibold text-white">Demo accounts</p>
          <p className="mt-1 text-navy-200">Available after running <code className="rounded bg-white/10 px-1">flask seed-demo</code>. Password is set by DEMO_PASSWORD in backend/.env. Staff accounts use the staff login.</p>
          <ul className="mt-3 space-y-1.5">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button type="button" onClick={() => setForm((f) => ({ ...f, email: a.email }))} className="text-left hover:text-teal-300">
                  <span className="font-semibold text-white">{a.role}:</span> {a.email}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <form onSubmit={submit} noValidate className="card mx-auto w-full max-w-md space-y-5 p-6 sm:p-8">
        <div>
          <h2 className="font-display text-2xl font-bold">Citizen login</h2>
          <p className="text-sm text-slate-500">Report issues and track their resolution.</p>
        </div>
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700" role="alert">{error}</p>}
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`input ${errors.email ? 'input-error' : ''}`} />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <div className="relative">
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={`input pr-10 ${errors.password ? 'input-error' : ''}`} />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="field-error">{errors.password}</p>}
        </div>
        <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Log in
        </button>
        <p className="text-center text-sm text-slate-600">
          New here? <Link to="/signup" className="font-semibold text-electric-600 hover:underline">Create a citizen account</Link>
        </p>
        <p className="border-t border-slate-100 pt-3 text-center text-sm text-slate-600">
          Municipality or panchayat staff? <Link to="/municipality/login" className="font-semibold text-electric-600 hover:underline">Staff login</Link>
        </p>
      </form>
    </div>
  )
}
