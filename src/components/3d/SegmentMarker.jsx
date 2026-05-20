import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function SegmentMarker({ position, color, selected, onClick }) {
  const ref = useRef()

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.scale.setScalar(1 + 0.1 * Math.sin(clock.elapsedTime * 3))
    }
  })

  return (
    <group position={position} onClick={onClick}>
      {/* Flat disc on terrain */}
      <mesh rotation={[-Math.PI/2, 0, 0]} ref={ref}>
        <circleGeometry args={[selected ? 1.5 : 1, 32]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.9 : 0.6} />
      </mesh>
      {/* Vertical line */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  )
}
