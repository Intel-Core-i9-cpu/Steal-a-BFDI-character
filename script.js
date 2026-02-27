import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

const CHARACTER_POOL = [
  { name: "Leafy", speed: 5, value: 1, weight: 20, color: 0x6dff8f },
  { name: "Firey", speed: 6, value: 2, weight: 18, color: 0xff7a40 },
  { name: "Bubble", speed: 7, value: 1, weight: 18, color: 0x88deff },
  { name: "Coiny", speed: 5, value: 2, weight: 14, color: 0xffcd5b },
  { name: "Pin", speed: 6, value: 3, weight: 11, color: 0xff68d1 },
  { name: "Tennis Ball", speed: 6, value: 2, weight: 8, color: 0xd0ff63 },
  { name: "Flower", speed: 8, value: 3, weight: 6, color: 0xf57bff },
  { name: "Gelatin", speed: 7, value: 4, weight: 3, color: 0xa088ff },
  { name: "Four", speed: 9, value: 5, weight: 1.5, color: 0x5e4aff },
  { name: "X", speed: 10, value: 5, weight: 0.5, color: 0xfff466 }
];

const nodes = {
  scoreBlue: document.getElementById("scoreBlue"),
  scoreOrange: document.getElementById("scoreOrange"),
  carryBlue: document.getElementById("carryBlue"),
  carryOrange: document.getElementById("carryOrange"),
  eventLog: document.getElementById("eventLog")
};

const state = {
  scores: { blue: 0, orange: 0 },
  blue: { team: "blue", pos: new THREE.Vector3(-11, 0.9, 11), carry: null },
  orange: { team: "orange", pos: new THREE.Vector3(11, 0.9, 11), carry: null },
  characters: [],
  nextSpawnAt: 0
};

const keys = new Set();
const canvas = document.getElementById("gameCanvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1020);
scene.fog = new THREE.Fog(0x0a1020, 22, 66);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 180);
camera.position.set(0, 24, 24);
camera.lookAt(0, 0, -4);

scene.add(new THREE.HemisphereLight(0x8fabff, 0x1a1730, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.05);
sun.position.set(8, 18, 5);
sun.castShadow = true;
scene.add(sun);

function weightedPick() {
  const total = CHARACTER_POOL.reduce((sum, item) => sum + item.weight, 0);
  let rng = Math.random() * total;
  for (const item of CHARACTER_POOL) {
    rng -= item.weight;
    if (rng <= 0) return item;
  }
  return CHARACTER_POOL[0];
}

function setLog(msg) {
  nodes.eventLog.textContent = msg;
}

function createLabelSprite(text, width = 460, height = 126, fontSize = 42) {
  const cvs = document.createElement("canvas");
  cvs.width = width;
  cvs.height = height;
  const ctx = cvs.getContext("2d");
  ctx.fillStyle = "rgba(6, 9, 20, 0.75)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(180,200,255,0.8)";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, width - 6, height - 6);
  ctx.fillStyle = "#eef3ff";
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);
  const texture = new THREE.CanvasTexture(cvs);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.scale.set(3.4, 0.9, 1);
  return sprite;
}

function makeWorld() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x131a30, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const runway = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 48), new THREE.MeshStandardMaterial({ color: 0x2b3155, roughness: 0.9, metalness: 0.05 }));
  runway.position.set(0, 0.01, -2);
  runway.rotation.x = -Math.PI / 2;
  scene.add(runway);

  const tunnel = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 7.6, 26, 1, true, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x3e4264, side: THREE.DoubleSide })
  );
  tunnel.rotation.z = Math.PI / 2;
  tunnel.position.set(0, 2.2, -25);
  scene.add(tunnel);

  addBase("blue", new THREE.Vector3(-11, 0.2, 11), 0x4e7cff);
  addBase("orange", new THREE.Vector3(11, 0.2, 11), 0xff9f4f);
}

function addBase(name, position, color) {
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(4.1, 4.1, 0.4, 40), new THREE.MeshStandardMaterial({ color }));
  pad.position.copy(position);
  scene.add(pad);

  const text = createLabelSprite(`${name.toUpperCase()} BASE`, 360, 110, 34);
  text.position.set(position.x, 3.3, position.z + 3.5);
  scene.add(text);
}

function createPlayerMesh(team) {
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.5, 0.65, 8, 14),
    new THREE.MeshStandardMaterial({ color: team === "blue" ? 0x5f83ff : 0xffa44a })
  );
  body.castShadow = true;
  scene.add(body);
  return body;
}

const playerMeshes = {
  blue: createPlayerMesh("blue"),
  orange: createPlayerMesh("orange")
};

function spawnCharacter() {
  const seed = weightedPick();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 24), new THREE.MeshStandardMaterial({ color: seed.color }));
  mesh.castShadow = true;
  scene.add(mesh);

  const label = createLabelSprite(`${seed.name} SPD:${seed.speed} VAL:${seed.value}`);
  scene.add(label);

  state.characters.push({
    id: Math.random().toString(36).slice(2, 9),
    ...seed,
    pos: new THREE.Vector3((Math.random() - 0.5) * 2.8, 0.7, -24),
    carrier: null,
    storedAt: null,
    mesh,
    label
  });
}

