// Keyboard and mouse state for LUMEN DRIFT. The world reads this once per fixed
// step; the input never mutates the world itself. Mouse aim is in canvas pixels.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_NOVA = 'nova';
export const ACTION_RESTART = 'restart';
export const ACTION_MUTE = 'mute';
export const ACTION_UPGRADE_1 = 'upgrade1';
export const ACTION_UPGRADE_2 = 'upgrade2';
export const ACTION_UPGRADE_3 = 'upgrade3';

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  ' ': ACTION_CONFIRM,
  Escape: ACTION_PAUSE,
  p: ACTION_PAUSE,
  P: ACTION_PAUSE,
  r: ACTION_RESTART,
  R: ACTION_RESTART,
  m: ACTION_MUTE,
  M: ACTION_MUTE,
  1: ACTION_UPGRADE_1,
  2: ACTION_UPGRADE_2,
  3: ACTION_UPGRADE_3,
};

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 700, y: 300, down: false, clicked: false, clickX: 0, clickY: 0 };
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function toCanvas(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top - offsetY) / scale,
    };
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.key);
    const action = KEY_ACTIONS[event.key];
    if (action) {
      pressed.add(action);
      event.preventDefault();
    }
    // Space is both "confirm" on menus and "nova" in play; the world reads
    // whichever one fits its screen, so both actions are raised.
    if (event.key === ' ') pressed.add(ACTION_NOVA);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    keys.delete(event.key);
  }

  function onMouseMove(event) {
    const p = toCanvas(event.clientX, event.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
  }

  function onMouseDown(event) {
    const p = toCanvas(event.clientX, event.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.down = true;
    mouse.clicked = true;
    mouse.clickX = p.x;
    mouse.clickY = p.y;
    pressed.add(ACTION_CONFIRM);
  }

  function onMouseUp() {
    mouse.down = false;
  }

  function onContextMenu(event) {
    // Right click is the nova: never show the browser menu over the game.
    event.preventDefault();
    pressed.add(ACTION_NOVA);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('contextmenu', onContextMenu);

  return {
    mouse,
    /** Tell the input the canvas letterbox transform (from the renderer). */
    setTransform(nextScale, nextOffsetX, nextOffsetY) {
      scale = nextScale;
      offsetX = nextOffsetX;
      offsetY = nextOffsetY;
    },
    /** -1, 0 or 1 on each axis, from WASD or the arrow keys. */
    moveAxis() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('A') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('d') || keys.has('D') || keys.has('ArrowRight')) x += 1;
      if (keys.has('w') || keys.has('W') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('s') || keys.has('S') || keys.has('ArrowDown')) y += 1;
      return { x, y };
    },
    get firing() {
      return mouse.down;
    },
    /** True once per key press or mouse click; the world consumes it. */
    consume(action) {
      if (!pressed.has(action)) return false;
      pressed.delete(action);
      return true;
    },
    /** True once per mouse click, with its canvas position; consumed by the caller. */
    takeClick() {
      if (!mouse.clicked) return null;
      mouse.clicked = false;
      return { x: mouse.clickX, y: mouse.clickY };
    },
    clearClick() {
      mouse.clicked = false;
    },
  };
}
