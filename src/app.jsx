import { useEffect, useRef, useState } from 'preact/hooks'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './app.css'

export function App() {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [airports, setAirports] = useState([])
  const [filteredAirports, setFilteredAirports] = useState([])

  // Load airports data
  useEffect(() => {
    fetch('/airports.json')
      .then(res => res.json())
      .then(data => {
        setAirports(data)
      })
      .catch(err => console.error('Failed to load airports:', err))
  }, [])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return

    // Initialize the map centered on the world
    const map = L.map(mapContainer.current, {
      center: [0, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
    })

    mapRef.current = map

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

  // Filter airports based on search query and map center
  useEffect(() => {
    if (!searchQuery && !searchOpen) {
      setFilteredAirports([])
      return
    }

    let results = airports

    // If there's a search query, filter by it
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim()
      results = airports.filter(airport => {
        return (
          airport.name.toLowerCase().includes(query) ||
          airport.city.toLowerCase().includes(query) ||
          airport.iata.toLowerCase().includes(query) ||
          airport.icao.toLowerCase().includes(query)
        )
      })
    }

    // Sort by distance from map center
    if (mapRef.current) {
      const center = mapRef.current.getCenter()
      results = results.map(airport => {
        const distance = center.distanceTo([airport.lat, airport.lon])
        return { ...airport, distance }
      }).sort((a, b) => a.distance - b.distance)
    }

    // Limit to top 10 results
    setFilteredAirports(results.slice(0, 10))
  }, [searchQuery, airports, searchOpen])

  const handleSearchToggle = () => {
    setSearchOpen(!searchOpen)
    if (searchOpen) {
      setSearchQuery('')
    }
  }

  const handleAirportSelect = (airport) => {
    if (mapRef.current) {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []

      // Add marker for selected airport
      const marker = L.marker([airport.lat, airport.lon])
        .addTo(mapRef.current)
        .bindPopup(`
          <strong>${airport.name}</strong><br/>
          ${airport.city}, ${airport.country}<br/>
          ICAO: ${airport.icao} | IATA: ${airport.iata}
        `)
        .openPopup()

      markersRef.current.push(marker)

      // Zoom to airport
      mapRef.current.setView([airport.lat, airport.lon], 12, {
        animate: true,
        duration: 1
      })

      // Close search
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  return (
    <div class="app-container">
      <div ref={mapContainer} class="map-container"></div>
      
      <div class="search-overlay">
        {searchOpen && (
          <div class="search-input-container">
            <input
              type="text"
              class="search-input"
              placeholder="Search by city, airport, ICAO, or IATA code..."
              value={searchQuery}
              onInput={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {filteredAirports.length > 0 && (
              <div class="search-results">
                {filteredAirports.map(airport => (
                  <div
                    key={airport.icao}
                    class="search-result-item"
                    onClick={() => handleAirportSelect(airport)}
                  >
                    <strong>{airport.name}</strong>
                    <span>{airport.city}, {airport.country}</span>
                    <span class="search-result-codes">
                      ICAO: {airport.icao} | IATA: {airport.iata}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        <button
          class="search-button"
          onClick={handleSearchToggle}
          aria-label="Search airports"
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
