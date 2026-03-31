# UI Components

All UI is Phaser-native (rendered on canvas, no DOM). Every component is configurable via a typed config object.

## Theme System

```typescript
import { setTheme, DarkTheme, LightTheme, RetroTheme, NeonTheme } from 'clik-engine';

setTheme(NeonTheme); // All components use neon colors
```

Components that support theming use `getTheme()` for default colors and fonts.

## Component Reference

### Interactive

| Component | Key Features |
|-----------|-------------|
| **Button** | Click handler, hover/press states, rounded corners, icon support |
| **SpriteButton** | Texture-based button with frame states |
| **Toggle** | On/off switch with onChange callback |
| **Slider** | Draggable value selector (min/max range) |
| **Checkbox** | Toggle with label, themed colors |
| **RadioGroup** | Mutual exclusion, vertical/horizontal layout |
| **Dropdown** | Select from options, keyboard nav, click-outside close |
| **TextInput** | Keyboard input, cursor blink, placeholder, submit |
| **NumberInput** | +/- buttons with min/max clamping |

### Layout

| Component | Key Features |
|-----------|-------------|
| **Panel** | Background rectangle with addItem layout |
| **NineSlicePanel** | Sprite-based panel with 9-slice scaling |
| **ScrollContainer** | Scrollable content area with momentum |
| **GridLayout** | Arrange items in rows/columns |
| **TabBar** | Tabbed content switching |
| **ListView** | Scrollable list with item templates |

### Display

| Component | Key Features |
|-----------|-------------|
| **Label** | Styled text with color/font config |
| **ProgressBar** | Fill bar with percentage text |
| **SpriteProgressBar** | Texture-based progress bar |
| **Tooltip** | Hover-triggered info popup |
| **Notification** | Timed message with icon |
| **LayeredTile** | 5-layer depth rendering (shadow, glow, bg, highlight, shape) |
| **DepthRenderer** | Panel/grid backgrounds with shadows and glows |

### Feedback

| Component | Key Features |
|-----------|-------------|
| **Toast** | Static single-notification popup |
| **ToastManager** | Queued notifications with max visible, auto-dismiss |
| **Dialog** | Modal dialog with title, message, buttons |
| **ConfirmDialog** | Yes/No dialog returning Promise |
| **ModalStack** | Z-ordered modal management, ESC to close |
| **ComboDisplay** | Combo counter with glow effect |
| **ScorePopup** | Floating score text that fades |
| **AnimatedHUD** | Rolling number counters with flash |

### Animation

| Component | Key Features |
|-----------|-------------|
| **UIAnimator** | fadeIn/Out, slide, scale, bounce animations. Respects reduced motion. |
| **FocusManager** | Tab-key focus cycling for accessible navigation |
| **Anchor** | Pin to screen position with auto-reposition on resize |

## Example: Complete Form

```typescript
import {
  Button, TextInput, Dropdown, Checkbox, RadioGroup,
  Slider, Toggle, ToastManager, ModalStack,
} from 'clik-engine';

// In scene create():
const nameInput = new TextInput(this, { x: 200, y: 100, placeholder: 'Enter name' });

const difficulty = new Dropdown(this, {
  x: 200, y: 150,
  options: [
    { label: 'Easy', value: 'easy' },
    { label: 'Normal', value: 'normal' },
    { label: 'Hard', value: 'hard' },
  ],
  selected: 'normal',
});

const soundEnabled = new Toggle(this, { x: 200, y: 200, value: true });
const volume = new Slider(this, { x: 200, y: 250, value: 0.8 });

const toasts = new ToastManager(this, { maxVisible: 3, position: 'bottom' });
toasts.show({ message: 'Settings loaded!' });
```
