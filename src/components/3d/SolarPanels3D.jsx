import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import useSolarStore from '../../store/useSolarStore'
import { geoToScene } from '../../utils/geoToScene'

// ---------------------------------------------------------------------------
// Roof segment colored overlays — makes recognized roof visually obvious
// ---------------------------------------------------------------------------
export function RoofSegmentPlanes({ segments, dsmMesh, dsmBbox }) {
  if (!segments?.length || !dsmMesh || !dsmBbox) return null
  const filtered = segments.filter(s => s.centerLat && s.centerLng)
  if (!filtered.length) return null

  return (
    <group>
      {filtered.map((seg) => {
        const { x, z } = geoToScene(seg.centerLat, seg.centerLng, dsmBbox, dsmMesh.width, dsmMesh.height)
        const terrainY = getTerrainY(x, z, dsmMesh)
        const posY = terrainY - 2 + 0.04

        // Plane dimensions from roof area
        const area = seg.areaSqM || 15
        const side = Math.sqrt(area)
        const pw = side * 1.3 * SCENE_SCALE
        const ph = side * 0.85 * SCENE_SCALE

        // Geographic azimuth → Three.js Y rotation
        const azRad = ((180 - (seg.azimuth || 180)) * Math.PI) / 180
        const pitchRad = ((seg.tilt || 20) * Math.PI) / 180

        return (
          <mesh key={seg.id} position={[x, posY, z]} rotation={[pitchRad, azRad, 0]}>
            <planeGeometry args={[pw, ph]} />
            <meshBasicMaterial
              color={seg.color || '#f97316'}
              transparent
              opacity={0.38}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )
      })}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Terrain height lookup
// ---------------------------------------------------------------------------
function getTerrainY(x, z, meshData) {
  const { positions, width, height, WORLD_SIZE } = meshData
  const aspectH = height / width
  const col = Math.round(((x / WORLD_SIZE) + 0.5) * (width - 1))
  const row = Math.round(((-(z / (WORLD_SIZE * aspectH))) + 0.5) * (height - 1))
  const c = Math.max(0, Math.min(width - 1, col))
  const r = Math.max(0, Math.min(height - 1, row))
  return positions[(r * width + c) * 3 + 1]  // y component
}

// ---------------------------------------------------------------------------
// Panel geometry & materials (shared singletons — created once)
// ---------------------------------------------------------------------------

// Scale: WORLD_SIZE=40 covers ~120 m of real-world span (radius 60 m × 2)
const SCENE_SCALE = 40 / 120   // ≈ 0.333 scene units per meter
const PANEL_W = 1.134 * SCENE_SCALE  // ≈ 0.378 units (portrait width)
const PANEL_H = 2.278 * SCENE_SCALE  // ≈ 0.759 units (portrait height)
const PANEL_THICKNESS = 0.015

const panelGeo = new THREE.BoxGeometry(PANEL_W, PANEL_THICKNESS, PANEL_H)

const panelMat = new THREE.MeshStandardMaterial({
  color: '#1a3a5c',
  roughness: 0.3,
  metalness: 0.1,
})

const panelMatSelected = new THREE.MeshStandardMaterial({
  color: '#f97316',
  roughness: 0.3,
  metalness: 0.2,
  emissive: '#f97316',
  emissiveIntensity: 0.3,
})

// ---------------------------------------------------------------------------
// Instanced renderer — efficient for large numbers of panels
// ---------------------------------------------------------------------------
function InstancedPanels({ panels, dsmMesh, dsmBbox }) {
  const meshRef = useRef()

  const validPanels = useMemo(
    () => panels.filter(p => p.lat && p.lng),
    [panels]
  )

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh || !validPanels.length) return

    const m = new THREE.Matrix4()
    const pos = new THREE.Vector3()
    const rot = new THREE.Euler()
    const quat = new THREE.Quaternion()
    const scale = new THREE.Vector3(1, 1, 1)

    validPanels.forEach((panel, i) => {
      const { x, z } = geoToScene(panel.lat, panel.lng, dsmBbox, dsmMesh.width, dsmMesh.height)
      const terrainY = getTerrainY(x, z, dsmMesh)
      const posY = terrainY - 2 + PANEL_THICKNESS / 2 + 0.02

      pos.set(x, posY, z)
      // Geographic azimuth to Three.js Y rotation
      const azRad = ((180 - panel.azimuth) * Math.PI) / 180
      const tiltRad = (panel.pitch * Math.PI) / 180
      rot.set(tiltRad, azRad, 0)
      quat.setFromEuler(rot)
      m.compose(pos, quat, scale)
      mesh.setMatrixAt(i, m)
    })

    mesh.instanceMatrix.needsUpdate = true
  }, [validPanels, dsmMesh, dsmBbox])

  if (!validPanels.length) return null

  return (
    <instancedMesh
      ref={meshRef}
      args={[panelGeo, panelMat, validPanels.length]}
      castShadow
    />
  )
}

// ---------------------------------------------------------------------------
// Individual panel mesh — supports per-panel selection colour
// ---------------------------------------------------------------------------
function PanelMesh({ panel, dsmMesh, dsmBbox, isSelected }) {
  const { x, z } = geoToScene(panel.lat, panel.lng, dsmBbox, dsmMesh.width, dsmMesh.height)
  const terrainY = getTerrainY(x, z, dsmMesh)

  // Convert geographic azimuth to Three.js Y rotation.
  // Geographic: 0=N, 90=E, 180=S, 270=W
  // Three.js scene positive-Z ≈ south → south-facing panels rotate 0
  const azRad = ((180 - panel.azimuth) * Math.PI) / 180
  const tiltRad = (panel.pitch * Math.PI) / 180

  // -2 accounts for the ShadedTerrain group placed at y=-2 in Scene3D
  const posY = terrainY - 2 + PANEL_THICKNESS / 2 + 0.02

  return (
    <mesh
      geometry={panelGeo}
      material={isSelected ? panelMatSelected : panelMat}
      position={[x, posY, z]}
      rotation={[tiltRad, azRad, 0]}
      castShadow
    />
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export default function SolarPanels3D({ panels, dsmMesh, dsmBbox }) {
  const { selectedSegmentId, segments } = useSolarStore()

  // Build Set of selected segment indices for fast lookup
  const selectedSegIdx = useMemo(() => {
    if (!selectedSegmentId) return new Set()
    const seg = segments.find(s => s.id === selectedSegmentId)
    if (!seg) return new Set()
    const idx = seg.segmentIndex ?? segments.indexOf(seg)
    return new Set([idx])
  }, [selectedSegmentId, segments])

  if (!panels?.length || !dsmMesh || !dsmBbox) return null

  const validPanels = panels.filter(p => p.lat && p.lng)
  if (!validPanels.length) return null

  // Use instanced rendering for performance when panels are many AND nothing is
  // selected (selection requires per-panel colour control via individual meshes)
  const useInstanced = validPanels.length > 50 && selectedSegIdx.size === 0

  if (useInstanced) {
    return (
      <group>
        <InstancedPanels panels={validPanels} dsmMesh={dsmMesh} dsmBbox={dsmBbox} />
      </group>
    )
  }

  return (
    <group>
      {validPanels.map(panel => (
        <PanelMesh
          key={panel.id}
          panel={panel}
          dsmMesh={dsmMesh}
          dsmBbox={dsmBbox}
          isSelected={selectedSegIdx.has(panel.segmentIndex)}
        />
      ))}
    </group>
  )
}
