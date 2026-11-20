import * as THREE from 'three';

// Placeholder procedural bus. Front faces +Z. Replace by loading a GLB and
// keeping the same public members: root, body, wheels[], frontWheels[], brakeLights, headLights.
function destinationBoard() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 40;
  const g = c.getContext('2d');
  g.fillStyle = '#111'; g.fillRect(0, 0, 256, 40);
  g.fillStyle = '#ffb000'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('ঢাকা ⇄ চট্টগ্রাম', 128, 22);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t });
}

export class Bus {
  constructor() {
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);

    const L = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
    const green = L(0x1f7a3d), red = L(0xc8102e), cream = L(0xf1ead2), dark = L(0x222222), grey = L(0x555555);
    const glass = L(0x88aacc, { transparent: true, opacity: 0.28, depthWrite: false });
    const add = (geo, mat, x, y, z, parent = this.body) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m;
    };
    const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);

    add(B(2.5, 0.9, 10.5), green, 0, 1.05, 0);              // lower body
    add(B(2.52, 0.2, 10.52), red, 0, 1.0, 0);               // stripe
    add(B(2.5, 0.3, 10.5), cream, 0, 3.35, 0);              // roof
    add(B(2.5, 1.7, 0.1), green, 0, 2.35, -5.2);            // rear wall
    for (const z of [-2.6, 0, 2.6, 4.95]) for (const s of [-1, 1]) add(B(0.1, 1.7, 0.18), cream, s * 1.22, 2.35, z);
    for (const s of [-1, 1]) add(B(0.1, 1.7, 0.12), cream, s * 1.2, 2.35, 5.2);
    for (const s of [-1, 1]) add(B(0.02, 1.5, 10.2), glass, s * 1.24, 2.35, 0);   // side glass
    add(B(2.4, 1.5, 0.02), glass, 0, 2.35, 5.22);                                  // windshield
    add(B(2.6, 0.3, 0.3), dark, 0, 0.7, 5.35);                                     // bumper
    add(B(2.6, 0.3, 0.3), dark, 0, 0.7, -5.35);
    for (const s of [-1, 1]) add(B(0.1, 0.4, 0.25), dark, s * 1.55, 2.5, 4.8);     // mirrors

    // driver area (driver sits on the right = -X; Bangladesh drives on the left)
    add(B(2.3, 0.5, 0.7), grey, 0, 1.75, 4.7);
    const wheelMesh = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 8, 16), dark);
    wheelMesh.position.set(-0.7, 1.95, 4.15); wheelMesh.rotation.x = -1.0; this.body.add(wheelMesh);

    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.26), destinationBoard());
    board.position.set(0, 3.35, 5.26); this.body.add(board);

    // lights
    this.headLights = L(0xffffee, { emissive: 0x555544 });
    this.brakeLights = L(0x550000, { emissive: 0x330000 });
    for (const s of [-1, 1]) {
      add(B(0.35, 0.2, 0.06), this.headLights, s * 0.85, 1.0, 5.28);
      add(B(0.3, 0.2, 0.06), this.brakeLights, s * 0.9, 1.0, -5.28);
    }

    // wheels (root-level so they don't roll with the body)
    this.wheels = []; this.frontWheels = [];
    const tyre = new THREE.CylinderGeometry(0.5, 0.5, 0.32, 16).rotateZ(Math.PI / 2);
    const tyreMat = L(0x151515), hubMat = L(0xbbbbbb);
    for (const [x, z, front] of [[1.28, 3.6, true], [-1.28, 3.6, true], [1.28, -3.4, false], [-1.28, -3.4, false]]) {
      const pivot = new THREE.Group(); pivot.position.set(x, 0.5, z);
      const spin = new THREE.Mesh(tyre, tyreMat);
      add(B(0.34, 0.12, 0.12), hubMat, 0, 0.32, 0, spin);   // marker so rotation is visible
      pivot.add(spin); this.root.add(pivot);
      this.wheels.push(spin); if (front) this.frontWheels.push(pivot);
    }

    // cheap blob shadow
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(3, 11), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.2; sh.renderOrder = 2; this.root.add(sh);
  }

  sync(p) {
    this.root.position.set(p.x, 0, p.z);
    this.root.rotation.y = p.heading;
    this.body.rotation.set(p.pitch, 0, p.roll);
    for (const w of this.wheels) w.rotation.x = p.wheelSpin;
    for (const f of this.frontWheels) f.rotation.y = -p.steer;
    this.brakeLights.emissive.setHex(p.braking ? 0xff1111 : 0x330000);
  }
}
