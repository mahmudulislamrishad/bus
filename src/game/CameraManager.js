import * as THREE from 'three';

const MODES = ['Cockpit', 'Front', 'Chase', 'Side'];
const FLIP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI); // camera looks -Z, bus faces +Z
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();

export class CameraManager {
  constructor(camera, onChange) {
    this.camera = camera; this.mode = 2; this.onChange = onChange;
    this.camHeading = 0; this.initialised = false;
  }
  get name() { return MODES[this.mode]; }
  next() { this.mode = (this.mode + 1) % MODES.length; this.initialised = false; this.onChange(this.name); }

  update(bus, p, look, dt) {
    const cam = this.camera;
    // free-look returns to centre when released
    if (!look.active) { const k = Math.min(1, dt * 3); look.yaw -= look.yaw * k; look.pitch -= look.pitch * k; }
    bus.root.updateMatrixWorld(true);
    let fov = 65;

    if (this.mode === 0 || this.mode === 1) {            // cockpit / front: rigidly attached to body (no jitter)
      const local = this.mode === 0 ? _v.set(-0.7, 2.45, 3.4) : _v.set(0, 1.3, 5.9);
      cam.position.copy(bus.body.localToWorld(local));
      bus.body.getWorldQuaternion(_q);
      cam.quaternion.copy(_q).multiply(FLIP);
      if (this.mode === 0) { _e.set(look.pitch, look.yaw, 0, 'YXZ'); cam.quaternion.multiply(_q.setFromEuler(_e)); }
      fov = this.mode === 0 ? 75 : 70;
    } else if (this.mode === 2) {                        // chase: heading is smoothed, position follows rigidly
      if (!this.initialised) { this.camHeading = p.heading; this.initialised = true; }
      let d = p.heading - this.camHeading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.camHeading += d * (1 - Math.exp(-dt * 3));
      const h = this.camHeading + look.yaw;
      const dist = 15, height = 5.5 - look.pitch * 6;
      cam.position.set(p.x - Math.sin(h) * dist, height, p.z - Math.cos(h) * dist);
      cam.lookAt(p.x + Math.sin(p.heading) * 6, 2.2, p.z + Math.cos(p.heading) * 6);
      fov = 60 + Math.min(12, p.kmh * 0.12);
    } else {                                             // side: attached to bus root
      cam.position.copy(bus.root.localToWorld(_v.set(10, 3, 1)));
      cam.lookAt(p.x, 1.8, p.z + Math.cos(p.heading) * 0.5);
      fov = 60;
    }
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = fov; cam.updateProjectionMatrix(); }
  }
}
