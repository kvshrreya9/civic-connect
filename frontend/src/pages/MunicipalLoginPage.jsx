import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Building2, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import useAuth from '../hooks/useAuth.js'
import { getErrorMessage } from '../services/api.js'
import { hasErrors, validateLogin } from '../utils/validators.js'
import { homePathFor } from '../utils/statusUtils.js'
import { getMunicipalOffices } from '../services/locationService.js'

export default function MunicipalLoginPage() {
  const { municipalLogin, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ office_id: '', email: '', password: '' })
  const [offices, setOffices] = useState([])
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    let active = true
    getMunicipalOffices()
      .then((items) => active && setOffices(items))
      .catch((err) => active && setError(getErrorMessage(err, 'Could not load the municipality list. Please refresh and try again.')))
    return () => { active = false }
  }, [])

  if (user) return <Navigate to={homePathFor(user)} replace />

  const submit = async (event) => {
    event.preventDefault()
    const validation = validateLogin(form)
    if (!form.office_id) validation.office_id = 'Choose your municipality or administrator access'
    setErrors(validation)
    if (hasErrors(validation)) return
    setBusy(true)
    setError(null)
    try {
      const loggedIn = await municipalLogin(form.email.trim(), form.password, form.office_id)
      const from = location.state?.from?.pathname
      navigate(from && (from.startsWith('/municipality') || from.startsWith('/admin')) ? from : homePathFor(loggedIn), { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-navy-950">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2">
        <div className="text-white">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-200 ring-1 ring-white/15">
            <Building2 className="h-3.5 w-3.5" /> Municipality / Panchayat staff
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight sm:text-5xl">Staff sign in</h1>
          <p className="mt-4 max-w-md text-navy-200">
            For officers, field workers and administrators. Accounts are created by your administrator and only show
            complaints in your office's jurisdiction.
          </p>
          <p className="mt-6 flex items-start gap-2 text-sm text-navy-300">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" /> Every assignment, status change and alert acknowledgement is recorded in the audit trail.
          </p>
        </div>
        <form onSubmit={submit} noValidate className="card mx-auto w-full max-w-md space-y-5 p-6 sm:p-8">
          <h2 className="font-display text-2xl font-bold">Municipal login</h2>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700" role="alert">{error}</p>}
          <div>
            <label htmlFor="m-office" className="label">Municipality / office</label>
            <select id="m-office" value={form.office_id} onChange={(e) => setForm({ ...form, office_id: e.target.value })}
                    className={`input ${errors.office_id ? 'input-error' : ''}`} required>
              <option value="">Choose your office</option>
              {offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}
              <option value="all">Administrator / All offices</option>
            </select>
            {errors.office_id && <p className="field-error">{errors.office_id}</p>}
          </div>
          <div>
            <label htmlFor="m-email" className="label">Work email</label>
            <input id="m-email" type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                   className={`input ${errors.email ? 'input-error' : ''}`} />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="m-password" className="label">Password</label>
            <div className="relative">
              <input id="m-password" type={show ? 'text' : 'password'} autoComplete="current-password" value={form.password}
                     onChange={(e) => setForm({ ...form, password: e.target.value })} className={`input pr-10 ${errors.password ? 'input-error' : ''}`} />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>
          <button type="submit" className="btn-primary w-full py-3" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in</button>
          <p className="text-center text-sm text-slate-600">Reporting an issue? <Link to="/login" className="font-semibold text-electric-600 hover:underline">Citizen login</Link></p>
        </form>
      </div>
    </div>
  )
}
