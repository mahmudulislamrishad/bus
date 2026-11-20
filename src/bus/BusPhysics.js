// Pure physics (no Three.js). Units: metres, seconds, radians.
// Convention: heading 0 faces +Z; positive heading turns LEFT; steer > 0 = right.

const WHEELBASE = 5.5;
const GEAR_ACC = [0, 2.6, 1.9, 1.4, 1.0, 0.8];      // m/s^2 at full throttle, index = gear
const UP_SHIFT = [0, 4.0, 8.5, 13.0, 16.5];          // m/s: gear n -> n+1
const V_MAX = 26;                                    // ~94 km/h governor
const MAX_LAT_ACC = 4.0;                             // grip limit (m/s^2)

export class BusPhysics {
  constructor() { this.reset(); }

  reset(x = 2.5, z = -450, heading = 0) {
    this.x = x; this.z = z; this.heading = heading;
    this.speed = 0;          // signed, m/s along heading
    this.steer = 0;          // current road-wheel angle
    this.thr = 0; this.brk = 0;
    this.gear = 1; this.shiftTimer = 0;
    this.rpm = 0.15;         // 0..1
    this.pitch = 0; this.pitchV = 0; this.roll = 0; this.rollV = 0;
    this.longAcc = 0; this.latAcc = 0;
    this.braking = false;
    this.wheelSpin = 0;
  }

  get kmh() { return Math.abs(this.speed) * 3.6; }

  update(dt, inp) {
    const v0 = this.speed;
    let v = v0;
    const reverse = inp.reverse;

    // smoothed pedals (no instant response)
    this.thr += ((inp.gas ? 1 : 0) - this.thr) * Math.min(1, dt * 3);
    this.brk += ((inp.brake ? 1 : 0) - this.brk) * Math.min(1, dt * 6);

    // automatic gearbox with shift lockout
    if (!reverse) {
      const a = Math.abs(v);
      if (this.shiftTimer <= 0) {
        if (this.gear < 5 && a > UP_SHIFT[this.gear]) { this.gear++; this.shiftTimer = 0.45; }
        else if (this.gear > 1 && a < UP_SHIFT[this.gear - 1] * 0.8) { this.gear--; this.shiftTimer = 0.3; }
      }
    } else this.gear = 1;
    this.shiftTimer = Math.max(0, this.shiftTimer - dt);

    // drive
    let drive = 0;
    if (this.thr > 0.01 && this.shiftTimer <= 0) {
      if (!reverse) {
        drive = GEAR_ACC[this.gear] * this.thr * Math.max(0, 1 - (v / V_MAX) ** 2);
      } else if (v > 0.3) {
        drive = -3 * this.thr;                        // can't engage reverse while rolling forward: acts as brake
      } else {
        drive = -1.3 * this.thr * Math.max(0, 1 - Math.abs(v) / 6);
      }
    }
    v += drive * dt;

    // resistance: rolling + drag + engine braking + brakes
    let res = 0.12 + 0.0009 * v * v;
    if (this.thr < 0.05) res += 0.25;
    res += 5 * this.brk + (inp.handbrake ? 4.5 : 0);
    const dv = res * dt;
    if (Math.abs(v) <= dv) v = 0; else v -= Math.sign(v) * dv;
    this.speed = v;
    this.braking = this.brk > 0.1 || inp.handbrake;

    // steering: speed-dependent lock, gradual rate
    const a = Math.abs(v);
    const maxSteer = 0.62 / (1 + 0.09 * a);
    const target = ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * maxSteer;
    const rate = target === 0 ? 1.8 : 0.9;
    const d = target - this.steer;
    this.steer += Math.sign(d) * Math.min(Math.abs(d), rate * dt);
    if (Math.abs(this.steer) > maxSteer) this.steer = Math.sign(this.steer) * maxSteer;

    // bicycle model + grip limit (understeer at speed)
    let yaw = -(v / WHEELBASE) * Math.tan(this.steer);
    if (a > 1) {
      const lim = MAX_LAT_ACC / a;
      yaw = Math.max(-lim, Math.min(lim, yaw));
    }
    this.heading += yaw * dt;
    this.x += Math.sin(this.heading) * v * dt;
    this.z += Math.cos(this.heading) * v * dt;
    this.wheelSpin += v * dt / 0.5;

    // body motion: spring-damper pitch/roll from accelerations
    const accel = dt > 0 ? (v - v0) / dt : 0;
    this.longAcc += (accel - this.longAcc) * Math.min(1, dt * 5);
    this.latAcc += (v * yaw - this.latAcc) * Math.min(1, dt * 5);
    const pT = -this.longAcc * 0.006, rT = this.latAcc * 0.012;
    this.pitchV += (30 * (pT - this.pitch) - 5 * this.pitchV) * dt; this.pitch += this.pitchV * dt;
    this.rollV += (30 * (rT - this.roll) - 5 * this.rollV) * dt; this.roll += this.rollV * dt;

    // RPM (normalised): rises through each gear, revs with throttle when slow
    const lo = this.gear > 1 ? UP_SHIFT[this.gear - 1] * 0.8 : 0;
    const hi = this.gear < 5 ? UP_SHIFT[this.gear] : V_MAX;
    const base = 0.25 + 0.6 * Math.min(1, Math.max(0, (a - lo) / (hi - lo)));
    const rpmT = Math.max(base, 0.15 + 0.5 * this.thr * (a < 1 ? 1 : 0.4));
    this.rpm += (rpmT - this.rpm) * Math.min(1, dt * 6);
  }

  // Bus approximated by 3 circles; colliders are AABBs {minX,maxX,minZ,maxZ}.
  collide(colliders, bounds) {
    const R = 1.4, OFF = [3.6, 0, -3.6];
    for (let pass = 0; pass < 2; pass++) {
      const sx = Math.sin(this.heading), cz0 = Math.cos(this.heading);
      for (const off of OFF) {
        let cx = this.x + sx * off, cz = this.z + cz0 * off;
        for (const c of colliders) {
          if (cx < c.minX - R || cx > c.maxX + R || cz < c.minZ - R || cz > c.maxZ + R) continue;
          const px = Math.max(c.minX, Math.min(cx, c.maxX));
          const pz = Math.max(c.minZ, Math.min(cz, c.maxZ));
          let dx = cx - px, dz = cz - pz;
          const d2 = dx * dx + dz * dz;
          if (d2 >= R * R) continue;
          let d = Math.sqrt(d2);
          if (d < 1e-4) { dx = 1; dz = 0; d = 0; } else { dx /= d; dz /= d; }
          const push = R - d;
          this.x += dx * push; this.z += dz * push; cx += dx * push; cz += dz * push;
          if (this.speed * (sx * dx + cz0 * dz) < 0) this.speed *= 0.7;
        }
      }
    }
    if (Math.abs(this.x) > bounds.x) { this.x = Math.sign(this.x) * bounds.x; this.speed *= 0.7; }
    if (Math.abs(this.z) > bounds.z) { this.z = Math.sign(this.z) * bounds.z; this.speed *= 0.7; }
  }
}
