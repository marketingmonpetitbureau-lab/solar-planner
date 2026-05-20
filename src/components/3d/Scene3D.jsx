import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Sky, Grid } from '@react-three/drei'
import { Html } from '@react-three/drei'
import House from './House'
import ShadedTerrain from './ShadedTerrain'
import SegmentMarker from './SegmentMarker'
import SolarPanels3D, { RoofSegmentPlanes } from './SolarPanels3D'
import useSolarStore from '../../store/useSolarStore'
import { useSolarData } from '../../hooks/useSolarData'
import { useShadeData } from '../../hooks/useShadeData'
import { getSunPosition } from '../../utils/sunPosition'
import { geoToScene } from '../../utils/geoToScene'

const SOLAR_API_KEY = import.meta.env.VITE_GOOGLE_SOLAR_API_KEY

export default function Scene3D() {
  const { setSelectedSegment, lat, lng } = useSolarStore()
  const solar = useSolarData(lat, lng)

  // When Solar data loads, update the store with real roof segments
  useEffect(() => {
    if (solar.roofSegments) {
      useSolarStore.getState().setSegmentsFromSolar(solar.roofSegments)
    }
  }, [solar.roofSegments])

  // Sync solarApiPanels to Zustand store so getTotals() reflects real panel count
  useEffect(() => {
    if (solar.solarApiPanels) {
      useSolarStore.getState().setSolarApiPanels(solar.solarApiPanels)
    }
  }, [solar.solarApiPanels])

  // Convert RGB GeoTIFF texture to blob URL for 2D satellite view
  useEffect(() => {
    if (!solar.rgbTexture) return
    const { pixels, width, height } = solar.rgbTexture
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      const oldUrl = useSolarStore.getState().rgbBlobUrl
      if (oldUrl?.startsWith('blob:')) URL.revokeObjectURL(oldUrl)
      useSolarStore.getState().setRgbBlobUrl(URL.createObjectURL(blob))
    }, 'image/jpeg', 0.92)
  }, [solar.rgbTexture])

  // Sync DSM bounding box for 2D projection
  useEffect(() => {
    if (solar.dsmBbox) useSolarStore.getState().setDsmBbox(solar.dsmBbox)
  }, [solar.dsmBbox])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Satellite preview — shows instantly while 3D loads */}
      {solar.loading && lat && lng && <SatellitePreview lat={lat} lng={lng} />}
      {solar.loading && <LoadingOverlay step={solar.step} />}
      {solar.error && <ErrorBanner error={solar.error} />}

      <Canvas
        shadows
        frameloop="demand"
        camera={{ position: [0, 35, 28], fov: 50, near: 0.1, far: 800 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onPointerMissed={() => setSelectedSegment(null)}
      >
        <color attach="background" args={['#d4e8f7']} />
        <fog attach="fog" args={['#c8daf0', 50, 150]} />

        <Suspense fallback={null}>
          <SceneContent solar={solar} />
        </Suspense>
      </Canvas>
    </div>
  )
}

// Watches store state and triggers a re-render whenever anything changes
function StoreInvalidator() {
  const { invalidate } = useThree()
  const state = useSolarStore()
  useEffect(() => { invalidate() }, [
    state.shadeHour, state.shadeMonth, state.shadeDayOfYear,
    state.showShadows, state.showShadowPanel,
    state.selectedSegmentId, state.segments,
    state.solarApiPanels,
    invalidate,
  ])
  return null
}

function CameraReset({ meshData, controlsRef }) {
  const { camera } = useThree()
  useEffect(() => {
    if (!meshData) return
    camera.position.set(0, 35, 28)
    camera.lookAt(0, 0, 0)
    const ctrl = controlsRef?.current
    if (ctrl) {
      ctrl.target.set(0, 0, 0)
      ctrl.update()
    }
  }, [meshData])
  return null
}

