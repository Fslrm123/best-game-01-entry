// The game's rules and state, with no drawing and no browser in it: the comet, the pools of
// star shards and void rocks, the nova burst, combo scoring, lives and levels. step() advances
// one fixed step and returns what happened as bit flags, so the caller can react without the
// world knowing about screens or sound. Nothing here allocates after createWorld returns.

import {
  COMET,
  FIELD,
  LEVEL,
  LIVES,
  NOVA,
  POOL_SIZE,
  ROCK,
  SHARD,
  WIN_SCORE,
} from './config.js';

export const EVENT_SHARD = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_WIN = 8;
export const EVENT_LEVEL = 16;
export const EVENT_NOVA = 32;

function circleHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const reach = ar + br;
  return dx * dx + dy * dy < reach * reach;
}

export function createWorld(random) {
  const comet = { x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0, radius: COMET.radius, invulnerable: 0 };
  const shards = [];
  const rocks = [];
  const particles = [];
  const popups = [];
  const stars = [];
  for (let i = 0; i < POOL_SIZE.shards; i += 1) shards.push({ active: false, x: 0, y: 0, speed: 0, phase: 0, sway: 0 });
  for (let i = 0; i < POOL_SIZE.rocks; i += 1) {
    rocks.push({ active: false, x: 0, y: 0, radius: 0, speed: 0, angle: 0, spin: 0, verts: [0, 0, 0, 0, 0, 0, 0, 0] });
  }
  for (let i = 0; i < POOL_SIZE.particles; i += 1) {
    particles.push({ active: false, kind: 'burst', x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 0, color: '#ffffff', growth: 0 });
  }
  for (let i = 0; i < POOL_SIZE.popups; i += 1) {
    popups.push({ active: false, x: 0, y: 0, life: 0, maxLife: 1, text: '', color: '#ffffff', size: 20 });
  }
  for (let i = 0; i < POOL_SIZE.stars; i += 1) {
    stars.push({ x: 0, y: 0, layer: 0.3, size: 1, phase: 0 });
  }
  const nebulas = [
    { x: 220, y: 140, radius: 260, color: '124, 47, 247', drift: 6 },
    { x: 1050, y: 560, radius: 300, color: '255, 46, 136', drift: -5 },
    { x: 980, y: 120, radius: 220, color: '0, 194, 255', drift: 4 },
  ];
  const state = {
    comet, shards, rocks, particles, popups, stars, nebulas,
    score: 0, lives: LIVES, level: 1, shardsCollected: 0,
    combo: 0, comboTimer: 0, multiplier: 1,
    novaCharges: NOVA.maxCharges, novaRecharge: 0,
    banner: { text: '', sub: '', timer: 0 },
    shake: 0, elapsed: 0, shardTimer: 0, rockTimer: 0, won: false,
  };

  function reset() {
    comet.x = FIELD.width / 2;
    comet.y = FIELD.height * 0.62;
    comet.vx = 0;
    comet.vy = 0;
    comet.invulnerable = 0;
    for (const shard of shards) shard.active = false;
    for (const rock of rocks) rock.active = false;
    for (const particle of particles) particle.active = false;
    for (const popup of popups) popup.active = false;
    for (const star of stars) {
      star.x = random() * FIELD.width;
      star.y = random() * FIELD.height;
      star.layer = 0.25 + random() * 0.75;
      star.size = 0.8 + random() * 1.8;
      star.phase = random() * Math.PI * 2;
    }
    state.score = 0;
    state.lives = LIVES;
    state.level = 1;
    state.shardsCollected = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.multiplier = 1;
    state.novaCharges = NOVA.maxCharges;
    state.novaRecharge = 0;
    state.banner = { text: '', sub: '', timer: 0 };
    state.shake = 0;
    state.elapsed = 0;
    state.shardTimer = SHARD.interval;
    state.rockTimer = ROCK.interval;
    state.won = false;
  }

  function free(pool) {
    for (let i = 0; i < pool.length; i += 1) if (!pool[i].active) return pool[i];
    return null;
  }

  function spawnParticle(kind, x, y, vx, vy, life, size, color, growth) {
    const p = free(particles);
    if (p === null) return;
    p.active = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.maxLife = life;
    p.size = size;
    p.color = color;
    p.growth = growth;
  }

  function burst(x, y, color, count, speed, size) {
    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      const power = speed * (0.3 + random() * 0.7);
      spawnParticle('burst', x, y, Math.cos(angle) * power, Math.sin(angle) * power, 0.45 + random() * 0.35, size * (0.6 + random() * 0.8), color, 0);
    }
  }

  function popup(x, y, text, color, size) {
    const p = free(popups);
    if (p === null) return;
    p.active = true;
    p.x = x;
    p.y = y;
    p.life = 0.9;
    p.maxLife = 0.9;
    p.text = text;
    p.color = color;
    p.size = size;
  }

  function spawnShard() {
    const shard = free(shards);
    if (shard === null) return;
    shard.active = true;
    shard.x = 30 + random() * (FIELD.width - 60);
    shard.y = -20;
    shard.speed = SHARD.speed + random() * SHARD.speedJitter;
    shard.phase = random() * Math.PI * 2;
    shard.sway = 18 + random() * 26;
  }

  function spawnRock() {
    const rock = free(rocks);
    if (rock === null) return;
    rock.active = true;
    rock.radius = ROCK.minRadius + random() * (ROCK.maxRadius - ROCK.minRadius);
    rock.x = 40 + random() * (FIELD.width - 80);
    rock.y = -rock.radius * 2;
    rock.speed = ROCK.speed + ROCK.speedPerLevel * (state.level - 1) + random() * ROCK.speedJitter;
    rock.angle = random() * Math.PI * 2;
    rock.spin = (random() - 0.5) * 1.6;
    for (let i = 0; i < 8; i += 1) rock.verts[i] = 0.72 + random() * 0.43;
  }

  function rockInterval() {
    return Math.max(ROCK.minInterval, ROCK.interval * ROCK.intervalScale ** (state.level - 1));
  }

  function recomputeMultiplier() {
    state.multiplier = Math.min(SHARD.maxMultiplier, 1 + Math.floor(state.combo / SHARD.comboStep));
  }

  function collectShard(shard, byNova) {
    shard.active = false;
    state.combo += 1;
    state.comboTimer = SHARD.comboWindow;
    recomputeMultiplier();
    const points = SHARD.value * state.multiplier;
    state.score += points;
    state.shardsCollected += 1;
    burst(shard.x, shard.y, '#ffd94a', byNova ? 4 : 8, 170, 3.5);
    popup(shard.x, shard.y - 14, `+${points}`, '#ffd94a', state.multiplier > 1 ? 24 : 20);
    const nextLevel = Math.min(LEVEL.max, 1 + Math.floor(state.shardsCollected / LEVEL.shardsPerLevel));
    if (nextLevel > state.level) {
      state.level = nextLevel;
      state.banner = { text: `LEVEL ${nextLevel}`, sub: 'The drift quickens', timer: 1.6 };
      return EVENT_LEVEL;
    }
    return 0;
  }

  /**
   * Fire a nova burst: shatters every rock and gathers every shard inside the radius.
   * Returns how many of each it caught, so the caller can play the right sounds.
   */
  function nova() {
    if (state.novaCharges <= 0) return { shards: 0, rocks: 0, fired: false };
    state.novaCharges -= 1;
    state.novaRecharge = NOVA.recharge;
    spawnParticle('ring', comet.x, comet.y, 0, 0, 0.55, NOVA.radius, '#7df9ff', 1);
    let caughtShards = 0;
    let caughtRocks = 0;
    let levelEvent = 0;
    for (const shard of shards) {
      if (!shard.active) continue;
      if (circleHit(comet.x, comet.y, NOVA.radius, shard.x, shard.y, SHARD.radius)) {
        levelEvent |= collectShard(shard, true);
        caughtShards += 1;
      }
    }
    for (const rock of rocks) {
      if (!rock.active) continue;
      if (circleHit(comet.x, comet.y, NOVA.radius, rock.x, rock.y, rock.radius)) {
        rock.active = false;
        burst(rock.x, rock.y, '#b06bff', 12, 220, 4);
        state.score += ROCK.shatterPoints;
        popup(rock.x, rock.y - 10, `+${ROCK.shatterPoints}`, '#b06bff', 18);
        caughtRocks += 1;
      }
    }
    state.shake = Math.max(state.shake, 7);
    return { shards: caughtShards, rocks: caughtRocks, fired: true, levelEvent };
  }

  /**
   * One fixed step. `thrust` is a unit-ish {x, y} steering vector (or {0,0}); `target` is a
   * pointer position in field coordinates the comet steers toward, or null. With `harmless`
   * set (the title screen's backdrop) things drift but nothing touches the comet and nothing
   * scores.
   */
  function step(dt, thrust, target, harmless) {
    let events = 0;
    state.elapsed += dt;
    if (state.banner.timer > 0) state.banner.timer -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);

    // Steering: keyboard thrust, or accelerate toward the pointer when it is the guide.
    let ax = 0;
    let ay = 0;
    if (target !== null) {
      const dx = target.x - comet.x;
      const dy = target.y - comet.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6) {
        const pull = Math.min(1, dist / 160);
        ax = (dx / dist) * COMET.thrust * pull;
        ay = (dy / dist) * COMET.thrust * pull;
      }
    } else if (thrust.x !== 0 || thrust.y !== 0) {
      const len = Math.hypot(thrust.x, thrust.y);
      ax = (thrust.x / len) * COMET.thrust;
      ay = (thrust.y / len) * COMET.thrust;
    }
    comet.vx += ax * dt;
    comet.vy += ay * dt;
    const drag = Math.exp(-COMET.drag * dt);
    comet.vx *= drag;
    comet.vy *= drag;
    const speed = Math.hypot(comet.vx, comet.vy);
    if (speed > COMET.maxSpeed) {
      comet.vx = (comet.vx / speed) * COMET.maxSpeed;
      comet.vy = (comet.vy / speed) * COMET.maxSpeed;
    }
    comet.x = Math.min(FIELD.width - comet.radius, Math.max(comet.radius, comet.x + comet.vx * dt));
    comet.y = Math.min(FIELD.height - comet.radius, Math.max(comet.radius, comet.y + comet.vy * dt));
    if (comet.invulnerable > 0) comet.invulnerable = Math.max(0, comet.invulnerable - dt);

    // A glowing trail, every step, while the comet moves.
    if (speed > 40) {
      spawnParticle('trail', comet.x - (comet.vx / speed) * comet.radius, comet.y - (comet.vy / speed) * comet.radius, -comet.vx * 0.12, -comet.vy * 0.12, 0.4, 5 + random() * 4, '#4fc3f7', -6);
    }

    // Combo window drains; losing it drops the chain back to one.
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = 0;
        recomputeMultiplier();
      }
    }

    // One nova charge recharges at a time.
    if (state.novaCharges < NOVA.maxCharges) {
      state.novaRecharge -= dt;
      if (state.novaRecharge <= 0) {
        state.novaCharges += 1;
        state.novaRecharge = NOVA.recharge;
      }
    }

    state.shardTimer -= dt;
    if (state.shardTimer <= 0) {
      spawnShard();
      state.shardTimer += SHARD.interval + random() * SHARD.intervalJitter;
    }
    state.rockTimer -= dt;
    if (state.rockTimer <= 0) {
      spawnRock();
      state.rockTimer += rockInterval();
    }

    for (const shard of shards) {
      if (!shard.active) continue;
      shard.y += shard.speed * dt;
      shard.x += Math.sin(state.elapsed * 1.8 + shard.phase) * shard.sway * dt;
      if (shard.y > FIELD.height + 30) {
        shard.active = false;
        continue;
      }
      if (harmless) continue;
      if (circleHit(comet.x, comet.y, comet.radius, shard.x, shard.y, SHARD.radius)) {
        events |= EVENT_SHARD;
        events |= collectShard(shard, false);
      }
    }

    for (const rock of rocks) {
      if (!rock.active) continue;
      rock.y += rock.speed * dt;
      rock.angle += rock.spin * dt;
      if (rock.y > FIELD.height + rock.radius * 2) {
        rock.active = false;
        continue;
      }
      if (harmless) continue;
      if (comet.invulnerable === 0 && circleHit(comet.x, comet.y, comet.radius * 0.85, rock.x, rock.y, rock.radius * 0.9)) {
        rock.active = false;
        burst(rock.x, rock.y, '#ff2e63', 16, 260, 4.5);
        state.lives -= 1;
        state.combo = 0;
        state.comboTimer = 0;
        recomputeMultiplier();
        state.shake = 14;
        comet.invulnerable = COMET.invulnerable;
        events |= EVENT_HIT;
        if (state.lives === 0) {
          events |= EVENT_OVER;
          break;
        }
      }
    }

    for (const star of stars) {
      star.y += star.layer * 12 * dt;
      if (star.y > FIELD.height + 2) {
        star.y = -2;
        star.x = random() * FIELD.width;
      }
    }

    for (const particle of particles) {
      if (!particle.active) continue;
      particle.life -= dt;
      if (particle.life <= 0) {
        particle.active = false;
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.exp(-2 * dt);
      particle.vy *= Math.exp(-2 * dt);
      if (particle.growth !== 0) particle.size += particle.growth * dt * 60;
    }

    for (const popup of popups) {
      if (!popup.active) continue;
      popup.life -= dt;
      if (popup.life <= 0) popup.active = false;
      popup.y -= 42 * dt;
    }

    if (!harmless && !state.won && state.score >= WIN_SCORE) {
      state.won = true;
      events |= EVENT_WIN;
    }
    return events;
  }

  reset();
  return { state, reset, step, nova };
}
