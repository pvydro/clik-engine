import Phaser from 'phaser';
import type { PositionLike } from '../utils/interfaces';

export interface TooltipConfig {
  /** Body text (or the only text if no `title`). */
  text: string;
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  backgroundColor?: number;
  padding?: number;
  offsetY?: number;
  /** Hover delay in ms before the tooltip appears (default `300`). */
  delay?: number;

  // ── Extended fields ───────────────────────────────────────

  /** Optional bold title rendered above the body text. */
  title?: string;
  titleColor?: string;
  titleFontSize?: string;
  /** Optional icon texture key rendered to the left of the title. */
  icon?: string;
  /** Max width before the body text word-wraps (default unlimited). */
  maxWidth?: number;
  /**
   * Texture key for a 9-slice sprite background.  When provided the
   * colored-rectangle fallback is skipped.
   */
  texture?: string;
  /** 9-slice insets for the texture background. */
  nineSlice?: { left: number; right: number; top: number; bottom: number };
}

/**
 * Shows a tooltip when hovering over a game object.
 *
 * Supports plain text (original behaviour) **and** rich tooltips with a
 * title line, icon, word-wrap, and 9-slice sprite background.
 */
export class Tooltip {
  /**
   * Attach a tooltip to a game object.  Shows on hover after `delay` ms.
   */
  static attach(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    config: TooltipConfig,
  ): void {
    let tip: Phaser.GameObjects.Container | null = null;
    let delayTimer: Phaser.Time.TimerEvent | null = null;

    target.on('pointerover', (_pointer: Phaser.Input.Pointer) => {
      delayTimer = scene.time.delayedCall(config.delay ?? 300, () => {
        if (tip) return;

        const pad = config.padding ?? 6;
        const children: Phaser.GameObjects.GameObject[] = [];
        let contentHeight = 0;
        let contentWidth = 0;
        const maxW = config.maxWidth ?? 0;

        // ── Title ───────────────────────────────────────────
        let titleText: Phaser.GameObjects.Text | undefined;
        if (config.title) {
          titleText = scene.add.text(0, 0, config.title, {
            fontSize: config.titleFontSize ?? '14px',
            fontFamily: config.fontFamily ?? 'monospace',
            fontStyle: 'bold',
            color: config.titleColor ?? '#ffffff',
          }).setOrigin(0.5, 0);

          contentHeight += titleText.height + 4;
          contentWidth = Math.max(contentWidth, titleText.width);
          children.push(titleText);
        }

        // ── Icon (beside title) ─────────────────────────────
        let iconImg: Phaser.GameObjects.Image | undefined;
        if (config.icon && titleText) {
          iconImg = scene.add.image(0, 0, config.icon)
            .setDisplaySize(
              titleText.height,
              titleText.height,
            );
          children.push(iconImg);
        }

        // ── Body ────────────────────────────────────────────
        const bodyStyle: Phaser.Types.GameObjects.Text.TextStyle = {
          fontSize: config.fontSize ?? '12px',
          fontFamily: config.fontFamily ?? 'monospace',
          color: config.color ?? '#ffffff',
        };
        if (maxW > 0) {
          bodyStyle.wordWrap = { width: maxW, useAdvancedWrap: true };
        }

        // When there's no sprite background, fall back to the old
        // backgroundColor-on-text approach for the body.
        if (!config.texture && !config.title) {
          bodyStyle.padding = { x: pad, y: pad };
          bodyStyle.backgroundColor = config.backgroundColor
            ? `#${config.backgroundColor.toString(16).padStart(6, '0')}`
            : '#222222ee';
        }

        const bodyText = scene.add.text(0, contentHeight, config.text, bodyStyle)
          .setOrigin(0.5, 0);

        contentHeight += bodyText.height;
        contentWidth = Math.max(contentWidth, bodyText.width);
        children.push(bodyText);

        // ── Background sprite ───────────────────────────────
        const totalW = contentWidth + pad * 2;
        const totalH = contentHeight + pad * 2;

        if (config.texture) {
          let bg: Phaser.GameObjects.NineSlice | Phaser.GameObjects.Image;
          if (config.nineSlice) {
            const ns = config.nineSlice;
            bg = scene.add.nineslice(
              0, totalH / 2,
              config.texture, undefined,
              totalW, totalH,
              ns.left, ns.right, ns.top, ns.bottom,
            ).setOrigin(0.5);
          } else {
            bg = scene.add.image(0, totalH / 2, config.texture)
              .setDisplaySize(totalW, totalH)
              .setOrigin(0.5);
          }
          children.unshift(bg); // behind text
        } else if (config.title) {
          // If we have a title but no sprite bg, draw a simple rect.
          const bg = scene.add.rectangle(0, totalH / 2, totalW, totalH,
            config.backgroundColor ?? 0x222222, 0.93)
            .setOrigin(0.5);
          children.unshift(bg);
        }

        // ── Position children relative to container ─────────
        // Re-center body and title now that we know totalW/totalH
        if (titleText) {
          const titleY = pad;
          titleText.setPosition(0, titleY);

          if (iconImg) {
            const iconSize = titleText.height;
            iconImg.setPosition(
              -(titleText.width / 2) - iconSize / 2 - 4,
              titleY + titleText.height / 2,
            );
          }
        }
        bodyText.setPosition(0, config.title ? (titleText!.height + 4 + pad) : pad);

        // ── Container ───────────────────────────────────────
        const targetObj = target as unknown as PositionLike;
        const offsetY = config.offsetY ?? -20;

        tip = scene.add.container(
          targetObj.x,
          targetObj.y + offsetY - totalH,
          children,
        )
          .setDepth(9500)
          .setAlpha(0);

        scene.tweens.add({ targets: tip, alpha: 1, duration: 150 });
      });
    });

    const hideTooltip = () => {
      delayTimer?.destroy();
      delayTimer = null;
      if (tip) {
        const t = tip;
        scene.tweens.add({
          targets: t,
          alpha: 0,
          duration: 100,
          onComplete: () => { t.destroy(); },
        });
        tip = null;
      }
    };

    target.on('pointerout', hideTooltip);
    target.on('destroy', hideTooltip);
  }
}
