/** Common easing function names for use with Phaser tweens */
export const Ease = {
  // Linear
  Linear: 'Linear',

  // Quadratic
  QuadIn: 'Quad.easeIn',
  QuadOut: 'Quad.easeOut',
  QuadInOut: 'Quad.easeInOut',

  // Cubic
  CubicIn: 'Cubic.easeIn',
  CubicOut: 'Cubic.easeOut',
  CubicInOut: 'Cubic.easeInOut',

  // Quartic
  QuartIn: 'Quart.easeIn',
  QuartOut: 'Quart.easeOut',
  QuartInOut: 'Quart.easeInOut',

  // Sine
  SineIn: 'Sine.easeIn',
  SineOut: 'Sine.easeOut',
  SineInOut: 'Sine.easeInOut',

  // Exponential
  ExpoIn: 'Expo.easeIn',
  ExpoOut: 'Expo.easeOut',
  ExpoInOut: 'Expo.easeInOut',

  // Circular
  CircIn: 'Circ.easeIn',
  CircOut: 'Circ.easeOut',
  CircInOut: 'Circ.easeInOut',

  // Elastic
  ElasticIn: 'Elastic.easeIn',
  ElasticOut: 'Elastic.easeOut',
  ElasticInOut: 'Elastic.easeInOut',

  // Back
  BackIn: 'Back.easeIn',
  BackOut: 'Back.easeOut',
  BackInOut: 'Back.easeInOut',

  // Bounce
  BounceIn: 'Bounce.easeIn',
  BounceOut: 'Bounce.easeOut',
  BounceInOut: 'Bounce.easeInOut',
} as const;

export type EaseName = (typeof Ease)[keyof typeof Ease];
