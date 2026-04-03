export type PatternType =
  | 'radial'
  | 'aimed'
  | 'spiral'
  | 'ring'
  | 'shotgun'
  | 'stream'
  | 'random-spread';

export interface PatternConfig {
  type: PatternType;
  count?: number;
  angleSpread?: number;
  baseAngle?: number;
  rotationRate?: number;
  fireRateMs?: number;
}

export interface BulletConfig {
  speed?: number;
  damage?: number;
  lifetime?: number;
}
