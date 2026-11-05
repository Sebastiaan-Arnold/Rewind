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

| Parameter  | Effect                                                    |
| ---------- | --------------------------------------------------------- |
| `?seed=<n>` | Load a specific floor layout. The active seed is logged to the console. |
| `?debug`    | Show physics bodies, seed, hit count and current room.   |

## Controls

| Input             | Action                          |
| ----------------- | ------------------------------- |
| W A S D           | Move                            |
| Mouse             | Aim                             |
| Left mouse        | Use item in hand                |
| 1 2 3 / Wheel     | Select inventory slot           |

Only the item in hand is active. The flashlight lights the way and its burst blinds enemies; switching to the crowbar means going dark.

## Project structure

```
public/
  assets/tiles/     Tilesets
  rooms/            Tiled room maps and the room manifest (rooms.json)
src/
  config.js         Gameplay tuning values
  art/              Palette, pixel buffer and procedural sprites
  scenes/           Boot, Game and HUD scenes
  world/            Room parsing, floor generation and floor construction
  lighting/         Lightmap and shadowed light shapes
  entities/         Player and enemies
  items/            Inventory and item behaviour
  fx/               VHS filter, particles and death rewind
  utils/            Seeded RNG and URL parameters
tools/              Asset generation scripts
```

## Room authoring

Rooms are authored in [Tiled](https://www.mapeditor.org) and saved as JSON in `public/rooms/`.

- **Map:** orthogonal, 16×16 px tiles, fixed size. The tileset must be embedded.
- **Tile layer `ground`:** floor, walls and props. Rooms are enclosed by walls.
- **Object layer `objects`:**

| Class    | Shape                              | Properties              |
| -------- | ---------------------------------- | ----------------------- |
| `door`   | Rectangle on the outer wall, 2 tiles wide, painted as wall | — |
| `enemy`  | Point                              | `kind` (string): `zombie` |
| `player` | Point (used when the room is first) | —                      |
| `light`  | Point                              | `color` (color), `radius` (int), `intensity` (float), `flicker` (`none` \| `subtle` \| `broken`), `glow` (bool) |

- **Map property:** `ambient` (color) sets the room's base light level. Near-black makes a dark room.
- **Tile properties:** `collides` (solid) and `opaque` (blocks light and line of sight).

Register a new room by adding its file name to `public/rooms/rooms.json`. The generator opens only the doors it connects; all others remain closed.

## Deployment

Pushes to `main` are built and deployed to GitHub Pages by `.github/workflows/deploy.yml`. Pages must be configured with **Source: GitHub Actions**.
