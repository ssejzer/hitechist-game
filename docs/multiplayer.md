# Multiplayer preparation

The current release is single-player and still deploys as static files on Hostinger. No network server, rooms, accounts, matchmaking, or remote players are enabled yet.

## Boundaries implemented now

- `config.js` defines protocol version, world seed/dimensions, and the 60 Hz simulation rate.
- `engine.js` has no DOM, rendering, or network dependencies. Its state includes tick number, stable actor/projectile/drop IDs, and projectile ownership.
- `session.js` is the local authority used by the actual browser game. Movement, repair, dash, and pulse pass through its input command interface. Upgrade offers are generated and checked by this authority, rather than re-rolled by the UI.
- `random.js` supplies a seeded RNG whose exact state can be saved and restored.
- `LocalSession.snapshot()` produces JSON-compatible state. `fromSnapshot()` continues with the same RNG, input, cooldowns, pending actions, and partial tick accumulator. Snapshots are trusted checkpoints; they are not a general-purpose validator for untrusted network data.
- `animation.js` derives expressions from actor identity and simulation time without consuming gameplay randomness. Walking phases advance from actual distance travelled. Rendering the same snapshot does not change the simulation.
- `world.js` generates deterministic 8 × 8 tile chunks on demand and retains at most 32 chunks. Actors remain capped at 55 enemies. The map size therefore does not determine the number of simulated actors or drawn tiles.

## Existing input contract

```js
{
  version: 1,
  playerId: "player-1",
  sequence: 42,
  x: 1, y: 0,       // screen-space movement; engine normalizes diagonal input
  repair: false,    // held state
  dash: true,       // one-shot action, consumed on next simulation tick
  pulse: false
}
```

`submitInput` rejects non-finite movement, unsupported protocol versions, duplicate/old sequence numbers, and commands for a different player. The current single-player session owns `player-1`; remote-player authority must be bound to the authenticated connection by the future server.

## Next implementation step

1. Run the shared session/engine in an authoritative game server and introduce rooms with stable player IDs. Replace the engine's single `player` with a roster; define shared server health, upgrades, pickups, revival, targeting, and win/loss semantics for co-op.
2. Add a transport adapter that sends input commands and receives versioned snapshots/events. The browser keeps the existing renderer and input controls. Validate incoming messages, enforce connection ownership and rate limits, and add join/leave/reconnect handling on the server.
3. Broadcast snapshots at a lower rate than the 60 Hz simulation. Interpolate remote actors, add local prediction/reconciliation if needed, and acknowledge input sequences. Client animations can continue from synchronized actor phase/time.
4. Pause should become a local menu during live multiplayer; individual clients must not stop the shared simulation. Bound and deduplicate transient effects/events before broadcasting.
5. Choose the server host then. Hostinger can continue serving the static frontend; online multiplayer also needs a persistent realtime server.

The tests cover frame-rate-independent ticks, snapshot continuation through random events, command rejection, one-shot actions, upgrade authority, animation determinism, and bounded world caching. Full multiplayer authority and network security require the server/roster work above; a deterministic local session alone is not multiplayer.
