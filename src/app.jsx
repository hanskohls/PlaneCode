import { useEffect, useRef } from 'preact/hooks'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './app.css'

export function App() {
  const mapContainer = useRef(null)

  useEffect(() => {
    if (!mapContainer.current) return

    // Initialize the map centered on the world
    const map = L.map(mapContainer.current, {
      center: [0, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
    })

    // Add OpenStreetMap tile layer (free and open source)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map)

    // Cleanup function to remove map on unmount
    return () => {
      map.remove()
    }
  }, [])

  return (
    <div class="app-container">
      <h1>PlaneCode Globe</h1>
      <div ref={mapContainer} class="map-container"></div>
    </div>
  )
}
