import { useEffect, useRef } from 'preact/hooks'
import * as THREE from 'three'

// Constants
const EARTH_RADIUS = 100
const CAMERA_DISTANCE = 300
const MARKER_HEIGHT = 2
const ROUTE_HEIGHT = 0.5

export function Globe({ 
  airports = [], 
  originAirport, 
  destinationAirport, 
  routeCoordinates = [],
  onAirportClick 
}) {
  const containerRef = useRef(null)
  const rendererRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const earthRef = useRef(null)
  const markersRef = useRef([])
  const routeLineRef = useRef(null)

  // Convert lat/lon to 3D coordinates on sphere
  const latLonToVector3 = (lat, lon, radius = EARTH_RADIUS) => {
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lon + 180) * (Math.PI / 180)
    
    const x = -radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.cos(phi)
    const z = radius * Math.sin(phi) * Math.sin(theta)
    
    return new THREE.Vector3(x, y, z)
  }

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.z = CAMERA_DISTANCE
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 3, 5)
    scene.add(directionalLight)

    // Create Earth sphere with simple material
    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64)
    const earthMaterial = new THREE.MeshPhongMaterial({
      color: 0x2d5f8a,
      emissive: 0x112244,
      shininess: 5,
      transparent: true,
      opacity: 0.95
    })
    const earth = new THREE.Mesh(earthGeometry, earthMaterial)
    scene.add(earth)
    earthRef.current = earth

    // Add wireframe overlay for landmasses effect
    const wireframeGeometry = new THREE.SphereGeometry(EARTH_RADIUS + 0.1, 32, 32)
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      wireframe: true,
      transparent: true,
      opacity: 0.1
    })
    const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial)
    scene.add(wireframe)

    // Handle mouse drag for rotation
    let isDragging = false
    let previousMousePosition = { x: 0, y: 0 }

    const onMouseDown = (e) => {
      isDragging = true
      previousMousePosition = { x: e.clientX, y: e.clientY }
    }

    const onMouseMove = (e) => {
      if (!isDragging) return

      const deltaX = e.clientX - previousMousePosition.x
      const deltaY = e.clientY - previousMousePosition.y

      earth.rotation.y += deltaX * 0.005
      wireframe.rotation.y += deltaX * 0.005
      earth.rotation.x += deltaY * 0.005
      wireframe.rotation.x += deltaY * 0.005

      // Update markers and route rotation
      markersRef.current.forEach(marker => {
        marker.rotation.y = earth.rotation.y
        marker.rotation.x = earth.rotation.x
      })
      if (routeLineRef.current) {
        routeLineRef.current.rotation.y = earth.rotation.y
        routeLineRef.current.rotation.x = earth.rotation.x
      }

      previousMousePosition = { x: e.clientX, y: e.clientY }
    }

    const onMouseUp = () => {
      isDragging = false
    }

    // Handle mouse wheel for zoom
    const onWheel = (e) => {
      e.preventDefault()
      const zoomSpeed = 0.1
      camera.position.z += e.deltaY * zoomSpeed
      camera.position.z = Math.max(150, Math.min(500, camera.position.z))
    }

    renderer.domElement.addEventListener('mousedown', onMouseDown)
    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('mouseup', onMouseUp)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false })

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      
      // Auto-rotate slowly when not dragging
      if (!isDragging) {
        earth.rotation.y += 0.001
        wireframe.rotation.y += 0.001
        markersRef.current.forEach(marker => {
          marker.rotation.y = earth.rotation.y
          marker.rotation.x = earth.rotation.x
        })
        if (routeLineRef.current) {
          routeLineRef.current.rotation.y = earth.rotation.y
          routeLineRef.current.rotation.x = earth.rotation.x
        }
      }
      
      renderer.render(scene, camera)
    }
    animate()

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return
      
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('mousedown', onMouseDown)
      renderer.domElement.removeEventListener('mousemove', onMouseMove)
      renderer.domElement.removeEventListener('mouseup', onMouseUp)
      renderer.domElement.removeEventListener('wheel', onWheel)
      
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  // Update airport markers
  useEffect(() => {
    if (!sceneRef.current || !earthRef.current) return

    // Clear existing markers
    markersRef.current.forEach(marker => sceneRef.current.remove(marker))
    markersRef.current = []

    // Add origin marker
    if (originAirport) {
      const position = latLonToVector3(originAirport.lat, originAirport.lon, EARTH_RADIUS + MARKER_HEIGHT)
      const geometry = new THREE.SphereGeometry(2, 16, 16)
      const material = new THREE.MeshBasicMaterial({ 
        color: 0x10b981,
        transparent: true,
        opacity: 0.9
      })
      const marker = new THREE.Mesh(geometry, material)
      marker.position.copy(position)
      marker.rotation.y = earthRef.current.rotation.y
      marker.rotation.x = earthRef.current.rotation.x
      sceneRef.current.add(marker)
      markersRef.current.push(marker)
    }

    // Add destination marker
    if (destinationAirport) {
      const position = latLonToVector3(destinationAirport.lat, destinationAirport.lon, EARTH_RADIUS + MARKER_HEIGHT)
      const geometry = new THREE.SphereGeometry(2, 16, 16)
      const material = new THREE.MeshBasicMaterial({ 
        color: 0xef4444,
        transparent: true,
        opacity: 0.9
      })
      const marker = new THREE.Mesh(geometry, material)
      marker.position.copy(position)
      marker.rotation.y = earthRef.current.rotation.y
      marker.rotation.x = earthRef.current.rotation.x
      sceneRef.current.add(marker)
      markersRef.current.push(marker)
    }
  }, [originAirport, destinationAirport])

  // Update route line
  useEffect(() => {
    if (!sceneRef.current || !earthRef.current) return

    // Clear existing route line
    if (routeLineRef.current) {
      sceneRef.current.remove(routeLineRef.current)
      routeLineRef.current = null
    }

    // Add new route line if coordinates exist
    if (routeCoordinates && routeCoordinates.length > 0) {
      // Generate more points for a smoother curve
      const points = routeCoordinates.map(coord => 
        latLonToVector3(coord[0], coord[1], EARTH_RADIUS + ROUTE_HEIGHT)
      )
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({ 
        color: 0x4285F4,
        linewidth: 3,
        transparent: true,
        opacity: 0.9
      })
      const line = new THREE.Line(geometry, material)
      line.rotation.y = earthRef.current.rotation.y
      line.rotation.x = earthRef.current.rotation.x
      sceneRef.current.add(line)
      routeLineRef.current = line
    }
  }, [routeCoordinates])

  return (
    <div 
      ref={containerRef} 
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0
      }}
    />
  )
}
