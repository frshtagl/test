import assert from 'node:assert/strict';
import { WeaponStateMachine } from '../src/combat/weapon-state.mjs';

const definitions = {
  rifle: { mag: 3, rate: 100, reload: 600 },
  shotgun: { mag: 2, rate: 500, reload: 900 }
};
const capacityFor = id => definitions[id].mag;
const machine = new WeaponStateMachine(definitions, { rifle: 9, shotgun: 4 }, capacityFor, .2);
assert.equal(machine.currentWeapon, 'rifle');
assert.equal(machine.magazines.rifle, 3);
assert.equal(machine.reserves.rifle, 9);

let shot = machine.tryFire(1000, 1);
assert.equal(shot.ok, true);
assert.equal(machine.magazines.rifle, 2);
assert.equal(machine.mode, 'firing');
assert.equal(machine.tryFire(1050, 1).reason, 'firing');
machine.update(.1);
assert.equal(machine.mode, 'ready');
assert.equal(machine.tryFire(1090, 1).reason, 'cadence');
shot = machine.tryFire(1100, 1);
assert.equal(shot.ok, true);

assert.equal(machine.beginReload(1), true);
assert.equal(machine.mode, 'reloading');
assert.equal(machine.beginReload(1), false);
machine.update(.3);
assert.equal(machine.magazines.rifle, 1, 'Ammo is not transferred before reload completes.');
const reload = machine.update(.31);
assert.equal(reload.type, 'reloaded');
assert.equal(reload.loaded, 2);
assert.equal(machine.magazines.rifle, 3);
assert.equal(machine.reserves.rifle, 7);

assert.equal(machine.requestSwitch('shotgun'), true);
assert.equal(machine.mode, 'swapping');
assert.equal(machine.requestSwitch('rifle'), false, 'A second switch cannot interrupt the swap animation.');
machine.update(.1);
assert.equal(machine.currentWeapon, 'rifle');
const swapped = machine.update(.11);
assert.equal(swapped.type, 'swapped');
assert.equal(machine.currentWeapon, 'shotgun');

machine.magazines.shotgun = 0;
shot = machine.tryFire(3000, 1);
assert.equal(shot.reason, 'empty');
assert.equal(shot.canReload, true);
assert.equal(machine.beginReload(1), true);
machine.update(1);
assert.equal(machine.magazines.shotgun, 2);
assert.equal(machine.reserves.shotgun, 2);

machine.magazines.rifle = 1;
machine.reserves.rifle = 0;
assert.equal(machine.requestSwitch('rifle'), true);
machine.update(.21);
assert.equal(machine.currentWeapon, 'rifle');
assert.equal(machine.magazines.rifle, 1, 'Weapon swap preserves partial magazines.');

machine.refillMagazines();
assert.equal(machine.magazines.rifle, 3);
assert.equal(machine.magazines.shotgun, 2);
machine.reset();
assert.equal(machine.currentWeapon, 'rifle');
assert.equal(machine.magazines.rifle, 3);
assert.equal(machine.reserves.rifle, 9);
assert.equal(machine.mode, 'ready');
console.log('ARENA ZERO weapon state-machine tests passed.');
