import { Link } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import useAuth from '../hooks/useAuth.js'
import { homePathFor } from '../utils/statusUtils.js'

export default function Unauthorized() {
  const { user } = useAuth()
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600"><ShieldX className="h-7 w-7" /></span>
      <h1 className="mt-4 font-display text-3xl font-bold">This area is for another role</h1>
      <p className="mt-2 text-slate-600">Your account does not have access to this page. City staff accounts are created by an administrator.</p>
      <Link to={homePathFor(user)} className="btn-primary mt-6">Go to my dashboard</Link>
    </div>
  )
}
