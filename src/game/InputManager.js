// Unified keyboard + touch input. Touch buttons carry data-key (held) or data-act (one-shot).
export class InputManager {
  constructor(canvas) {
    this.state = { left: false, right: false, gas: false, brake: false, handbrake: false, reverse: false };
    this.look = { yaw: 0, pitch: 0, active: false };
    this.handlers = {};
    this.buttons = {};

    document.querySelectorAll('[data-key]').forEach((el) => {
      const key = el.dataset.key; this.buttons[key] = el;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault(); el.setPointerCapture(e.pointerId);
        if (key === 'reverse') this.setKey('reverse', !this.state.reverse);
        else this.setKey(key, true);
      });
      if (key !== 'reverse') {
        const up = (e) => { e.preventDefault(); this.setKey(key, false); };
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        el.addEventListener('lostpointercapture', up);
      }
    });
    document.querySelectorAll('[data-act]').forEach((el) =>
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); this.emit(el.dataset.act); }));

    const map = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'gas', KeyW: 'gas',
      ArrowDown: 'brake', ShiftLeft: 'brake', ShiftRight: 'brake', Space: 'handbrake' };
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (map[e.code]) { this.setKey(map[e.code], true); e.preventDefault(); }
      else if (e.code === 'KeyC') this.emit('camera');
      else if (e.code === 'KeyR') this.setKey('reverse', !this.state.reverse);
      else if (e.code === 'KeyT') this.emit('reset');
    });
    addEventListener('keyup', (e) => { if (map[e.code]) this.setKey(map[e.code], false); });
    addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.releaseAll(); });

    // block scrolling / context menu / pinch
    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('gesturestart', (e) => e.preventDefault());

    // drag on the 3D view = look around
    let id = null, lx = 0, ly = 0;
    canvas.addEventListener('pointerdown', (e) => { id = e.pointerId; lx = e.clientX; ly = e.clientY; this.look.active = true; canvas.setPointerCapture(id); });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      this.look.yaw = Math.max(-1.8, Math.min(1.8, this.look.yaw - (e.clientX - lx) * 0.005));
      this.look.pitch = Math.max(-0.5, Math.min(0.5, this.look.pitch - (e.clientY - ly) * 0.004));
      lx = e.clientX; ly = e.clientY;
    });
    const end = (e) => { if (e.pointerId === id) { id = null; this.look.active = false; } };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  }

  setKey(k, v) {
    this.state[k] = v;
    const b = this.buttons[k]; if (b) b.classList.toggle('on', v);
  }
  releaseAll() { for (const k of Object.keys(this.state)) if (k !== 'reverse') this.setKey(k, false); }
  on(act, fn) { this.handlers[act] = fn; }
  emit(act) { if (this.handlers[act]) this.handlers[act](); }
}
