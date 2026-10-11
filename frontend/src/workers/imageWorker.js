/* Off-main-thread image compression using OffscreenCanvas. */
self.onmessage = async (event) => {
  const { id, file, maxDimension = 1600, quality = 0.82 } = event.data
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
    self.postMessage({ id, blob })
  } catch (error) {
    self.postMessage({ id, error: error?.message || 'Could not process image' })
  }
}
