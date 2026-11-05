/**
 * VCR-style on-screen display, inventory and crosshair, rendered above the
 * game scene and outside the VHS filter. Health is intentionally not
 * displayed; damage is communicated through the VHS effect only.
 */
import Phaser from 'phaser';
import { VIEW_W, VIEW_H, INVENTORY } from '../config.js';
import { params } from '../utils/params.js';

const FONT = { fontFamily: '"Courier New", monospace', fontSize: '10px', color: '#e8e8e8' };
const SLOT = 20;
const SLOT_GAP = 4;
const MARGIN = 10;

export default class HudScene extends Phaser.Scene {
  constructor() {
    super('Hud');
  }

  create() {
    const shadow = (t) => t.setShadow(1, 1, '#000000', 0, false, true);
    this.play = shadow(this.add.text(MARGIN, 8, 'PLAY >', FONT));
    this.counter = shadow(this.add.text(MARGIN, VIEW_H - 18, '0:00:00', FONT));
    shadow(this.add.text(VIEW_W - 24, 8, 'SP', FONT));
    this.message = shadow(this.add.text(VIEW_W / 2, VIEW_H / 2 - 30, '', { ...FONT, fontSize: '16px' }).setOrigin(0.5));
    this.debug = params.has('debug') ? shadow(this.add.text(VIEW_W / 2, VIEW_H - 18, '', FONT).setOrigin(0.5, 0)) : null;

    // Inventory: three slots, bottom right.
    const width = INVENTORY.slots * SLOT + (INVENTORY.slots - 1) * SLOT_GAP;
    this.slotOrigin = { x: VIEW_W - MARGIN - width, y: VIEW_H - MARGIN - SLOT };
    this.slotFrame = this.add.graphics();
    this.slotIcons = [];
    for (let i = 0; i < INVENTORY.slots; i++) {
      const x = this.slotOrigin.x + i * (SLOT + SLOT_GAP);
      this.slotIcons.push(this.add.image(x + SLOT / 2, this.slotOrigin.y + SLOT / 2, 'icon-crowbar').setVisible(false));
      shadow(this.add.text(x + 2, this.slotOrigin.y + 1, String(i + 1), { ...FONT, fontSize: '7px', color: '#9a9a9a' }));
    }
    this.itemName = shadow(this.add.text(VIEW_W - MARGIN, this.slotOrigin.y - 13, '', FONT).setOrigin(1, 0));
    this.inventoryKey = '';

    this.crosshair = this.add.image(0, 0, 'crosshair').setDepth(100);
  }

  resetRun() {
    this.message.setText('');
    this.inventoryKey = '';
  }

  showMessage(text) {
    this.message.setText(text);
  }

  update(time) {
    const game = this.scene.get('Game');
    const pointer = this.input.activePointer;
    this.crosshair.setPosition(Math.round(pointer.x), Math.round(pointer.y));

    if (!game || !game.player || !game.player.active) return;
    const player = game.player;

    // Tape counter (H:MM:SS since run start).
    const s = game.runStartedAt === null ? 0 : Math.max(0, Math.floor((time - game.runStartedAt) / 1000));
    const pad = (n) => String(n).padStart(2, '0');
    this.counter.setText(`${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`);
    this.play.setVisible(player.dead || Math.floor(time / 600) % 4 !== 0);

    this.drawInventory(player);

    if (this.debug) {
      const area = game.floor.areaAt(player.x, player.y);
      const light = (game.playerLight ?? 0).toFixed(2);
      this.debug.setText(`${area?.name || '-'}  hits ${player.hits}  light ${light}`);
    }
  }

  drawInventory(player) {
    const inv = player.inventory;
    const key = `${inv.selected}:${inv.slots.map((s) => s?.id ?? '-').join(',')}:${player.dead}:${player.beamEnabled}`;
    if (key === this.inventoryKey) return;
    this.inventoryKey = key;

    const g = this.slotFrame.clear();
    const visible = !player.dead;
    inv.slots.forEach((item, i) => {
      const x = this.slotOrigin.x + i * (SLOT + SLOT_GAP);
      const selected = i === inv.selected;
      if (visible) {
        g.fillStyle(0x000000, selected ? 0.55 : 0.35).fillRect(x, this.slotOrigin.y, SLOT, SLOT);
        g.lineStyle(1, 0xe8e8e8, selected ? 1 : 0.3).strokeRect(x + 0.5, this.slotOrigin.y + 0.5, SLOT - 1, SLOT - 1);
      }
      const icon = this.slotIcons[i];
      icon.setVisible(visible && Boolean(item));
      if (item) icon.setTexture(item.icon).setAlpha(selected ? 1 : 0.45);
    });
    const active = inv.active;
    const state = active?.emitsLight ? (player.beamEnabled ? ' ON' : ' OFF') : '';
    this.itemName.setText(visible && active ? active.name + state : '');
  }
}
