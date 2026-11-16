# LUMEN DRIFT

A twin-stick arena survival game for the make.fun **best-game-01** bounty:
you fly a lone lantern-ship through a dark void, hold back 10 waves of
shadow creatures, collect the light shards they drop, and charge your NOVA —
a blast that clears the whole screen. Clear wave 10 and the Gloomheart falls.

## How to play

- **WASD / arrows** — fly
- **Mouse** — aim, **hold left click** — shoot
- **Space / right click** — NOVA when the meter is full
- **P** — pause, **M** — mute, **R** — restart
- Between waves, pick **one of three upgrades** (click, or keys 1/2/3):
  Rapid Fire, Heavy Rounds, Swift Hull, Twin Shot, Piercing Light,
  Shard Magnet, Extra Heart, Nova Dynamo, Thick Plating.

Kills chain a combo multiplier (up to x8) while you keep killing inside
2.5 seconds. Enemies: wisps that chase, darters that telegraph and lunge,
splitters that burst into minis, brutes from wave 4, and the Gloomheart boss
on waves 5 and 10 (radial bullet bursts, spawns minis).

## Run it

```sh
node serve.ts        # then open http://localhost:8080
```

No build step, no network requests, no audio files — every sound is
synthesized with the WebAudio API. Screenshots are staged deterministically
with `?shot=start|play|upgrade|end&seed=N`.

## Layout

- `game/index.html` — canvas shell
- `game/src/main.js` — boot + fixed-step loop
- `game/src/world.js` — the simulation and screen machine
- `game/src/player.js` — the lantern ship
- `game/src/enemies.js` — shadow creatures and the boss
- `game/src/waves.js` — wave director and upgrade cards
- `game/src/render.js` — all canvas drawing, HUD and menus
- `game/src/input.js` — keyboard + mouse
- `game/src/audio.js` — synthesized WebAudio sounds
- `game/src/effects.js` — particles, floating text, shockwave rings
- `game/src/shots.js` — deterministic screenshot scenes
- `game/src/config.js` — tuning and palette
- `game/src/random.js` — seeded RNG
- `game/src/storage.js` — best score

## License

MIT — see LICENSE.
