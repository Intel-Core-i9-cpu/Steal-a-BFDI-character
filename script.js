const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const nodes = {
  scoreBlue: document.getElementById("scoreBlue"),
  scoreOrange: document.getElementById("scoreOrange"),
  carryBlue: document.getElementById("carryBlue"),
  carryOrange: document.getElementById("carryOrange"),
  eventLog: document.getElementById("eventLog")
};

const CHARACTER_POOL = [
  { name: "Leafy", speed: 0.65, value: 1, weight: 20, color: "#6dff8f" },
  { name: "Firey", speed: 0.8, value: 2, weight: 18, color: "#ff7a40" },
  { name: "Bubble", speed: 0.92, value: 1, weight: 18, color: "#88deff" },
  { name: "Coiny", speed: 0.68, value: 2, weight: 14, color: "#ffcd5b" },
  { name: "Pin", speed: 0.78, value: 3, weight: 11, color: "#ff68d1" },
  { name: "Tennis Ball", speed: 0.76, value: 2, weight: 8, color: "#d0ff63" },
  { name: "Flower", speed: 1.0, value: 3, weight: 6, color: "#f57bff" },
  { name: "Gelatin", speed: 0.9, value: 4, weight: 3, color: "#a088ff" },
  { name: "Four", speed: 1.1, value: 5, weight: 1.5, color: "#5e4aff" },
  { name: "X", speed: 1.2, value: 5, weight: 0.5, color: "#fff466" }
];

const CONTROL_MAP = {
  blue: { left: ["KeyA"], right: ["KeyD"], up: ["KeyW"], down: ["KeyS"], action: "KeyE" },
  orange: { left: ["ArrowLeft"], right: ["ArrowRight"], up: ["ArrowUp"], down: ["ArrowDown"], action: "KeyM" }
};

const state = {
  scores: { blue: 0, orange: 0 },
  blue: { team: "blue", pos: { x: -11, z: 11 }, carry: null },
  orange: { team: "orange", pos: { x: 11, z: 11 }, carry: null },
  characters: [],
  nextSpawnAt: 0
};

const keys = new Set();

function setLog(message) {
  nodes.eventLog.textContent = message;
}

function weightedPick() {
  const total = CHARACTER_POOL.reduce((sum, c) => sum + c.weight, 0);
  let rng = Math.random() * total;
  for (const c of CHARACTER_POOL) {
    rng -= c.weight;
    if (rng <= 0) return c;
  }
  return CHARACTER_POOL[0];
}

