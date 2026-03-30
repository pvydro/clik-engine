export interface Vec2 {
  x: number;
  y: number;
}

function length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function normalize(v: Vec2): Vec2 {
  const len = length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function truncate(v: Vec2, max: number): Vec2 {
  const len = length(v);
  if (len <= max) return v;
  return scale(normalize(v), max);
}

function distanceSq(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Individual steering behavior functions.
 * Each returns a force vector to apply to an entity.
 */
export const Steering = {
  /** Seek: steer toward target at max speed */
  seek(position: Vec2, target: Vec2, velocity: Vec2, maxSpeed: number): Vec2 {
    const desired = scale(normalize(sub(target, position)), maxSpeed);
    return sub(desired, velocity);
  },

  /** Flee: steer away from target at max speed */
  flee(position: Vec2, target: Vec2, velocity: Vec2, maxSpeed: number): Vec2 {
    const desired = scale(normalize(sub(position, target)), maxSpeed);
    return sub(desired, velocity);
  },

  /** Arrive: seek with deceleration near target */
  arrive(position: Vec2, target: Vec2, velocity: Vec2, maxSpeed: number, slowRadius = 100): Vec2 {
    const toTarget = sub(target, position);
    const dist = length(toTarget);
    if (dist < 1) return scale(velocity, -1); // Stop

    const speed = dist < slowRadius ? maxSpeed * (dist / slowRadius) : maxSpeed;
    const desired = scale(normalize(toTarget), speed);
    return sub(desired, velocity);
  },

  /** Pursue: predict target's future position and seek it */
  pursue(
    position: Vec2, target: Vec2, targetVelocity: Vec2,
    velocity: Vec2, maxSpeed: number
  ): Vec2 {
    const dist = length(sub(target, position));
    const lookAhead = dist / maxSpeed;
    const futurePos = add(target, scale(targetVelocity, lookAhead));
    return Steering.seek(position, futurePos, velocity, maxSpeed);
  },

  /** Evade: predict target's future position and flee from it */
  evade(
    position: Vec2, target: Vec2, targetVelocity: Vec2,
    velocity: Vec2, maxSpeed: number
  ): Vec2 {
    const dist = length(sub(target, position));
    const lookAhead = dist / maxSpeed;
    const futurePos = add(target, scale(targetVelocity, lookAhead));
    return Steering.flee(position, futurePos, velocity, maxSpeed);
  },

  /** Wander: gentle random steering */
  wander(velocity: Vec2, wanderDistance = 50, wanderRadius = 25, wanderAngle = 0): { force: Vec2; angle: number } {
    const newAngle = wanderAngle + (Math.random() - 0.5) * 0.5;
    const circleCenter = length(velocity) > 0
      ? scale(normalize(velocity), wanderDistance)
      : { x: wanderDistance, y: 0 };
    const displacement = {
      x: Math.cos(newAngle) * wanderRadius,
      y: Math.sin(newAngle) * wanderRadius,
    };
    return { force: add(circleCenter, displacement), angle: newAngle };
  },

  /** Obstacle avoidance: steer away from nearest obstacle */
  obstacleAvoidance(
    position: Vec2, velocity: Vec2,
    obstacles: { x: number; y: number; radius: number }[],
    detectionRange = 100
  ): Vec2 {
    if (length(velocity) < 0.1) return { x: 0, y: 0 };

    const ahead = add(position, scale(normalize(velocity), detectionRange));
    let nearest: { x: number; y: number; radius: number } | null = null;
    let nearestDist = Infinity;

    for (const obs of obstacles) {
      const dist = length(sub(obs, position));
      if (dist < nearestDist && dist < detectionRange + obs.radius) {
        nearestDist = dist;
        nearest = obs;
      }
    }

    if (!nearest) return { x: 0, y: 0 };
    return scale(normalize(sub(ahead, nearest)), detectionRange / nearestDist);
  },

  /** Separation: steer away from neighbors that are too close */
  separation(position: Vec2, neighbors: Vec2[], desiredSeparation = 50): Vec2 {
    let force = { x: 0, y: 0 };
    let count = 0;

    for (const n of neighbors) {
      const d = Math.sqrt(distanceSq(position, n));
      if (d > 0 && d < desiredSeparation) {
        const diff = scale(normalize(sub(position, n)), 1 / d);
        force = add(force, diff);
        count++;
      }
    }

    return count > 0 ? scale(force, 1 / count) : force;
  },

  /** Alignment: steer toward average heading of neighbors */
  alignment(velocity: Vec2, neighborVelocities: Vec2[]): Vec2 {
    if (neighborVelocities.length === 0) return { x: 0, y: 0 };
    let avg = { x: 0, y: 0 };
    for (const v of neighborVelocities) {
      avg = add(avg, v);
    }
    avg = scale(avg, 1 / neighborVelocities.length);
    return sub(avg, velocity);
  },

  /** Cohesion: steer toward center of mass of neighbors */
  cohesion(position: Vec2, neighbors: Vec2[], velocity: Vec2, maxSpeed: number): Vec2 {
    if (neighbors.length === 0) return { x: 0, y: 0 };
    let center = { x: 0, y: 0 };
    for (const n of neighbors) {
      center = add(center, n);
    }
    center = scale(center, 1 / neighbors.length);
    return Steering.seek(position, center, velocity, maxSpeed);
  },
};

/**
 * Composable steering behavior calculator.
 * Add weighted behaviors and compute the combined steering force.
 */
export class SteeringCalculator {
  private forces: { force: Vec2; weight: number }[] = [];
  private maxForce: number;

  constructor(maxForce = 100) {
    this.maxForce = maxForce;
  }

  add(force: Vec2, weight = 1): this {
    this.forces.push({ force, weight });
    return this;
  }

  clear(): this {
    this.forces.length = 0;
    return this;
  }

  calculate(): Vec2 {
    let combined = { x: 0, y: 0 };
    for (const { force, weight } of this.forces) {
      combined = add(combined, scale(force, weight));
    }
    this.forces.length = 0;
    return truncate(combined, this.maxForce);
  }
}
