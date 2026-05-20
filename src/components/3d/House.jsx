import { useMemo } from 'react'
import * as THREE from 'three'
import RoofSegment from './RoofSegment'
import useSolarStore from '../../store/useSolarStore'

// House dimensions
const W = 9    // width (X)
const D = 7    // depth (Z)
const H = 3.0  // wall height
const RH = 2.2 // ridge height above walls

export default function House() {
  const { segments } = useSolarStore()

  return (
    <group>
      {/* Foundation */}
      <mesh receiveShadow position={[0, -0.12, 0]}>
        <boxGeometry args={[W + 0.4, 0.25, D + 0.4]} />
        <meshStandardMaterial color="#94a3b8" roughness={1} />
      </mesh>

      {/* Walls */}
      <Walls />

      {/* Roof mesh */}
      <group position={[0, H, 0]}>
        <RoofMesh />

        {/* Segments placed ON the south face */}
        {/* South face: tilts from (y=0, z=D/2) down toward eave, ridge at y=RH, z=0 */}
        {segments.map(seg => (
          <RoofSegment key={seg.id} segment={seg} />
        ))}
      </group>

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#1a2e0a" roughness={1} />
      </mesh>
    </group>
  )
}

function Walls() {
  const mat = <meshStandardMaterial color="#f0ede8" roughness={0.85} metalness={0} />

  return (
    <group>
      {/* Front */}
      <mesh castShadow receiveShadow position={[0, H / 2, D / 2]}>
        <boxGeometry args={[W, H, 0.22]} />
        {mat}
      </mesh>
      {/* Back */}
      <mesh castShadow receiveShadow position={[0, H / 2, -D / 2]}>
        <boxGeometry args={[W, H, 0.22]} />
        {mat}
      </mesh>
      {/* Left */}
      <mesh castShadow receiveShadow position={[-W / 2, H / 2, 0]}>
        <boxGeometry args={[0.22, H, D]} />
        {mat}
      </mesh>
      {/* Right */}
      <mesh castShadow receiveShadow position={[W / 2, H / 2, 0]}>
        <boxGeometry args={[0.22, H, D]} />
        {mat}
      </mesh>

      {/* Windows front */}
      <mesh position={[-2.2, H / 2 + 0.3, D / 2 + 0.12]}>
        <boxGeometry args={[1.2, 1.0, 0.05]} />
        <meshStandardMaterial color="#bfdbfe" metalness={0.6} roughness={0.1} transparent opacity={0.8} />
      </mesh>
      <mesh position={[2.2, H / 2 + 0.3, D / 2 + 0.12]}>
        <boxGeometry args={[1.2, 1.0, 0.05]} />
        <meshStandardMaterial color="#bfdbfe" metalness={0.6} roughness={0.1} transparent opacity={0.8} />
      </mesh>
      {/* Window frames */}
      <mesh position={[-2.2, H / 2 + 0.3, D / 2 + 0.14]}>
        <edgesGeometry args={[new THREE.BoxGeometry(1.2, 1.0, 0.05)]} />
        <lineBasicMaterial color="#9ca3af" />
      </mesh>
      <mesh position={[2.2, H / 2 + 0.3, D / 2 + 0.14]}>
        <edgesGeometry args={[new THREE.BoxGeometry(1.2, 1.0, 0.05)]} />
        <lineBasicMaterial color="#9ca3af" />
      </mesh>

      {/* Door */}
      <mesh position={[0, H / 2 - 0.6, D / 2 + 0.12]}>
        <boxGeometry args={[0.95, 1.8, 0.06]} />
        <meshStandardMaterial color="#7c3a1a" roughness={0.9} />
      </mesh>

      {/* Right side window */}
      <mesh position={[W / 2 + 0.12, H / 2 + 0.3, 1.5]}>
        <boxGeometry args={[0.05, 1.0, 1.2]} />
        <meshStandardMaterial color="#bfdbfe" metalness={0.6} roughness={0.1} transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

function RoofMesh() {
  const geo = useMemo(() => {
    return buildHipRoofGeo(W, D, RH)
  }, [])

  return (
    <>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial
          color="#c0392b"
          roughness={0.82}
          metalness={0.05}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Ridge beam */}
      <mesh position={[0, RH + 0.06, 0]} castShadow>
        <boxGeometry args={[W + 0.2, 0.14, 0.14]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.9} />
      </mesh>

      {/* Gutters */}
      {[D / 2, -D / 2].map((z, i) => (
        <mesh key={i} position={[0, 0, z]}>
          <boxGeometry args={[W + 0.5, 0.09, 0.18]} />
          <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </>
  )
}

function buildHipRoofGeo(w, d, rh) {
  const hw = w / 2
  const hd = d / 2

  const vertices = new Float32Array([
    // South face (front) — facing +Z
    -hw, 0, hd,   // 0 eave-left
     hw, 0, hd,   // 1 eave-right
     hw, rh, 0,   // 2 ridge-right
    -hw, rh, 0,   // 3 ridge-left

    // North face (back) — facing -Z
    -hw, 0, -hd,  // 4
     hw, 0, -hd,  // 5
     hw, rh, 0,   // 6
    -hw, rh, 0,   // 7

    // West hip — facing -X
    -hw, 0,  hd,  // 8
    -hw, 0, -hd,  // 9
    -hw, rh, 0,   // 10

    // East hip — facing +X
     hw, 0,  hd,  // 11
     hw, 0, -hd,  // 12
     hw, rh, 0,   // 13
  ])

  const indices = [
    0, 1, 2,  0, 2, 3,    // south
    5, 4, 7,  5, 7, 6,    // north
    8, 9, 10,             // west
    11, 13, 12,           // east
  ]

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}
