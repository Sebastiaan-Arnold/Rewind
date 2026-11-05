/**
 * Title screen styled as a VCR: on-screen menu above, the deck below.
 * Selecting PLAY inserts the tape and starts the first level.
 */
import Phaser from 'phaser';
import { VIEW_W, VIEW_H, LEVELS } from '../config.js';
import VhsEffect from '../fx/VhsFilter.js';

const OSD = { fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#e8e8e8' };
const LED = { fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#58f0ff' };
const VCR_Y = VIEW_H - 38;
const SLOT = { x: VIEW_W / 2 - 150 + 80, y: VCR_Y - 23 + 19 };

const CONTROLS = [
  'W A S D         MOVE',
  'MOUSE           AIM',
  'LEFT MOUSE      USE ITEM',
  '1 2 3 / WHEEL   SELECT ITEM',
  '',
  'FLASHLIGHT DRAWS THEM IN.',
  'DARKNESS KEEPS YOU HIDDEN.',
];

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.cameras.main.setBackgroundColor('#000000');
    this.vhs = new VhsEffect(this);
    this.vhs.setDamage(1);

    const shadow = (t) => t.setShadow(1, 1, '#000000', 0, false, true);

    // Title with chromatic ghosts
    const titleStyle = { fontFamily: '"Courier New", monospace', fontSize: '44px', fontStyle: 'bold', color: '#f2f2f2' };
    this.titleGhosts = [
      this.add.text(VIEW_W / 2, 62, 'REWIND', { ...titleStyle, color: '#ff3050' }).setOrigin(0.5).setAlpha(0.6),
      this.add.text(VIEW_W / 2, 62, 'REWIND', { ...titleStyle, color: '#30e0ff' }).setOrigin(0.5).setAlpha(0.6),
    ];
    this.titleText = this.add.text(VIEW_W / 2, 62, 'REWIND', titleStyle).setOrigin(0.5);
    shadow(this.add.text(VIEW_W / 2, 92, 'TAPE 01', { ...OSD, fontSize: '10px', color: '#9a9a9a' }).setOrigin(0.5));

    // Menu
    this.items = [
      { label: 'PLAY', action: () => this.insertTape() },
      { label: 'CONTROLS', action: () => this.toggleControls(true) },
    ];
    this.menuText = this.items.map((item, i) =>
      shadow(this.add.text(VIEW_W / 2 - 40, 126 + i * 18, item.label, OSD))
        .setInteractive({ useHandCursor: false })
        .on('pointerover', () => this.select(i))
        .on('pointerdown', () => this.choose()),
    );
    this.cursor = shadow(this.add.text(VIEW_W / 2 - 56, 126, '>', OSD));
    this.selected = 0;

    this.controls = this.add.container(0, 0).setVisible(false);
    this.controls.add(this.add.rectangle(VIEW_W / 2, 132, 250, 120, 0x000000, 0.8).setStrokeStyle(1, 0xe8e8e8, 0.5));
    CONTROLS.forEach((line, i) => this.controls.add(shadow(this.add.text(VIEW_W / 2 - 112, 82 + i * 13, line, { ...OSD, fontSize: '10px' }))));

    // Deck
    this.add.image(VIEW_W / 2, VCR_Y, 'vcr');
    this.led = this.add.text(VIEW_W / 2 - 150 + 211, VCR_Y - 4, '12:00', LED).setOrigin(0.5);
    shadow(this.add.text(VIEW_W / 2 - 150 + 22, VCR_Y + 6, 'REWIND  VHS', { ...OSD, fontSize: '7px', color: '#7a7c84' }));
    ['<<', '>', '[]', '>>', '^'].forEach((g, i) =>
      this.add.text(VIEW_W / 2 - 150 + 171 + i * 26, VCR_Y + 13, g, { ...OSD, fontSize: '7px', color: '#b0b2b8' }).setOrigin(0.5),
    );
    this.cassette = this.add.image(SLOT.x, SLOT.y - 40, 'cassette').setVisible(false);

    // Input
    const kb = this.input.keyboard;
    kb.on('keydown-UP', () => this.move(-1));
    kb.on('keydown-W', () => this.move(-1));
    kb.on('keydown-DOWN', () => this.move(1));
    kb.on('keydown-S', () => this.move(1));
    kb.on('keydown-ENTER', () => this.choose());
    kb.on('keydown-SPACE', () => this.choose());
    kb.on('keydown-ESC', () => this.toggleControls(false));
    this.input.on('pointerdown', () => this.controls.visible && this.toggleControls(false));

    this.busy = false;
  }

  move(dir) {
    if (this.busy || this.controls.visible) return;
    this.select((this.selected + dir + this.items.length) % this.items.length);
  }

  select(index) {
    if (this.busy || this.controls.visible) return;
    this.selected = index;
    this.cursor.setY(this.menuText[index].y);
  }

  choose() {
    if (this.busy) return;
    if (this.controls.visible) {
      this.toggleControls(false);
      return;
    }
    this.items[this.selected].action();
  }

  toggleControls(show) {
    if (this.busy) return;
    this.time.delayedCall(0, () => this.controls.setVisible(show));
  }

  /** Cassette slides into the deck, static builds, then the tape plays. */
  insertTape() {
    this.busy = true;
    this.menuText.forEach((t) => t.setVisible(false));
    this.cursor.setVisible(false);
    this.led.setText('LOAD');
    this.cassette.setVisible(true);
    this.tweens.add({
      targets: this.cassette,
      y: SLOT.y,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: this.cassette, scaleY: 0, duration: 220, ease: 'Quad.easeIn' });
        this.led.setText('PLAY');
        this.vhs.hold(1.2);
        this.time.delayedCall(700, () => this.scene.start('Game', { level: LEVELS[0] }));
      },
    });
  }

  update(time, delta) {
    const glitch = Math.random() < 0.06;
    this.titleGhosts[0].setX(VIEW_W / 2 - (glitch ? 3 : 1));
    this.titleGhosts[1].setX(VIEW_W / 2 + (glitch ? 3 : 1));
    this.titleText.setX(VIEW_W / 2 + (glitch ? Phaser.Math.Between(-1, 1) : 0));
    if (!this.busy) this.led.setVisible(Math.floor(time / 500) % 2 === 0);
    else this.led.setVisible(true);
    this.vhs.update(time, delta);
  }
}
