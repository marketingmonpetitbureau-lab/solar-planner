/**
 * DSMTerrain — renders the real building from Google Solar API GeoTIFF
 * Reconstructs the 3D surface from DSM elevation data + RGB aerial photo
 */
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export default function DSMTerrain({ meshData, rgbTexture }) {
  const { geometry, material } = useMemo(() => {
    if (!meshData || !rgbTexture) return {}

    // ── Geometry from DSM ──────────────────────────────────────────
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3))
    geo.setAttribute('uv',       new THREE.BufferAttribute(meshData.uvs, 2))
    geo.setIndex(new THREE.BufferAttribute(meshData.indices, 1))
    geo.computeVertexNormals()

    // ── Texture from RGB ──────────────────────────────────────────
    const tex = new THREE.DataTexture(
      rgbTexture.pixels,
      rgbTexture.width,
      rgbTexture.height,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    )
    tex.needsUpdate = true
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.85,
      metalness: 0,
      side: THREE.FrontSide,
    })

    return { geometry: geo, material: mat }
  }, [meshData, rgbTexture])

  if (!geometry) return null

  return (
    <mesh
      geometry={geometry}
      material={material}
      castShadow
      receiveShadow
      position={[0, -2, 0]}
    />
  )
}
