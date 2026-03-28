import {
  BaseScene, Button, Label, ProgressBar, Slider, Toggle, Toast,
  StateMachine, ConsoleReporter,
} from 'clik-engine';

/**
 * KitchenSink scene — exercises all engine UI and system components.
 * Used for visual verification during engine development.
 */
export class KitchenSink extends BaseScene {
  private hp = 0.75;
  private hpBar!: ProgressBar;
  private fsm!: StateMachine<KitchenSink>;

  constructor() {
    super({ key: 'kitchen-sink' });
  }

  create(): void {
    super.create();
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#0a0a1a');

    // Title
    new Label(this, { x: width / 2, y: 30, text: 'Kitchen Sink', fontSize: '28px', color: '#00ff88' });

    // --- UI Components Column ---
    const col1 = 160;

    new Label(this, { x: col1, y: 80, text: 'UI Components', fontSize: '14px', color: '#888888' });

    new Button(this, {
      x: col1, y: 120, text: 'Click Me', width: 140,
      onClick: () => Toast.show(this, { message: 'Button clicked!', duration: 1500 }),
    });

    this.hpBar = new ProgressBar(this, { x: col1 - 60, y: 160, width: 120, height: 12 });
    this.hpBar.setValue(this.hp);
    new Label(this, { x: col1 + 75, y: 160, text: 'HP', fontSize: '11px', color: '#666' });

    new Slider(this, {
      x: col1 - 60, y: 200, width: 120,
      value: this.hp,
      onChange: (v) => { this.hp = v; this.hpBar.setValue(v); },
    });

    new Toggle(this, { x: col1 - 25, y: 240, label: 'Sound', value: true });
    new Toggle(this, { x: col1 - 25, y: 275, label: 'Debug', value: true });

    // --- FSM Column ---
    const col2 = width / 2;
    new Label(this, { x: col2, y: 80, text: 'State Machine', fontSize: '14px', color: '#888888' });

    this.fsm = new StateMachine<KitchenSink>(this, 'demo-fsm')
      .addState('idle', {
        enter: () => ConsoleReporter.state('FSM entered: idle'),
      })
      .addState('active', {
        enter: () => ConsoleReporter.state('FSM entered: active'),
      })
      .addState('paused', {
        enter: () => ConsoleReporter.state('FSM entered: paused'),
      })
      .start('idle');

    new Button(this, {
      x: col2, y: 130, text: 'Go Active', width: 130,
      onClick: () => this.fsm.transitionTo('active'),
    });
    new Button(this, {
      x: col2, y: 175, text: 'Go Paused', width: 130,
      onClick: () => this.fsm.transitionTo('paused'),
    });
    new Button(this, {
      x: col2, y: 220, text: 'Go Idle', width: 130,
      onClick: () => this.fsm.transitionTo('idle'),
    });

    // --- Navigation ---
    const col3 = width - 160;
    new Label(this, { x: col3, y: 80, text: 'Navigation', fontSize: '14px', color: '#888888' });

    new Button(this, {
      x: col3, y: 120, text: 'Back to Sandbox', width: 150,
      onClick: () => this.director.go('kitchen-sink', 'sandbox'),
    });

    new Button(this, {
      x: col3, y: 165, text: 'Show Toast', width: 150,
      onClick: () => Toast.show(this, { message: 'Hello from KitchenSink!', position: 'top' }),
    });

    // State inspection
    this.inspectState('kitchen-sink', () => ({
      hp: this.hp,
      fsm: this.fsm.getCurrent() ?? 'none',
    }));

    ConsoleReporter.scene('KitchenSink ready');
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    this.fsm.update(delta);
  }
}
