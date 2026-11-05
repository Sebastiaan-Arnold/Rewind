/**
 * Records the player's recent movement and plays it back in reverse on death,
 * as if the tape were rewinding.
 */
const SAMPLE_MS = 16;

export default class Rewind {
  constructor(seconds = 3) {
    this.max = Math.round((seconds * 1000) / SAMPLE_MS);
    this.samples = [];
    this.lastSample = -Infinity;
    this.playhead = -1;
  }

  record(time, player) {
    if (time - this.lastSample < SAMPLE_MS) return;
    this.lastSample = time;
    this.samples.push({ x: player.x, y: player.y, r: player.rotation, frame: player.frame.name });
    if (this.samples.length > this.max) this.samples.shift();
  }

  /** Prepares playback over `frames` frames, skipping stationary samples. */
  start(frames) {
    this.track = this.samples.filter((s, i, all) => {
      const prev = all[i - 1];
      return !prev || Math.abs(s.x - prev.x) + Math.abs(s.y - prev.y) > 0.5;
    });
    this.playhead = this.track.length - 1;
    this.speed = Math.max(1, this.track.length / frames);
  }

  /** Moves the player one playback step back. Returns false when finished. */
  step(player) {
    if (this.playhead < 0) return false;
    const s = this.track[Math.max(0, Math.floor(this.playhead))];
    player.setPosition(s.x, s.y).setRotation(s.r).setFrame(s.frame);
    this.playhead -= this.speed;
    return true;
  }
}
