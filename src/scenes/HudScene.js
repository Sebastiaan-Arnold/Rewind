// The VCR on-screen display, drawn on top of the game.
// It's a separate scene so it stays crisp: the VHS filter only applies to
// the game scene's camera, just like a real VCR's overlay sits on top of a
// worn tape. It also draws the mouse crosshair.
//
// Note: no health bar on purpose. Damage shows up as tape glitches.
import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../config.js';
import { params } from '../utils/params.js';

const FONT = { fontFamily: '"Courier New", monospace', fontSize: '10px', color: '#e8e8e8' };

export default class HudScene extends Phaser.Scene {
  constructor() {
    super('Hud');
  }

  create() {
    const shadow = (t) => t.setShadow(1, 1, '#000000', 0, false, true);
    this.play = shadow(this.add.text(10, 8, 'PLAY >', FONT));
    this.counter = shadow(this.add.text(10, VIEW_H - 18, '0:00:00', FONT));
    shadow(this.add.text(VIEW_W - 24, 8, 'SP', FONT));
    this.message = shadow(this.add.text(VIEW_W / 2, VIEW_H / 2 - 30, '', { ...FONT, fontSize: '16px' }).setOrigin(0.5));
    this.debug = params.has('debug') ? shadow(this.add.text(VIEW_W - 10, VIEW_H - 18, '', FONT).setOrigin(1, 0)) : null;
    this.crosshair = this.add.image(0, 0, 'crosshair').setDepth(100);
  }

  resetRun() {
    this.message.setText('');
  }

  showMessage(text) {
    this.message.setText(text);
  }

  update(time) {
    const game = this.scene.get('Game');
    const pointer = this.input.activePointer;
    this.crosshair.setPosition(Math.round(pointer.x), Math.round(pointer.y));

    if (!game || !game.player) return;
    // Tape counter, like a VCR: hours:minutes:seconds since the run started.
    const s = Math.max(0, Math.floor((time - game.runStartedAt) / 1000));
    const pad = (n) => String(n).padStart(2, '0');
    this.counter.setText(`${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`);
    this.play.setVisible(game.player.dead || Math.floor(time / 600) % 4 !== 0);

    if (this.debug) {
      const room = game.floor.roomAt(game.player.x, game.player.y);
      this.debug.setText(`seed ${game.seed}  hits ${game.player.hits}  ${room ? room.template.label : 'corridor'}`);
    }
  }
}
