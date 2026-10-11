import api from './api.js'

export const listOffices = async () => (await api.get('/admin/offices')).data.offices
export const createOffice = async (payload) => (await api.post('/admin/offices', payload)).data.office
export const updateOffice = async (id, payload) => (await api.put(`/admin/offices/${id}`, payload)).data.office

export const listWards = async (officeId) =>
  (await api.get('/admin/wards', { params: officeId ? { office_id: officeId } : {} })).data.wards
export const createWard = async (payload) => (await api.post('/admin/wards', payload)).data.ward
export const updateWard = async (id, payload) => (await api.put(`/admin/wards/${id}`, payload)).data.ward

export const listStaff = async (params = {}) => (await api.get('/admin/staff', { params })).data.staff
export const createStaff = async (payload) => (await api.post('/admin/staff', payload)).data.user
export const updateStaff = async (id, payload) => (await api.put(`/admin/staff/${id}`, payload)).data.user

export const testRouting = async (lat, lng) => (await api.get('/admin/routing/test', { params: { lat, lng } })).data
export const rerouteUnmapped = async () => (await api.post('/admin/routing/reroute-unmapped')).data.routed
export const routeComplaint = async (id, payload) => (await api.post(`/admin/complaints/${id}/route`, payload)).data.complaint
export const listAudit = async (params = {}) => (await api.get('/admin/audit', { params })).data
