/**
 * UAV Path Visualization Component
 *
 * Renders colored path visualization for UAV flight
 * Shows traversed positions with start/end markers and a pulsing current-position indicator
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface UAVPathPoint {
  x: number;
  y: number;
  z: number;
  timestamp: number;
  color: string;
}

export interface UAVPathVisualizationProps {
  pathPoints: UAVPathPoint[];
  currentPosition?: [number, number, number];
  showCurrentPosition?: boolean;
  maxPathLength?: number;
}

export default function UAVPathVisualization({
  pathPoints,
  currentPosition,
  showCurrentPosition = true,
  maxPathLength = 1000,
}: UAVPathVisualizationProps) {
  const currentPosRef = useRef<THREE.Mesh>(null);

  // Build line as a THREE.Line object managed via useMemo
  const lineObject = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8 });
    return new THREE.Line(new THREE.BufferGeometry(), mat);
  }, []);

  // Update geometry when path changes
  useEffect(() => {
    if (pathPoints.length < 2) {
      lineObject.geometry.dispose();
      lineObject.geometry = new THREE.BufferGeometry();
      return;
    }

    const displayPoints = pathPoints.slice(-maxPathLength);
    const positions = new Float32Array(displayPoints.length * 3);
    const colors = new Float32Array(displayPoints.length * 3);

    displayPoints.forEach((point, i) => {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;

      const color = new THREE.Color();
      if (point.color.startsWith('rgba(')) {
        const m = point.color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
        if (m) color.setRGB(parseInt(m[1]) / 255, parseInt(m[2]) / 255, parseInt(m[3]) / 255);
      } else {
        color.set(point.color);
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    lineObject.geometry.dispose();
    lineObject.geometry = geo;
  }, [pathPoints, maxPathLength, lineObject]);

  // Pulse animation for current position indicator
  useFrame((state) => {
    if (currentPosRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
      currentPosRef.current.scale.setScalar(s);
    }
  });

  return (
    <group>
      {/* Path line */}
      <primitive object={lineObject} />

      {/* Current position indicator */}
      {showCurrentPosition && currentPosition && (
        <mesh ref={currentPosRef} position={currentPosition}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
        </mesh>
      )}

      {/* Start position marker */}
      {pathPoints.length > 0 && (
        <mesh position={[pathPoints[0].x, pathPoints[0].y, pathPoints[0].z + 1]}>
          <coneGeometry args={[1.5, 3, 6]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      )}

      {/* End position marker */}
      {pathPoints.length > 1 && (
        <mesh
          position={[
            pathPoints[pathPoints.length - 1].x,
            pathPoints[pathPoints.length - 1].y,
            pathPoints[pathPoints.length - 1].z + 1,
          ]}
        >
          <coneGeometry args={[1.5, 3, 6]} />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
      )}
    </group>
  );
}
