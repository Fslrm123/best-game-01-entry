// The screenshot scenes behind ?shot=start|play|nova|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot (chase
// the nearest shard, keep clear of rocks, fire a nova when the rocks crowd in), so the frame
// is what a short game really looks like and the same seed always gives the same frame.

import { FIELD, NOVA, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const NOVA_LIMIT_SECONDS = 90;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** Steer toward the nearest shard, pushed away from any rock closer than this. */
const AVOID_RADIUS = 170;

/**
 * A steering vector: toward the nearest shard, with a repulsion shove from close rocks.
 * `reckless` ignores the rocks entirely (the end scene's pilot, hurrying to its doom).
 */
function autopilot(state, reckless) {
  const comet = state.comet;
  let shard = null;
  let shardDist = Infinity;
  for (const item of state.shards) {
    if (!item.active) continue;
    const dist = Math.hypot(item.x - comet.x, item.y - comet.y);
    if (dist < shardDist) {
      shardDist = dist;
      shard = item;
    }
  }
  let x = 0;
  let y = 0;
  if (shard !== null) {
    x = (shard.x - comet.x) / Math.max(1, shardDist);
    y = (shard.y - comet.y) / Math.max(1, shardDist);
  } else {
    x = (FIELD.width / 2 - comet.x) / FIELD.width;
    y = -0.4;
  }
  if (!reckless) {
    for (const rock of state.rocks) {
      if (!rock.active) continue;
      const dx = comet.x - rock.x;
      const dy = comet.y - rock.y;
      const dist = Math.hypot(dx, dy);
      if (dist < AVOID_RADIUS && dist > 1) {
        const push = (1 - dist / AVOID_RADIUS) * 2.4;
        x += (dx / dist) * push;
        y += (dy / dist) * push;
      }
    }
    // Keep off the walls: ease back toward the middle near an edge.
    if (comet.x < 90) x += 0.8;
    if (comet.x > FIELD.width - 90) x -= 0.8;
    if (comet.y < 80) y += 0.8;
    if (comet.y > FIELD.height - 80) y -= 0.8;
  }
  const len = Math.hypot(x, y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

/** True when a nova burst would catch at least three rocks right now. */
function novaWorthIt(state) {
  if (state.novaCharges <= 0) return false;
  let near = 0;
  for (const rock of state.rocks) {
    if (!rock.active) continue;
    if (Math.hypot(rock.x - state.comet.x, rock.y - state.comet.y) < NOVA.radius * 0.9) near += 1;
  }
  return near >= 3;
}

/**
 * Set `world` to the named scene (start, play, nova or end; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'win') {
    for (let index = 0; index < 600 / STEP; index += 1) {
      const events = world.step(STEP, autopilot(world.state, false), null, false);
      if (events & EVENT_WIN) break;
      if (events & EVENT_OVER) break;
    }
    return { screen: world.state.won ? SCREEN_WIN : SCREEN_OVER, best: world.state.score };
  }
  if (name !== 'play' && name !== 'nova' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      const drift = { x: Math.cos(world.state.elapsed * 0.35), y: Math.sin(world.state.elapsed * 0.35) * 0.6 };
      world.step(STEP, drift, null, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'nova') {
    for (let index = 0; index < NOVA_LIMIT_SECONDS / STEP; index += 1) {
      const events = world.step(STEP, autopilot(world.state, false), null, false);
      if (events & EVENT_OVER) break;
      // Let the field fill up first, so the burst lands in a busy frame.
      if (world.state.elapsed > 12 && novaWorthIt(world.state)) {
        world.nova();
        // Let the shockwave ring open for a few frames, then freeze it mid-burst.
        for (let frame = 0; frame < 9; frame += 1) world.step(STEP, { x: 0, y: 0 }, null, false);
        break;
      }
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const reckless = name === 'end';
  for (let index = 0; index < limit / STEP; index += 1) {
    if (world.step(STEP, autopilot(world.state, reckless), null, false) & EVENT_OVER) break;
  }
  const over = world.state.lives === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
