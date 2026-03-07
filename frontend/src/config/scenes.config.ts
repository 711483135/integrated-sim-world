import { NTPU_CONFIG } from './ntpu.config';
import { NYCU_CONFIG } from './nycu.config';

export type SceneId = 'ntpu' | 'nycu';

export interface SceneDefinition {
  id: SceneId;
  label: string;
  labelEn: string;
  config: typeof NTPU_CONFIG;
}

export const SCENES: SceneDefinition[] = [
  {
    id: 'ntpu',
    label: '臺北大學',
    labelEn: 'NTPU',
    config: NTPU_CONFIG,
  },
  {
    id: 'nycu',
    label: '陽明交通大學',
    labelEn: 'NYCU',
    config: NYCU_CONFIG,
  },
];

export const DEFAULT_SCENE_ID: SceneId = 'ntpu';

export function getSceneById(id: SceneId): SceneDefinition {
  return SCENES.find(s => s.id === id) ?? SCENES[0];
}
