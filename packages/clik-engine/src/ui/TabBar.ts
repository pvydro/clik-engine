import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface TabConfig {
  key: string;
  label: string;
}

export interface TabBarConfig {
  x: number;
  y: number;
  tabs: TabConfig[];
  tabWidth?: number;
  tabHeight?: number;
  activeColor?: number;
  inactiveColor?: number;
  textColor?: string;
  activeTextColor?: string;
  onChange?: (tabKey: string) => void;
}

export class TabBar extends Phaser.GameObjects.Container {
  private tabs: { key: string; bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text }[] = [];
  private activeTab: string;
  private tabBarConfig: TabBarConfig;

  constructor(scene: Phaser.Scene, config: TabBarConfig) {
    super(scene, config.x, config.y);
    this.tabBarConfig = config;
    this.activeTab = config.tabs[0]?.key ?? '';

    const w = config.tabWidth ?? 100;
    const h = config.tabHeight ?? 36;
    const activeColor = config.activeColor ?? 0x00ff88;
    const inactiveColor = config.inactiveColor ?? 0x333333;

    config.tabs.forEach((tab, i) => {
      const x = i * w;
      const bg = scene.add.rectangle(x + w / 2, h / 2, w - 2, h, i === 0 ? activeColor : inactiveColor)
        .setInteractive({ useHandCursor: true });

      const text = scene.add.text(x + w / 2, h / 2, tab.label, {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: i === 0 ? (config.activeTextColor ?? '#000000') : (config.textColor ?? '#cccccc'),
      }).setOrigin(0.5);

      bg.on('pointerup', () => this.setActiveTab(tab.key));

      this.add([bg, text]);
      this.tabs.push({ key: tab.key, bg, text });
    });

    scene.add.existing(this);
  }

  setActiveTab(key: string): void {
    if (this.activeTab === key) return;
    this.activeTab = key;

    const activeColor = this.tabBarConfig.activeColor ?? 0x00ff88;
    const inactiveColor = this.tabBarConfig.inactiveColor ?? 0x333333;

    for (const tab of this.tabs) {
      const isActive = tab.key === key;
      tab.bg.setFillStyle(isActive ? activeColor : inactiveColor);
      tab.text.setColor(isActive ? (this.tabBarConfig.activeTextColor ?? '#000000') : (this.tabBarConfig.textColor ?? '#cccccc'));
    }

    this.tabBarConfig.onChange?.(key);
    ConsoleReporter.input(`tab: ${key}`);
  }

  getActive(): string {
    return this.activeTab;
  }
}
