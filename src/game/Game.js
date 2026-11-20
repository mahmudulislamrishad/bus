import * as THREE from 'three';
import { World } from '../environment/World.js';
import { Bus } from '../bus/Bus.js';
import { BusPhysics } from '../bus/BusPhysics.js';
import { InputManager } from './InputManager.js';
import { CameraManager } from './CameraManager.js';
import { HUD } from '../ui/HUD.js';

const MOBILE = /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent);

export class Game {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2));

    this.scene = new THREE.Scene();
    const sky = 0xbfd8e6;
    this.scene.background = new THREE.Color(sky);
    this.scene.fog = new THREE.Fog(sky, 90, 450);
    this.scene.add(new THREE.HemisphereLight(0xdfeeff, 0x587042, 1.0));
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.6); sun.position.set(-120, 200, 80); this.scene.add(sun);

    this.camera = new THREE.PerspectiveCamera(65, 1, 0.3, 700);
    this.world = new World(this.scene);
    this.bus = new Bus(); this.scene.add(this.bus.root);
    this.physics = new BusPhysics();
    this.input = new InputManager(canvas);
    this.hud = new HUD();
    this.cams = new CameraManager(this.camera, (n) => this.hud.toast(n));

    this.input.on('camera', () => this.cams.next());
    this.input.on('reset', () => { this.physics.reset(); this.input.setKey('reverse', false); });

    addEventListener('resize', () => this.resize());
    addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
    this.resize();
    this.tick(0);                                  // draw one frame behind the menu
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  start() {
    if (this.running) return;
    this.running = true; this.last = performance.now();
    const loop = (t) => { if (!this.running) return; this.tick((t - this.last) / 1000); this.last = t; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  tick(dt) {
    dt = Math.min(dt, 0.05);
    if (dt > 0) {
      const p = this.physics;
      p.update(dt, this.input.state);
      p.collide(this.world.colliders, this.world.bounds);
      this.hud.update(p, this.input.state.reverse);
    }
    this.bus.sync(this.physics);
    this.cams.update(this.bus, this.physics, this.input.look, dt);
    this.renderer.render(this.scene, this.camera);
  }
}
