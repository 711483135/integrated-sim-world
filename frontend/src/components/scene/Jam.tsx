import { useRef, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { NTPU_CONFIG } from '@/config/ntpu.config';

interface JamProps {
  position: [number, number, number];
  scale?: number;
}

export function Jam({ position, scale = 10 }: JamProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/jam.glb');

  const clonedScene = useMemo(() => {
    const cloned = SkeletonUtils.clone(scene);

    cloned.traverse((obj: THREE.Object3D) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    return cloned;
  }, [scene]);

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <primitive object={clonedScene} />
    </group>
  );
}

// 預載入模型
useGLTF.preload('/models/jam.glb');
