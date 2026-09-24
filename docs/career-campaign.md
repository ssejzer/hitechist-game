# Arcade career campaign — implementation plan

The campaign remains an arcade game at every career stage: move, dodge, auto-fire,
collect patches, perform quick contextual repairs, survive incident waves, and
choose upgrades. Promotions unlock new workplaces. Technology incidents become
short arcade objectives and enemy modifiers rather than administrative simulations.

Character selection is implemented first: Sebastian plus Yaroslav, Juan Ignacio,
Erez, Luis, Nenad, Elad, Rotem, Tal, Jason and Aldo. All are available immediately,
with matching stats, remembered selection, roster portraits and distinct animated
pixel characters. Character identity is included in session snapshots.

## Career stages (planned)

| Stage | Workplace | Arcade objectives and promotion challenge |
| --- | --- | --- |
| First IT job | Small office | Repair Wi-Fi, clear a Windows blue-screen and pair a Mac headset while dodging bugs; survive the office outage. |
| Call-center IT | Employee open space and communications room | Reconnect Ethernet, clear a printer jam and activate an access card under wave pressure; protect both rooms during peak calls. |
| Sysadmin | Two server rooms, three offices and one conference room | Restore shared services while defending equipment across six rooms; defeat a cascading infrastructure incident. |
| Tech Lead | Multiple worldwide sites | Dispatch technicians as timed support abilities, travel via a site map and prioritize simultaneous incident waves; survive a global rollout. |
| AWS datacenter role | Large datacenter buildings across availability zones | Drive between buildings, collect parts, defend racks and restore connectivity; contain a multi-building outage. This is a fictional arcade setting. |
| Manager | Meeting rooms and a team operations floor | Meetings are brief decision encounters; assign teams, collect unblockers and defend sprint deadlines against interruptions; survive release week. |

Each workplace has short incident rounds and a final promotion challenge. Passing
unlocks the next location; failure retries the current shift. Save unlocked stages
and best ratings locally. Keep ordinary upgrades within a shift. Travel must not
cause unavoidable losses at unattended sites: remote support and explicit grace
periods give the player time to respond.

## Technology incidents (planned)

- Okta: restart a failed provisioning chain by activating its nodes in order.
- Active Directory: reconnect a workstation to its domain-controller beacon.
- BitLocker: collect the matching device recovery token and unlock the device.
- Intune: restore a sync relay while defending an app-deployment progress meter.
- Microsoft 365 / Exchange: clear queued mail packets and restore mailbox access.
- VPN: reconnect a tunnel and repel authentication-error enemies.
- DNS: repair the resolver to stop linked failures across several rooms.
- CrowdStrike / EDR: bring an offline sensor back online to reveal hidden enemies.
- VMware / Hyper-V: restore a host or datastore to revive affected VM objectives.
- Veeam: defend a backup job, repair its destination and complete verification.

Use fictional local state throughout. Each incident teaches one visible rule,
reuses movement/combat/interaction controls, and offers readable progress feedback.

## Delivery order

1. Character roster and portraits (complete).
2. Data-driven location bounds, rooms, doors, collision, equipment and spawn points;
   update the renderer, camera, minimap and snapshot format accordingly.
3. Reusable arcade objectives with progress, dependencies, rewards and completion.
4. Small office and call center, including promotion and saved unlocks.
5. Six-room sysadmin stage and linked technology incidents.
6. Global sites and delegation, then datacenter vehicles and travel.
7. Management encounters and sprint objectives.

Acceptance checks for later stages: objectives remain reachable, transitions clear
old enemies and held input, saves restore the correct location, timers remain fair
during travel, and all stages work with keyboard and touch controls. Preserve the
fixed-tick deterministic simulation and bounded rendering caches.

## Handoff for the next development session

The character roster is complete. The current playable game remains three arcade
waves in one datacenter; none of the career locations or promotion mechanics are
implemented yet. The next concrete task is a playable small-office stage with
Wi-Fi router, Windows blue-screen, and Mac Bluetooth-headset objectives. Keep
movement, dodging, auto-fire, patches, quick repairs, incident waves, and upgrades.
Completing its final wave should unlock the two-room call-center stage. Build the
location and objective foundations needed for those stages rather than adding
new technology incidents first.

No new character photos or design decisions are needed to begin. See `README.md`
for controls and source-file roles. The game is static JavaScript and Canvas;
`npm test`, `npm run test:browser`, and `npm run build` are the relevant checks.
The `resources-to-get-ideas/` folder contains optional source inspiration and
is not used by the game or production build.
