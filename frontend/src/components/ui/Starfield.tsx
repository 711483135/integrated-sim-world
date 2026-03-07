import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface StarfieldProps {
  starCount?: number;
}

export function Starfield({ starCount = 180 }: StarfieldProps) {
  const meshRef = useRef<THREE.Points>(null);

  const { positions, sizes } = useMemo(() => {
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4000;
      positions[i * 3 + 1] = Math.random() * 2000;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4000;
      sizes[i] = Math.random() * 2 + 0.5;
    }
    return { positions, sizes };
  }, [starCount]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.01;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={1.5} sizeAttenuation transparent opacity={0.8} />
    </points>
  );
}
