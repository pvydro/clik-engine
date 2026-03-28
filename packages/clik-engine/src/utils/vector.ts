export interface Vec2 {
  x: number;
  y: number;
}

export const Vector2 = {
  create(x = 0, y = 0): Vec2 {
    return { x, y };
  },

  add(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x + b.x, y: a.y + b.y };
  },

  sub(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x - b.x, y: a.y - b.y };
  },

  scale(v: Vec2, s: number): Vec2 {
    return { x: v.x * s, y: v.y * s };
  },

  length(v: Vec2): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  },

  lengthSq(v: Vec2): number {
    return v.x * v.x + v.y * v.y;
  },

  normalize(v: Vec2): Vec2 {
    const len = Vector2.length(v);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  },

  distance(a: Vec2, b: Vec2): number {
    return Vector2.length(Vector2.sub(a, b));
  },

  distanceSq(a: Vec2, b: Vec2): number {
    return Vector2.lengthSq(Vector2.sub(a, b));
  },

  dot(a: Vec2, b: Vec2): number {
    return a.x * b.x + a.y * b.y;
  },

  angle(v: Vec2): number {
    return Math.atan2(v.y, v.x);
  },

  angleBetween(a: Vec2, b: Vec2): number {
    return Math.atan2(b.y - a.y, b.x - a.x);
  },

  rotate(v: Vec2, radians: number): Vec2 {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
  },

  lerp(a: Vec2, b: Vec2, t: number): Vec2 {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  },

  fromAngle(radians: number, length = 1): Vec2 {
    return { x: Math.cos(radians) * length, y: Math.sin(radians) * length };
  },

  zero(): Vec2 {
    return { x: 0, y: 0 };
  },

  equals(a: Vec2, b: Vec2, epsilon = 0.001): boolean {
    return Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon;
  },
};
