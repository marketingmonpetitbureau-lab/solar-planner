import { useMemo } from 'react'
import * as THREE from 'three'
import useSolarStore from '../../store/useSolarStore'

export default function RoofSegment({ segment }) {
  const { selectedSegmentId, hoveredSegmentId, setSelectedSegment, setHoveredSegment } = useSolarStore()

  const isSelected = selectedSegmentId === segment.id
  const isHovered = hoveredSegmentId === segment.id

  const tiltRad = (segment.tilt * Math.PI) / 180
  const azimuthRad = (segment.azimuth * Math.PI) / 180

  const pW = 1.134
  const pH = 2.278

  return (
    // Outer group: positioned at the eave of the roof face
    <group
      position={[segment.offsetX, 0, segment.offsetZ]}
      rotation={[0, -azimuthRad, 0]}
    >
      {/* Inner group: tilts the whole face up the slope */}
      <group rotation={[-tiltRad, 0, 0]}>

        {/* Invisible click surface */}
        <mesh
          onClick={(e) => { e.stopPropagation(); setSelectedSegment(isSelected ? null : segment.id) }}
          onPointerOver={(e) => { e.stopPropagation(); setHoveredSegment(segment.id) }}
          onPointerOut={() => setHoveredSegment(null)}
        >
          <planeGeometry args={[segment.width, segment.height + 1]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>

        {/* Selection outline */}
        {(isSelected || isHovered) && (
          <mesh position={[0, segment.height / 2, 0.009]}>
            <planeGeometry args={[segment.width + 0.3, segment.height + 0.8]} />
            <meshBasicMaterial
              color={isSelected ? '#f97316' : '#60a5fa'}
              transparent
              opacity={0.12}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* Solar panels – positioned from y=0 up the slope */}
        {segment.panels.map((panel) => (
          <SolarPanel
            key={panel.id}
            x={panel.x}
            y={panel.y}
            width={pW}
            height={pH}
          />
        ))}
      </group>
    </group>
  )
}

function SolarPanel({ x, y, width, height }) {
  const cellRows = 6
  const cellCols = 9
  const Z_OFFSET = 0.015  // Raise panels above roof surface

  const gridGeo = useMemo(() => {
    const pts = []
    const pad = 0.025
    const iw = width - pad * 2
    const ih = height - pad * 2

    for (let c = 1; c < cellCols; c++) {
      const px = -iw / 2 + (c / cellCols) * iw
      pts.push(px, -ih / 2, 0, px, ih / 2, 0)
    }
    for (let r = 1; r < cellRows; r++) {
      const py = -ih / 2 + (r / cellRows) * ih
      pts.push(-iw / 2, py, 0, iw / 2, py, 0)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return geo
  }, [width, height])

  return (
    <group position={[x, y, Z_OFFSET]}>
      {/* Dark blue panel body */}
      <mesh castShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color="#0d1f3c"
          roughness={0.12}
          metalness={0.75}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Aluminium frame border */}
      <lineSegments position={[0, 0, 0.001]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(width, height)]} />
        <lineBasicMaterial color="#cbd5e1" linewidth={1} />
      </lineSegments>

      {/* Cell grid lines */}
      <lineSegments geometry={gridGeo} position={[0, 0, 0.002]}>
        <lineBasicMaterial color="#1d4ed8" transparent opacity={0.55} />
      </lineSegments>

      {/* Blue sheen surface */}
      <mesh position={[0, 0, 0.003]}>
        <planeGeometry args={[width - 0.05, height - 0.05]} />
        <meshPhysicalMaterial
          color="#0f2d6e"
          roughness={0.03}
          metalness={0.95}
          reflectivity={1}
          transparent
          opacity={0.5}
        />
      </mesh>
    </group>
  )
}
