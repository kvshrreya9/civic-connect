const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const PHONE_RE = /^[0-9+\-\s()]{6,20}$/

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024
export const MAX_IMAGES = 5

export function validateEmail(email) {
  return EMAIL_RE.test((email || '').trim())
}

export function validatePassword(password) {
  if (!password || password.length < 8) return 'Use at least 8 characters'
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Use both letters and numbers'
  return null
}

export function validateLogin({ email, password }) {
  const errors = {}
  if (!validateEmail(email)) errors.email = 'Enter a valid email address'
  if (!password) errors.password = 'Enter your password'
  return errors
}

export function validateSignup({ name, email, phone, password, confirmPassword }) {
  const errors = {}
  if (!name || name.trim().length < 2) errors.name = 'Enter your full name'
  if (!validateEmail(email)) errors.email = 'Enter a valid email address'
  if (phone && !PHONE_RE.test(phone)) errors.phone = 'Enter a valid phone number'
  const passwordError = validatePassword(password)
  if (passwordError) errors.password = passwordError
  if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match'
  return errors
}

export function validateComplaint(form) {
  const errors = {}
  if (!form.title || form.title.trim().length < 5) errors.title = 'Give it a short title (5+ characters)'
  if (!form.description || form.description.trim().length < 15) errors.description = 'Describe the issue in at least 15 characters'
  if (!form.category) errors.category = 'Choose a category'
  if (!form.severity) errors.severity = 'Choose how severe it is'
  const affected = Number(form.affected_count)
  if (!Number.isInteger(affected) || affected < 0 || affected > 100000) errors.affected_count = 'Enter a number between 0 and 100000'
  if (form.latitude === null || form.latitude === undefined || form.longitude === null || form.longitude === undefined) {
    errors.location = 'Tap the map or use your location to pin the issue'
  }
  return errors
}

export function validateImageFile(file) {
  if (!file) return 'No file selected'
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Only JPEG, PNG or WEBP photos are supported'
  if (file.size > MAX_IMAGE_BYTES) return 'Photo is larger than 15 MB'
  return null
}

export function hasErrors(errors) {
  return Object.keys(errors || {}).length > 0
}
