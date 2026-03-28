import Phaser from 'phaser';

export interface SceneEntry {
  key: string;
  class: new (config: string | Phaser.Types.Scenes.SettingsConfig) => Phaser.Scene;
  default?: boolean;
  assets?: AssetManifest;
}

export interface ActionBinding {
  keys?: string[];
  touch?: 'tap' | 'swipe_left' | 'swipe_right' | 'swipe_up' | 'swipe_down';
  gamepad?: string;
}

export interface InputConfig {
  actions: Record<string, ActionBinding>;
}

export interface SaveConfig {
  slots: number;
  version: number;
}

export interface AssetEntry {
  type: 'image' | 'atlas' | 'audio' | 'spritesheet' | 'json' | 'tilemapJSON';
  key: string;
  path: string | string[];
  atlasPath?: string;
  frameConfig?: Phaser.Types.Loader.FileTypes.ImageFrameConfig;
}

export interface AssetManifest {
  boot?: AssetEntry[];
  main?: AssetEntry[];
  deferred?: AssetEntry[];
}

export type ScalePresetType = 'mobile-portrait' | 'mobile-landscape' | 'desktop' | 'auto';

export type PhysicsType = 'arcade' | 'matter' | 'none';

export interface ClikGameConfig {
  name: string;
  parent?: string;
  width?: number;
  height?: number;
  scale?: ScalePresetType;
  physics?: PhysicsType;
  debug?: boolean;
  devStartScene?: string;
  scenes: SceneEntry[];
  input?: InputConfig;
  save?: SaveConfig;
  backgroundColor?: string;
}
