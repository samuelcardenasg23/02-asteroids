# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Asteroids clone in plain HTML5 Canvas + vanilla JS (README and UI text are in Spanish). No dependencies, no bundler, no package.json, no tests, no linter. Git repo (`main` + feature branches; remote `origin` on GitHub).

## Running

Open `index.html` directly in a browser, or serve locally with `npx serve .` (http://localhost:3000). Reload to see changes.

## Architecture

All logic lives in `game.js` (classic script, `'use strict'`, loaded by `index.html`). The canvas is a fixed 800×600 (`W`/`H` constants must match the `width`/`height` attributes in `index.html`).

- **Loop**: `loop(ts)` → `update(dt)` → `draw()`. `dt` is in seconds and clamped to 0.05 to avoid big jumps after tab switches. All motion is dt-based, including ship drag (`Math.pow(DRAG, dt * 60)`, with `DRAG = 0.987` defined per frame at 60 fps).
- **State machine**: global `state` is `'playing' | 'dead' | 'gameover'`. `'dead'` runs a 2s `deadTimer` (asteroids and particles keep moving), then resets the ship. `'gameover'` waits for Space to call `initGame()`.
- **Entities**: `Ship`, `Asteroid`, `Bullet`, `Particle` classes, each with `update(dt)` and `draw()`. Entities are removed by setting `dead = true` and filtering the arrays (`bullets`, `asteroids`, `particles`) afterwards. Game state is held in module-level `let` globals (`ship`, `score`, `lives`, `level`, …) initialized by `initGame()`.
- **Toroidal world**: positions use `wrap(v, max)`. Particles do not wrap.
- **Collisions**: circle-based using `dist()` and each entity's `radius`. Ship-vs-asteroid uses `a.radius * 0.82` for forgiveness, and is skipped while `ship.invincible > 0`.
- **Asteroid sizes**: `RADII`, `SPEEDS`, `POINTS` are arrays indexed by size 1–3 (index 0 is unused padding). Note that smaller asteroids are worth more points. `split()` returns two asteroids of `size - 1`.
- **Input**: `keys` holds held state; `justPressed` plus `pressed(code)` gives a consume-once edge trigger (used for Space to fire, so holding Space does not auto-fire). Ship controls use `keys` directly.
- **Power-ups**: `POWERUP_DEFS` is the single table (label, shape, color, duration, drop weight) for `shield`, `triple`, `slow`, `hyper`, `nova`. `PowerUp` items drop from destroyed asteroids (`maybeDropPowerUp`, `POWERUP_DROP_CHANCE`) and are collected in `update()` via `applyPowerUp(type)`. Active effects are seconds-remaining timers in the `powers` object (reset to full on re-pickup, zeroed in `killShip()`); `novaCharges` (max 1) is kept across deaths and fired with `B` (`useNova()`, visual in `novaFx`). Where each effect hooks in: shield → `absorbHitWithShield()` in the ship-vs-asteroid check; triple → `Ship.tryShoot()`; slow → `asteroidDt(dt)` (asteroids only); hyper → thrust/rotation/`MAX_SPEED` in `Ship.update()`. Add a new power-up by adding a `POWERUP_DEFS` entry, a `powers` key, a shape in `polygonPoints()` if needed, and its effect hook.
- **Levels**: when `asteroids` is empty, `nextLevel()` resets the ship and spawns `3 + level` large asteroids, at least `SAFE_DIST` from the center.

## Notes

The README mentions a "shooting star" asteroid type that does not exist in `game.js` yet. Power-ups are implemented (see Architecture). There is still no automated test suite; verify gameplay changes in the browser.
