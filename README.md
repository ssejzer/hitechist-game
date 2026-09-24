# ROOT ACCESS

**Play through six IT career stages, from the small office to release week.**

A personal arcade survival game for Sebastian “The Hitechist” Sejzer and the full engineer roster, built with JavaScript and Canvas.

Move through each workplace while your patch blaster handles nearby bugs. Hold E near the marked station to complete each incident step. Collect patches, repair damaged equipment, choose upgrades between incidents, and defeat each promotion challenge. Victory unlocks the next stage. Unlocks, best ratings, and high score are saved in your browser.

Choose your engineer from the title screen: Sebastian, Yaroslav, Juan Ignacio,
Erez, Luis, Nenad, Elad, Rotem, Tal, Jason, or Aldo. Selection changes the portrait,
animated pixel character, and player labels. Engineers share the same base stats;
Yaroslav has a monitoring drone. Your selection is remembered locally. The career campaign
keeps the arcade gameplay across all six workplaces; see
[the campaign plan](docs/career-campaign.md).

## Play locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the local address Vite prints (normally http://localhost:5173).

| Control              | Action                                                      |
| -------------------- | ----------------------------------------------------------- |
| WASD / arrow keys    | Move; firing is automatic                                   |
| Space                | Invulnerable dash; 3-second cooldown                        |
| Q                    | Sudo pulse: area damage, knockback, and projectile clearing |
| Hold E near a marked station | Complete its fix meter for 4 patches |
| Hold E near damaged equipment | Restore 24 integrity for 4 patches |
| Hold E near a coffee machine | Gain 8 seconds of faster movement and firing; the machine takes 20 seconds to brew again |
| 1–3 at remote stages | Travel to a site or choose an AWS shuttle destination |
| R at remote stages | Dispatch technicians to repair and cover all sites |
| P / Escape           | Pause or resume                                             |
| Enter on title       | Start a shift                                               |
| Switch player        | End the current shift and open character selection          |
| End shift            | Return directly to the title                                 |

On phones, use the joystick and action buttons. The title screen shows a career graph with completed stages and best star ratings. The in-game HUD shows the level and current room; the minimap marks the player, equipment, and rooms. Doorway approaches stay clear of furniture. Call-center IT has an employee open space and communications room joined by a center doorway. Winning a stage selects the next unlocked level for the next shift, and the selection is remembered locally.

Remote stages show travel and support controls below the playfield. At the AWS datacenter, press 1–3 or tap a destination, walk to your current building's marked shuttle stop, and stay there. A short boarding tip appears near the stop. A circulating shuttle boards you automatically when it arrives. The shuttle drives between the availability-zone buildings and grants equipment cover during the ride. The final Manager stage has faster, longer waves and a stronger promotion boss. The supplied `Velocity_Breach.mp3` plays in a loop during active shifts when sound is enabled; its audio gain is half the effects gain. Music pauses during menus, upgrades, pauses, and after a shift ends.

Workplaces use deterministic 8 × 8 tile chunks with a bounded 32-chunk cache. Only nearby tiles are submitted to the renderer, cached sprites are reused, and enemies remain capped at 55. Characters and enemies have walking cycles and changing expressions; cosmetics do not alter gameplay randomness.

Across the career workplaces, desks, equipment, server racks, coffee machines, plants, and utility consoles use transparent isometric PNG sprites. Meeting-room tables and equipment types have their own variants. The sprites are rendered ahead of time from simple Blender geometry in `scripts/render_environment_sprites.py`; Blender is not needed to play the game. To regenerate them after changing the models, run `blender --background --python scripts/render_environment_sprites.py`. The Canvas renderer retains its drawn props as a fallback while the PNGs load.

Green diamonds provide patches; pink crosses restore health. All equipment going offline, or losing all player health, ends the run. Between incidents you recover health and equipment integrity and select one of three randomized upgrades. Sound starts muted; enable it in the game toolbar.

Each room outside the datacenter has a coffee machine. Coffee overload boosts movement and firing for eight seconds, followed by a two-second slowdown. Yaroslav's monitoring drone follows him, marks nearby equipment below 75 integrity, and collects patches close to the drone.

The game remains single-player. Its fixed-tick local session, input commands, seeded RNG, stable entity IDs, and JSON snapshots prepare the next multiplayer step. See [the multiplayer notes](docs/multiplayer.md) for what is ready and what the online implementation still needs.

## Hostinger deployment

This is a **static website**. It needs no Node.js server, database, API keys, or account integration on Hostinger.

```sh
npm run build
```

1. Open your website's **File Manager** in Hostinger hPanel.
2. Create a `root-access` folder inside `public_html`.
3. Upload the contents of `dist/` into that folder.
4. Check that `index.html`, `assets/`, `fonts/`, and `sw.js` are directly inside `public_html/root-access/`.
5. Open `https://your-domain.com/root-access/`.

You can also upload the contents of `dist/` to a subdomain's document root. All production asset paths are relative, so both approaches work. HTTPS enables offline caching. After the first completed load, the game can reload without an internet connection. A new build creates a fresh versioned cache. To update the game, rebuild and upload the new contents of `dist/`, replacing the previous game files.

Nothing has been deployed to your hosting account.

## Verification

```sh
npm test                      # movement, ranged combat, waves, and world checks
npm run dev                   # keep running in another terminal
npm run test:browser           # desktop and phone browser checks
npm run build
npm run preview -- --port 5174 # keep running in another terminal
npm run test:offline           # production offline reload check
```

Browser checks use Playwright Chromium. If needed, run `npx playwright install chromium`, or set `CHROMIUM_PATH` to your Chromium executable. Set `TEST_URL` to test another running server.

## Source map

- `src/engine.js` — deterministic simulation, combat, server repairs, waves, upgrades, and win/loss rules.
- `src/world.js`, `src/career.js` — deterministic tiles and workplace, room, equipment, spawn, and objective definitions.
- `src/config.js`, `src/random.js` — shared world/protocol constants and restorable seeded randomness.
- `src/session.js` — fixed-tick local authority, input commands, upgrade offers, and snapshots.
- `src/animation.js` — deterministic expressions and distance-driven walking cycles.
- `src/renderer.js` — isometric projection, modular world rendering, pixel art, particles, and camera.
- `src/main.js` — interface, controls, audio events, score persistence, and lifecycle.
- `src/audio.js` — small Web Audio synthesizer; no downloaded sound effects.
- `src/style.css` — responsive arcade interface and menus.
- `scripts/offline.mjs` — generates the production offline cache.

The `?test=1` URL flag exposes a small test interface for browser verification; normal play does not expose it. High scores are local and are not an online leaderboard.

## Personal touches and assets

Inspired by [Hitechist](https://hitechist.com/), its “Making tech nerdy again” tagline, and Sebastian's infrastructure, automation, and security background. The supplied avatar images appear in the interface; the pixel world and in-game sprites are drawn directly in code.

No private CV files, contact details, business documents, analytics, or trackers are included in the deployed game. The fonts (Barlow Condensed, DM Sans, IBM Plex Mono) are bundled locally with their SIL Open Font Licenses in `public/fonts/`.
