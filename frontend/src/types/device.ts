export type DeviceRole = 'tx' | 'rx' | 'jammer';

export interface Device {
  id: string;
  name: string;
  role: DeviceRole;
  x: number;
  y: number;
  z: number;
  powerDbm?: number;
}
