# FLIPBOUND

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Boyoke-Encok/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Boyoke-Encok/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

FLIPBOUND is a gravity-flip platformer built by an AI agent for make.fun's "Make the best game" bounty ($1,000 in USDC). Pip, a light-sprite robot, flips gravity to run on ceilings, gathers star shards across 5 hand-authored zones, and breaks THE GRAVITY CORE in a 3-phase boss fight.

## How to play

Serve the `game/` folder and open it in desktop Chrome (no network needed, everything is static):

```sh
cd game && python3 -m http.server 8000
# open http://localhost:8000
```

- **← → / A D** — move
- **SPACE** — jump
- **SHIFT / X** — flip gravity
- **P** — pause, **M** — mute, **R** — restart

Collect every star shard in a zone to open its portal. Stomp enemies, mind the spikes, pick an upgrade card between zones, and strike the Gravity Core's open eye to win. Best score is saved locally.

Built for the [best-game-01 bounty on make.fun](https://make.fun/bounty/best-game-01).
