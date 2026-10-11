import { validateImageFile } from '../utils/validators.js'

const DEFAULTS = { maxDimension: 1600, quality: 0.82 }
let worker = null
let messageId = 0
const pending = new Map()

function getWorker() {
  if (worker) return worker
  worker = new Worker(new URL('../workers/imageWorker.js', import.meta.url), { type: 'module' })
  worker.onmessage = (event) => {
    const { id, blob, error } = event.data
    const entry = pending.get(id)
    if (!entry) return
    pending.delete(id)
    if (error) entry.reject(new Error(error))
    else entry.resolve(blob)
  }
  worker.onerror = (event) => {
    pending.forEach((entry) => entry.reject(new Error(event.message || 'Image worker failed')))
    pending.clear()
    worker = null
  }
  return worker
}

function compressInWorker(file, options) {
  return new Promise((resolve, reject) => {
    const id = ++messageId
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, file, ...options })
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id)
        reject(new Error('Image compression timed out'))
      }
    }, 20000)
  })
}

async function compressOnMainThread(file, { maxDimension, quality }) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))), 'image/jpeg', quality)
  })
}

/** Resize + re-encode to JPEG. Re-encoding also strips EXIF/GPS metadata before upload. */
export async function compressImage(file, options = {}) {
  const error = validateImageFile(file)
  if (error) throw new Error(error)
  const settings = { ...DEFAULTS, ...options }
  const canUseWorker = typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined'
  if (canUseWorker) {
    try {
      return await compressInWorker(file, settings)
    } catch {
      // fall back to the main thread
    }
  }
  return compressOnMainThread(file, settings)
}

/** 64-bit difference hash (hex). Same algorithm as the backend's compute_dhash. */
export async function computeImageHash(blob) {
  try {
    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = 9
    canvas.height = 8
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(bitmap, 0, 0, 9, 8)
    bitmap.close?.()
    const { data } = ctx.getImageData(0, 0, 9, 8)
    const gray = []
    for (let i = 0; i < data.length; i += 4) gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
    let hex = ''
    for (let row = 0; row < 8; row += 1) {
      let byte = 0
      for (let col = 0; col < 8; col += 1) {
        byte = (byte << 1) | (gray[row * 9 + col] > gray[row * 9 + col + 1] ? 1 : 0)
      }
      hex += byte.toString(16).padStart(2, '0')
    }
    return hex
  } catch {
    return null
  }
}

export async function prepareImage(file) {
  const blob = await compressImage(file)
  const hash = await computeImageHash(blob)
  const name = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg'
  return { blob, hash, name, originalSize: file.size, size: blob.size }
}
