import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Loader2, UserPlus } from 'lucide-react'
import useAuth from '../hooks/useAuth.js'
import { getErrorMessage, getFieldErrors } from '../services/api.js'
import { validateSignup, hasErrors } from '../utils/validators.js'
import { homePathFor } from '../utils/statusUtils.js'

const FIELDS = [
  { name: 'name', label: 'Full name', type: 'text', autoComplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { name: 'phone', label: 'Phone (optional)', type: 'tel', autoComplete: 'tel' },
  { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', hint: 'At least 8 characters with letters and numbers' },
  { name: 'confirmPassword', label: 'Confirm password', type: 'password', autoComplete: 'new-password' },
]

export default function SignupPage() {
  const { register, user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={homePathFor(user)} replace />

  const submit = async (event) => {
    event.preventDefault()
    const validation = validateSignup(form)
    setErrors(validation)
    if (hasErrors(validation)) return
    setBusy(true)
    setError(null)
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password })
      navigate('/citizen', { replace: true })
    } catch (err) {
      setErrors(getFieldErrors(err))
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-12">
      <form onSubmit={submit} noValidate className="card w-full space-y-4 p-6 sm:p-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-slate-500">Your name is only visible to you and the department handling your report.</p>
        </div>
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700" role="alert">{error}</p>}
        {FIELDS.map((field) => (
          <div key={field.name}>
            <label htmlFor={field.name} className="label">{field.label}</label>
            <input
              id={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              value={form[field.name]}
              onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
              className={`input ${errors[field.name] ? 'input-error' : ''}`}
            />
            {errors[field.name] ? <p className="field-error">{errors[field.name]}</p> : field.hint && <p className="mt-1 text-xs text-slate-500">{field.hint}</p>}
          </div>
        ))}
        <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Create account
        </button>
        <p className="text-center text-sm text-slate-600">
          Already registered? <Link to="/login" className="font-semibold text-electric-600 hover:underline">Log in</Link>
        </p>
      </form>
    </div>
  )
}
