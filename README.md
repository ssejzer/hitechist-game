# ROOT ACCESS

**One sysadmin. Three incidents. Absolutely no staging environment.**

A complete, personal arcade survival game for Sebastian “The Hitechist” Sejzer. Built with JavaScript and Canvas, with an original pixel-art datacenter, a fedora-wearing protagonist, synthesized audio, and a very questionable Friday deployment.

Move through a server room while your patch blaster automatically handles nearby enemies. Collect patches, repair your infrastructure, and choose upgrades between incidents. Survive the legacy stack and cluster panic, then defeat the Friday Deploy. A run lasts about three minutes. Your best score is saved in your browser.

Choose your engineer from the title screen: Sebastian, Yaroslav, Juan Ignacio,
Erez, Luis, Nenad, Elad, Rotem, Tal, Jason, or Aldo. Selection changes the portrait,
animated pixel character, and player labels; all engineers share the same stats
and abilities. Your selection is remembered locally. The planned career campaign
keeps the arcade gameplay while introducing new workplaces and promotions; see
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
| Hold E near a server | Restore 24 integrity for 4 patches; revives offline servers |
| P / Escape           | Pause or resume                                             |
| Enter on title       | Start a shift                                               |
| Switch player        | End the current shift and open character selection          |
| End shift            | Return directly to the title                                 |

On phones, use the joystick and action buttons. The camera follows you through a 12,800 × 8,800 isometric datacenter—16 times the earlier map's area—and the minimap shows its districts and three mission servers. The mission stays in the starting production district, while the wider facility is explorable. If you travel away, your servers still need protection; the boss spawns near you.

The facility uses deterministic 8 × 8 tile chunks, generated as you move, with a bounded 32-chunk cache. Only nearby tiles are submitted to the renderer, cached block sprites are reused, and enemies remain capped at 55. Increasing map area therefore does not multiply the drawing or enemy-simulation workload. Sebastian and every enemy type have walking cycles and changing expressions; cosmetics do not alter gameplay randomness.

Green diamonds provide patches; pink crosses restore health. All servers going offline, or losing all player health, ends the run. Between incidents you recover health and server integrity and select one of three randomized upgrades. Sound starts muted; enable it in the game toolbar.

The game remains single-player. Its fixed-tick local session, input commands, seeded RNG, stable entity IDs, and JSON snapshots prepare the next multiplayer step. See [the multiplayer notes](docs/multiplayer.md) for what is ready and what the online implementation still needs.

## Hostinger deployment

This is a **static website**. It needs no Node.js server, database, API keys, or account integration on Hostinger.

```sh
npm run build
npm run package
```

1. Open your website's **File Manager** in Hostinger hPanel.
2. Create a `root-access` folder inside `public_html`.
3. Upload `root-access-hostinger.zip` into that folder and extract it there.
4. Check that `index.html`, `assets/`, `fonts/`, and `sw.js` are directly inside `public_html/root-access/`.
5. Open `https://your-domain.com/root-access/`.

You can also upload the contents of `dist/` to a subdomain's document root. All production asset paths are relative, so both approaches work. HTTPS enables offline caching. After the first completed load, the game can reload without an internet connection. A new build creates a fresh versioned cache. To update the game, upload and extract a new package in the same location, replacing the previous game files.

The included archive is a generated deployment artifact; rebuild it after changing the source. Nothing has been deployed to your hosting account.

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
- `src/world.js` — reusable deterministic building blocks and the current facility layout.
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

