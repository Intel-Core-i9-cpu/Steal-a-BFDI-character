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
    y: 8.5,
    z: 24,
    yaw: 0,
    pitch: -0.42,
    fov: 520
  };

  function shade(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amount));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
    const b = Math.max(0, Math.min(255, (n & 255) + amount));
    return `rgb(${r}, ${g}, ${b})`;
  }

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
      y: 0.7,
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

    const cy = Math.cos(camera.yaw);
    const sy = Math.sin(camera.yaw);
    const yx = dx * cy - dz * sy;
    const yz = dx * sy + dz * cy;

    const cp = Math.cos(camera.pitch);
    const sp = Math.sin(camera.pitch);
    const px = yx;
    const py = dy * cp - yz * sp;
    const pz = dy * sp + yz * cp;

    const depth = -pz;
    if (depth < 0.25) return null;
    const scale = camera.fov / depth;

    return {
      x: canvas.width * 0.5 + px * scale,
      y: canvas.height * 0.57 - py * scale,
      depth,
      scale
    };
  }

  function drawFace(points3d, fill, stroke = null) {
    const pts = points3d.map((p) => project(p[0], p[1], p[2]));
    if (pts.some((p) => !p)) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  function drawPrism(centerX, centerZ, width, depth, height, color) {
    const x1 = centerX - width / 2;
    const x2 = centerX + width / 2;
    const z1 = centerZ - depth / 2;
    const z2 = centerZ + depth / 2;
    const y0 = 0;
    const y1 = height;

    const top = [[x1, y1, z1], [x2, y1, z1], [x2, y1, z2], [x1, y1, z2]];
    const sideA = [[x2, y0, z1], [x2, y1, z1], [x2, y1, z2], [x2, y0, z2]];
    const sideB = [[x1, y0, z2], [x2, y0, z2], [x2, y1, z2], [x1, y1, z2]];

    drawFace(sideA, shade(color, -28));
    drawFace(sideB, shade(color, -12));
    drawFace(top, shade(color, 30), "rgba(255,255,255,0.15)");
  }

  function drawArena(now) {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#1f2f6a");
    sky.addColorStop(1, "#090e1f");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawFace([[-32, 0, -44], [32, 0, -44], [32, 0, 32], [-32, 0, 32]], "#111938");
    drawFace([[-3.8, 0.01, -28], [3.8, 0.01, -28], [5.7, 0.01, 24], [-5.7, 0.01, 24]], "#2d365f", "rgba(152,170,255,0.25)");

    for (let i = 0; i < 16; i += 1) {
      const z = -27 + i * 3.15;
      drawFace([[-0.08, 0.02, z], [0.08, 0.02, z], [0.16, 0.02, z + 1], [-0.16, 0.02, z + 1]], "rgba(225,236,255,0.35)");
    }

    // tunnel rings with animated shimmer
    for (let i = 0; i < 13; i += 1) {
      const z = -29 + i * 0.8;
      const h = 2.2 + Math.sin(now * 0.002 + i) * 0.08;
      const w = 2.2;
      const left = project(-w, h, z);
      const top = project(0, h + 1.1, z);
      const right = project(w, h, z);
      if (!left || !top || !right) continue;
      ctx.strokeStyle = `rgba(190,205,255,${0.12 + i * 0.03})`;
      ctx.lineWidth = Math.max(1, left.scale * 0.03);
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.quadraticCurveTo(top.x, top.y, right.x, right.y);
      ctx.stroke();
    }
  }

  function drawBase(team) {
    const b = base[team];
    drawPrism(b.x, b.z, 3.3, 3.3, 0.35, b.color);

    const label = project(b.x, 1.05, b.z + 1.6);
    if (label) {
      ctx.fillStyle = "#ecf2ff";
      ctx.font = `${Math.max(10, label.scale * 0.2)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`${team.toUpperCase()} BASE`, label.x, label.y);
    }
  }

  function drawPlayer(player) {
    drawPrism(player.x, player.z, 0.8, 0.8, 1.2, player.color);
    drawPrism(player.x, player.z, 0.5, 0.5, 1.7, shade(player.color, 18));
  }

  function drawChar(c, now) {
    const bobY = c.y + Math.sin(now * 0.004 + c.bobSeed) * 0.1;

    drawPrism(c.x, c.z, 0.52, 0.52, bobY + 0.45, c.color);
    const tag = project(c.x, bobY + 0.85, c.z);
    if (tag) {
      ctx.fillStyle = "#ecf2ff";
      ctx.textAlign = "center";
      ctx.font = `${Math.max(10, tag.scale * 0.16)}px sans-serif`;
      ctx.fillText(`${c.name} SPD:${Math.round(c.speed * 10)} VAL:${c.value}`, tag.x, tag.y);
    }
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

    // subtle camera pan so perspective motion is obvious
    camera.yaw = Math.sin(now * 0.00045) * 0.13;
    camera.x = Math.sin(now * 0.00035) * 1.2;

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

    drawArena(now);
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
  log("3D graphics loaded: box geometry + dynamic camera perspective.");
  requestAnimationFrame(tick);
})();
