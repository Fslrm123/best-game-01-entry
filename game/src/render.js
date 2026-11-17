// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. Glow comes from radial gradients and additive blending, never from an image: the
// whole game is drawn from code, so it stays sharp at any size and loads nothing.

import { FIELD, FONT, LIVES, NOVA, PALETTE, SHARD, WIN_SCORE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** The panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 640, top: 150, line: 32, bottom: 76 };

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('SCORE ');
  const bestLabel = cachedLabel('BEST ');
  const levelLabel = cachedLabel('LEVEL ');
  const finalLabel = cachedLabel('SCORE ');
  const comboLabel = cachedLabel('x');
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function font(size) {
    if (!fonts.has(size)) fonts.set(size, `700 ${size}px ${FONT}`);
    return fonts.get(size);
  }

  function text(value, x, y, size, color, align, baseline) {
    context.font = font(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = baseline ?? 'alphabetic';
    context.fillText(value, x, y);
  }

  /** A client (page) point in field coordinates, for pointer steering. */
  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const px = (clientX - rect.left) * ratio;
    const py = (clientY - rect.top) * ratio;
    return { x: (px - view.x) / view.scale, y: (py - view.y) / view.scale };
  }

  function drawBackground(state) {
    const sky = context.createLinearGradient(0, 0, 0, FIELD.height);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(0.55, PALETTE.skyMid);
    sky.addColorStop(1, PALETTE.skyBottom);
    context.fillStyle = sky;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    for (const nebula of state.nebulas) {
      const drift = Math.sin(state.elapsed * 0.05) * nebula.drift;
      const glow = context.createRadialGradient(nebula.x + drift, nebula.y, 0, nebula.x + drift, nebula.y, nebula.radius);
      glow.addColorStop(0, `rgba(${nebula.color}, 0.20)`);
      glow.addColorStop(1, `rgba(${nebula.color}, 0)`);
      context.fillStyle = glow;
      context.fillRect(nebula.x - nebula.radius, nebula.y - nebula.radius, nebula.radius * 2, nebula.radius * 2);
    }

    for (const star of state.stars) {
      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(state.elapsed * 2 + star.phase));
      context.globalAlpha = twinkle * star.layer;
      context.fillStyle = '#dfe8ff';
      context.fillRect(star.x, star.y, star.size, star.size);
    }
    context.globalAlpha = 1;
  }

  function drawShard(shard, now) {
    const pulse = 1 + 0.12 * Math.sin(now * 5 + shard.phase);
    const r = SHARD.radius * pulse;
    context.save();
    context.translate(shard.x, shard.y);
    context.globalCompositeOperation = 'lighter';
    const glow = context.createRadialGradient(0, 0, 0, 0, 0, r * 2.6);
    glow.addColorStop(0, 'rgba(255, 217, 74, 0.55)');
    glow.addColorStop(1, 'rgba(255, 157, 0, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, r * 2.6, 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = 'source-over';
    // A four-point sparkle.
    context.fillStyle = PALETTE.shard;
    context.beginPath();
    context.moveTo(0, -r);
    context.quadraticCurveTo(0, 0, r, 0);
    context.quadraticCurveTo(0, 0, 0, r);
    context.quadraticCurveTo(0, 0, -r, 0);
    context.quadraticCurveTo(0, 0, 0, -r);
    context.fill();
    context.fillStyle = '#fff6c9';
    context.beginPath();
    context.arc(0, 0, r * 0.32, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawRock(rock) {
    context.save();
    context.translate(rock.x, rock.y);
    context.rotate(rock.angle);
    context.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = rock.radius * rock.verts[i];
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.fillStyle = PALETTE.rock;
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = PALETTE.rockRim;
    context.stroke();
    context.beginPath();
    context.moveTo(-rock.radius * 0.4, -rock.radius * 0.2);
    context.lineTo(0, rock.radius * 0.15);
    context.lineTo(rock.radius * 0.45, -rock.radius * 0.35);
    context.lineWidth = 2;
    context.strokeStyle = PALETTE.rockCrack;
    context.stroke();
    context.restore();
  }

  function drawComet(state, now) {
    const comet = state.comet;
    // Blink while invulnerable after a hit: hidden on every other tenth of a second.
    if (comet.invulnerable > 0 && Math.floor(now * 10) % 2 === 0) return;
    context.save();
    context.globalCompositeOperation = 'lighter';
    const glow = context.createRadialGradient(comet.x, comet.y, 0, comet.x, comet.y, comet.radius * 3.4);
    glow.addColorStop(0, 'rgba(125, 249, 255, 0.75)');
    glow.addColorStop(0.4, 'rgba(79, 195, 247, 0.28)');
    glow.addColorStop(1, 'rgba(79, 195, 247, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(comet.x, comet.y, comet.radius * 3.4, 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = PALETTE.cometCore;
    context.beginPath();
    context.arc(comet.x, comet.y, comet.radius * 0.62, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.cometGlow;
    context.beginPath();
    context.arc(comet.x, comet.y, comet.radius, 0, Math.PI * 2);
    context.globalAlpha = 0.35;
    context.fill();
    context.restore();
  }

  function drawParticles(state) {
    context.save();
    context.globalCompositeOperation = 'lighter';
    for (const particle of state.particles) {
      if (!particle.active) continue;
      const fade = particle.life / particle.maxLife;
      if (particle.kind === 'ring') {
        context.globalAlpha = fade * 0.9;
        context.lineWidth = 5 * fade + 1;
        context.strokeStyle = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * (1 - fade * 0.55), 0, Math.PI * 2);
        context.stroke();
        continue;
      }
      context.globalAlpha = fade;
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, Math.max(0.5, particle.size * fade), 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function drawPopups(state) {
    for (const popup of state.popups) {
      if (!popup.active) continue;
      const fade = popup.life / popup.maxLife;
      context.globalAlpha = Math.min(1, fade * 2);
      text(popup.text, popup.x, popup.y, popup.size, popup.color, 'center');
    }
    context.globalAlpha = 1;
  }

  function drawHud(state, best, muted) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 26, 18, 30, PALETTE.text, 'left', 'top');
    // Goal progress: how far to the 300-point win.
    const barWidth = 190;
    const barX = 26;
    const barY = 56;
    context.fillStyle = 'rgba(244, 241, 255, 0.18)';
    context.fillRect(barX, barY, barWidth, 8);
    context.fillStyle = PALETTE.gold;
    context.fillRect(barX, barY, barWidth * Math.min(1, state.score / WIN_SCORE), 8);
    text(`GOAL ${WIN_SCORE}`, barX + barWidth + 10, barY - 4, 15, PALETTE.muted, 'left', 'top');

    text(levelLabel(state.level), FIELD.width / 2, 18, 30, PALETTE.text, 'center', 'top');

    // Lives: three little comets, dimmed as they are lost.
    const lifeGap = 34;
    const firstLife = FIELD.width - 26 - LIVES * lifeGap + 12;
    for (let life = 0; life < LIVES; life += 1) {
      const cx = firstLife + life * lifeGap;
      const cy = 34;
      context.globalAlpha = life < state.lives ? 1 : 0.22;
      context.fillStyle = PALETTE.cometGlow;
      context.beginPath();
      context.arc(cx, cy, 11, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.cometCore;
      context.beginPath();
      context.arc(cx, cy, 5, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;

    // Combo meter: a draining bar under the score, with the multiplier.
    if (state.combo > 1) {
      const comboWidth = 150;
      const comboX = 26;
      const comboY = 78;
      context.fillStyle = 'rgba(244, 241, 255, 0.18)';
      context.fillRect(comboX, comboY, comboWidth, 7);
      context.fillStyle = PALETTE.shard;
      context.fillRect(comboX, comboY, comboWidth * (state.comboTimer / SHARD.comboWindow), 7);
      text(`${comboLabel(state.multiplier)} COMBO`, comboX + comboWidth + 10, comboY - 5, 17, PALETTE.shard, 'left', 'top');
    }

    // Nova charges: three orbs, bottom-left.
    const orbY = FIELD.height - 34;
    for (let charge = 0; charge < NOVA.maxCharges; charge += 1) {
      const cx = 40 + charge * 34;
      const filled = charge < state.novaCharges;
      context.globalAlpha = filled ? 1 : 0.25;
      context.fillStyle = filled ? '#7df9ff' : '#5a5470';
      context.beginPath();
      context.arc(cx, orbY, 11, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(cx, orbY, 4, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    text('NOVA  [SPACE / CLICK]', 40 + NOVA.maxCharges * 34 + 6, orbY - 9, 15, PALETTE.muted, 'left', 'top');
    text(bestLabel(best), FIELD.width - 26, FIELD.height - 30, 15, PALETTE.muted, 'right', 'top');
    if (muted) text('MUTED  [M]', FIELD.width / 2, FIELD.height - 30, 15, PALETTE.muted, 'center', 'top');
  }

  function drawBanner(state) {
    const banner = state.banner;
    if (banner.timer <= 0) return;
    const fade = Math.min(1, banner.timer / 0.4);
    context.globalAlpha = fade;
    text(banner.text, FIELD.width / 2, 150, 54, PALETTE.gold, 'center');
    text(banner.sub, FIELD.width / 2, 190, 22, PALETTE.text, 'center');
    context.globalAlpha = 1;
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.lineWidth = 2;
    context.strokeStyle = PALETTE.panelEdge;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 82, 52, accent ?? PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.gold, 'center');
  }

  const TITLE_LINES = [
    'Ride the comet. Gather the starlight.',
    'Steer with ← ↑ ↓ → / WASD, or guide it with the mouse.',
    'Catch gold shards to build a combo. Dodge the void rocks.',
    'SPACE or click fires a NOVA burst — 3 charges, they recharge.',
    'Reach 500 points and the constellation is yours.  P pauses, M mutes.',
    '',
  ];
  const PAUSED_LINES = ['The drift waits for you.'];
  const OVER_LINES = ['', ''];
  const WIN_LINES = ['', '', ''];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, muted) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = state.shake > 0 ? Math.sin(state.elapsed * 61) * state.shake : 0;
    const shakeY = state.shake > 0 ? Math.cos(state.elapsed * 53) * state.shake : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    drawBackground(state);
    for (const shard of state.shards) if (shard.active) drawShard(shard, state.elapsed);
    for (const rock of state.rocks) if (rock.active) drawRock(rock);
    drawParticles(state);
    drawComet(state, state.elapsed);
    drawPopups(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[5] = bestLabel(best);
      drawPanel('NOVA DRIFT', TITLE_LINES, 'Press Space or click to start');
      return;
    }
    drawHud(state, best, muted);
    drawBanner(state);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      drawPanel('Game over', OVER_LINES, 'Press Space or click to play again');
    } else if (screen === SCREEN_WIN) {
      WIN_LINES[0] = finalLabel(state.score);
      WIN_LINES[1] = bestLabel(best);
      WIN_LINES[2] = 'The constellation is complete.';
      drawPanel('STARBORN!', WIN_LINES, 'Press C to keep drifting, or Space to play again', PALETTE.gold);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view, toField };
}
