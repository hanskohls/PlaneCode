import { useEffect, useRef, useState, useMemo } from 'preact/hooks'
import L from 'leaflet'
import * as turf from '@turf/turf'
import 'leaflet/dist/leaflet.css'
import './app.css'

// Constants
const KM_TO_MILES_CONVERSION = 0.621371
const TAXI_TAKEOFF_LANDING_HOURS = 0.5
const ROUTE_LINE_DASH_PATTERN = '10, 10'
const MAX_VISIBLE_AIRPORTS = 20
const MIN_ZOOM_FOR_MARKERS = 5
const ZOOM_INCREMENT = 2
const MIN_CLICK_ZOOM = 10
const PRIVACY_POLICY_LAST_UPDATED = 'December 2025'

// Airport level configuration
const AIRPORT_LEVEL_CONFIG = {
  1: { size: 10, color: '#FF4444' },
  2: { size: 8, color: '#4285F4' },
  default: { size: 6, color: '#888888' }
}

// Helper function to create marker styles
const createMarkerStyles = (iconSize, iconColor) => {
  return `width: ${iconSize}px;
    height: ${iconSize}px;
    background-color: ${iconColor};
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    cursor: pointer;`
}

// Helper function to create route endpoint marker styles
const createRouteMarkerIcon = (type) => {
  const isOrigin = type === 'origin'
  const color = isOrigin ? '#10b981' : '#ef4444' // green for origin, red for destination
  const size = 16
  
  return L.divIcon({
    className: 'route-marker',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [size + 6, size + 6],
    iconAnchor: [(size + 6) / 2, (size + 6) / 2]
  })
}

// Aircraft configuration based on distance
const AIRCRAFT_CONFIG = [
  { maxDistance: 500, name: 'Regional Jet (e.g., Embraer E175)', speedKmh: 700 },
  { maxDistance: 1500, name: 'Narrow Body (e.g., Boeing 737, Airbus A320)', speedKmh: 800 },
  { maxDistance: 6000, name: 'Wide Body (e.g., Boeing 787, Airbus A350)', speedKmh: 900 },
  { maxDistance: Infinity, name: 'Large Wide Body (e.g., Boeing 777, Airbus A380)', speedKmh: 920 }
]