function spawnCharacter() {
  const seed = weightedPick();
  state.characters.push({
    id: Math.random().toString(36).slice(2, 9),
    ...seed,
    pos: { x: (Math.random() - 0.5) * 2.8, z: -24 },
    carrier: null,
    storedAt: null
  });
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function basePos(team) {
  return team === "blue" ? { x: -11, z: 11 } : { x: 11, z: 11 };
}

function handlePlayerMovement(player, controls, speed) {
  let dx = 0;
  let dz = 0;
  if (controls.left.some((k) => keys.has(k))) dx -= 1;
  if (controls.right.some((k) => keys.has(k))) dx += 1;
  if (controls.up.some((k) => keys.has(k))) dz -= 1;
  if (controls.down.some((k) => keys.has(k))) dz += 1;

  const len = Math.hypot(dx, dz) || 1;
  player.pos.x = clamp(player.pos.x + (dx / len) * speed, -18, 18);
  player.pos.z = clamp(player.pos.z + (dz / len) * speed, -30, 18);
}

function attemptGrabOrDrop(player) {
  if (player.carry) {
    const carried = state.characters.find((c) => c.id === player.carry);
    if (!carried) return;

    const home = basePos(player.team);
    if (dist(player.pos, home) < 4.2) {
      carried.carrier = null;
      carried.storedAt = player.team;
      carried.pos = { x: home.x + (Math.random() - 0.5) * 2, z: home.z + (Math.random() - 0.5) * 2 };
      player.carry = null;
      state.scores[player.team] += carried.value;
      setLog(`${player.team.toUpperCase()} scored ${carried.name} (+${carried.value})`);
      return;
    }

    carried.carrier = null;
    carried.pos = { x: player.pos.x + 0.6, z: player.pos.z + 0.6 };
    player.carry = null;
    setLog(`${player.team.toUpperCase()} dropped ${carried.name}`);
    return;
  }

  const enemy = player.team === "blue" ? "orange" : "blue";
  const stealable = state.characters.find((c) => c.storedAt === enemy && dist(player.pos, c.pos) < 4.2);
  if (stealable) {
    stealable.storedAt = null;
    stealable.carrier = player.team;
    player.carry = stealable.id;
    setLog(`${player.team.toUpperCase()} stole ${stealable.name} from ${enemy.toUpperCase()} base!`);
    return;
  }

  const free = state.characters.find((c) => !c.carrier && !c.storedAt && dist(player.pos, c.pos) < 2.1);
  if (free) {
    free.carrier = player.team;
    player.carry = free.id;
    setLog(`${player.team.toUpperCase()} grabbed ${free.name}`);
  }
}

function toScreen(pos) {
  const runwayTop = 120;
  const runwayBottom = canvas.height - 80;
  const zNorm = (pos.z + 30) / 48;
  const y = runwayTop + zNorm * (runwayBottom - runwayTop);
  const widthNear = canvas.width * 0.62;
  const widthFar = canvas.width * 0.14;
  const currentWidth = widthFar + zNorm * (widthNear - widthFar);
  const x = canvas.width / 2 + (pos.x / 18) * (currentWidth / 2);
  const scale = 0.45 + zNorm * 1.1;
  return { x, y, scale, zNorm };
}

function drawWorld() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#1a2758");
  sky.addColorStop(1, "#080c1a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const runwayTopY = 120;
  const runwayBottomY = canvas.height - 80;
  ctx.fillStyle = "#2b3155";
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.43, runwayTopY);
  ctx.lineTo(canvas.width * 0.57, runwayTopY);
  ctx.lineTo(canvas.width * 0.81, runwayBottomY);
  ctx.lineTo(canvas.width * 0.19, runwayBottomY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#3e4264";
  ctx.beginPath();
  ctx.ellipse(canvas.width / 2, 90, 90, 42, 0, Math.PI, 2 * Math.PI);
  ctx.fill();

  drawBase("blue", "#4e7cff", basePos("blue"));
  drawBase("orange", "#ff9f4f", basePos("orange"));
}

function drawBase(team, color, worldPos) {
  const p = toScreen(worldPos);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, 55 * p.scale, 20 * p.scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#eef3ff";
  ctx.font = `${Math.round(16 * p.scale)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`${team.toUpperCase()} BASE`, p.x, p.y - 24 * p.scale);
}

function drawPlayer(player, color) {
  const p = toScreen(player.pos);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y - 16 * p.scale, 12 * p.scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawCharacter(character) {
  const p = toScreen(character.pos);
  ctx.fillStyle = character.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y - 10 * p.scale, 10 * p.scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#eef3ff";
  ctx.font = `${Math.max(10, Math.round(12 * p.scale))}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`${character.name} SPD:${Math.round(character.speed * 10)} VAL:${character.value}`, p.x, p.y - 26 * p.scale);
}

function tick(now) {
  requestAnimationFrame(tick);

  if (now > state.nextSpawnAt && state.characters.length < 28) {
    spawnCharacter();
    state.nextSpawnAt = now + 2200;
  }

  handlePlayerMovement(state.blue, CONTROL_MAP.blue, 0.2);
  handlePlayerMovement(state.orange, CONTROL_MAP.orange, 0.2);

  for (const c of state.characters) {
    if (c.carrier) {
      const player = state[c.carrier];
      c.pos.x = player.pos.x;
      c.pos.z = player.pos.z - 1;
      c.storedAt = null;
    } else if (!c.storedAt) {
      c.pos.z += 0.03 * c.speed * 10;
      if (c.pos.z > 19) {
        c.pos.z = -24;
        c.pos.x = (Math.random() - 0.5) * 2.8;
      }
    }
  }

  drawWorld();

  const drawOrder = [...state.characters, { ...state.blue, type: "player", color: "#5f83ff" }, { ...state.orange, type: "player", color: "#ffa44a" }]
    .sort((a, b) => a.pos.z - b.pos.z);

  for (const item of drawOrder) {
    if (item.type === "player") {
      drawPlayer(item, item.color);
    } else {
      drawCharacter(item);
    }
  }

  nodes.scoreBlue.textContent = String(state.scores.blue);
  nodes.scoreOrange.textContent = String(state.scores.orange);
  nodes.carryBlue.textContent = state.characters.find((c) => c.id === state.blue.carry)?.name ?? "None";
  nodes.carryOrange.textContent = state.characters.find((c) => c.id === state.orange.carry)?.name ?? "None";
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  keys.add(event.code);
  if (event.code === CONTROL_MAP.blue.action) attemptGrabOrDrop(state.blue);
  if (event.code === CONTROL_MAP.orange.action) attemptGrabOrDrop(state.orange);
});
window.addEventListener("keyup", (event) => keys.delete(event.code));

resize();
spawnCharacter();
spawnCharacter();
setLog("Working build loaded: grab runway characters, bank at base, steal from enemy base.");
requestAnimationFrame(tick);
