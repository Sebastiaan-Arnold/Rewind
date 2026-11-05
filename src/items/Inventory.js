/** Three-slot inventory. Exactly one slot is selected (the item in hand). */
import { INVENTORY } from '../config.js';
import { ITEMS } from './items.js';

export default class Inventory {
  constructor(ids = INVENTORY.start) {
    this.slots = Array.from({ length: INVENTORY.slots }, (_, i) => (ids[i] ? ITEMS[ids[i]] : null));
    this.selected = Math.max(0, this.slots.findIndex(Boolean));
  }

  get active() {
    return this.slots[this.selected];
  }

  /** Selects a slot. Returns true if the item in hand changed. */
  select(index) {
    if (index < 0 || index >= this.slots.length || index === this.selected || !this.slots[index]) return false;
    this.selected = index;
    return true;
  }

  /** Moves the selection to the next occupied slot in the given direction. */
  cycle(direction) {
    const n = this.slots.length;
    for (let step = 1; step < n; step++) {
      const i = (((this.selected + direction * step) % n) + n) % n;
      if (this.slots[i]) return this.select(i);
    }
    return false;
  }
}
