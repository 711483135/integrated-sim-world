/**
 * App.tsx — 應用程式主元件
 *
 * 職責：
 *  1. 取得本地 GPS（手機端，傳給 useGPSSync 發送）
 *  2. 從 useGPSSync 接收其他裝置的 GPS（電腦端顯示）
 *  3. 將 GPS 轉成 ENU 三維座標，驅動 UAV 位置與軌跡
 *  4. 管理照片列表（初始載入 + WebSocket 即時更新）
 *  5. 渲染 3D 場景、GPS HUD、拍照按鈕、照片歷史
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { MainScene } from './components/scene/MainScene';
import { CameraUpload } from './components/ui/CameraUpload';
import { PhotoViewer } from './components/ui/PhotoViewer';
import { GPSStatus } from './components/ui/GPSStatus';
import { useGPSSync } from './hooks/useGPSSync';
import { latLonToENU } from './utils/geo';
import { SimulationPanel } from './components/ui/SimulationPanel';
import { SceneSwitcher } from './components/ui/SceneSwitcher';
import { type SceneId, DEFAULT_SCENE_ID, getSceneById } from './config/scenes.config';

// ── 環境變數 ────────────────────────────────────────────────────────

const SCALE = Number(import.meta.env.VITE_SCENE_SCALE ?? 1);
// 空字串時使用相對路徑，讓 Vite proxy 接管（本地開發用）
const API = import.meta.env.VITE_API_URL || '';

// 高度視覺增益（現實 1m → 場景 ALT_GAIN 單位）
const ALT_GAIN = 2.14;

// ── Types ───────────────────────────────────────────────────────────
interface LocalGPS {
  lat: number;
  lon: number;
  alt: number;
  accuracy: number;
}

interface Photo {
  url: string;
  timestamp: string;
  filename: string;
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  deviceId?: string | null;
}

// ── App ─────────────────────────────────────────────────────────────
export function App() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // ── 場景管理 ────────────────────────────────────────────────
  const [sceneId, setSceneId] = useState<SceneId>(DEFAULT_SCENE_ID);
  const sceneDef = getSceneById(sceneId);
  const ORIGIN = {
    lat: sceneDef.config.observer.lat,
    lon: sceneDef.config.observer.lon,
    alt: sceneDef.config.observer.alt,
  };

  const [localGPS, setLocalGPS] = useState<LocalGPS>({ lat: 0, lon: 0, alt: 0, accuracy: 999 });

  useEffect(() => {
    if (!isMobile) return;
    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setLocalGPS({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          alt: pos.coords.altitude ?? 0,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => console.warn('GPS 錯誤:', err),
      { enableHighAccuracy: true, maximumAge: 1000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [isMobile]);

  // ── GPS Sync ────────────────────────────────────────────────────
  const {
    myDeviceId,
    deviceName,
    updateDeviceName,
    allDevices,
    clearPathTrigger,
    sendClearPath,
    photoEvent,
    photoDeleteEvent,
    connectionStatus,
  } = useGPSSync(localGPS);

  // ── 選定追蹤的裝置（電腦端）──────────────────────────────────────
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // 當第一個裝置上線時自動選取
  useEffect(() => {
    if (selectedDeviceId) return;
    const first = allDevices.keys().next().value;
    if (first) setSelectedDeviceId(first);
  }, [allDevices, selectedDeviceId]);

  // ── UAV 位置 + 軌跡 ──────────────────────────────────────────────
  const [uavPosition, setUavPosition] = useState<[number, number, number]>([0, 10, 0]);
  const [uavPath, setUavPath] = useState<Array<{ x: number; y: number; z: number }>>([]);

  useEffect(() => {
    const trackId = isMobile ? myDeviceId : selectedDeviceId;
    if (!trackId) return;

    // 手機端追自己、電腦端追選定的裝置
    const gps = isMobile
      ? (localGPS.lat !== 0 ? localGPS : null)
      : allDevices.get(trackId ?? '') ?? null;

    if (!gps) return;

    const [ex, ez, ealt] = latLonToENU(gps.lat, gps.lon, gps.alt, ORIGIN);
    const x = ex * SCALE;
    const z = ez * SCALE;
    const y = Math.max(ealt * ALT_GAIN, 10);

    setUavPosition([x, y, z]);
    setUavPath(prev => {
      const last = prev[prev.length - 1];
      if (last && Math.abs(last.x - x) < 0.1 && Math.abs(last.z - z) < 0.1) return prev;
      return [...prev, { x, y, z }];
    });
  }, [allDevices, localGPS, selectedDeviceId, myDeviceId, isMobile]);

  // ── 清除軌跡 ─────────────────────────────────────────────────────
  useEffect(() => {
    if (clearPathTrigger > 0) setUavPath([]);
  }, [clearPathTrigger]);

  // 切換場景時重置 UAV 路徑（ENU 原點改變，舊路徑座標無效）
  useEffect(() => {
    setUavPath([]);
  }, [sceneId]);

  const handleClearPath = useCallback(() => {
    sendClearPath();
    setUavPath([]);
  }, [sendClearPath]);

  // ── 照片管理 ─────────────────────────────────────────────────────
  const [photos, setPhotos] = useState<Photo[]>([]);

  // 初始載入
  useEffect(() => {
    fetch(`${API}/api/photo-history`)
      .then(r => r.json())
      .then(d => { if (d.success) setPhotos(d.photos); })
      .catch(() => {});
  }, []);

  // WebSocket 新照片
  useEffect(() => {
    if (!photoEvent) return;
    setPhotos(prev => {
      if (prev.some(p => p.filename === photoEvent.filename)) return prev;
      return [photoEvent as unknown as Photo, ...prev];
    });
  }, [photoEvent]);

  // WebSocket 刪除照片
  useEffect(() => {
    if (!photoDeleteEvent) return;
    setPhotos(prev => prev.filter(p => p.filename !== photoDeleteEvent.filename));
  }, [photoDeleteEvent]);

  const handleDelete = useCallback((filename: string) => {
    setPhotos(prev => prev.filter(p => p.filename !== filename));
  }, []);

  // ── 改名 ─────────────────────────────────────────────────────────
  const handleRename = useCallback(() => {
    const name = prompt('輸入新的裝置名稱', deviceName);
    if (name && name.trim()) updateDeviceName(name.trim());
  }, [deviceName, updateDeviceName]);

  // ── 目前 GPS（供 HUD 顯示）────────────────────────────────────────
  const currentGPS = isMobile && localGPS.lat !== 0 ? localGPS : null;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100vw', height: '100dvh', position: 'relative' }}>

      {/* 3D 場景 */}
      <MainScene uavPosition={uavPosition} uavPath={uavPath} sceneId={sceneId} />

      {/* GPS 狀態 HUD */}
      <GPSStatus
        myDeviceId={myDeviceId}
        deviceName={deviceName}
        onRenameClick={handleRename}
        allDevices={allDevices}
        uavPath={uavPath}
        onClearPath={handleClearPath}
        connectionStatus={connectionStatus}
        localGPS={currentGPS}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={setSelectedDeviceId}
      />

      {/* 照片歷史（電腦端） */}
      {!isMobile && (
        <PhotoViewer photos={photos} onDelete={handleDelete} />
      )}

      {/* 拍照上傳（手機端） */}
      <CameraUpload
        currentPosition={currentGPS ? { lat: currentGPS.lat, lon: currentGPS.lon, altitude: currentGPS.alt } : null}
        deviceId={myDeviceId}
      />

      {/* Sionna 無線模擬面板（電腦端） */}
      {!isMobile && <SimulationPanel />}

      {/* 場景切換器 */}
      {!isMobile && (
        <SceneSwitcher currentScene={sceneId} onChange={setSceneId} />
      )}
    </div>
  );
}
