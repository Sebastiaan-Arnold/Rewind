# Rewind

A top-down thriller dungeon crawler. The player is trapped inside VHS recordings; each era is a tape.

**Era 01 — The Mall.** A dead shopping mall at night, late 1990s.

## Requirements

- Node.js 20 or later

## Getting started

```bash
npm install
npm run dev
```

| Command           | Description                                   |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Start the development server with hot reload  |
| `npm run build`   | Create a production build in `dist/`          |
| `npm run preview` | Serve the production build locally            |
| `npm run tileset` | Regenerate the placeholder tileset            |

### URL parameters

| Parameter | Effect                                                     |
| --------- | ---------------------------------------------------------- |
| `?play`   | Skip the title screen and start the first level.           |
| `?debug`  | Show physics bodies, current area, hit count and light level. |

## Controls

| Input             | Action                          |
| ----------------- | ------------------------------- |
| W A S D           | Move                            |
| Mouse             | Aim                             |
| Left mouse        | Use item in hand                |
| 1 2 3 / Wheel     | Select inventory slot           |

Only the item in hand is active. Clicking with the flashlight switches it on or off. A lit beam reveals the way but draws zombies from a distance; in darkness the player is harder to detect. Switching to the crowbar means going dark.

## Project structure

```
public/
  assets/tiles/     Tilesets
  levels/           Tiled level maps
src/
  config.js         Gameplay tuning values
  art/              Palette, pixel buffer and procedural sprites
  scenes/           Boot, Title, Game and HUD scenes
  world/            Level parsing, collision, line of sight and light queries
  lighting/         Lightmap and shadowed light shapes
  entities/         Player, enemies and the exit device
  items/            Inventory and item behaviour
  fx/               VHS filter, particles and death rewind
  utils/            URL parameters
tools/              Asset generation scripts
```

## Level authoring

Each level is a single map authored in [Tiled](https://www.mapeditor.org) and saved as JSON in `public/levels/`. Levels are listed in play order in `LEVELS` in `src/config.js`.

- **Map:** orthogonal, 16×16 px tiles, fixed size. The tileset must be embedded.
- **Map properties:** `name` (string), `ambient` (color, light level outside any area).
- **Tile layer `ground`:** floors, walls and fixed store fixtures.
- **Tile layer `props`:** furniture, debris and other overlays drawn on transparent tiles (tileset rows 5–9), placed over any floor.
- **Object layer `objects`:**

| Class    | Shape     | Properties |
| -------- | --------- | ---------- |
| `player` | Point     | — (level start; the tape rewinds here on death) |
| `enemy`  | Point     | `kind` (string): `zombie` |
| `light`  | Point     | `color` (color), `radius` (int), `intensity` (float), `flicker` (`none` \| `subtle` \| `broken` \| `fire`), `glow` (bool) |
| `area`   | Rectangle | `name` (string), `ambient` (color). Later areas override earlier ones. |
| `device` | Point     | — (the era's exit; touching it ends the tape) |

- **Tile properties:** `collides` (solid), `opaque` (blocks light and line of sight), `pit` (falling in ends the run).

## Deployment

Pushes to `main` are built and deployed to GitHub Pages by `.github/workflows/deploy.yml`. Pages must be configured with **Source: GitHub Actions**.
