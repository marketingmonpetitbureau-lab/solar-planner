import { useMemo, useRef, useEffect, forwardRef } from 'react'
import * as THREE from 'three'

const ShadedTerrain = forwardRef(function ShadedTerrain({ meshData, rgbTexture, shadeMode, shadeData }, ref) {
  const meshRef = useRef()

  // Expose mesh ref to parent
  useEffect(() => {
    if (ref) ref.current = meshRef.current
  })

  const { geometry, material } = useMemo(() => {
    if (!meshData || !rgbTexture) return {}

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(meshData.uvs, 2))
    geo.setIndex(new THREE.BufferAttribute(meshData.indices, 1))
    const colors = new Float32Array(meshData.positions.length)
    colors.fill(1)
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()

    const tex = new THREE.DataTexture(
      rgbTexture.pixels, rgbTexture.width, rgbTexture.height,
      THREE.RGBAFormat, THREE.UnsignedByteType
    )
    tex.needsUpdate = true
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = tex.magFilter = THREE.LinearFilter

    const mat = new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.85, metalness: 0, side: THREE.FrontSide,
    })
    mat.userData.rgbTex = tex

    return { geometry: geo, material: mat }
  }, [meshData, rgbTexture])

  useEffect(() => {
    if (!geometry || !material) return
    const colorAttr = geometry.attributes.color

    if (shadeMode && shadeData) {
      for (let i = 0; i < colorAttr.count; i++) {
        const v = (shadeData[i] ?? 128) / 255
        const r = v < 0.5 ? v * 0.3 : 0.15 + (v - 0.5) * 1.7
        const g = v < 0.5 ? v * 0.5 : 0.25 + (v - 0.5) * 1.5
        const b = v < 0.5 ? 0.3 + v * 0.7 : 0.65 - (v - 0.5) * 1.3
        colorAttr.setXYZ(i, Math.min(1,r), Math.min(1,g), Math.min(1,b))
      }
      colorAttr.needsUpdate = true
      material.vertexColors = true
      material.map = null
      material.needsUpdate = true
    } else {
      colorAttr.array.fill(1)
      colorAttr.needsUpdate = true
      material.vertexColors = false
      material.map = material.userData.rgbTex
      material.needsUpdate = true
    }
  }, [shadeMode, shadeData, geometry, material])

  if (!geometry) return null

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      castShadow receiveShadow
      position={[0, -2, 0]}
    />
  )
})

export default ShadedTerrain
