/**
 * MainScene — 主 3D 場景
 *
 * 接收：
 *  - uavPosition  : UAV 目前位置（ENU，由 GPS 驅動）
 *  - uavPath      : UAV 歷史軌跡（ENU 點陣列）
 */
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  PerspectiveCamera,
  Html,
} from '@react-three/drei';
import { ACESFilmicToneMapping } from 'three';
import { NTPUScene } from './NTPUScene';
import { NYCUScene } from './NYCUScene';
import { UAV } from './UAV';
import { UAVPath } from './UAVPath';
import { Starfield } from '../ui/Starfield';
import { type SceneId, getSceneById, DEFAULT_SCENE_ID } from '@/config/scenes.config';

// ── 載入提示 ──────────────────────────────────────────────────────
function Loader({ label }: { label: string }) {
  return (
    <Html center>
      <div style={{
        color: 'white',
        fontSize: '18px',
        background: 'rgba(0,0,0,0.7)',
        padding: '16px 32px',
        borderRadius: '8px',
      }}>
        Loading {label} Scene…
      </div>
    </Html>
  );
}

// ── Props ─────────────────────────────────────────────────────────
interface MainSceneProps {
  uavPosition?: [number, number, number];
  uavPath?: Array<{ x: number; y: number; z: number }>;
  sceneId?: SceneId;
}

// ── Component ─────────────────────────────────────────────────────
export function MainScene({
  uavPosition = [0, 10, 0],
  uavPath = [],
  sceneId = DEFAULT_SCENE_ID,
}: MainSceneProps) {
  const sceneDef = getSceneById(sceneId);
  const cfg = sceneDef.config;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      background: 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)',
      overflow: 'hidden',
    }}>
      <Canvas
        shadows
        gl={{
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          alpha: true,
          powerPreference: 'high-performance',
          antialias: true,
        }}
      >
        {/* 相機 */}
        <PerspectiveCamera
          makeDefault
          position={cfg.camera.initialPosition}
          fov={cfg.camera.fov}
          near={cfg.camera.near}
          far={cfg.camera.far}
        />

        {/* 軌道控制 */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={2000}
          maxPolarAngle={Math.PI / 2}
        />

        {/* 燈光 */}
        <hemisphereLight args={[0xffffff, 0x444444, 1.0]} />
        <ambientLight intensity={0.2} />
        <directionalLight
          castShadow
          position={[0, 50, 0]}
          intensity={1.5}
          shadow-mapSize-width={4096}
          shadow-mapSize-height={4096}
          shadow-camera-near={1}
          shadow-camera-far={1000}
          shadow-camera-top={500}
          shadow-camera-bottom={-500}
          shadow-camera-left={500}
          shadow-camera-right={-500}
          shadow-bias={-0.0004}
          shadow-radius={8}
        />

        {/* 3D 場景（依 sceneId 動態切換） */}
        <Suspense fallback={<Loader label={sceneDef.labelEn} />}>
          {sceneId === 'nycu' ? <NYCUScene /> : <NTPUScene />}
        </Suspense>

        {/* UAV 模型 */}
        <Suspense fallback={null}>
          <UAV position={uavPosition} scale={10} />
        </Suspense>

        {/* UAV 軌跡線 */}
        <UAVPath path={uavPath} color="#00ff00" lineWidth={3} />

        {/* 星空背景 */}
        <Starfield starCount={180} />
      </Canvas>
    </div>
  );
}
