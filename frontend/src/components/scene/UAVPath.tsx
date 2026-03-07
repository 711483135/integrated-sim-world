import { useMemo, useRef, useLayoutEffect } from 'react';
import { Line } from '@react-three/drei';
import { Line2 } from 'three-stdlib';

interface UAVPathProps {
  path: Array<{ x: number; y: number; z: number }>;
  color?: string;
  lineWidth?: number;
}

/** 在 3D 場景中畫出 UAV 移動軌跡 */
export function UAVPath({ path, color = '#00ff00', lineWidth = 3 }: UAVPathProps) {
  const lineRef = useRef<Line2>(null);

  const points = useMemo(() => {
    if (!path || path.length < 2) return null;
    const valid = path.filter(p =>
      Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)
    );
    if (valid.length < 2) return null;
    return valid.map(p => [p.x, Math.max(p.y, 15), p.z] as [number, number, number]);
  }, [path]);

  useLayoutEffect(() => {
    if (lineRef.current?.geometry) {
      lineRef.current.computeLineDistances();
      lineRef.current.geometry.computeBoundingSphere();
      lineRef.current.geometry.computeBoundingBox();
    }
  }, [points]);

  if (!points) return null;

  return (
    <Line
      ref={lineRef}
      points={points}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={0.8}
      polygonOffset
      polygonOffsetFactor={-1}
    />
  );
}
