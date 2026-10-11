import ComplaintForm from '../components/citizen/ComplaintForm.jsx'

export default function RaiseComplaint() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Report an issue</h1>
        <p className="text-slate-600">Takes about a minute. Your report goes straight to the responsible department.</p>
      </div>
      <ComplaintForm />
    </div>
  )
}
