import api from './api.js'

export async function getVerification(complaintId) {
  const { data } = await api.get(`/verification/${complaintId}`)
  return data
}

/** Resolution evidence. The idempotency key makes accidental double submits safe. */
export async function submitResolutionProof(complaintId, fields, files = [], idempotencyKey) {
  const formData = new FormData()
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') formData.append(key, String(value))
  })
  files.forEach((file, index) => formData.append('images', file.blob || file, file.name || `after-${index + 1}.jpg`))
  const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}
  const { data } = await api.post(`/verification/${complaintId}/proof`, formData, { headers })
  return data
}

export async function submitFeedback(complaintId, { verdict, rating, comment }) {
  const { data } = await api.post(`/verification/${complaintId}/feedback`, { verdict, rating, comment })
  return data
}
