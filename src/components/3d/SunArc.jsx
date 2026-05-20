import { useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { getSunPosition } from '../../utils/sunPosition'
import { useThree } from '@react-three/fiber'

export default function SunArc({ lat, lng, month, hour }) {
  const sunSphereRef = useRef()

  // Compute all hourly positions for the arc
  const { arcPoints, currentPos, altitude } = useMemo(() => {
    const points = []
    let currentPos = null

    for (let h = 0; h <= 23; h++) {
      const sun = getSunPosition(lat, lng, month, h)
      if (sun.altitude > 0) {
        // Scale the sun position to sit nicely in scene (radius ~35 units)
        const dir = new THREE.Vector3(...sun.position).normalize()
        const p = dir.multiplyScalar(35)
        p.y = Math.max(p.y, 0.5) // keep above ground
        points.push(p)
      }
      if (h === hour) {
        const sun2 = getSunPosition(lat, lng, month, hour)
        if (sun2.altitude > 0) {
          const dir2 = new THREE.Vector3(...sun2.position).normalize()
          currentPos = dir2.multiplyScalar(34)
        }
      }
    }

    const altitude = getSunPosition(lat, lng, month, hour).altitude

    return { arcPoints: points, currentPos, altitude }
  }, [lat, lng, month, hour])

  // Build tube geometry along arc
  const { tubeGeo, glowGeo } = useMemo(() => {
    if (arcPoints.length < 2) return {}
    const curve = new THREE.CatmullRomCurve3(arcPoints)
    const tubeGeo = new THREE.TubeGeometry(curve, arcPoints.length * 4, 0.08, 6, false)
    const glowGeo = new THREE.SphereGeometry(0.6, 16, 16)
    return { tubeGeo, glowGeo }
  }, [arcPoints])

  const { invalidate } = useThree()
  // Pulse animation — invalidate keeps frameloop="demand" ticking
  useFrame(({ clock }) => {
    if (sunSphereRef.current && altitude > 0) {
      const s = 1 + Math.sin(clock.elapsedTime * 2) * 0.06
      sunSphereRef.current.scale.setScalar(s)
      invalidate()
    }
  })

  if (!tubeGeo) return null

  return (
    <group>
      {/* Arc tube */}
      <mesh geometry={tubeGeo}>
        <meshBasicMaterial
          color="#fbbf24"
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>

      {/* Dashed endpoint dots along arc */}
      {arcPoints.filter((_, i) => i % 3 === 0).map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.06, 6, 6]} />
          <meshBasicMaterial color="#fde68a" transparent opacity={0.6} />
        </mesh>
      ))}

      {/* Current sun position sphere */}
      {currentPos && altitude > 0 && (
        <group position={currentPos} ref={sunSphereRef}>
          {/* Outer glow */}
          <mesh>
            <sphereGeometry args={[0.9, 16, 16]} />
            <meshBasicMaterial color="#fde68a" transparent opacity={0.15} depthWrite={false} />
          </mesh>
          {/* Middle */}
          <mesh>
            <sphereGeometry args={[0.65, 16, 16]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.4} depthWrite={false} />
          </mesh>
          {/* Core */}
          <mesh>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshBasicMaterial color="#fff8c0" />
          </mesh>
        </group>
      )}
    </group>
  )
}
