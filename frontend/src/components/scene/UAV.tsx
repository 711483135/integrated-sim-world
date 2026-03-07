import { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { NTPU_CONFIG } from '@/config/ntpu.config';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

interface UAVProps {
  position: [number, number, number];
  scale?: number;
}

export function UAV({ position, scale = 10 }: UAVProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(NTPU_CONFIG.uav.modelPath);

  const cloned = useMemo(() => {
    const c = SkeletonUtils.clone(scene);
    c.traverse((obj: THREE.Object3D) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <primitive object={cloned} />
      <pointLight intensity={0.3} distance={50} decay={2} color="#ffffff" position={[0, 2, 0]} />
    </group>
  );
}

useGLTF.preload(NTPU_CONFIG.uav.modelPath);
