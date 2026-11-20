import * as THREE from 'three';

// Phase 1 world: one long main road (Z axis) + one cross road (X axis at z = CROSS_Z).
// Everything is built from InstancedMesh batches to keep draw calls low.
// Extend later by adding "sections" that push meshes + colliders the same way.
export const CROSS_Z = 150;
const ROAD_W = 9;

function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function noiseTexture(r, g, b, spread, repX, repY) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), img = x.createImageData(128, 128), rand = rng(7);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * spread;
    img.data[i] = r + n; img.data[i + 1] = g + n; img.data[i + 2] = b + n; img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repX, repY);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.bounds = { x: 290, z: 580 };
    this.rand = rng(1234);
    this.buildGround();
    this.buildRoads();
    this.buildBuildings();
    this.buildTrees();
  }

  plane(w, l, mat, x, y, z, rotY = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l).rotateX(-Math.PI / 2), mat);
    m.position.set(x, y, z); m.rotation.y = rotY; this.scene.add(m); return m;
  }

  buildGround() {
    const mat = new THREE.MeshLambertMaterial({ map: noiseTexture(86, 130, 60, 30, 180, 180) });
    this.plane(1600, 1600, mat, 0, 0, 0);
  }

  buildRoads() {
    const asphalt = (rx, ry) => new THREE.MeshLambertMaterial({ map: noiseTexture(58, 58, 62, 22, rx, ry), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    this.plane(ROAD_W, 1200, asphalt(1, 150), 0, 0.06, 0);
    this.plane(600, ROAD_W, asphalt(75, 1), 0, 0.12, CROSS_Z);

    const white = new THREE.MeshBasicMaterial({ color: 0xeeeeee, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const yellow = new THREE.MeshBasicMaterial({ color: 0xf2c200, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const edge = ROAD_W / 2 - 0.4;
    // edge lines, split at the junction
    for (const s of [-1, 1]) {
      this.plane(0.15, 590 + CROSS_Z - 8, white, s * edge, 0.18, (-600 + CROSS_Z - 8) / 2);
      this.plane(0.15, 600 - CROSS_Z - 8, white, s * edge, 0.18, (CROSS_Z + 8 + 600) / 2);
    }
    for (const s of [-1, 1]) {
      this.plane(292 - 8, 0.15, white, (s * (300 + 8)) / 2, 0.18, CROSS_Z + edge);
      this.plane(292 - 8, 0.15, white, (s * (300 + 8)) / 2, 0.18, CROSS_Z - edge);
    }
    // dashed centre lines (instanced)
    const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.02, 3), yellow, 300);
    const m = new THREE.Matrix4(); let n = 0;
    for (let z = -590; z < 590; z += 9) {
      if (Math.abs(z - CROSS_Z) < 8) continue;
      dash.setMatrixAt(n++, m.makeTranslation(0, 0.18, z));
    }
    for (let x = -290; x < 290; x += 9) {
      if (Math.abs(x) < 8) continue;
      dash.setMatrixAt(n++, m.makeRotationY(Math.PI / 2).setPosition(x, 0.18, CROSS_Z));
    }
    dash.count = n; this.scene.add(dash);
  }

  addCollider(x, z, hw, hd) { this.colliders.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd }); }

  buildBuildings() {
    const R = this.rand, list = [];
    const place = (x, z, w, d, h) => { list.push({ x, z, w, d, h }); this.addCollider(x, z, w / 2, d / 2); };
    for (let z = -560; z < 560; z += 16 + R() * 14) {
      if (Math.abs(z - CROSS_Z) < 16) continue;
      for (const s of [-1, 1]) {
        if (R() < 0.25) continue;
        const w = 6 + R() * 6, d = 7 + R() * 5, h = 4 + R() * 5;
        place(s * (ROAD_W / 2 + 3 + w / 2 + R() * 4), z, w, d, h);
      }
    }
    // along the cross road
    for (let x = -280; x < 280; x += 18 + R() * 12) {
      if (Math.abs(x) < 16) continue;
      for (const s of [-1, 1]) {
        if (R() < 0.35) continue;
        const w = 7 + R() * 5, d = 6 + R() * 5, h = 4 + R() * 4;
        place(x, CROSS_Z + s * (ROAD_W / 2 + 3 + d / 2 + R() * 3), w, d, h);
      }
    }
    this.buildingList = list;

    const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), list.length);
    const roofs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0x8a8f94 }), list.length);
    const pal = [0xe8d9a8, 0xd9a066, 0x9bc4a0, 0xcf7a6a, 0xa8c0d8, 0xefe6d0, 0xd8c35a];
    const m = new THREE.Matrix4(), col = new THREE.Color(), pos = new THREE.Vector3(), sc = new THREE.Vector3(), q = new THREE.Quaternion();
    list.forEach((b, i) => {
      m.compose(pos.set(b.x, 0, b.z), q, sc.set(b.w, b.h, b.d)); walls.setMatrixAt(i, m);
      walls.setColorAt(i, col.setHex(pal[Math.floor(R() * pal.length)]));
      m.compose(pos.set(b.x, b.h, b.z), q, sc.set(b.w + 0.6, 0.25, b.d + 0.6)); roofs.setMatrixAt(i, m);
    });
    this.scene.add(walls, roofs);
  }

  buildTrees() {
    const R = this.rand, pts = [];
    const nearBuilding = (x, z) => this.buildingList.some((b) => Math.abs(x - b.x) < b.w / 2 + 2 && Math.abs(z - b.z) < b.d / 2 + 2);
    const ok = (x, z) => Math.abs(x) > 7 && Math.abs(z - CROSS_Z) > 7 && !nearBuilding(x, z);
    for (let i = 0; i < 700 && pts.length < 380; i++) {
      let x, z;
      if (i % 4 === 0) { x = (R() - 0.5) * 560; z = CROSS_Z + (R() - 0.5) * 120; }
      else { x = (R() - 0.5) * 160; z = (R() - 0.5) * 1160; }
      if (ok(x, z)) pts.push([x, z, 0.8 + R() * 0.7]);
    }
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.3, 3, 6).translate(0, 1.5, 0), new THREE.MeshLambertMaterial({ color: 0x5b4030 }), pts.length);
    const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2, 0).translate(0, 4.2, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), pts.length);
    const m = new THREE.Matrix4(), col = new THREE.Color(), pos = new THREE.Vector3(), sc = new THREE.Vector3(), q = new THREE.Quaternion();
    pts.forEach(([x, z, s], i) => {
      m.compose(pos.set(x, 0, z), q, sc.set(s, s, s));
      trunks.setMatrixAt(i, m); crowns.setMatrixAt(i, m);
      crowns.setColorAt(i, col.setHSL(0.27 + R() * 0.06, 0.5, 0.22 + R() * 0.12));
      this.addCollider(x, z, 0.35 * s, 0.35 * s);
    });
    this.scene.add(trunks, crowns);
  }
}
