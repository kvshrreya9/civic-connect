import { useState } from 'react'
import { CheckCircle2, Loader2, Star, XCircle } from 'lucide-react'
import { submitFeedback } from '../../services/verificationService.js'
import { getErrorMessage } from '../../services/api.js'

export default function ResolutionFeedback({ complaintId, onSubmitted }) {
  const [verdict, setVerdict] = useState(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (event) => {
    event.preventDefault()
    if (!verdict) return setError('Choose whether the issue is fixed')
    if (verdict === 'disputed' && comment.trim().length < 5) return setError('Tell the department what is still wrong')
    setSubmitting(true)
    setError(null)
    try {
      const result = await submitFeedback(complaintId, { verdict, rating: rating || null, comment })
      onSubmitted?.(result)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl bg-navy-900 p-5 text-white">
      <div>
        <h4 className="font-display text-lg font-bold">Is it actually fixed?</h4>
        <p className="text-sm text-navy-200">The case only closes when you confirm. Disputing reopens it and escalates it.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setVerdict('confirmed')}
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
            verdict === 'confirmed' ? 'border-teal-300 bg-teal-400 text-navy-950' : 'border-white/20 hover:bg-white/5'
          }`}
        >
          <CheckCircle2 className="h-5 w-5" /> Yes, it is fixed
        </button>
        <button
          type="button"
          onClick={() => setVerdict('disputed')}
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
            verdict === 'disputed' ? 'border-rose-300 bg-rose-500 text-white' : 'border-white/20 hover:bg-white/5'
          }`}
        >
          <XCircle className="h-5 w-5" /> No, still a problem
        </button>
      </div>
      <div>
        <p className="mb-1 text-sm font-semibold">Rate the response (optional)</p>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} onClick={() => setRating(n)} className="p-1" aria-label={`${n} stars`}>
              <Star className={`h-6 w-6 ${n <= rating ? 'fill-signal-400 text-signal-400' : 'text-navy-400'}`} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="feedback-comment" className="mb-1 block text-sm font-semibold">
          {verdict === 'disputed' ? 'What is still wrong?' : 'Comment (optional)'}
        </label>
        <textarea id="feedback-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={2000} className="input text-navy-900" />
      </div>
      {error && <p className="text-sm font-medium text-rose-300">{error}</p>}
      <button type="submit" className="btn-teal w-full" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {verdict === 'disputed' ? 'Reopen the complaint' : 'Confirm the fix'}
      </button>
    </form>
  )
}