export function App() {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const airportMarkersRef = useRef([]) // Markers for all airports on the map
  const routeLineRef = useRef(null)
  const privacyButtonRef = useRef(null)
  const privacyModalCloseRef = useRef(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [airports, setAirports] = useState([])
  const [filteredAirports, setFilteredAirports] = useState([])
  const [originAirport, setOriginAirport] = useState(null)
  const [destinationAirport, setDestinationAirport] = useState(null)
  const [routeInfo, setRouteInfo] = useState(null)
  const [routeInfoExpanded, setRouteInfoExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)

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

  // Track window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Handle privacy modal keyboard events and focus management
  useEffect(() => {
    if (showPrivacyModal) {
      // Focus on close button when modal opens
      if (privacyModalCloseRef.current) {
        privacyModalCloseRef.current.focus()
      }

      // Handle escape key to close modal
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          setShowPrivacyModal(false)
        }
      }

      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('keydown', handleEscape)
        // Return focus to privacy button when modal closes
        if (privacyButtonRef.current) {
          privacyButtonRef.current.focus()
        }
      }
    }
  }, [showPrivacyModal])

  // Memoize max level calculation to avoid recalculating on every render
  const maxLevel = useMemo(() => {
    return airports.reduce((max, airport) => Math.max(max, airport.level || 1), 1)
  }, [airports])

  // Update airport markers based on map position and zoom
  useEffect(() => {
    if (!mapRef.current || airports.length === 0) return

    const map = mapRef.current

    const updateAirportMarkers = () => {
      // Save markers with open popups to preserve them
      const markersToPreserve = airportMarkersRef.current.filter(marker => marker.isPopupOpen())
      
      // Clear existing airport markers except those with open popups
      airportMarkersRef.current.forEach(marker => {
        if (!marker.isPopupOpen()) {
          marker.remove()
        }
      })
      airportMarkersRef.current = [...markersToPreserve]

      // Get map bounds and zoom
      const bounds = map.getBounds()
      const zoom = map.getZoom()

      // Only show markers when zoomed in enough
      if (zoom < MIN_ZOOM_FOR_MARKERS) return

      // Get airports in current view
      const visibleAirports = airports.filter(airport => {
        return bounds.contains([airport.lat, airport.lon])
      })

      // Determine which levels to show based on count
      let airportsToShow = []
      let currentLevel = 1

      while (airportsToShow.length < MAX_VISIBLE_AIRPORTS && currentLevel <= maxLevel) {
        const levelAirports = visibleAirports.filter(a => a.level === currentLevel)
        airportsToShow = airportsToShow.concat(levelAirports)
        currentLevel++
      }

      // If we still have too many, prioritize by level and limit
      if (airportsToShow.length > MAX_VISIBLE_AIRPORTS) {
        airportsToShow = airportsToShow.slice(0, MAX_VISIBLE_AIRPORTS)
      }

      // Get ICAOs of airports that already have markers (preserved)
      const preservedICAOs = new Set(
        markersToPreserve
          .map(m => m._airportData?.icao)
          .filter(icao => icao !== undefined)
      )

      // Create markers for airports to show (excluding already preserved ones)
      airportsToShow.forEach(airport => {
        // Skip if this airport already has a preserved marker
        if (preservedICAOs.has(airport.icao)) return
        
        // Get icon configuration based on level
        const config = AIRPORT_LEVEL_CONFIG[airport.level] || AIRPORT_LEVEL_CONFIG.default
        const iconSize = config.size
        const iconColor = config.color
        
        const icon = L.divIcon({
          className: 'airport-marker',
          html: `<div style="${createMarkerStyles(iconSize, iconColor)}"></div>`,
          iconSize: [iconSize + 4, iconSize + 4],
          iconAnchor: [(iconSize + 4) / 2, (iconSize + 4) / 2]
        })

        const popupContent = `
          <div class="airport-popup">
            <strong>${airport.name}</strong><br/>
            ${airport.city}, ${airport.country}<br/>
            ICAO: ${airport.icao} | IATA: ${airport.iata}<br/>
            <a href="#" class="route-to-link">Route to →</a>
          </div>
        `

        const marker = L.marker([airport.lat, airport.lon], { icon })
          .addTo(map)
          .bindPopup(popupContent)
        
        // Store airport data on marker for identification during updates
        // This allows the popup preservation logic to track which airport a marker represents
        marker._airportData = airport

        // Handle "Route to" link click
        const handleRouteLinkClick = (e) => {
          e.preventDefault()
          handleAirportSelect(airport)
        }
        
        marker.on('popupopen', () => {
          const popup = marker.getPopup().getElement()
          if (popup) {
            const routeLink = popup.querySelector('.route-to-link')
            if (routeLink) {
              routeLink.addEventListener('click', handleRouteLinkClick)
            }
          }
        })
        
        marker.on('popupclose', () => {
          const popup = marker.getPopup().getElement()
          if (popup) {
            const routeLink = popup.querySelector('.route-to-link')
            if (routeLink) {
              routeLink.removeEventListener('click', handleRouteLinkClick)
            }
          }
        })

        airportMarkersRef.current.push(marker)
      })
    }

    // Update markers initially
    updateAirportMarkers()

    // Update markers on map move or zoom
    map.on('moveend', updateAirportMarkers)
    map.on('zoomend', updateAirportMarkers)

    // Cleanup
    return () => {
      map.off('moveend', updateAirportMarkers)
      map.off('zoomend', updateAirportMarkers)
      airportMarkersRef.current.forEach(marker => marker.remove())
      airportMarkersRef.current = []
    }
  }, [airports, maxLevel])

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
    const config = AIRCRAFT_CONFIG.find(cfg => distanceKm < cfg.maxDistance)
    const aircraft = config.name
    const speedKmh = config.speedKmh
    
    // Calculate flight time in hours (add time for taxi, takeoff, landing)
    const flightTimeHours = (distanceKm / speedKmh) + TAXI_TAKEOFF_LANDING_HOURS
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
    const distanceMiles = distance * KM_TO_MILES_CONVERSION

    // Create a great circle route line
    const line = turf.greatCircle(from, to)
    
    // Convert to Leaflet coordinates (reverse lat/lon)
    const coords = line.geometry.coordinates.map(coord => [coord[1], coord[0]])
    
    // Draw the route on the map
    const routeLine = L.polyline(coords, {
      color: '#4285F4',
      weight: 3,
      opacity: 0.8,
      dashArray: ROUTE_LINE_DASH_PATTERN
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
    setRouteInfoExpanded(false)
  }

  const handleSearchToggle = () => {
    setSearchOpen(!searchOpen)
    if (searchOpen) {
      setSearchQuery('')
    }
  }

  const toggleRouteInfoExpanded = () => {
    setRouteInfoExpanded(!routeInfoExpanded)
  }

  const handleAirportSelect = (airport) => {
    if (mapRef.current) {
      // If no origin is selected, set this as origin
      if (!originAirport) {
        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove())
        markersRef.current = []

        // Add marker for origin airport with custom icon
        const originIcon = createRouteMarkerIcon('origin')
        const marker = L.marker([airport.lat, airport.lon], { icon: originIcon })
          .addTo(mapRef.current)
          .bindPopup(`
            <div class="airport-popup">
              <strong>${airport.name}</strong><br/>
              ${airport.city}, ${airport.country}<br/>
              ICAO: ${airport.icao} | IATA: ${airport.iata}<br/>
              <em>Origin Airport</em>
            </div>
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
        // Add marker for destination airport with custom icon
        const destinationIcon = createRouteMarkerIcon('destination')
        const marker = L.marker([airport.lat, airport.lon], { icon: destinationIcon })
          .addTo(mapRef.current)
          .bindPopup(`
            <div class="airport-popup">
              <strong>${airport.name}</strong><br/>
              ${airport.city}, ${airport.country}<br/>
              ICAO: ${airport.icao} | IATA: ${airport.iata}<br/>
              <em>Destination Airport</em>
            </div>
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
        
        // Set this as new origin with custom icon
        const originIcon = createRouteMarkerIcon('origin')
        const marker = L.marker([airport.lat, airport.lon], { icon: originIcon })
          .addTo(mapRef.current)
          .bindPopup(`
            <div class="airport-popup">
              <strong>${airport.name}</strong><br/>
              ${airport.city}, ${airport.country}<br/>
              ICAO: ${airport.icao} | IATA: ${airport.iata}<br/>
              <em>Origin Airport</em>
            </div>
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
      
      {/* Privacy Modal */}
      {showPrivacyModal && (
        <div 
          class="privacy-modal-overlay" 
          onClick={() => setShowPrivacyModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-modal-title"
        >
          <div class="privacy-modal-content" onClick={(e) => e.stopPropagation()}>
            <div class="privacy-modal-header">
              <h2 id="privacy-modal-title">Privacy & Data Information</h2>
              <button 
                ref={privacyModalCloseRef}
                class="privacy-modal-close" 
                onClick={() => setShowPrivacyModal(false)}
                aria-label="Close privacy information"
              >
                ×
              </button>
            </div>
            <div class="privacy-modal-body">
              <section>
                <h3>🔒 Your Privacy is Protected</h3>
                <p>
                  PlaneCode is designed with privacy as a core principle. We are committed to protecting your personal information and complying with data protection regulations including GDPR (EU) and similar privacy laws.
                </p>
              </section>
              
              <section>
                <h3>📊 No Tracking or Analytics</h3>
                <p>
                  We do not use any tracking, analytics, or monitoring services. Your browsing behavior, searches, and interactions with this application are never recorded, transmitted, or shared with any third parties.
                </p>
              </section>
              
              <section>
                <h3>💾 Local Storage Only</h3>
                <p>
                  PlaneCode stores data only on your device for functionality purposes:
                </p>
                <ul>
                  <li><strong>Map Tiles:</strong> OpenStreetMap tiles are cached locally using a service worker to enable offline viewing of previously visited map areas.</li>
                  <li><strong>No Personal Data:</strong> We do not collect, store, or process any personal information, user accounts, or identifiable data.</li>
                </ul>
              </section>
              
              <section>
                <h3>🍪 No Cookies</h3>
                <p>
                  This application does not use cookies or similar tracking technologies. All data remains on your device and is never transmitted to external servers except for loading map tiles from OpenStreetMap.
                </p>
              </section>
              
              <section>
                <h3>🌐 Third-Party Services</h3>
                <p>
                  PlaneCode uses OpenStreetMap for map tiles, which are loaded directly from their servers. Please refer to <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer">OpenStreetMap's Privacy Policy</a> for information about their data practices.
                </p>
              </section>
              
              <section>
                <h3>✅ Your Rights</h3>
                <p>
                  Since we do not collect or process any personal data, there is no data to access, correct, or delete. You can clear locally cached map tiles by clearing your browser's cache or uninstalling the application.
                </p>
              </section>
              
              <section class="privacy-modal-footer">
                <p>
                  <em>Last updated: {PRIVACY_POLICY_LAST_UPDATED}</em>
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
      
      {/* Route Info Box */}
      {routeInfo && (
        <div class={`route-info-box ${routeInfoExpanded ? 'expanded' : ''}`}>
          <div 
            class="route-info-header" 
            onClick={() => isMobile && toggleRouteInfoExpanded()}
            onKeyDown={(e) => isMobile && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggleRouteInfoExpanded())}
            role={isMobile ? 'button' : undefined}
            tabIndex={isMobile ? 0 : undefined}
            aria-expanded={isMobile ? routeInfoExpanded : undefined}
          >
            <h3>Route Information</h3>
            <div class="header-buttons">
              {isMobile && (
                <button 
                  class="expand-button" 
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleRouteInfoExpanded()
                  }}
                  aria-label={routeInfoExpanded ? "Collapse" : "Expand"}
                >
                  {routeInfoExpanded ? '−' : '+'}
                </button>
              )}
              <button class="close-button" onClick={(e) => {
                e.stopPropagation()
                clearRoute()
              }} aria-label="Clear route">
                ×
              </button>
            </div>
          </div>
          
          <div class="route-info-content">
            <div class="route-airports">
              <div class="route-airport">
                <div class="route-label">Origin</div>
                <div class="route-name">{routeInfo.origin.iata}</div>
                {(!isMobile || routeInfoExpanded) && (
                  <div class="route-city">{routeInfo.origin.city}</div>
                )}
              </div>
              
              <div class="route-arrow">→</div>
              
              <div class="route-airport">
                <div class="route-label">Destination</div>
                <div class="route-name">{routeInfo.destination.iata}</div>
                {(!isMobile || routeInfoExpanded) && (
                  <div class="route-city">{routeInfo.destination.city}</div>
                )}
              </div>
            </div>
            
            {(!isMobile || routeInfoExpanded) && (
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
            )}
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
        
        <button
          ref={privacyButtonRef}
          class="privacy-button"
          onClick={() => setShowPrivacyModal(true)}
          aria-label="Privacy information"
          title="Privacy & Data Information"
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
