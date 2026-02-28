(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const ui = {
    blueScore: document.getElementById("blueScore"),
    orangeScore: document.getElementById("orangeScore"),
    blueCarry: document.getElementById("blueCarry"),
    orangeCarry: document.getElementById("orangeCarry"),
    log: document.getElementById("log")
  };

  const roster = [
    { name: "Leafy", value: 1, speed: 0.62, color: "#72ff93", weight: 25 },
    { name: "Firey", value: 2, speed: 0.78, color: "#ff8c45", weight: 20 },
    { name: "Bubble", value: 1, speed: 0.86, color: "#8fdbff", weight: 18 },
    { name: "Coiny", value: 2, speed: 0.7, color: "#ffd36e", weight: 14 },
    { name: "Pin", value: 3, speed: 0.75, color: "#ff77da", weight: 11 },
    { name: "Flower", value: 3, speed: 0.95, color: "#f28fff", weight: 7 },
    { name: "Gelatin", value: 4, speed: 0.9, color: "#a995ff", weight: 4 },
    { name: "Four", value: 5, speed: 1.05, color: "#6550ff", weight: 1 }
  ];

  const controls = {
    blue: { up: ["KeyW"], down: ["KeyS"], left: ["KeyA"], right: ["KeyD"], act: "KeyE" },
    orange: { up: ["ArrowUp"], down: ["ArrowDown"], left: ["ArrowLeft"], right: ["ArrowRight"], act: "KeyM" }
  };

  const state = {
    keys: new Set(),
    players: {
      blue: { team: "blue", x: -11, z: 11, carrying: null, score: 0, color: "#5f84ff" },
      orange: { team: "orange", x: 11, z: 11, carrying: null, score: 0, color: "#ffaa57" }
    },
    chars: [],
    spawnAt: 0
  };

  const base = {
    blue: { x: -11, z: 11, color: "#4d79ff" },
    orange: { x: 11, z: 11, color: "#ff9c47" }
  };

  function log(message) {
    ui.log.textContent = message;
  }

  function pickWeighted() {
    const total = roster.reduce((sum, c) => sum + c.weight, 0);
    let r = Math.random() * total;
    for (const c of roster) {
      r -= c.weight;
      if (r <= 0) return c;
    }
    return roster[0];
  }

  function spawnChar() {
    const pick = pickWeighted();
    state.chars.push({
      id: Math.random().toString(36).slice(2, 9),
      ...pick,
      x: (Math.random() - 0.5) * 3,
      z: -24,
      carrier: null,
      stored: null
    });
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function dist2(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
  }

  function worldToScreen(x, z) {
    const zNorm = (z + 30) / 48;
    const yTop = 118;
    const yBottom = canvas.height - 74;
    const y = yTop + zNorm * (yBottom - yTop);
    const wFar = canvas.width * 0.14;
    const wNear = canvas.width * 0.62;
    const w = wFar + zNorm * (wNear - wFar);
    const sx = canvas.width / 2 + (x / 18) * (w / 2);
    const scale = 0.44 + zNorm * 1.1;
    return { sx, sy: y, scale };
  }

  function drawArena() {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "#1f2f6a");
    grad.addColorStop(1, "#0b1024");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const yTop = 118;
    const yBottom = canvas.height - 74;
    ctx.fillStyle = "#2d365f";
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.43, yTop);
    ctx.lineTo(canvas.width * 0.57, yTop);
    ctx.lineTo(canvas.width * 0.81, yBottom);
    ctx.lineTo(canvas.width * 0.19, yBottom);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#404871";
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, 88, 88, 42, 0, Math.PI, 2 * Math.PI);
    ctx.fill();
  }

  function drawBase(team) {
    const b = base[team];
    const p = worldToScreen(b.x, b.z);
    ctx.fillStyle = b.color;
    ctx.globalAlpha = 0.88;
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, 54 * p.scale, 20 * p.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ecf2ff";
    ctx.font = `${Math.round(15 * p.scale)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(`${team.toUpperCase()} BASE`, p.sx, p.sy - 22 * p.scale);
  }

  function drawChar(c) {
    const p = worldToScreen(c.x, c.z);
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy - 10 * p.scale, 10 * p.scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ecf2ff";
    ctx.font = `${Math.max(10, Math.round(11 * p.scale))}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(`${c.name} SPD:${Math.round(c.speed * 10)} VAL:${c.value}`, p.sx, p.sy - 25 * p.scale);
  }

  function drawPlayer(player) {
    const p = worldToScreen(player.x, player.z);
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy - 16 * p.scale, 12 * p.scale, 0, Math.PI * 2);
    ctx.fill();
  }

  function handleMovement(player, map) {
    let dx = 0;
    let dz = 0;
    if (map.left.some((k) => state.keys.has(k))) dx -= 1;
    if (map.right.some((k) => state.keys.has(k))) dx += 1;
    if (map.up.some((k) => state.keys.has(k))) dz -= 1;
    if (map.down.some((k) => state.keys.has(k))) dz += 1;

    const len = Math.hypot(dx, dz) || 1;
    player.x = clamp(player.x + (dx / len) * 0.2, -18, 18);
    player.z = clamp(player.z + (dz / len) * 0.2, -30, 18);
  }

  function act(player) {
    if (player.carrying) {
      const c = state.chars.find((it) => it.id === player.carrying);
      if (!c) return;

      if (dist2(player, base[player.team]) < 4.1) {
        c.carrier = null;
        c.stored = player.team;
        c.x = base[player.team].x + (Math.random() - 0.5) * 2;
        c.z = base[player.team].z + (Math.random() - 0.5) * 2;
        player.carrying = null;
        player.score += c.value;
        log(`${player.team.toUpperCase()} banked ${c.name} (+${c.value}).`);
        return;
      }

      c.carrier = null;
      c.x = player.x + 0.7;
      c.z = player.z + 0.7;
      player.carrying = null;
      log(`${player.team.toUpperCase()} dropped ${c.name}.`);
      return;
    }

    const enemy = player.team === "blue" ? "orange" : "blue";
    const stolen = state.chars.find((c) => c.stored === enemy && dist2(player, c) < 4.2);
    if (stolen) {
      stolen.stored = null;
      stolen.carrier = player.team;
      player.carrying = stolen.id;
      log(`${player.team.toUpperCase()} stole ${stolen.name} from ${enemy.toUpperCase()} base!`);
      return;
    }

    const free = state.chars.find((c) => !c.carrier && !c.stored && dist2(player, c) < 2.2);
    if (free) {
      free.carrier = player.team;
      player.carrying = free.id;
      log(`${player.team.toUpperCase()} grabbed ${free.name}.`);
    }
  }

  function updateHUD() {
    const blue = state.players.blue;
    const orange = state.players.orange;
    ui.blueScore.textContent = String(blue.score);
    ui.orangeScore.textContent = String(orange.score);
    ui.blueCarry.textContent = state.chars.find((c) => c.id === blue.carrying)?.name ?? "None";
    ui.orangeCarry.textContent = state.chars.find((c) => c.id === orange.carrying)?.name ?? "None";
  }

  function tick(now) {
    requestAnimationFrame(tick);

    if (now > state.spawnAt && state.chars.length < 30) {
      spawnChar();
      state.spawnAt = now + 2100;
    }

    handleMovement(state.players.blue, controls.blue);
    handleMovement(state.players.orange, controls.orange);

    for (const c of state.chars) {
      if (c.carrier) {
        const p = state.players[c.carrier];
        c.x = p.x;
        c.z = p.z - 1;
        c.stored = null;
      } else if (!c.stored) {
        c.z += c.speed * 0.3;
        if (c.z > 19) {
          c.z = -24;
          c.x = (Math.random() - 0.5) * 3;
        }
      }
    }

    drawArena();
    drawBase("blue");
    drawBase("orange");

    const drawables = [
      ...state.chars.map((c) => ({ kind: "char", z: c.z, ref: c })),
      { kind: "player", z: state.players.blue.z, ref: state.players.blue },
      { kind: "player", z: state.players.orange.z, ref: state.players.orange }
    ].sort((a, b) => a.z - b.z);

    for (const d of drawables) {
      if (d.kind === "char") drawChar(d.ref);
      else drawPlayer(d.ref);
    }

    updateHUD();
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    state.keys.add(e.code);
    if (e.code === controls.blue.act) act(state.players.blue);
    if (e.code === controls.orange.act) act(state.players.orange);
  });
  window.addEventListener("keyup", (e) => state.keys.delete(e.code));

  resize();
  spawnChar();
  spawnChar();
  log("Build reset complete. Grab, bank, and steal characters.");
  requestAnimationFrame(tick);
})();
