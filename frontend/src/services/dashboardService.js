import api from './api.js'

export async function getPublicStats() {
  const { data } = await api.get('/dashboard/public')
  return data
}

export async function getCitizenSummary() {
  const { data } = await api.get('/dashboard/citizen')
  return data
}

export async function getEmployeeSummary() {
  const { data } = await api.get('/dashboard/employee')
  return data
}

export async function getNotifications() {
  const { data } = await api.get('/notifications')
  return data
}

export async function markNotificationRead(id) {
  const { data } = await api.post(`/notifications/${id}/read`)
  return data.notification
}

export async function markAllNotificationsRead() {
  const { data } = await api.post('/notifications/read-all')
  return data.updated
}
