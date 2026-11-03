// A damped spring solved in closed form, so any frame length gives the exact
// state and a retarget keeps position and velocity continuous.

export interface Spring {
  period: number;
  damping: number;
  mass: number;
}

export type State = readonly [position: number, velocity: number];

export function springAt(
  spring: Spring,
  offset: number,
  velocity: number,
  t: number,
): State {
  const omega = (2 * Math.PI) / spring.period;
  const zeta = spring.damping;

  if (zeta < 1) {
    const wd = omega * Math.sqrt(1 - zeta * zeta);
    const a = offset;
    const b = (velocity + zeta * omega * offset) / wd;
    const decay = Math.exp(-zeta * omega * t);
    const cos = Math.cos(wd * t);
    const sin = Math.sin(wd * t);
    return [
      decay * (a * cos + b * sin),
      decay *
        ((b * wd - zeta * omega * a) * cos - (a * wd + zeta * omega * b) * sin),
    ];
  }

  if (zeta === 1) {
    const a = offset;
    const b = velocity + omega * offset;
    const decay = Math.exp(-omega * t);
    return [decay * (a + b * t), decay * (b - omega * (a + b * t))];
  }

  const root = omega * Math.sqrt(zeta * zeta - 1);
  const r1 = -zeta * omega + root;
  const r2 = -zeta * omega - root;
  const c2 = (velocity - r1 * offset) / (r2 - r1);
  const c1 = offset - c2;
  const e1 = Math.exp(r1 * t);
  const e2 = Math.exp(r2 * t);
  return [c1 * e1 + c2 * e2, r1 * c1 * e1 + r2 * c2 * e2];
}

// The same spring for libraries that take stiffness and damping (motion's
// layout animations): ω = 2π / period, k = m·ω², c = 2·ζ·m·ω.
export function springForce({ period, damping, mass }: Spring) {
  const omega = (2 * Math.PI) / period;
  return {
    type: "spring",
    stiffness: mass * omega ** 2,
    damping: 2 * damping * mass * omega,
    mass,
  } as const;
}
