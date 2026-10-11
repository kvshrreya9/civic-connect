// Static reference data and safe fallbacks used when the API is unreachable.

export const MAP_DEFAULTS = {
  center: [
    Number(import.meta.env.VITE_DEFAULT_LAT) || 13.0827,
    Number(import.meta.env.VITE_DEFAULT_LNG) || 80.2707,
  ],
  zoom: 13,
  cityName: import.meta.env.VITE_CITY_NAME || 'Your City',
}

export const CATEGORIES = [
  { value: 'pothole', label: 'Pothole', icon: 'CircleDot', color: '#2f6bff', hint: 'Holes or craters in the road surface' },
  { value: 'road_damage', label: 'Damaged road', icon: 'Construction', color: '#6366f1', hint: 'Cracks, broken edges, uneven patches' },
  { value: 'garbage', label: 'Garbage', icon: 'Trash2', color: '#f59e0b', hint: 'Uncollected waste or illegal dumping' },
  { value: 'water_leakage', label: 'Water leakage', icon: 'Droplets', color: '#0ea5e9', hint: 'Burst pipes, leaking valves' },
  { value: 'drainage', label: 'Drainage', icon: 'Waves', color: '#14b8a6', hint: 'Blocked drains, open covers, waterlogging' },
  { value: 'streetlight', label: 'Streetlight', icon: 'Lightbulb', color: '#eab308', hint: 'Lights out, flickering, exposed wiring' },
  { value: 'tree_hazard', label: 'Tree hazard', icon: 'TreePine', color: '#22c55e', hint: 'Fallen or dangerously leaning trees' },
  { value: 'other', label: 'Other', icon: 'HelpCircle', color: '#64748b', hint: 'Any other public infrastructure issue' },
]

export const SEVERITIES = [
  { value: 'low', label: 'Low', description: 'Inconvenient, not urgent' },
  { value: 'medium', label: 'Medium', description: 'Affects daily use' },
  { value: 'high', label: 'High', description: 'Disrupts many people' },
  { value: 'critical', label: 'Critical', description: 'Dangerous right now' },
]

export const FALLBACK_STATS = {
  totals: {
    total: 0, open: 0, resolved: 0, verified: 0, overdue: 0, escalated: 0,
    resolution_rate: 0, avg_resolution_hours: null, sla_compliance: null, citizens_engaged: 0, supports: 0,
    reported_last_7_days: 0,
  },
  by_category: [],
  by_status: {},
  departments: [],
  timeline: [],
  hotspots: [],
  recent_resolved: [],
}

export const HOW_IT_WORKS = [
  { title: 'Pin it', text: 'Drop a pin, add a photo and pick a category. Works even with no signal - it sends when you reconnect.' },
  { title: 'It reaches the right office', text: 'Your location routes the report to the responsible municipality or panchayat, where officers assign a field worker.' },
  { title: 'Watch the fix happen', text: 'Follow every status change, the deadline the city committed to, and who is working on it.' },
  { title: 'You confirm it is fixed', text: 'The field worker uploads a completion photo to your dashboard. You confirm the fix or dispute it.' },
]

export const PROBLEMS = [
  { title: 'Complaints vanish', text: 'Phone calls and paper forms leave no trail. Citizens never learn what happened.' },
  { title: 'Same pothole, fifty reports', text: 'Duplicates flood desks while the worst hazards wait in the same queue as minor ones.' },
  { title: 'Closed but not fixed', text: 'Tickets get marked done without anyone checking the street.' },
]

export const DEMO_ACCOUNTS = [
  { role: 'Citizen', email: 'asha@civicconnect.demo' },
  { role: 'Central City Municipality officer', email: 'officer.ccm@civicconnect.demo' },
  { role: 'North Gram Panchayat officer', email: 'officer.ngp@civicconnect.demo' },
  { role: 'Field worker (staff login)', email: 'worker.ccm@civicconnect.demo' },
  { role: 'Administrator (staff login)', email: 'admin@civicconnect.demo' },
]
