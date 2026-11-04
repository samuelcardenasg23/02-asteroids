'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    // Tono azulado mientras dura slow motion; vuelve a blanco al final
    // con un parpadeo para avisar de que se acaba (último 1.5 s)
    const slowTint = powers.slow > 0 &&
      !(powers.slow < 1.5 && Math.floor(powers.slow * 8) % 2 === 0);
    ctx.strokeStyle = slowTint ? SLOW_TINT : '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    const hyper  = powers.hyper > 0;
    const ROT    = hyper ? 5   : 3.5;   // rad/s
    const THRUST = hyper ? 520 : 260;   // px/s²
    const MAX_SPEED = hyper ? 650 : 400; // px/s
    const DRAG   = 0.987;               // factor por frame a 60 fps

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    // Fricción independiente de los FPS (equivale a DRAG por frame a 60 fps)
    const drag = Math.pow(DRAG, dt * 60);
    this.vx *= drag;
    this.vy *= drag;

    // Tope de velocidad. Si se pasa (p. ej. al acabar la hiperpropulsión) se
    // frena de forma gradual en vez de pegar un tirón seco.
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > MAX_SPEED) {
      const k = Math.max(MAX_SPEED / speed, 1 - OVERSPEED_BRAKE * dt);
      this.vx *= k;
      this.vy *= k;
    }

    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    // Con disparo triple salen 3 balas en abanico: centro y ±TRIPLE_SPREAD
    const offsets = powers.triple > 0 ? [-TRIPLE_SPREAD, 0, TRIPLE_SPREAD] : [0];
    return offsets.map(o => new Bullet(ox, oy, this.angle + o));
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      const hyper = powers.hyper > 0;
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - (hyper ? rand(16, 30) : rand(6, 14)), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = hyper ? POWERUP_DEFS.hyper.color : 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-ups ─────────────────────────────────────────────────────────────────
const POWERUP_DROP_CHANCE = 0.1;  // probabilidad de soltar uno al destruir un asteroide
const POWERUP_MAX_ON_SCREEN = 2;
const POWERUP_TTL = 8;            // segundos que dura el ítem flotando antes de desaparecer

// shape: figura wireframe · duration: segundos del efecto (0 = ítem de un solo uso)
// weight: peso relativo para el sorteo del tipo que cae
const POWERUP_DEFS = {
  shield: { label: 'ESCUDO',  shape: 'hexagon',  color: '#00e5ff', duration: 5,  weight: 30 },
  triple: { label: 'TRIPLE',  shape: 'triangle', color: '#ffe600', duration: 10, weight: 25 },
  slow:   { label: 'SLOW-MO', shape: 'diamond',  color: '#6a8dff', duration: 6,  weight: 20 },
  hyper:  { label: 'HIPER',   shape: 'square',   color: '#ff4df0', duration: 8,  weight: 20 },
  nova:   { label: 'NOVA',    shape: 'star',     color: '#ff7a1a', duration: 0,  weight: 5  },
};

const OVERSPEED_BRAKE = 2;  // fracción/s que se frena la nave si supera el tope

const NOVA_FX_TIME = 0.6;  // duración del anillo expansivo en segundos
const NOVA_KEY     = 'KeyB';

const SLOW_FACTOR = 0.5;   // los asteroides van a la mitad de velocidad
const SLOW_TINT   = '#8fa8ff';

const TRIPLE_SPREAD = 0.25; // rad (~14°) entre la bala central y cada lateral

const SHIELD_RADIUS = 21;  // radio del círculo (y de la zona de impacto) con escudo
const SHIELD_GRACE  = 0.5; // invencibilidad breve tras absorber un golpe

function pickWeighted(defs) {
  const entries = Object.entries(defs);
  let r = rand(0, entries.reduce((sum, [, d]) => sum + d.weight, 0));
  for (const [type, d] of entries) {
    r -= d.weight;
    if (r <= 0) return type;
  }
  return entries[0][0];
}

function polygonPoints(shape, r) {
  switch (shape) {
    case 'diamond':
      return [[0, -r * 1.25], [r * 0.8, 0], [0, r * 1.25], [-r * 0.8, 0]];
    case 'square':
      return [[-r, -r], [r, -r], [r, r], [-r, r]].map(([x, y]) => [x * 0.8, y * 0.8]);
    case 'triangle':
      return [0, 1, 2].map(i => {
        const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
        return [Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1];
      });
    case 'hexagon':
      return [0, 1, 2, 3, 4, 5].map(i => {
        const a = (i / 6) * Math.PI * 2;
        return [Math.cos(a) * r, Math.sin(a) * r];
      });
    case 'star':
      return Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const rr = i % 2 === 0 ? r * 1.15 : r * 0.5;
        return [Math.cos(a) * rr, Math.sin(a) * rr];
      });
  }
  return [];
}

