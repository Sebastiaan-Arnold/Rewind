# Rewind

A top-down VHS thriller dungeon crawler. You're trapped inside old tapes;
each era is a tape. First era: a dead shopping mall at night, late 1990s.

Built with [Phaser 4](https://phaser.io) and [Vite](https://vite.dev), plain JavaScript.

## Running it on your computer

You need [Node.js](https://nodejs.org) installed (version 20 or newer).

```bash
npm install      # once: downloads Phaser and Vite into node_modules/
npm run dev      # starts the game at http://localhost:5173
```

Leave `npm run dev` running. Every time you save a file, the browser reloads.

Handy address options:

- `http://localhost:5173/?debug` shows hitboxes, the seed, your hit count and current room.
- `http://localhost:5173/?seed=12345` replays an exact layout. Every run prints
  its seed in the browser console (right-click the page, then Inspect, then Console).

## Controls

- **WASD**: move
- **Mouse**: aim
- **Left click** (or hold): swing the crowbar

## Project map

```
index.html                 the web page the game lives in
src/main.js                creates the game
src/config.js              all the tuning numbers (speeds, damage, timings)
src/scenes/                BootScene (loading), GameScene (a run), HudScene (VCR overlay)
src/world/                 reading Tiled rooms, the floor generator, building the map
src/entities/              Player, Zombie, weapons
src/fx/VhsFilter.js        the VHS glitch shader
public/rooms/              Tiled room files (.json) and rooms.json (the list of rooms)
public/assets/tiles/       the tileset image
tools/                     helper scripts (npm run tileset redraws the placeholder tiles)
```

## Making rooms in Tiled

1. Open a file from `public/rooms/` in [Tiled](https://www.mapeditor.org), or make
   a new map: Orthogonal, tile size 16x16, fixed size.
2. Tileset: use `public/assets/tiles/mall-placeholder.png` and make sure the
   tileset is **embedded** in the map (Phaser can't read separate .tsx files).
3. Paint on a tile layer named **`ground`**. Surround the room with walls.
4. Add an object layer named **`objects`** with:
   - **Doors**: a rectangle on the outer wall, 2 tiles wide, with Class `door`.
     Paint wall underneath; the generator opens only the doors it connects.
   - **Enemies**: a point with Class `enemy` and a string property `kind` = `zombie`.
   - **Player start**: a point with Class `player` (used if the room comes first).
5. Save as JSON (`File > Save As`, type "JSON map files") into `public/rooms/`.
6. Add the file name (without `.json`) to `public/rooms/rooms.json`.

Tile properties (set in the tileset editor): `collides` = solid,
`opaque` = blocks enemy line of sight.

## Publishing to GitHub Pages

The game is a static site: `npm run build` turns everything into plain files in
`dist/`, which any web host can serve. A GitHub Action
(`.github/workflows/deploy.yml`) does this for you automatically.

One-time setup:

1. Create an empty repository on GitHub (for example `rewind`). Don't add a README.
2. Connect this folder to it and push (replace `YOUR-NAME`):
   ```bash
   git remote add origin https://github.com/YOUR-NAME/rewind.git
   git push -u origin main
   ```
   (Or use GitHub Desktop: "Publish repository".)
3. On GitHub, go to the repository's **Settings > Pages**, and under
   **Build and deployment > Source** choose **GitHub Actions**.
4. Open the **Actions** tab and watch the "Deploy to GitHub Pages" run.
   When it turns green, the game is live at
   `https://YOUR-NAME.github.io/rewind/`.

After that, every push to `main` republishes the game within a minute or two.

To test the built version locally before pushing:

```bash
npm run build
npm run preview
```
