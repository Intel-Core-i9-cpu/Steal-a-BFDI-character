const rosterPool = [
  { name: "Leafy", rarity: "common", income: 3, weight: 34 },
  { name: "Firey", rarity: "common", income: 3, weight: 34 },
  { name: "Bubble", rarity: "common", income: 4, weight: 26 },
  { name: "Coiny", rarity: "rare", income: 8, weight: 16 },
  { name: "Pin", rarity: "rare", income: 10, weight: 13 },
  { name: "Tennis Ball", rarity: "rare", income: 12, weight: 9 },
  { name: "Flower", rarity: "epic", income: 20, weight: 6 },
  { name: "Gelatin", rarity: "epic", income: 24, weight: 4 },
  { name: "Four", rarity: "legendary", income: 45, weight: 2 },
  { name: "X", rarity: "legendary", income: 60, weight: 1 }
];

const state = {
  cash: 120,
  rollCost: 50,
  playerRoster: [],
  rivalRoster: [],
  stealCooldownMs: 6000,
  lastStealAt: 0
};

const nodes = {
  cash: document.getElementById("cash"),
  income: document.getElementById("income"),
  stealRate: document.getElementById("stealRate"),
  rollBtn: document.getElementById("rollBtn"),
  stealBtn: document.getElementById("stealBtn"),
  eventLog: document.getElementById("eventLog"),
  playerRoster: document.getElementById("playerRoster"),
  rivalRoster: document.getElementById("rivalRoster"),
  template: document.getElementById("characterTemplate")
};

function weightedPick() {
  const totalWeight = rosterPool.reduce((sum, c) => sum + c.weight, 0);
  let random = Math.random() * totalWeight;

  for (const character of rosterPool) {
    random -= character.weight;
    if (random <= 0) {
      return { ...character };
    }
  }

  return { ...rosterPool[0] };
}

function addCharacter(team) {
  const character = weightedPick();
  team.push(character);
  return character;
}

function formatMoney(value) {
  return `$${Math.floor(value).toLocaleString()}`;
}

function playerIncome() {
  return state.playerRoster.reduce((sum, c) => sum + c.income, 0);
}

function stealChance() {
  return Math.min(0.25 + state.playerRoster.length * 0.05, 0.8);
}

function setLog(message, type = "") {
  nodes.eventLog.textContent = message;
  nodes.eventLog.classList.remove("log-good", "log-bad");
  if (type) nodes.eventLog.classList.add(type);
}

function renderRoster(listNode, roster) {
  listNode.textContent = "";

  if (!roster.length) {
    const empty = document.createElement("li");
    empty.textContent = "No characters yet.";
    empty.className = "character-card";
    listNode.append(empty);
    return;
  }

  for (const character of roster) {
    const card = nodes.template.content.firstElementChild.cloneNode(true);
    card.querySelector(".character-name").textContent = character.name;
    const rarityNode = card.querySelector(".character-rarity");
    rarityNode.textContent = character.rarity.toUpperCase();
    rarityNode.classList.add(`rarity-${character.rarity}`);
    card.querySelector(".character-income").textContent = `+${formatMoney(character.income)}/s`;
    listNode.append(card);
  }
}

function refreshUi() {
  nodes.cash.textContent = formatMoney(state.cash);
  nodes.income.textContent = formatMoney(playerIncome());
  nodes.stealRate.textContent = `${Math.round(stealChance() * 100)}%`;
  nodes.rollBtn.disabled = state.cash < state.rollCost;

  const cooldownLeft = state.stealCooldownMs - (Date.now() - state.lastStealAt);
  const canSteal = cooldownLeft <= 0 && state.rivalRoster.length > 0;
  nodes.stealBtn.disabled = !canSteal;
  nodes.stealBtn.textContent = canSteal
    ? "Attempt Steal"
    : cooldownLeft > 0
      ? `Steal Cooling (${Math.ceil(cooldownLeft / 1000)}s)`
      : "Attempt Steal";

  renderRoster(nodes.playerRoster, state.playerRoster);
  renderRoster(nodes.rivalRoster, state.rivalRoster);
}

function rollCharacter() {
  if (state.cash < state.rollCost) {
    setLog("You need more cash to roll.", "log-bad");
    return;
  }

  state.cash -= state.rollCost;
  const recruit = addCharacter(state.playerRoster);
  setLog(`You rolled ${recruit.name}! (+${formatMoney(recruit.income)}/s)`, "log-good");
  refreshUi();
}

function attemptSteal() {
  const now = Date.now();
  if (now - state.lastStealAt < state.stealCooldownMs) {
    setLog("Steal action is still cooling down.", "log-bad");
    return;
  }

  if (!state.rivalRoster.length) {
    setLog("Rival has no characters left. You win this round!", "log-good");
    return;
  }

  state.lastStealAt = now;
  const success = Math.random() < stealChance();

  if (success) {
    const targetIndex = Math.floor(Math.random() * state.rivalRoster.length);
    const [stolen] = state.rivalRoster.splice(targetIndex, 1);
    state.playerRoster.push(stolen);
    setLog(`Success! You stole ${stolen.name}.`, "log-good");
  } else {
    const penalty = Math.max(15, Math.round(playerIncome() * 0.6));
    state.cash = Math.max(0, state.cash - penalty);
    setLog(`Failed steal! Security fined you ${formatMoney(penalty)}.`, "log-bad");
  }

  refreshUi();
}

function seedGame() {
  for (let i = 0; i < 4; i++) addCharacter(state.rivalRoster);
  addCharacter(state.playerRoster);
}

nodes.rollBtn.addEventListener("click", rollCharacter);
nodes.stealBtn.addEventListener("click", attemptSteal);

setInterval(() => {
  state.cash += playerIncome();
  refreshUi();
}, 1000);

setInterval(refreshUi, 300);

seedGame();
refreshUi();