class PowerUp {
  constructor(x, y, type) {
    this.x      = x;
    this.y      = y;
    this.type   = type;
    this.def    = POWERUP_DEFS[type];
    this.radius = 10;
    this.ttl    = POWERUP_TTL;
    this.age    = 0;
    this.rot    = rand(0, Math.PI * 2);
    this.dead   = false;

    const angle = rand(0, Math.PI * 2);
    const speed = rand(15, 30);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += 0.8 * dt;
    this.age += dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo rápido en los últimos 2 s; pulso suave el resto del tiempo
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    const pulse = 0.65 + 0.35 * Math.sin(this.age * 6);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = this.def.color;
    ctx.lineWidth   = 1.8;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    const pts = polygonPoints(this.def.shape, this.radius);
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups;
let novaFx;       // anillos expansivos de la Bomba Nova: { x, y, t }
let powers;       // segundos restantes por efecto: { shield, triple, slow, hyper }
let novaCharges;  // cargas de Bomba Nova guardadas (máx. 1)
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  novaFx    = [];
  powers    = { shield: 0, triple: 0, slow: 0, hyper: 0 };
  novaCharges = 0;
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  powerups  = [];
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function maybeDropPowerUp(x, y) {
  if (powerups.length >= POWERUP_MAX_ON_SCREEN) return;
  if (Math.random() >= POWERUP_DROP_CHANCE) return;
  powerups.push(new PowerUp(x, y, pickWeighted(POWERUP_DEFS)));
}

function applyPowerUp(type) {
  const def = POWERUP_DEFS[type];
  if (type === 'nova') novaCharges = 1;
  else powers[type] = def.duration;   // si ya estaba activo, el timer se reinicia
  for (let i = 0; i < 10; i++) particles.push(new Particle(ship.x, ship.y));
}

// Bomba Nova: destruye todos los asteroides a la vez, sin partirlos. Al
// quedar el campo vacío, update() avanza de nivel con la lógica de siempre.
function useNova() {
  novaCharges = 0;
  for (const a of asteroids) {
    score += POINTS[a.size];
    explode(a.x, a.y, a.size * 5);
    a.dead = true;
  }
  asteroids = [];
  novaFx.push({ x: ship.x, y: ship.y, t: 0 });
}

// El escudo absorbe un único impacto: destruye el asteroide (se parte como
// con una bala) y se consume. Unos instantes de gracia evitan que muera con
// uno de los fragmentos recién creados pegados a la nave.
function absorbHitWithShield(a) {
  a.dead = true;
  score += POINTS[a.size];
  explode(a.x, a.y, a.size * 5);
  asteroids = asteroids.filter(x => !x.dead).concat(a.split());
  powers.shield = 0;
  ship.invincible = SHIELD_GRACE;
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  // Al morir se pierden los efectos temporales; la Nova guardada se conserva
  for (const k in powers) powers[k] = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
// Con slow motion solo los asteroides (movimiento y rotación) usan un dt
// reducido; nave, balas, partículas e ítems siguen a velocidad normal.
function asteroidDt(dt) {
  return powers.slow > 0 ? dt * SLOW_FACTOR : dt;
}

function update(dt) {
  novaFx.forEach(f => f.t += dt);
  novaFx = novaFx.filter(f => f.t < NOVA_FX_TIME);

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    pressed(NOVA_KEY);  // descarta pulsaciones hechas mientras la nave estaba destruida
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(asteroidDt(dt)));
    powerups.forEach(p => p.update(dt));
    powerups = powerups.filter(p => !p.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Se consume siempre la pulsación para que no quede "guardada" sin cargas
  if (pressed(NOVA_KEY) && novaCharges > 0) useNova();

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(asteroidDt(dt)));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));

  for (const k in powers) if (powers[k] > 0) powers[k] = Math.max(0, powers[k] - dt);

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);

  // Nave recoge power-up
  for (const p of powerups) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      applyPowerUp(p.type);
    }
  }
  powerups = powerups.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        maybeDropPowerUp(a.x, a.y);
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    // Con escudo activo la zona de impacto es la del círculo visible
    const hitRadius = powers.shield > 0 ? SHIELD_RADIUS : ship.radius;
    for (const a of asteroids) {
      if (dist(ship, a) < hitRadius + a.radius * 0.82) {
        if (powers.shield > 0) absorbHitWithShield(a);
        else killShip();
        break;
      }
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  drawPowerUpHUD();
}

// Barra por cada efecto temporal activo (abajo a la izquierda) e indicador de Nova (abajo a la derecha)
function drawPowerUpHUD() {
  const BAR_W = 80;
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  let row = 0;
  for (const type in powers) {
    if (powers[type] <= 0) continue;
    const def = POWERUP_DEFS[type];
    const y = H - 18 - row * 18;
    ctx.fillStyle = def.color;
    ctx.fillText(def.label, 14, y);
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(90.5, y - 9.5, BAR_W, 10);
    ctx.fillRect(91, y - 9, (BAR_W - 1) * (powers[type] / def.duration), 9);
    row++;
  }

  if (novaCharges > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = POWERUP_DEFS.nova.color;
    ctx.fillText('NOVA [B]', W - 14, H - 18);
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

// Dos anillos concéntricos que se expanden desde la nave y se desvanecen
function drawNovaFx() {
  const MAX_R = Math.hypot(W, H);
  const color = POWERUP_DEFS.nova.color;
  ctx.save();
  ctx.strokeStyle = color;
  for (const f of novaFx) {
    const k = f.t / NOVA_FX_TIME;
    const eased = 1 - (1 - k) * (1 - k);  // arranca rápido y frena
    ctx.globalAlpha = 1 - k;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(f.x, f.y, eased * MAX_R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(f.x, f.y, eased * MAX_R * 0.8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// Círculo de energía que pulsa; parpadea cuando quedan menos de 1.5 s
function drawShield() {
  if (ship.dead || powers.shield <= 0) return;
  if (powers.shield < 1.5 && Math.floor(powers.shield * 8) % 2 === 0) return;
  const t = performance.now() / 1000;
  const pulse = Math.sin(t * 8);
  ctx.save();
  ctx.strokeStyle = POWERUP_DEFS.shield.color;
  ctx.globalAlpha = 0.65 + 0.2 * pulse;
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.arc(ship.x, ship.y, SHIELD_RADIUS + pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerups.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();
  drawShield();
  drawNovaFx();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
