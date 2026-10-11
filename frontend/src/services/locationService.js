import api from './api.js'

export async function reverseGeocode(lat, lng) {
  const { data } = await api.get('/location/reverse', { params: { lat, lng } })
  return data
}

export async function searchPlaces(query) {
  if (!query || query.trim().length < 3) return []
  const { data } = await api.get('/location/search', { params: { q: query.trim() } })
  return data.results
}

export async function getNearby(lat, lng, radius = 500, category) {
  const params = { lat, lng, radius }
  if (category) params.category = category
  const { data } = await api.get('/location/nearby', { params })
  return data.items
}

export async function getMunicipalityContact(lat, lng) {
  const { data } = await api.get('/location/municipality-contact', { params: { lat, lng } })
  return data
}

export async function getMunicipalOffices() {
  const { data } = await api.get('/location/offices')
  return data.offices
}
