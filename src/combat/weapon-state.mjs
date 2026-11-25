export class WeaponStateMachine {
  constructor(definitions, reserveDefaults, capacityFor, swapDuration = .22) {
    this.definitions = definitions;
    this.reserveDefaults = { ...reserveDefaults };
    this.capacityFor = capacityFor;
    this.swapDuration = swapDuration;
    this.currentWeapon = Object.keys(definitions)[0];
    this.magazines = {};
    this.reserves = {};
    this.mode = 'ready';
    this.timer = 0;
    this.pendingWeapon = null;
    this.lastFireAt = -Infinity;
    this.reset();
  }

  tryFire(nowMs, fireRateMultiplier = 1) {
    if (this.mode !== 'ready') return { ok: false, reason: this.mode };
    const id = this.currentWeapon;
    const definition = this.definitions[id];
    if (this.magazines[id] <= 0) return { ok: false, reason: 'empty', canReload: this.reserves[id] > 0 };
    const delayMs = definition.rate / Math.max(.1, Number(fireRateMultiplier) || 1);
    if (nowMs - this.lastFireAt < delayMs) return { ok: false, reason: 'cadence' };
    this.magazines[id]--;
    this.lastFireAt = nowMs;
    this.mode = 'firing';
    this.timer = delayMs / 1000;
    return { ok: true, weapon: id, definition };
  }

  beginReload(reloadSpeed = 1) {
    if (this.mode === 'reloading' || this.mode === 'swapping') return false;
    const id = this.currentWeapon;
    if (this.magazines[id] >= this.capacityFor(id) || this.reserves[id] <= 0) return false;
    this.mode = 'reloading';
    this.timer = this.definitions[id].reload / 1000 / Math.max(.1, Number(reloadSpeed) || 1);
    return true;
  }

  requestSwitch(id) {
    if (!this.definitions[id] || id === this.currentWeapon || this.mode === 'swapping') return false;
    this.mode = 'swapping';
    this.timer = this.swapDuration;
    this.pendingWeapon = id;
    return true;
  }

  update(deltaSeconds) {
    if (this.mode === 'ready') return null;
    this.timer = Math.max(0, this.timer - Math.max(0, Number(deltaSeconds) || 0));
    if (this.timer > 0) return null;

    if (this.mode === 'firing') {
      this.mode = 'ready';
      return { type: 'ready', weapon: this.currentWeapon };
    }
    if (this.mode === 'reloading') {
      const id = this.currentWeapon;
      const needed = Math.max(0, this.capacityFor(id) - this.magazines[id]);
      const loaded = Math.min(needed, this.reserves[id]);
      this.magazines[id] += loaded;
      this.reserves[id] -= loaded;
      this.mode = 'ready';
      return { type: 'reloaded', weapon: id, loaded, reserve: this.reserves[id] };
    }
    if (this.mode === 'swapping') {
      const previous = this.currentWeapon;
      this.currentWeapon = this.pendingWeapon;
      this.pendingWeapon = null;
      this.mode = 'ready';
      return { type: 'swapped', previous, current: this.currentWeapon };
    }
    this.mode = 'ready';
    return null;
  }

  refillMagazines() {
    for (const id of Object.keys(this.definitions)) this.magazines[id] = this.capacityFor(id);
  }

  reset() {
    this.currentWeapon = Object.keys(this.definitions)[0];
    for (const id of Object.keys(this.definitions)) {
      this.magazines[id] = this.capacityFor(id);
      this.reserves[id] = this.reserveDefaults[id] ?? 0;
    }
    this.mode = 'ready';
    this.timer = 0;
    this.pendingWeapon = null;
    this.lastFireAt = -Infinity;
  }
}
