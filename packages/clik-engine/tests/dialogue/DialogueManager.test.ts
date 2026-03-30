import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), scene: vi.fn(), state: vi.fn(), audio: vi.fn(), save: vi.fn(), asset: vi.fn(), log: vi.fn() },
}));

vi.mock('../../src/utils/validation', () => ({
  validatePositiveNumber: vi.fn(() => true),
  validateNonNegativeNumber: vi.fn(() => true),
}));

import { ConsoleReporter } from '../../src/debug/ConsoleReporter';
import { DialogueManager, type DialogueTree, type DialogueDisplayConfig } from '../../src/dialogue/DialogueManager';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeText() {
  return {
    setText: vi.fn().mockReturnThis(),
    setColor: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    off: vi.fn(),
    destroy: vi.fn(),
    text: '',
  };
}

function makeContainer() {
  const children: unknown[] = [];
  return {
    add: vi.fn((item: unknown) => { children.push(item); }),
    destroy: vi.fn(),
    setDepth: vi.fn().mockReturnThis(),
    list: children,
  };
}

function makeRectangle() {
  return {
    setOrigin: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };
}

function makeTimerEvent() {
  return {
    destroy: vi.fn(),
    remove: vi.fn(),
    elapsed: 0,
  };
}

function makeScene() {
  let timerCallback: (() => void) | null = null;
  let timerEvent = makeTimerEvent();

  return {
    add: {
      container: vi.fn(() => makeContainer()),
      rectangle: vi.fn(() => makeRectangle()),
      text: vi.fn(() => makeText()),
    },
    time: {
      addEvent: vi.fn((config: { callback: () => void }) => {
        timerCallback = config.callback;
        timerEvent = makeTimerEvent();
        return timerEvent;
      }),
    },
    _tickTypewriter() {
      if (timerCallback) timerCallback();
    },
    _timerEvent: timerEvent,
  } as unknown as Phaser.Scene & { _tickTypewriter: () => void };
}

const defaultConfig: DialogueDisplayConfig = {
  x: 0,
  y: 400,
  width: 800,
  height: 150,
  typewriterSpeed: 30,
};

const sampleTree: DialogueTree = {
  start: {
    speaker: 'Alice',
    text: 'Hello there!',
    next: 'reply',
  },
  reply: {
    speaker: 'Bob',
    text: 'Hi Alice, how are you?',
    next: 'end',
  },
  end: {
    speaker: 'Alice',
    text: 'Goodbye!',
  },
};

const choiceTree: DialogueTree = {
  start: {
    speaker: 'NPC',
    text: 'Choose your path:',
    choices: [
      { text: 'Go left', next: 'left' },
      { text: 'Go right', next: 'right' },
    ],
  },
  left: {
    speaker: 'NPC',
    text: 'You went left!',
  },
  right: {
    speaker: 'NPC',
    text: 'You went right!',
  },
};

