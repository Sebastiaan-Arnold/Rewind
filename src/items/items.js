/**
 * Item definitions. Only the item in hand is active.
 *
 *   pose      player body pose while held
 *   held      texture drawn in the player's hand
 *   grip      hand position relative to the player, facing right
 *   use       action on left mouse button
 */
import Phaser from 'phaser';
import { CROWBAR, FLASHLIGHT } from '../config.js';

export const ITEMS = {
  crowbar: {
    id: 'crowbar',
    name: 'CROWBAR',
    icon: 'icon-crowbar',
    held: 'held-crowbar',
    heldOrigin: [0.12, 0.6],
    grip: [4, 3],
    pose: 'melee',
    cooldownMs: CROWBAR.cooldownMs,
    use: swingCrowbar,
  },
  flashlight: {
    id: 'flashlight',
    name: 'FLASHLIGHT',
    icon: 'icon-flashlight',
    held: 'held-flashlight',
    heldOrigin: [0.1, 0.5],
    grip: [5, 0],
    pose: 'light',
    emitsLight: true,
    cooldownMs: FLASHLIGHT.toggleCooldownMs,
    use: toggleBeam,
  },
};

function swingCrowbar(scene, player, time) {
  const half = Phaser.Math.DegToRad(CROWBAR.arcDegrees / 2);
  const aim = player.aimAngle;
  player.startSwing(time, half);

  // Swing trail
  const trail = scene.add.graphics().setDepth(player.depth + 2);
  trail.lineStyle(2, 0xf2ead8, 0.55);
  trail.beginPath();
  trail.arc(player.x, player.y, CROWBAR.range - 5, aim - half, aim + half, false);
  trail.strokePath();
  scene.tweens.add({ targets: trail, alpha: 0, duration: 140, onComplete: () => trail.destroy() });

  let landed = false;
  for (const enemy of scene.enemies.getChildren()) {
    if (enemy.dead) continue;
    const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
    if (dist > CROWBAR.range + enemy.hitRadius) continue;
    const angleTo = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
    if (Math.abs(Phaser.Math.Angle.Wrap(angleTo - aim)) > half) continue;
    if (!scene.floor.hasLineOfSight(player.x, player.y, enemy.x, enemy.y)) continue;
    enemy.takeHit(angleTo, CROWBAR.damage, CROWBAR.knockback);
    scene.effects.impact(enemy.x - Math.cos(angleTo) * 5, enemy.y - Math.sin(angleTo) * 5, angleTo);
    landed = true;
  }

  if (landed) {
    scene.hitstop();
    scene.cameras.main.shake(80, 0.0035);
  }
}

/** Switches the beam on or off. A lit beam attracts zombies. */
function toggleBeam(scene, player) {
  player.beamEnabled = !player.beamEnabled;
}
