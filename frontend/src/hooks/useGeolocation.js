import { useCallback, useState } from 'react'

export default function useGeolocation() {
  const [state, setState] = useState({ loading: false, error: null, position: null })

  const locate = useCallback(() => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        const error = 'Location is not supported on this device'
        setState({ loading: false, error, position: null })
        resolve(null)
        return
      }
      setState((s) => ({ ...s, loading: true, error: null }))
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }
          setState({ loading: false, error: null, position })
          resolve(position)
        },
        (err) => {
          const messages = {
            1: 'Location permission denied. Tap the map to place the pin instead.',
            2: 'Your location is unavailable right now.',
            3: 'Finding your location took too long.',
          }
          setState({ loading: false, error: messages[err.code] || 'Could not get your location', position: null })
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
      )
    })
  }, [])

  return { ...state, locate }
}
