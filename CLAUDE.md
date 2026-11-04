# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Asteroids clone in plain HTML5 Canvas + vanilla JS (README and UI text are in Spanish). No dependencies, no bundler, no package.json, no tests, no linter, not a git repo.

## Running

Open `index.html` directly in a browser, or serve locally with `npx serve .` (http://localhost:3000). Reload to see changes.

## Architecture

All logic lives in `game.js` (classic script, `'use strict'`, loaded by `index.html`). The canvas is a fixed 800×600 (`W`/`H` constants must match the `width`/`height` attributes in `index.html`).

- **Loop**: `loop(ts)` → `update(dt)` → `draw()`. `dt` is in seconds and clamped to 0.05 to avoid big jumps after tab switches. All motion is dt-based, except ship drag (`DRAG = 0.987` is applied per frame, so it is frame-rate dependent).
- **State machine**: global `state` is `'playing' | 'dead' | 'gameover'`. `'dead'` runs a 2s `deadTimer` (asteroids and particles keep moving), then resets the ship. `'gameover'` waits for Space to call `initGame()`.
- **Entities**: `Ship`, `Asteroid`, `Bullet`, `Particle` classes, each with `update(dt)` and `draw()`. Entities are removed by setting `dead = true` and filtering the arrays (`bullets`, `asteroids`, `particles`) afterwards. Game state is held in module-level `let` globals (`ship`, `score`, `lives`, `level`, …) initialized by `initGame()`.
- **Toroidal world**: positions use `wrap(v, max)`. Particles do not wrap.
- **Collisions**: circle-based using `dist()` and each entity's `radius`. Ship-vs-asteroid uses `a.radius * 0.82` for forgiveness, and is skipped while `ship.invincible > 0`.
- **Asteroid sizes**: `RADII`, `SPEEDS`, `POINTS` are arrays indexed by size 1–3 (index 0 is unused padding). Note that smaller asteroids are worth more points. `split()` returns two asteroids of `size - 1`.
- **Input**: `keys` holds held state; `justPressed` plus `pressed(code)` gives a consume-once edge trigger (used for Space to fire, so holding Space does not auto-fire). Ship controls use `keys` directly.
- **Levels**: when `asteroids` is empty, `nextLevel()` resets the ship and spawns `3 + level` large asteroids, at least `SAFE_DIST` from the center.

## Notes

The README mentions power-ups and a "shooting star" asteroid type; neither exists in `game.js` yet.
