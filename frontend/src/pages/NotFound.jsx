import { Link } from 'react-router-dom'
import { MapPinOff } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-electric-50 text-electric-600"><MapPinOff className="h-7 w-7" /></span>
      <h1 className="mt-4 font-display text-3xl font-bold">No page at this address</h1>
      <p className="mt-2 text-slate-600">The link may be old or mistyped.</p>
      <Link to="/" className="btn-primary mt-6">Back to home</Link>
    </div>
  )
}
