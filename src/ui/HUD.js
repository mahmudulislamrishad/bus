export class HUD {
  constructor() {
    this.spd = document.getElementById('spd');
    this.gear = document.getElementById('gear');
    this.rpm = document.getElementById('rpm');
    this.label = document.getElementById('camlabel');
    this._s = -1; this._g = ''; this._r = -1; this._t = 0;
  }
  update(p, reverse) {
    const s = Math.round(p.kmh);
    if (s !== this._s) { this._s = s; this.spd.textContent = s; }
    const g = reverse ? 'R' : (p.kmh < 1 && p.thr < 0.05 ? 'N' : String(p.gear));
    if (g !== this._g) { this._g = g; this.gear.textContent = g; }
    const r = Math.round(p.rpm * 100);
    if (r !== this._r) {
      this._r = r; this.rpm.style.width = r + '%';
      this.rpm.style.background = r > 85 ? '#ff453a' : r > 70 ? '#ffd60a' : '#4cd964';
    }
  }
  toast(text) {
    this.label.textContent = text + ' camera'; this.label.classList.add('show');
    clearTimeout(this._t); this._t = setTimeout(() => this.label.classList.remove('show'), 1200);
  }
}
