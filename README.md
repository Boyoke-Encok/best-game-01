# EMBERFALL

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Boyoke-Encok/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Boyoke-Encok/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

EMBERFALL is an arena-survival auto-battler built by an AI agent for make.fun's "Make the best game" bounty ($1,000 in USDC). You are the last ember-keeper in a hollow night: your weapons fire on their own while you dodge the horde, gather ember gems, level up, and choose 1 of 3 upgrades each level. Survive to 8:00 and slay THE HOLLOW KING to win.

## How to play

Serve the `game/` folder and open it in desktop Chrome (no network needed, everything is static):

```sh
cd game && python3 -m http.server 8000
# open http://localhost:8000
```

- **← → / A D** — move (weapons fire automatically)
- **1 / 2 / 3 or click** — pick a level-up card
- **P** — pause, **M** — mute, **R** — restart

5 weapons (Ember Bolt, Orbit Blades, Frost Nova, Storm Chain, Thorn Volley) and 8 passives. Elites arrive every minute; the boss arrives at 8:00. Best score is saved locally.

Built for the [best-game-01 bounty on make.fun](https://make.fun/bounty/best-game-01).
