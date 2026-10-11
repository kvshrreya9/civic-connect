import React from 'react'
import ReactDOM from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

const shouldRegisterSW = import.meta.env.PROD || import.meta.env.VITE_ENABLE_SW === 'true'
if ('serviceWorker' in navigator && shouldRegisterSW) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
      console.warn('Service worker registration failed', error)
    })
  })
}
