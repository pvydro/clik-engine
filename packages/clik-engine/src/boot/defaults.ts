import Phaser from 'phaser';
import type { ScalePresetType } from '../utils/types';

interface ScaleConfig {
  width: number;
  height: number;
  mode: Phaser.Scale.ScaleModeType;
  autoCenter: Phaser.Scale.CenterType;
}

const PRESETS: Record<ScalePresetType, ScaleConfig> = {
  'mobile-portrait': {
    width: 720,
    height: 1280,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  'mobile-landscape': {
    width: 1280,
    height: 720,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  desktop: {
    width: 1280,
    height: 800,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  auto: {
    width: 1280,
    height: 720,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

export function getScaleConfig(preset: ScalePresetType): ScaleConfig {
  return PRESETS[preset];
}

export const ScalePreset = {
  MOBILE_PORTRAIT: 'mobile-portrait' as ScalePresetType,
  MOBILE_LANDSCAPE: 'mobile-landscape' as ScalePresetType,
  DESKTOP: 'desktop' as ScalePresetType,
  AUTO: 'auto' as ScalePresetType,
};
