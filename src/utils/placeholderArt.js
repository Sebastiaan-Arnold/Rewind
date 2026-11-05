/**
 * Generates placeholder sprite textures at boot.
 * All sprites face right (angle 0) and are rotated at runtime.
 */

function draw(scene, key, size, paint) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  paint(g);
  g.generateTexture(key, size, size);
  g.destroy();
}

export function makePlaceholderTextures(scene) {
  draw(scene, 'player', 16, (g) => {
    g.fillStyle(0x9aa0a6).fillRect(9, 9, 7, 2); // crowbar
    g.fillStyle(0x6b5a32).fillCircle(8, 8, 6);
    g.fillStyle(0xd9c27a).fillCircle(8, 8, 5);
    g.fillStyle(0x3a2f1c).fillRect(10, 6, 2, 4); // facing indicator
  });

  draw(scene, 'zombie', 16, (g) => {
    g.fillStyle(0x2f3f27).fillCircle(8, 8, 7);
    g.fillStyle(0x5f7d4f).fillCircle(8, 8, 6);
    g.fillStyle(0xd8e08a).fillRect(11, 5, 2, 2).fillRect(11, 9, 2, 2);
  });

  draw(scene, 'crosshair', 9, (g) => {
    g.fillStyle(0x000000).fillRect(3, 0, 3, 9).fillRect(0, 3, 9, 3);
    g.fillStyle(0xf2f2f2).fillRect(4, 1, 1, 7).fillRect(1, 4, 7, 1);
    g.fillStyle(0x000000).fillRect(4, 4, 1, 1);
  });
}
