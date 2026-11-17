// Keyboard and pointer input. Held keys give a steering vector; one-shot presses (start,
// nova, pause, mute, restart) are queued as bit flags and taken once by the loop, so a press
// between two frames is never lost and never counted twice. The pointer steers the comet when
// it moves and fires a nova on click; a click on a menu screen confirms instead.

export const ACTION_CONFIRM = 1;
export const ACTION_NOVA = 2;
export const ACTION_PAUSE = 4;
export const ACTION_MUTE = 8;
export const ACTION_RESTART = 16;
export const ACTION_CONTINUE = 32;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Enter']);
const NOVA = new Set(['Space']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const RESTART = new Set(['KeyR']);
const CONTINUE = new Set(['KeyC']);

/**
 * `toField` converts a client (page) point to field coordinates; the loop passes the
 * renderer's mapping. `isMenu` tells input whether a click means "confirm" (menu screens)
 * or "nova" (during play).
 */
export function createInput(target, toField, isMenu) {
  let left = false;
  let right = false;
  let up = false;
  let down = false;
  let actions = 0;
  let pointer = null;
  let pointerFresh = 0;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (NOVA.has(event.code)) {
      // Space is both "nova" in play and "confirm" on a menu screen, so one key starts
      // the game, fires a burst mid-game, and restarts after it ends; each screen only
      // reads the flag it uses.
      if (!event.repeat) actions |= ACTION_NOVA | ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (CONTINUE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONTINUE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    up = false;
    down = false;
    pointer = null;
  });
  target.addEventListener('pointermove', (event) => {
    pointer = toField(event.clientX, event.clientY);
    pointerFresh = 2;
  });
  target.addEventListener('pointerdown', (event) => {
    pointer = toField(event.clientX, event.clientY);
    pointerFresh = 2;
    if (isMenu()) actions |= ACTION_CONFIRM;
    else actions |= ACTION_NOVA;
  });

  return {
    /** The steering vector from held keys: each axis -1, 0 or 1. */
    thrust() {
      return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
    },
    /** The pointer's field position while it is a live guide, else null. */
    pointerTarget() {
      if (pointer === null || pointerFresh <= 0) return null;
      pointerFresh -= 1;
      return pointer;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
