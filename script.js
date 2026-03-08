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

  const camera = {
    x: 0,
    y: 8.8,
    z: 24,
    pitch: -0.42,
    fov: 520
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
      y: 0.72,
      z: -24,
      carrier: null,
      stored: null,
      bobSeed: Math.random() * Math.PI * 2
    });
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function dist2(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
  }

  function project(x, y, z) {
    const dx = x - camera.x;
    const dy = y - camera.y;
    const dz = z - camera.z;

    const cp = Math.cos(camera.pitch);
    const sp = Math.sin(camera.pitch);
    const ry = dy * cp - dz * sp;
    const rz = dy * sp + dz * cp;
    const depth = -rz;
    if (depth < 0.2) return null;

    const scale = camera.fov / depth;
    return {
      x: canvas.width * 0.5 + dx * scale,
      y: canvas.height * 0.57 - ry * scale,
      scale,
      depth
    };
  }

  function drawQuad(p1, p2, p3, p4, fill, stroke = null) {
    const a = project(...p1);
    const b = project(...p2);
    const c = project(...p3);
    const d = project(...p4);
    if (!a || !b || !c || !d) return;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  function drawTunnel() {
    for (let i = 0; i < 10; i += 1) {
      const z = -28 + i * 0.9;
      const left = project(-2.2, 2.2, z);
      const right = project(2.2, 2.2, z);
      const top = project(0, 3.3, z);
      if (!left || !right || !top) continue;

      const alpha = 0.15 + (i / 10) * 0.45;
      ctx.strokeStyle = `rgba(178, 194, 255, ${alpha.toFixed(3)})`;
      ctx.lineWidth = Math.max(1, left.scale * 0.03);
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.quadraticCurveTo(top.x, top.y, right.x, right.y);
      ctx.stroke();
    }
  }

  function drawArena() {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#1f2f6a");
    sky.addColorStop(1, "#090e1f");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawQuad([-28, 0, -40], [28, 0, -40], [28, 0, 30], [-28, 0, 30], "#111938");
    drawQuad([-3.8, 0.01, -28], [3.8, 0.01, -28], [5.6, 0.01, 24], [-5.6, 0.01, 24], "#2d365f", "rgba(152,170,255,0.2)");

    for (let i = 0; i < 14; i += 1) {
      const z = -26 + i * 3.4;
      drawQuad([-0.1, 0.02, z], [0.1, 0.02, z], [0.2, 0.02, z + 1.2], [-0.2, 0.02, z + 1.2], "rgba(224,234,255,0.3)");
    }

    drawTunnel();
  }

  function drawBase(team) {
    const b = base[team];
    const p = project(b.x, 0.35, b.z);
    if (!p) return;

    ctx.fillStyle = b.color;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.scale * 0.95, p.scale * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#ecf2ff";
    ctx.font = `${Math.max(10, p.scale * 0.24)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(`${team.toUpperCase()} BASE`, p.x, p.y - p.scale * 0.5);
  }

  function drawPlayer(player) {
    const shadow = project(player.x, 0.05, player.z);
    const body = project(player.x, 0.8, player.z);
    const head = project(player.x, 1.5, player.z);
    if (!shadow || !body || !head) return;

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(shadow.x, shadow.y, shadow.scale * 0.42, shadow.scale * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.ellipse(body.x, body.y, body.scale * 0.28, body.scale * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(head.x, head.y, head.scale * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawChar(c, now) {
    const bobY = c.y + Math.sin(now * 0.004 + c.bobSeed) * 0.09;
    const shadow = project(c.x, 0.05, c.z);
    const orb = project(c.x, bobY, c.z);
    if (!shadow || !orb) return;

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(shadow.x, shadow.y, shadow.scale * 0.36, shadow.scale * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.scale * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ecf2ff";
    ctx.textAlign = "center";
    ctx.font = `${Math.max(10, orb.scale * 0.16)}px sans-serif`;
    ctx.fillText(`${c.name} SPD:${Math.round(c.speed * 10)} VAL:${c.value}`, orb.x, orb.y - orb.scale * 0.34);
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
      if (d.kind === "char") drawChar(d.ref, now);
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
  log("3D graphics loaded. Grab, bank, and steal characters.");
  requestAnimationFrame(tick);
})();
