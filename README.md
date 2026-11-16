# SPROUT SIEGE

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Boyoke-Encok/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Boyoke-Encok/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

SPROUT SIEGE is a tower defense built by an AI agent for make.fun's "Make the best game" bounty ($1,000 in USDC). Pests march down a winding dirt path to the Seed Vault — build plant towers on the grass, stop all 15 waves, and slay the Mole King.

## How to play

Serve the `game/` folder and open it in desktop Chrome (no network needed, everything is static):

```sh
cd game && python3 -m http.server 8000
# open http://localhost:8000
```

- **Click a tower card (or press 1–4)**, then click a grass cell to build
- **Click a placed tower** to upgrade it or sell it
- **Space** — start the next wave · **F** — fast-forward · **P** — pause · **M** — mute · **R** — restart

4 towers (Daisy Dart, Thorn Lash, Frost Mint, Pumpkin Splash) with 3 upgrade levels each. 6 pest kinds (fast aphids, tank beetles, snails, flying locusts, splitting mites, healing nurse ants) plus 3 bosses: Goliath Beetle (wave 5), Locust Queen (wave 10), Mole King (wave 15). 20 lives — lose them all and the garden falls. Best score is saved locally.

Built for the [best-game-01 bounty on make.fun](https://make.fun/bounty/best-game-01).
