import Phaser from 'phaser';
import { ConsoleReporter } from './ConsoleReporter';

export interface InspectorConfig {
  width?: number;
  position?: 'left' | 'right';
  backgroundColor?: string;
  textColor?: string;
}

/**
 * DOM-based scene inspector panel. Shows hierarchy of game objects,
 * allows selecting and editing properties in real-time.
 * Only active in debug mode.
 */
export class SceneInspector {
  private game: Phaser.Game;
  private panel: HTMLDivElement | null = null;
  private hierarchyEl: HTMLDivElement | null = null;
  private propsEl: HTMLDivElement | null = null;
  private selectedObject: Phaser.GameObjects.GameObject | null = null;
  private config: Required<InspectorConfig>;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private visible = false;

  constructor(game: Phaser.Game, config?: InspectorConfig) {
    this.game = game;
    this.config = {
      width: config?.width ?? 280,
      position: config?.position ?? 'right',
      backgroundColor: config?.backgroundColor ?? '#1a1a2e',
      textColor: config?.textColor ?? '#e0e0e0',
    };
  }

  show(): void {
    if (this.panel) return;
    this.visible = true;
    this.createPanel();
    this.updateInterval = setInterval(() => this.refresh(), 200);
    ConsoleReporter.engine('Scene Inspector opened');
  }

  hide(): void {
    this.visible = false;
    this.panel?.remove();
    this.panel = null;
    this.hierarchyEl = null;
    this.propsEl = null;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    ConsoleReporter.engine('Scene Inspector closed');
  }

  toggle(): void {
    this.visible ? this.hide() : this.show();
  }

  isVisible(): boolean {
    return this.visible;
  }

  private createPanel(): void {
    this.panel = document.createElement('div');
    Object.assign(this.panel.style, {
      position: 'fixed',
      top: '0',
      [this.config.position]: '0',
      width: `${this.config.width}px`,
      height: '100vh',
      backgroundColor: this.config.backgroundColor,
      color: this.config.textColor,
      fontFamily: 'monospace',
      fontSize: '11px',
      overflowY: 'auto',
      zIndex: '10000',
      padding: '8px',
      boxSizing: 'border-box',
      borderLeft: this.config.position === 'right' ? '1px solid #333' : 'none',
      borderRight: this.config.position === 'left' ? '1px solid #333' : 'none',
    });

    // Title
    const title = document.createElement('div');
    title.textContent = 'Scene Inspector';
    Object.assign(title.style, {
      fontSize: '14px', fontWeight: 'bold', color: '#00ff88',
      marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #333',
    });
    this.panel.appendChild(title);

    // Hierarchy section
    const hierLabel = document.createElement('div');
    hierLabel.textContent = 'Hierarchy';
    Object.assign(hierLabel.style, { fontSize: '12px', color: '#888', marginBottom: '4px' });
    this.panel.appendChild(hierLabel);

    this.hierarchyEl = document.createElement('div');
    Object.assign(this.hierarchyEl.style, {
      maxHeight: '40vh', overflowY: 'auto', marginBottom: '8px',
      borderBottom: '1px solid #333', paddingBottom: '8px',
    });
    this.panel.appendChild(this.hierarchyEl);

    // Properties section
    const propsLabel = document.createElement('div');
    propsLabel.textContent = 'Properties';
    Object.assign(propsLabel.style, { fontSize: '12px', color: '#888', marginBottom: '4px' });
    this.panel.appendChild(propsLabel);

    this.propsEl = document.createElement('div');
    this.panel.appendChild(this.propsEl);

    document.body.appendChild(this.panel);
    this.refresh();
  }

  private refresh(): void {
    if (!this.hierarchyEl) return;
    this.refreshHierarchy();
    if (this.selectedObject) this.refreshProperties();
  }

