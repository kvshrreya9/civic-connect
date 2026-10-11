import api from './api.js'

let rulesCache = null

export async function getDepartments() {
  const { data } = await api.get('/departments')
  return data.departments
}

export async function getRoutingRules() {
  if (rulesCache) return rulesCache
  const { data } = await api.get('/departments/routing-rules')
  rulesCache = data.rules
  return rulesCache
}

export async function previewDepartment(category) {
  if (!category) return null
  const rules = await getRoutingRules()
  return rules[category] || null
}

export async function updateDepartment(id, payload) {
  rulesCache = null
  const { data } = await api.put(`/departments/${id}`, payload)
  return data.department
}
