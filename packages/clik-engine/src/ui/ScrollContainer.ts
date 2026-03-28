import Phaser from 'phaser';

export interface ScrollContainerConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor?: number;
  backgroundAlpha?: number;
  scrollSpeed?: number;
  momentum?: number;
}

export class ScrollContainer extends Phaser.GameObjects.Container {
  private mask!: Phaser.Display.Masks.GeometryMask;
  private content: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScrollY = 0;
  private isDragging = false;
  private dragStartY = 0;
  private dragScrollStart = 0;
  private velocity = 0;
  private containerConfig: ScrollContainerConfig;
  private bg: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, config: ScrollContainerConfig) {
    super(scene, config.x, config.y);
    this.containerConfig = config;

    this.bg = scene.add.rectangle(0, 0, config.width, config.height, config.backgroundColor ?? 0x111111, config.backgroundAlpha ?? 0.8)
      .setOrigin(0)
      .setInteractive();
    this.add(this.bg);

    this.content = scene.add.container(0, 0);
    this.add(this.content);

    // Create mask for clipping
    const maskShape = scene.make.graphics({});
    maskShape.fillRect(config.x, config.y, config.width, config.height);
    this.mask = maskShape.createGeometryMask();
    this.content.setMask(this.mask);

    // Drag to scroll
    this.bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.dragStartY = pointer.y;
      this.dragScrollStart = this.scrollY;
      this.velocity = 0;
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      const dy = pointer.y - this.dragStartY;
      this.setScroll(this.dragScrollStart - dy);
    });

    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.velocity = (this.dragStartY - pointer.y) * (config.momentum ?? 0.95);
    });

    // Mouse wheel
    this.bg.on('wheel', (_pointer: Phaser.Input.Pointer, _dx: number, dy: number) => {
      this.setScroll(this.scrollY + dy * (config.scrollSpeed ?? 1));
    });

    scene.add.existing(this);
  }

  addContent(child: Phaser.GameObjects.GameObject): this {
    this.content.add(child);
    this.recalculateMaxScroll();
    return this;
  }

  removeContent(child: Phaser.GameObjects.GameObject): this {
    this.content.remove(child);
    this.recalculateMaxScroll();
    return this;
  }

  clearContent(): this {
    this.content.removeAll(true);
    this.scrollY = 0;
    this.maxScrollY = 0;
    return this;
  }

  private setScroll(y: number): void {
    this.scrollY = Phaser.Math.Clamp(y, 0, this.maxScrollY);
    this.content.y = -this.scrollY;
  }

  private recalculateMaxScroll(): void {
    const bounds = this.content.getBounds();
    const contentHeight = bounds.height;
    this.maxScrollY = Math.max(0, contentHeight - this.containerConfig.height);
  }

  update(): void {
    // Apply momentum
    if (!this.isDragging && Math.abs(this.velocity) > 0.5) {
      this.setScroll(this.scrollY + this.velocity * 0.016);
      this.velocity *= this.containerConfig.momentum ?? 0.95;
    }
  }

  getScrollPosition(): number {
    return this.scrollY;
  }

  scrollTo(y: number): void {
    this.setScroll(y);
    this.velocity = 0;
  }

  scrollToTop(): void {
    this.scrollTo(0);
  }

  scrollToBottom(): void {
    this.scrollTo(this.maxScrollY);
  }
}