  private refreshHierarchy(): void {
    if (!this.hierarchyEl) return;
    this.hierarchyEl.innerHTML = '';

    const scenes = this.game.scene.getScenes(true).filter(s => !s.scene.key.startsWith('__clik_'));

    for (const scene of scenes) {
      const sceneNode = document.createElement('div');
      sceneNode.textContent = `▸ ${scene.scene.key}`;
      Object.assign(sceneNode.style, { color: '#00ff88', cursor: 'pointer', padding: '2px 0' });
      this.hierarchyEl.appendChild(sceneNode);

      const children = scene.children?.list ?? [];
      for (const child of children) {
        const node = document.createElement('div');
        const name = (child as { name?: string }).name || child.type || 'GameObject';
        const isSelected = child === this.selectedObject;
        node.textContent = `  ${name}`;
        Object.assign(node.style, {
          cursor: 'pointer',
          padding: '1px 0',
          paddingLeft: '12px',
          backgroundColor: isSelected ? '#333355' : 'transparent',
          color: isSelected ? '#ffffff' : '#aaa',
        });
        node.addEventListener('click', () => {
          this.selectedObject = child;
          this.refresh();
        });
        this.hierarchyEl.appendChild(node);
      }
    }
  }

  private refreshProperties(): void {
    if (!this.propsEl || !this.selectedObject) return;
    this.propsEl.innerHTML = '';

    const obj = this.selectedObject as unknown as Record<string, unknown>;
    const props = ['x', 'y', 'scaleX', 'scaleY', 'angle', 'alpha', 'depth', 'visible', 'active'];

    for (const prop of props) {
      if (obj[prop] === undefined) continue;

      const row = document.createElement('div');
      Object.assign(row.style, { display: 'flex', alignItems: 'center', marginBottom: '3px' });

      const label = document.createElement('span');
      label.textContent = `${prop}: `;
      Object.assign(label.style, { color: '#888', width: '60px', flexShrink: '0' });

      const input = document.createElement('input');
      input.type = typeof obj[prop] === 'boolean' ? 'checkbox' : 'number';
      input.style.cssText = 'background: #222; color: #fff; border: 1px solid #444; padding: 2px 4px; width: 80px; font-family: monospace; font-size: 11px;';

      if (typeof obj[prop] === 'boolean') {
        (input as HTMLInputElement).checked = obj[prop] as boolean;
        input.addEventListener('change', () => {
          (obj as Record<string, unknown>)[prop] = (input as HTMLInputElement).checked;
        });
      } else {
        input.value = typeof obj[prop] === 'number' ? (obj[prop] as number).toFixed(1) : String(obj[prop]);
        input.step = prop === 'alpha' ? '0.1' : '1';
        input.addEventListener('change', () => {
          (obj as Record<string, unknown>)[prop] = parseFloat(input.value);
        });
      }

      row.appendChild(label);
      row.appendChild(input);
      this.propsEl.appendChild(row);
    }

    // Copy as code button
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy as Code';
    copyBtn.style.cssText = 'margin-top: 8px; padding: 4px 8px; background: #333; color: #00ff88; border: 1px solid #555; cursor: pointer; font-family: monospace; font-size: 11px;';
    copyBtn.addEventListener('click', () => {
      const code = this.generateCode();
      navigator.clipboard.writeText(code);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy as Code'; }, 1500);
    });
    this.propsEl.appendChild(copyBtn);
  }

  private generateCode(): string {
    if (!this.selectedObject) return '';
    const obj = this.selectedObject as { x?: number; y?: number; scaleX?: number; scaleY?: number; angle?: number; alpha?: number; type?: string };
    const lines = [`// ${obj.type ?? 'GameObject'}`];
    if (obj.x !== undefined) lines.push(`.setPosition(${obj.x.toFixed(0)}, ${obj.y?.toFixed(0) ?? 0})`);
    if (obj.scaleX !== undefined && obj.scaleX !== 1) lines.push(`.setScale(${obj.scaleX.toFixed(2)}, ${obj.scaleY?.toFixed(2) ?? obj.scaleX.toFixed(2)})`);
    if (obj.angle !== undefined && obj.angle !== 0) lines.push(`.setAngle(${obj.angle.toFixed(1)})`);
    if (obj.alpha !== undefined && obj.alpha !== 1) lines.push(`.setAlpha(${obj.alpha.toFixed(2)})`);
    return lines.join('\n');
  }

  getSelectedObject(): Phaser.GameObjects.GameObject | null {
    return this.selectedObject;
  }

  selectObject(obj: Phaser.GameObjects.GameObject): void {
    this.selectedObject = obj;
    if (this.visible) this.refresh();
  }

  destroy(): void {
    this.hide();
  }
}