describe('DialogueManager', () => {
  let scene: Phaser.Scene & { _tickTypewriter: () => void };
  let dm: DialogueManager;

  beforeEach(() => {
    vi.clearAllMocks();
    scene = makeScene() as Phaser.Scene & { _tickTypewriter: () => void };
    dm = new DialogueManager(scene, defaultConfig);
  });

  // ── constructor ─────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('creates a manager that starts inactive', () => {
      expect(dm.isActive()).toBe(false);
      expect(dm.getCurrentNodeId()).toBeNull();
    });

    it('accepts config with optional fields', () => {
      const cfg: DialogueDisplayConfig = { x: 10, y: 20, width: 600 };
      const mgr = new DialogueManager(scene, cfg);
      expect(mgr.isActive()).toBe(false);
    });
  });

  // ── load() ──────────────────────────────────────────────────────────────

  describe('load()', () => {
    it('returns this for chaining', () => {
      expect(dm.load(sampleTree)).toBe(dm);
    });
  });

  // ── start() and navigation ─────────────────────────────────────────────

  describe('start()', () => {
    it('activates dialogue and sets current node', () => {
      dm.load(sampleTree);
      dm.start('start');
      expect(dm.isActive()).toBe(true);
      expect(dm.getCurrentNodeId()).toBe('start');
    });

    it('creates container, background, speaker text, and body text', () => {
      dm.load(sampleTree);
      dm.start('start');
      expect(scene.add.container).toHaveBeenCalled();
      expect(scene.add.rectangle).toHaveBeenCalled();
      // Speaker text + body text = at least 2 text calls
      expect(scene.add.text).toHaveBeenCalled();
    });

    it('logs error and closes when node does not exist', () => {
      dm.load(sampleTree);
      dm.start('nonexistent');
      expect(ConsoleReporter.error).toHaveBeenCalledWith(expect.stringContaining('nonexistent'));
      expect(dm.isActive()).toBe(false);
    });

    it('calls onComplete callback when dialogue ends', () => {
      const onComplete = vi.fn();
      dm.load({ solo: { speaker: 'A', text: 'Hi' } });
      // Use instant typewriter for simpler test
      dm = new DialogueManager(scene, { ...defaultConfig, typewriterSpeed: 0 });
      dm.load({ solo: { speaker: 'A', text: 'Hi' } });
      dm.start('solo', onComplete);

      // Node has no next, so advance should close
      dm.advance();
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  // ── advance() ───────────────────────────────────────────────────────────

  describe('advance()', () => {
    it('completes typewriter text when still typing', () => {
      dm.load(sampleTree);
      dm.start('start');
      // Typewriter is in progress; advance should complete it
      dm.advance();
      // After skipping, isActive should still be true (still on the same node)
      expect(dm.isActive()).toBe(true);
      expect(dm.getCurrentNodeId()).toBe('start');
    });

    it('moves to next node when typewriter is done', () => {
      dm = new DialogueManager(scene, { ...defaultConfig, typewriterSpeed: 0 });
      dm.load(sampleTree);
      dm.start('start');
      expect(dm.getCurrentNodeId()).toBe('start');

      dm.advance();
      expect(dm.getCurrentNodeId()).toBe('reply');

      dm.advance();
      expect(dm.getCurrentNodeId()).toBe('end');
    });

    it('closes dialogue when no next node is defined', () => {
      dm = new DialogueManager(scene, { ...defaultConfig, typewriterSpeed: 0 });
      dm.load(sampleTree);
      dm.start('end');

      dm.advance();
      expect(dm.isActive()).toBe(false);
    });

    it('does nothing when no current node', () => {
      dm.load(sampleTree);
      // Not started, advance should be safe
      dm.advance();
      expect(dm.isActive()).toBe(false);
    });
  });

  // ── choices ─────────────────────────────────────────────────────────────

  describe('choice handling', () => {
    it('creates interactive choice texts for nodes with choices', () => {
      dm = new DialogueManager(scene, { ...defaultConfig, typewriterSpeed: 0 });
      dm.load(choiceTree);
      dm.start('start');

      // Choices should produce additional text objects
      // container + rectangle + speaker + body + 2 choices = multiple add.text calls
      const textCalls = (scene.add.text as ReturnType<typeof vi.fn>).mock.calls;
      // At least the choice texts should appear with the ">" prefix
      const choiceCallTexts = textCalls.filter(
        (call: unknown[]) => typeof call[2] === 'string' && (call[2] as string).startsWith('>')
      );
      expect(choiceCallTexts.length).toBe(2);
    });

    it('does not advance past choice nodes with advance()', () => {
      dm = new DialogueManager(scene, { ...defaultConfig, typewriterSpeed: 0 });
      dm.load(choiceTree);
      dm.start('start');

      dm.advance();
      // Should stay on the same node since it has choices
      expect(dm.getCurrentNodeId()).toBe('start');
    });
  });

  // ── typewriter ──────────────────────────────────────────────────────────

  describe('typewriter mechanics', () => {
    it('starts a timer when typewriterSpeed > 0', () => {
      dm.load(sampleTree);
      dm.start('start');
      expect(scene.time.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({ delay: 30, loop: true })
      );
    });

    it('shows text instantly when typewriterSpeed is 0', () => {
      dm = new DialogueManager(scene, { ...defaultConfig, typewriterSpeed: 0 });
      dm.load(sampleTree);
      dm.start('start');
      // With speed 0, no timer should be used — text set directly
      const textResults = (scene.add.text as ReturnType<typeof vi.fn>).mock.results;
      // Body text is the last text created (after speaker text)
      const bodyText = textResults[textResults.length - 1].value;
      expect(bodyText.setText).toHaveBeenCalledWith('Hello there!');
    });

    it('reveals characters one at a time on each tick', () => {
      dm.load(sampleTree);
      dm.start('start');

      // Find the body text mock (second text created — first is speaker)
      const textResults = (scene.add.text as ReturnType<typeof vi.fn>).mock.results;
      const bodyText = textResults[textResults.length - 1].value;

      scene._tickTypewriter();
      expect(bodyText.setText).toHaveBeenCalledWith('H');

      scene._tickTypewriter();
      expect(bodyText.setText).toHaveBeenCalledWith('He');
    });
  });

  // ── close() ─────────────────────────────────────────────────────────────

  describe('close()', () => {
    it('deactivates dialogue and clears current node', () => {
      dm = new DialogueManager(scene, { ...defaultConfig, typewriterSpeed: 0 });
      dm.load(sampleTree);
      dm.start('start');
      dm.close();
      expect(dm.isActive()).toBe(false);
      expect(dm.getCurrentNodeId()).toBeNull();
    });

    it('fires onComplete callback', () => {
      const onComplete = vi.fn();
      dm = new DialogueManager(scene, { ...defaultConfig, typewriterSpeed: 0 });
      dm.load(sampleTree);
      dm.start('start', onComplete);
      dm.close();
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('logs state when closing', () => {
      dm = new DialogueManager(scene, { ...defaultConfig, typewriterSpeed: 0 });
      dm.load(sampleTree);
      dm.start('start');
      dm.close();
      expect(ConsoleReporter.state).toHaveBeenCalledWith('dialogue: closed');
    });
  });

  // ── destroy() ───────────────────────────────────────────────────────────

  describe('destroy()', () => {
    it('cleans up all resources and resets state', () => {
      dm = new DialogueManager(scene, { ...defaultConfig, typewriterSpeed: 0 });
      dm.load(sampleTree);
      dm.start('start');
      dm.destroy();
      expect(dm.isActive()).toBe(false);
      expect(dm.getCurrentNodeId()).toBeNull();
    });

    it('is safe to call without loading or starting', () => {
      expect(() => dm.destroy()).not.toThrow();
    });

    it('clears the loaded tree so re-start fails', () => {
      dm = new DialogueManager(scene, { ...defaultConfig, typewriterSpeed: 0 });
      dm.load(sampleTree);
      dm.destroy();
      dm.start('start');
      expect(ConsoleReporter.error).toHaveBeenCalledWith(expect.stringContaining('start'));
      expect(dm.isActive()).toBe(false);
    });
  });
});
