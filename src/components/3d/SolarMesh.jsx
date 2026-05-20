/**
 * SolarMesh — renders the real 3D building from Google Solar API GeoTIFF data
 * This replaces the generic house model when Solar API data is available.
 *
 * Data flow:
 * DSM.tiff (heights) + RGB.tiff (photo) + mask.tiff → Three.js mesh
 */
import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh'
import RoofSegment from './RoofSegment'
import useSolarStore from '../../store/useSolarStore'

// Enable BVH accelerated raycasting
THREE.Mesh.prototype.raycast = acceleratedRaycast

export default function SolarMesh({ meshData, rgbImageData }) {
  const meshRef = useRef()
  const { segments } = useSolarStore()

  const { geometry, texture } = useMemo(() => {
    if (!meshData) return {}

    const { positions, uvs, colors, indices, width, height } = meshData

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()

    // Build BVH for fast raycasting (panel placement)
    geo.boundsTree = new MeshBVH(geo)

    // Create texture from RGB data
    let tex = null
    if (rgbImageData) {
      tex = new THREE.DataTexture(
        rgbImageData,
        width,
        height,
        THREE.RGBFormat,
        THREE.UnsignedByteType
      )
      tex.needsUpdate = true
      tex.flipY = true
    }

    return { geometry: geo, texture: tex }
  }, [meshData, rgbImageData])

  if (!geometry) return null

  return (
    <group>
      {/* The real 3D terrain + building mesh */}
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors={!texture}
          map={texture || null}
          roughness={0.8}
          metalness={0}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Solar panel overlays on real roof geometry */}
      {segments.map(seg => (
        <RoofSegment key={seg.id} segment={seg} />
      ))}
    </group>
  )
}
