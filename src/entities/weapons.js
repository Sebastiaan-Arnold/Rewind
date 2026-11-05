/**
 * Weapon actions. Each weapon is a function invoked by the player.
 * Flashlight and pistol will be added here alongside the inventory system.
 */
import Phaser from 'phaser';
import { CROWBAR } from '../config.js';

export function swingCrowbar(scene, player) {
  const half = Phaser.Math.DegToRad(CROWBAR.arcDegrees / 2);
  const aim = player.aimAngle;

  // Swing arc visual.
  const g = scene.add.graphics().setDepth(11);
  g.fillStyle(0xe8e0c8, 0.5);
  g.slice(player.x, player.y, CROWBAR.range, aim - half, aim + half, false);
  g.fillPath();
  scene.tweens.add({ targets: g, alpha: 0, duration: 110, onComplete: () => g.destroy() });

  // Hit test: within range, inside the arc, and with line of sight.
  let landed = false;
  for (const enemy of scene.enemies.getChildren()) {
    if (enemy.dead) continue;
    const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
    if (dist > CROWBAR.range + enemy.hitRadius) continue;
    const angleTo = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
    if (Math.abs(Phaser.Math.Angle.Wrap(angleTo - aim)) > half) continue;
    if (!scene.floor.hasLineOfSight(player.x, player.y, enemy.x, enemy.y)) continue;
    enemy.takeHit(angleTo, CROWBAR.damage, CROWBAR.knockback);
    landed = true;
  }

  if (landed) {
    scene.hitstop();
    scene.cameras.main.shake(70, 0.003);
  }
}