function SceneContent({ solar }) {
  const controlsRef = useRef()
  const hasSolarMesh = !!(solar.dsmMesh && solar.rgbTexture)
  const { showShadows, showShadowPanel, shadeHour, shadeMonth, hourlyShadeUrls, lat, lng, segments, selectedSegmentId, setSelectedSegment } = useSolarStore()

  const { shadeGrids, loading: shadeLoading } = useShadeData(
    hourlyShadeUrls,
    showShadows || showShadowPanel,  // preload shade data as soon as panel opens
    shadeMonth,
    solar.dsmMesh ? { width: solar.dsmMesh.width, height: solar.dsmMesh.height } : null
  )

  const currentShadeData = showShadows ? shadeGrids[shadeHour] : null
  const sun = getSunPosition(lat || 43.68, lng || 1.42, shadeMonth, shadeHour)
  const sunPos = sun.altitude > 0 ? sun.position : [10, 8, 5]

  return (
    <>
      {/* Sky */}
      <Sky sunPosition={sunPos} turbidity={2} rayleigh={0.4} />


      {/* Lighting */}
      <ambientLight intensity={0.9} color="#d6eaff" />
      <directionalLight
        position={sunPos}
        intensity={2.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-25} shadow-camera-right={25}
        shadow-camera-top={25}  shadow-camera-bottom={-25}
        shadow-bias={-0.001}
        color="#fff8e0"
      />
      <hemisphereLight skyColor="#87ceeb" groundColor="#4a7c59" intensity={0.5} />

      {/* ── Real DSM terrain from Google Solar API ── */}
      {hasSolarMesh ? (
        <ShadedTerrain
          meshData={solar.dsmMesh}
          rgbTexture={solar.rgbTexture}
          shadeMode={showShadows}
          shadeData={currentShadeData}
        />
      ) : (
        <House />
      )}

      {/* ── Roof segment planes (colored overlays showing recognized roof) ── */}
      {hasSolarMesh && solar.dsmBbox && (
        <RoofSegmentPlanes
          segments={segments}
          dsmMesh={solar.dsmMesh}
          dsmBbox={solar.dsmBbox}
        />
      )}

      {/* ── Solar panels from Google Solar API ── */}
      {hasSolarMesh && solar.solarApiPanels && (
        <SolarPanels3D
          panels={solar.solarApiPanels}
          dsmMesh={solar.dsmMesh}
          dsmBbox={solar.dsmBbox}
        />
      )}

      {/* ── Segment markers on real terrain ── */}
      {hasSolarMesh && solar.dsmBbox && segments.map(seg => {
        if (!seg.centerLat || !seg.centerLng) return null
        const { x, z } = geoToScene(seg.centerLat, seg.centerLng, solar.dsmBbox, solar.dsmMesh.width, solar.dsmMesh.height)
        return (
          <SegmentMarker
            key={seg.id}
            position={[x, -2 + 0.1, z]}
            color={seg.color}
            selected={seg.id === selectedSegmentId}
            onClick={(e) => { e.stopPropagation(); setSelectedSegment(seg.id) }}
          />
        )
      })}

      {/* Shade loading indicator via Html overlay */}
      {shadeLoading && (
        <Html center>
          <div style={{
            background: 'white', borderRadius: 8, padding: '8px 14px',
            fontSize: 12, color: '#1d4ed8', border: '1px solid #bfdbfe',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            Chargement des données d'ombre…
          </div>
        </Html>
      )}

      {/* Ground */}
      <Grid
        position={[0, -0.26, 0]}
        args={[80, 80]}
        cellSize={1} cellThickness={0.3} cellColor="#2a5c3a"
        sectionSize={5} sectionThickness={0.8} sectionColor="#1a3d28"
        fadeDistance={50} fadeStrength={1.5} infiniteGrid
      />

      {/* Camera */}
      <OrbitControls
        ref={controlsRef}
        enableDamping dampingFactor={0.06}
        minDistance={3} maxDistance={80}
        maxPolarAngle={Math.PI / 2 - 0.02}
        target={[0, 0, 0]}
        makeDefault
      />
      <CameraReset meshData={solar.dsmMesh} controlsRef={controlsRef} />
      <StoreInvalidator />
    </>
  )
}

// Maps step labels to progress percentages for the progress bar
const STEP_PROGRESS = {
  'Analyse du bâtiment…': 15,
  'Récupération des couches de données…': 30,
  'Téléchargement DSM (modèle 3D élévation)…': 50,
  'Téléchargement RGB (photo aérienne)…': 65,
  'Téléchargement masque bâtiment…': 75,
  'Traitement du modèle 3D…': 85,
  'Génération du maillage 3D…': 95,
}

function SatellitePreview({ lat, lng }) {
  const imgUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=19&maptype=satellite&size=1200x900&scale=2&key=${SOLAR_API_KEY}`
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 15, overflow: 'hidden' }}>
      <img
        src={imgUrl}
        alt="Vue satellite"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {/* Crosshair on building */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}>
        <svg width={60} height={60}>
          <circle cx={30} cy={30} r={14} fill="none" stroke="#22c55e" strokeWidth={2.5} opacity={0.95} />
          <circle cx={30} cy={30} r={3.5} fill="#22c55e" opacity={0.95} />
          <line x1={30} y1={4} x2={30} y2={16} stroke="#22c55e" strokeWidth={2.5} opacity={0.95} />
          <line x1={30} y1={44} x2={30} y2={56} stroke="#22c55e" strokeWidth={2.5} opacity={0.95} />
          <line x1={4} y1={30} x2={16} y2={30} stroke="#22c55e" strokeWidth={2.5} opacity={0.95} />
          <line x1={44} y1={30} x2={56} y2={30} stroke="#22c55e" strokeWidth={2.5} opacity={0.95} />
        </svg>
      </div>
    </div>
  )
}

function LoadingOverlay({ step }) {
  const pct = STEP_PROGRESS[step] || 10
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      paddingBottom: 80,
      pointerEvents: 'none',
    }}>
      <div style={{
        background: 'rgba(15,23,42,0.82)', borderRadius: 14, padding: '16px 24px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        minWidth: 260,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Spinner size={18} />
          <div style={{ fontSize: 13, color: 'white', fontWeight: 600 }}>
            Analyse du bâtiment…
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2 }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
            width: `${pct}%`,
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
          {step}
        </div>
      </div>
    </div>
  )
}

function ErrorBanner({ error }) {
  return (
    <div style={{
      position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
      background: '#fef2f2', borderRadius: 10, padding: '10px 20px',
      border: '1px solid #fca5a5', zIndex: 20,
      fontSize: 13, color: '#dc2626', fontWeight: 500,
    }}>
      Solar API: {error} — mode démo activé
    </div>
  )
}

function Spinner({ size = 16 }) {
  return (
    <div style={{
      width: size, height: size, border: `${size > 20 ? 3 : 2}px solid #bfdbfe`,
      borderTopColor: '#1d4ed8', borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}
