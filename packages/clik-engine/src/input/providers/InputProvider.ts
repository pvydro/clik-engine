/**
 * Common interface for input providers.
 * Each provider handles one input source (keyboard, touch, gamepad).
 */
export interface InputProvider {
  /** Poll the provider and update action states */
  update(): void;
  /** Check if an action is currently down via this provider */
  isActionDown(action: string): boolean;
  /** Check if provider detected a one-shot gesture for this action (e.g. swipe) */
  consumeAction(action: string): boolean;
  /** Clean up all listeners */
  destroy(): void;
}
