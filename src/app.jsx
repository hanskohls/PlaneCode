import { useEffect, useRef, useState } from 'preact/hooks'
import L from 'leaflet'
import * as turf from '@turf/turf'
import 'leaflet/dist/leaflet.css'
import './app.css'

export function App() {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const routeLineRef = useRef(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [airports, setAirports] = useState([])
  const [filteredAirports, setFilteredAirports] = useState([])
  const [originAirport, setOriginAirport] = useState(null)
  const [destinationAirport, setDestinationAirport] = useState(null)
  const [routeInfo, setRouteInfo] = useState(null)

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

  // Calculate flight time based on distance and typical aircraft speed
  const calculateFlightTime = (distanceKm) => {
    // Determine typical aircraft and speed based on distance
    let aircraft = ''
    let speedKmh = 0
    
    if (distanceKm < 500) {
      // Short haul - Regional jets
      aircraft = 'Regional Jet (e.g., Embraer E175)'
      speedKmh = 700
    } else if (distanceKm < 1500) {
      // Medium haul - Narrow body jets
      aircraft = 'Narrow Body (e.g., Boeing 737, Airbus A320)'
      speedKmh = 800
    } else if (distanceKm < 6000) {
      // Long haul - Wide body jets
      aircraft = 'Wide Body (e.g., Boeing 787, Airbus A350)'
      speedKmh = 900
    } else {
      // Ultra long haul - Large wide body jets
      aircraft = 'Large Wide Body (e.g., Boeing 777, Airbus A380)'
      speedKmh = 920
    }
    
    // Calculate flight time in hours (add ~30 minutes for taxi, takeoff, landing)
    const flightTimeHours = (distanceKm / speedKmh) + 0.5
    const hours = Math.floor(flightTimeHours)
    const minutes = Math.round((flightTimeHours - hours) * 60)
    
    return { hours, minutes, aircraft }
  }

  const createRoute = (origin, destination) => {
    if (!mapRef.current) return

    // Remove existing route line
    if (routeLineRef.current) {
      routeLineRef.current.remove()
      routeLineRef.current = null
    }

    // Create route line using turf.js
    const from = turf.point([origin.lon, origin.lat])
    const to = turf.point([destination.lon, destination.lat])
    const distance = turf.distance(from, to, { units: 'kilometers' })
    const distanceMiles = distance * 0.621371

    // Create a great circle route line
    const line = turf.greatCircle(from, to)
    
    // Convert to Leaflet coordinates (reverse lat/lon)
    const coords = line.geometry.coordinates.map(coord => [coord[1], coord[0]])
    
    // Draw the route on the map
    const routeLine = L.polyline(coords, {
      color: '#4285F4',
      weight: 3,
      opacity: 0.8,
      dashArray: '10, 10'
    }).addTo(mapRef.current)
    
    routeLineRef.current = routeLine

    // Calculate flight time
    const { hours, minutes, aircraft } = calculateFlightTime(distance)

    // Set route info
    setRouteInfo({
      origin,
      destination,
      distanceKm: distance.toFixed(0),
      distanceMiles: distanceMiles.toFixed(0),
      hours,
      minutes,
      aircraft
    })

    // Fit map to show both airports
    const bounds = L.latLngBounds([
      [origin.lat, origin.lon],
      [destination.lat, destination.lon]
    ])
    mapRef.current.fitBounds(bounds, { padding: [50, 50] })
  }

  const clearRoute = () => {
    // Clear route line
    if (routeLineRef.current) {
      routeLineRef.current.remove()
      routeLineRef.current = null
    }

    // Clear markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Clear state
    setOriginAirport(null)
    setDestinationAirport(null)
    setRouteInfo(null)
  }

  const handleSearchToggle = () => {
    setSearchOpen(!searchOpen)
    if (searchOpen) {
      setSearchQuery('')
    }
  }

  const handleAirportSelect = (airport) => {
    if (mapRef.current) {
      // If no origin is selected, set this as origin
      if (!originAirport) {
        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove())
        markersRef.current = []

        // Add marker for origin airport
        const marker = L.marker([airport.lat, airport.lon])
          .addTo(mapRef.current)
          .bindPopup(`
            <strong>${airport.name}</strong><br/>
            ${airport.city}, ${airport.country}<br/>
            ICAO: ${airport.icao} | IATA: ${airport.iata}<br/>
            <em>Origin Airport</em>
          `)
          .openPopup()

        markersRef.current.push(marker)

        // Zoom to airport
        mapRef.current.setView([airport.lat, airport.lon], 8, {
          animate: true,
          duration: 1
        })

        // Set as origin
        setOriginAirport(airport)

        // Close search but don't clear query to allow easy second search
        setSearchOpen(false)
        setSearchQuery('')
      } 
      // If origin is selected but no destination, set this as destination
      else if (!destinationAirport) {
        // Add marker for destination airport
        const marker = L.marker([airport.lat, airport.lon])
          .addTo(mapRef.current)
          .bindPopup(`
            <strong>${airport.name}</strong><br/>
            ${airport.city}, ${airport.country}<br/>
            ICAO: ${airport.icao} | IATA: ${airport.iata}<br/>
            <em>Destination Airport</em>
          `)
          .openPopup()

        markersRef.current.push(marker)

        // Set as destination
        setDestinationAirport(airport)

        // Create route between origin and destination
        createRoute(originAirport, airport)

        // Close search
        setSearchOpen(false)
        setSearchQuery('')
      }
      // If both are selected, replace the route with a new one starting from this airport
      else {
        // Clear everything and start fresh
        clearRoute()
        
        // Set this as new origin
        const marker = L.marker([airport.lat, airport.lon])
          .addTo(mapRef.current)
          .bindPopup(`
            <strong>${airport.name}</strong><br/>
            ${airport.city}, ${airport.country}<br/>
            ICAO: ${airport.icao} | IATA: ${airport.iata}<br/>
            <em>Origin Airport</em>
          `)
          .openPopup()

        markersRef.current.push(marker)

        // Zoom to airport
        mapRef.current.setView([airport.lat, airport.lon], 8, {
          animate: true,
          duration: 1
        })

        setOriginAirport(airport)
        setSearchOpen(false)
        setSearchQuery('')
      }
    }
  }

  return (
    <div class="app-container">
      <div ref={mapContainer} class="map-container"></div>
      
      {/* Route Info Box */}
      {routeInfo && (
        <div class="route-info-box">
          <div class="route-info-header">
            <h3>Route Information</h3>
            <button class="close-button" onClick={clearRoute} aria-label="Clear route">
              ×
            </button>
          </div>
          
          <div class="route-info-content">
            <div class="route-airports">
              <div class="route-airport">
                <div class="route-label">Origin</div>
                <div class="route-name">{routeInfo.origin.iata}</div>
                <div class="route-city">{routeInfo.origin.city}</div>
              </div>
              
              <div class="route-arrow">→</div>
              
              <div class="route-airport">
                <div class="route-label">Destination</div>
                <div class="route-name">{routeInfo.destination.iata}</div>
                <div class="route-city">{routeInfo.destination.city}</div>
              </div>
            </div>
            
            <div class="route-details">
              <div class="route-detail-item">
                <div class="route-detail-label">Distance</div>
                <div class="route-detail-value">
                  {routeInfo.distanceKm} km / {routeInfo.distanceMiles} mi
                </div>
              </div>
              
              <div class="route-detail-item">
                <div class="route-detail-label">Typical Flight Time</div>
                <div class="route-detail-value">
                  {routeInfo.hours}h {routeInfo.minutes}m
                </div>
              </div>
              
              <div class="route-detail-item">
                <div class="route-detail-label">Typical Aircraft</div>
                <div class="route-detail-value route-aircraft">
                  {routeInfo.aircraft}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div class="search-overlay">
        {searchOpen && (
          <div class="search-input-container">
            <input
              type="text"
              class="search-input"
              placeholder={
                originAirport && !destinationAirport
                  ? "Search for destination airport..."
                  : "Search by city, airport, ICAO, or IATA code..."
              }
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
