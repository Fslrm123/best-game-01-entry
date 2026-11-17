// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Points that complete the constellation and win the game. */
export const WIN_SCORE = 500;

export const COMET = {
  radius: 14,
  thrust: 1500,
  maxSpeed: 470,
  /** Exponential drag, per second, while no thrust is applied. */
  drag: 2.4,
  invulnerable: 1.5,
};

export const LIVES = 3;

export const SHARD = {
  radius: 10,
  value: 10,
  speed: 70,
  speedJitter: 50,
  interval: 1.05,
  intervalJitter: 0.55,
  /** Seconds a pickup keeps the combo alive; each pickup refreshes it. */
  comboWindow: 2.5,
  /** One multiplier step per 5 chained pickups, capped. */
  comboStep: 5,
  maxMultiplier: 5,
};

export const ROCK = {
  minRadius: 15,
  maxRadius: 30,
  speed: 165,
  speedPerLevel: 16,
  speedJitter: 60,
  interval: 0.95,
  intervalScale: 0.88,
  minInterval: 0.34,
  /** Points for shattering a rock with a nova burst. */
  shatterPoints: 5,
};

export const NOVA = {
  radius: 235,
  maxCharges: 3,
  /** Seconds to recharge one spent charge. */
  recharge: 8,
};

/** One level per 20 shards gathered; speeds and spawn rates stop growing at the last level. */
export const LEVEL = { shardsPerLevel: 20, max: 12 };

/** How many things of each kind can exist at once; the pools are allocated once, at boot. */
export const POOL_SIZE = {
  shards: 48,
  rocks: 48,
  particles: 320,
  popups: 24,
  stars: 130,
};

export const PALETTE = {
  backdrop: '#070313',
  skyTop: '#0b0626',
  skyMid: '#1a0b3d',
  skyBottom: '#2a1155',
  nebulaPink: '#ff2e88',
  nebulaViolet: '#7b2ff7',
  nebulaCyan: '#00c2ff',
  cometCore: '#ffffff',
  cometGlow: '#7df9ff',
  cometTrail: '#4fc3f7',
  shard: '#ffd94a',
  shardGlow: '#ff9d00',
  rock: '#241a33',
  rockRim: '#ff2e63',
  rockCrack: '#b06bff',
  text: '#f4f1ff',
  muted: '#a89fc7',
  gold: '#ffd94a',
  danger: '#ff2e63',
  panel: 'rgba(12, 8, 32, 0.82)',
  panelEdge: 'rgba(125, 249, 255, 0.35)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'nova-drift.best';
