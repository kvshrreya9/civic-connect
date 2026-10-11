import api from './api.js'

export async function getMunicipalSummary() {
  const { data } = await api.get('/municipal/summary')
  return data
}

export async function listMunicipalComplaints(params = {}) {
  const { data } = await api.get('/municipal/complaints', { params })
  return data
}

export async function getMunicipalComplaint(id) {
  const { data } = await api.get(`/municipal/complaints/${id}`)
  return data.complaint
}

export async function getComplaintActivity(id) {
  const { data } = await api.get(`/municipal/complaints/${id}/activity`)
  return data
}

export async function updateComplaintStatus(id, payload) {
  const { data } = await api.post(`/municipal/complaints/${id}/status`, payload)
  return data.complaint
}

export async function assignWorker(id, payload) {
  const { data } = await api.post(`/municipal/complaints/${id}/assign`, payload)
  return data.complaint
}

export async function transferOffice(id, payload) {
  const { data } = await api.post(`/municipal/complaints/${id}/transfer`, payload)
  return data.complaint
}

export async function addInternalNote(id, note) {
  const { data } = await api.post(`/municipal/complaints/${id}/notes`, { note })
  return data.complaint
}

export async function getWorkers(officeId) {
  const { data } = await api.get('/municipal/workers', { params: officeId ? { office_id: officeId } : {} })
  return data.workers
}

export async function getWards(officeId) {
  const { data } = await api.get('/municipal/wards', { params: officeId ? { office_id: officeId } : {} })
  return data.wards
}

export async function getOffices() {
  const { data } = await api.get('/municipal/offices')
  return data.offices
}

export async function getAlerts(params = {}) {
  const { data } = await api.get('/municipal/alerts', { params })
  return data
}

export async function getAlertCount() {
  const { data } = await api.get('/municipal/alerts/count')
  return data.unacknowledged
}

export async function acknowledgeAlert(id, note) {
  const { data } = await api.post(`/municipal/alerts/${id}/acknowledge`, { note })
  return data.alert
}

export async function addAlertAction(id, note) {
  const { data } = await api.post(`/municipal/alerts/${id}/actions`, { note })
  return data.alert
}
