import api from './api.js'

export async function checkDuplicates({ latitude, longitude, category, description, image_hashes = [] }) {
  const { data } = await api.post('/duplicates/check', { latitude, longitude, category, description, image_hashes })
  return data.candidates
}

export async function getComplaintDuplicates(complaintId) {
  const { data } = await api.get(`/duplicates/complaint/${complaintId}`)
  return data.candidates
}

export async function resolveDuplicate(candidateId, action) {
  const { data } = await api.post(`/duplicates/${candidateId}/resolve`, { action })
  return data.candidate
}
