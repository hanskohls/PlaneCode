# PlaneCode

A minimal Vite + Preact application with an interactive globe/map viewer using OpenStreetMap.

## Features

- Built with Vite for fast development
- Preact for lightweight React alternative
- Leaflet for interactive 2D map visualization
- Three.js for interactive 3D globe visualization
- **Toggle between 2D Map and 3D Globe views** - Switch perspectives with a single click
- OpenStreetMap tiles (free and open source)
- **Progressive Web App (PWA)** - Install on your device for offline use
- Service worker for offline map tile caching
- Automatic version bumping on each PR merge

## Views

### 2D Map View
The traditional flat map view powered by Leaflet, perfect for detailed route planning and airport exploration.

### 3D Globe View
An interactive 3D globe powered by Three.js that provides a realistic spherical representation of the Earth. Features include:
- Drag to rotate the globe
- Scroll to zoom in/out
- Automatic slow rotation when idle
- Airport markers displayed as colored spheres
- Flight routes shown as great circle arcs

## Progressive Web App

PlaneCode is a Progressive Web App, which means you can install it on your phone, tablet, or desktop for a native-like experience.

### Installation

#### On Mobile (iOS/Android)
1. Open PlaneCode in your mobile browser (Safari on iOS, Chrome on Android)
2. Look for the "Add to Home Screen" or "Install" option:
   - **iOS Safari**: Tap the Share button → "Add to Home Screen"
   - **Android Chrome**: Tap the menu (⋮) → "Add to Home Screen" or "Install App"
3. The app icon will appear on your home screen
4. Launch PlaneCode like any other app!

#### On Desktop (Chrome/Edge)
1. Open PlaneCode in Chrome or Edge
2. Look for the install icon (⊕) in the address bar
3. Click "Install" when prompted
4. PlaneCode will open in its own window

### Offline Support

Once installed, PlaneCode caches map tiles as you explore, allowing you to view previously visited areas even without an internet connection.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173/`

### Build

Build for production:

```bash
npm run build
```

### Preview

Preview the production build:

```bash
npm run preview
```

## Technology Stack

- **Vite**: Fast build tool and dev server
- **Preact**: Lightweight 3kb alternative to React
- **Leaflet**: Open-source JavaScript library for interactive 2D maps
- **Three.js**: JavaScript 3D library for WebGL-based 3D globe rendering
- **OpenStreetMap**: Free, editable map of the world

## About

Testing if you can use Copilot Agenticode to write an app on the phone on a plane. 
