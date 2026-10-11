import api from './api.js'

const FIELDS = ['title', 'description', 'category', 'severity', 'safety_risk', 'affected_count', 'latitude', 'longitude', 'address']

export function buildComplaintFormData(payload, files = [], clientRequestId) {
  const formData = new FormData()
  FIELDS.forEach((key) => {
    const value = payload[key]
    if (value !== undefined && value !== null) formData.append(key, String(value))
  })
  if (clientRequestId) formData.append('client_request_id', clientRequestId)
  files.forEach((file, index) => {
    const name = file.name || `photo-${index + 1}.jpg`
    formData.append('images', file.blob || file, name)
  })
  return formData
}

export async function createComplaint(payload, files, clientRequestId, onUploadProgress) {
  const formData = buildComplaintFormData(payload, files, clientRequestId)
  const headers = clientRequestId ? { 'Idempotency-Key': clientRequestId } : {}
  const { data } = await api.post('/complaints', formData, { headers, onUploadProgress })
  return data
}

export async function listComplaints(params = {}) {
  const { data } = await api.get('/complaints', { params })
  return data
}

export async function listMyComplaints(params = {}) {
  return listComplaints({ ...params, scope: 'mine' })
}

export async function getComplaint(id) {
  const { data } = await api.get(`/complaints/${id}`)
  return data.complaint
}

export async function getHistory(id) {
  const { data } = await api.get(`/complaints/${id}/history`)
  return data.history
}

export async function toggleSupport(id) {
  const { data } = await api.post(`/complaints/${id}/support`)
  return data
}

export async function getMapPoints(params = {}) {
  const { data } = await api.get('/complaints/map', { params })
  return data.points
}

export async function previewPriority(payload) {
  const { data } = await api.post('/priority/preview', payload)
  return data
}

// Staff operations live in municipalService.js.