function basePos(team) {
  return team === "blue" ? new THREE.Vector3(-11, 0, 11) : new THREE.Vector3(11, 0, 11);
}

function handlePlayerMovement(player, controls, speed) {
  let dx = 0;
  let dz = 0;
  if (controls.left.some((k) => keys.has(k))) dx -= 1;
  if (controls.right.some((k) => keys.has(k))) dx += 1;
  if (controls.up.some((k) => keys.has(k))) dz -= 1;
  if (controls.down.some((k) => keys.has(k))) dz += 1;

  const len = Math.hypot(dx, dz) || 1;
  player.pos.x = THREE.MathUtils.clamp(player.pos.x + (dx / len) * speed, -18, 18);
  player.pos.z = THREE.MathUtils.clamp(player.pos.z + (dz / len) * speed, -30, 18);
}

function attemptGrabOrDrop(player) {
  if (player.carry) {
    const carried = state.characters.find((c) => c.id === player.carry);
    if (!carried) return;

    const homeBase = basePos(player.team);
    if (player.pos.distanceTo(homeBase) < 4.2) {
      carried.carrier = null;
      carried.storedAt = player.team;
      carried.pos.copy(homeBase).add(new THREE.Vector3((Math.random() - 0.5) * 2, 0.7, (Math.random() - 0.5) * 2));
      player.carry = null;
      state.scores[player.team] += carried.value;
      setLog(`${player.team.toUpperCase()} scored ${carried.name} (+${carried.value})`);
      return;
    }

    carried.carrier = null;
    carried.pos.copy(player.pos).add(new THREE.Vector3(0.6, -0.2, 0.6));
    player.carry = null;
    setLog(`${player.team.toUpperCase()} dropped ${carried.name}`);
    return;
  }

  const enemy = player.team === "blue" ? "orange" : "blue";
  const enemyStored = state.characters.find((c) => c.storedAt === enemy && player.pos.distanceTo(c.pos) < 4.2);
  if (enemyStored) {
    enemyStored.storedAt = null;
    enemyStored.carrier = player.team;
    player.carry = enemyStored.id;
    setLog(`${player.team.toUpperCase()} stole ${enemyStored.name} from ${enemy.toUpperCase()} base!`);
    return;
  }

  const free = state.characters.find((c) => !c.carrier && !c.storedAt && player.pos.distanceTo(c.pos) < 2.1);
  if (free) {
    free.carrier = player.team;
    player.carry = free.id;
    setLog(`${player.team.toUpperCase()} grabbed ${free.name}`);
  }
}

window.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }

  keys.add(event.code);
  if (event.code === "KeyE") attemptGrabOrDrop(state.blue);
  if (event.code === "KeyM") attemptGrabOrDrop(state.orange);
});

window.addEventListener("keyup", (event) => keys.delete(event.code));

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function tick(now) {
  requestAnimationFrame(tick);

  if (now > state.nextSpawnAt && state.characters.length < 28) {
    spawnCharacter();
    state.nextSpawnAt = now + 2200;
  }

  handlePlayerMovement(state.blue, { left: ["KeyA"], right: ["KeyD"], up: ["KeyW"], down: ["KeyS"] }, 0.2);
  handlePlayerMovement(state.orange, { left: ["ArrowLeft"], right: ["ArrowRight"], up: ["ArrowUp"], down: ["ArrowDown"] }, 0.2);

  for (const character of state.characters) {
    if (character.carrier) {
      const player = state[character.carrier];
      character.pos.copy(player.pos).add(new THREE.Vector3(0, 0, -1));
      character.storedAt = null;
    } else if (!character.storedAt) {
      character.pos.z += 0.03 * character.speed;
      if (character.pos.z > 19) {
        character.pos.z = -24;
        character.pos.x = (Math.random() - 0.5) * 2.8;
      }
    }

    character.mesh.visible = true;
    character.label.visible = true;
    character.mesh.position.copy(character.pos);
    character.label.position.copy(character.pos).add(new THREE.Vector3(0, 1, 0));
    character.label.quaternion.copy(camera.quaternion);
  }

  playerMeshes.blue.position.copy(state.blue.pos);
  playerMeshes.orange.position.copy(state.orange.pos);

  nodes.scoreBlue.textContent = String(state.scores.blue);
  nodes.scoreOrange.textContent = String(state.scores.orange);

  const blueCarry = state.characters.find((c) => c.id === state.blue.carry)?.name;
  const orangeCarry = state.characters.find((c) => c.id === state.orange.carry)?.name;
  nodes.carryBlue.textContent = blueCarry ?? "None";
  nodes.carryOrange.textContent = orangeCarry ?? "None";

  renderer.render(scene, camera);
}

makeWorld();
spawnCharacter();
spawnCharacter();
setLog("Blue and Orange can both steal from each other's base.");
tick(0);
