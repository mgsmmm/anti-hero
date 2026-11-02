// js/app.js

let canvas, ctx;
let tileSize = 40;

let gold = 350;
let castleHp = 30;
let maxCastleHp = 30;
let wave = 1;
let kills = 0;
let tries = 1;
let gameSpeed = 1;
let isWaveActive = false;
let selectedTrap = TRAP_TYPES.BRICK;
let isDemolishMode = false;
let hoverGridX = -1;
let hoverGridY = -1;

let grid = [];
let trapManager = null;

// Game Entities State
let heroes = [];
let heroesToSpawn = [];
let spawnTimer = 0;
let spawnInterval = 90; // frames between hero spawns

let shopUpgrades = {
  FORTRESS_WALLS: { level: 0, max: 5, baseCost: 150, name: 'Fortress Reinforcements', icon: '🏰', desc: '+10 Castle HP max & heal castle.' },
  MANA_HARVEST: { level: 0, max: 5, baseCost: 120, name: 'Mana Harvesting', icon: '🪙', desc: 'Gain +25% bonus Gold from all hero eliminations.' },
  TRAP_POWER: { level: 0, max: 5, baseCost: 200, name: 'Trap Overclocking', icon: '⚡', desc: 'Increase all trap damage by +20% globally.' },
  AUTO_REPAIR: { level: 0, max: 3, baseCost: 250, name: 'Repair Drones', icon: '🛠️', desc: 'Automatically restores 2 Castle HP after every wave.' }
};

// Hero Archetypes
const HERO_TYPES = {
  MARIO: { name: 'Super Hero', hp: 100, speed: 1.8, gold: 25, color: '#ef4444', jumpPower: -6.5, icon: '🏃' },
  LUIGI: { name: 'Jumper Hero', hp: 80, speed: 2.2, gold: 35, color: '#22c55e', jumpPower: -8.0, icon: '🤸' },
  TANK: { name: 'Armor Knight', hp: 250, speed: 1.1, gold: 50, color: '#64748b', jumpPower: -5.0, icon: '🛡️' }
};

function initGrid() {
  grid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));

  for (let c = 0; c < GRID_COLS; c++) {
    if (c < 20) {
      grid[9][c] = { type: 'GROUND_TILE', solid: true };
      grid[10][c] = { type: 'DIRT_TILE', solid: true };
      grid[11][c] = { type: 'DIRT_TILE', solid: true };
    } else {
      grid[8][c] = { type: 'CASTLE_TILE', solid: true };
      grid[9][c] = { type: 'CASTLE_TILE', solid: true };
      grid[10][c] = { type: 'CASTLE_TILE', solid: true };
      grid[11][c] = { type: 'CASTLE_TILE', solid: true };
    }
  }

  trapManager = new TrapManager(grid, GRID_ROWS, GRID_COLS);

  // Preset initial gator pit
  grid[9][12] = null; grid[10][12] = { type: 'WATER_PIT' }; grid[11][12] = { type: 'WATER_PIT' };
  grid[9][13] = null; grid[10][13] = { type: 'WATER_PIT' }; grid[11][13] = { type: 'WATER_PIT' };
  grid[9][12] = { type: 'TRAP', trapId: 'GATOR', isRoot: true, rootX: 12, level: 1 };
  grid[9][13] = { type: 'TRAP', trapId: 'GATOR', isRoot: false, rootX: 12, level: 1 };
}

function resizeCanvas() {
  if (!canvas || !canvas.parentElement) return;
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
  tileSize = Math.floor(Math.min(canvas.width / GRID_COLS, canvas.height / GRID_ROWS));
}

function updateUI() {
  document.getElementById('gold-val').textContent = gold;
  document.getElementById('castle-hp-val').textContent = `${castleHp}/${maxCastleHp}`;
  document.getElementById('castle-hp-bar').style.width = `${Math.max(0, (castleHp / maxCastleHp) * 100)}%`;
  document.getElementById('wave-val').textContent = wave;
  document.getElementById('tries-val').textContent = tries;
  document.getElementById('kills-val').textContent = kills;
  document.getElementById('shop-gold-display').textContent = `${gold} G`;
  
  renderTrapButtons();
}

function startWave() {
  if (isWaveActive) return;
  isWaveActive = true;
  heroesToSpawn = [];
  
  // Build wave queue based on current wave counter
  const heroCount = 4 + wave * 2;
  for (let i = 0; i < heroCount; i++) {
    if (i % 3 === 0) heroesToSpawn.push({ ...HERO_TYPES.LUIGI });
    else if (i % 5 === 0 && wave >= 2) heroesToSpawn.push({ ...HERO_TYPES.TANK });
    else heroesToSpawn.push({ ...HERO_TYPES.MARIO });
  }

  spawnTimer = 0;
  audio.playCannon();
}

function spawnHero(heroData) {
  const spawnGroundY = 9 * tileSize;
  heroes.push({
    ...heroData,
    maxHp: heroData.hp,
    x: 0,
    y: spawnGroundY - tileSize,
    vx: heroData.speed,
    vy: 0,
    width: tileSize * 0.7,
    height: tileSize * 0.9,
    isGrounded: true,
    isCrouching: false,
    jumpCooldown: 0
  });
}

function updateHeroes() {
  if (!isWaveActive) return;

  // Handle Spawning Queue
  if (heroesToSpawn.length > 0) {
    spawnTimer += gameSpeed;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnHero(heroesToSpawn.shift());
    }
  }

  const gravity = 0.35;
  const groundY = 9 * tileSize;

  for (let i = heroes.length - 1; i >= 0; i--) {
    const h = heroes[i];
    if (h.jumpCooldown > 0) h.jumpCooldown--;

    // 1. Horizontal Movement & Obstacle AI (Lookahead)
    const currentCol = Math.floor((h.x + h.width / 2) / tileSize);
    const aheadCol = Math.floor((h.x + h.width + 10) / tileSize);
    const aheadTile = grid[9]?.[aheadCol];
    const overheadTile = grid[8]?.[currentCol];

    // AI Jump Trigger: Obstacle/Trap Ahead on ground level
    if (aheadTile && (aheadTile.solid || aheadTile.type === 'TRAP') && h.isGrounded && h.jumpCooldown <= 0) {
      h.vy = h.jumpPower;
      h.isGrounded = false;
      h.jumpCooldown = 30;
      audio.playSpring();
    }

    // AI Crouch Trigger: Low-hanging trap overhead
    if (overheadTile && overheadTile.type === 'TRAP' && TRAP_TYPES[overheadTile.trapId]?.id === 'ANVIL') {
      h.isCrouching = true;
      h.height = tileSize * 0.5;
    } else {
      h.isCrouching = false;
      h.height = tileSize * 0.9;
    }

    // Apply Velocity
    h.x += h.vx * gameSpeed;
    h.y += h.vy * gameSpeed;
    h.vy += gravity * gameSpeed;

    // Ground Collision
    if (h.y + h.height >= groundY) {
      h.y = groundY - h.height;
      h.vy = 0;
      h.isGrounded = true;
    }

    // 2. Trap Collisions & Damage
    const gridX = Math.floor((h.x + h.width / 2) / tileSize);
    const gridY = Math.floor((h.y + h.height / 2) / tileSize);
    const tileUnder = grid[gridY]?.[gridX];

    if (tileUnder && tileUnder.type === 'TRAP') {
      const damage = 1.5 * gameSpeed;
      h.hp -= damage;

      if (tileUnder.trapId === 'SPIKES' || tileUnder.trapId === 'SAW') {
        audio.playZap();
      } else if (tileUnder.trapId === 'GATOR' || tileUnder.trapId === 'ACID') {
        h.hp = 0; // Instant drop trap kill
        audio.playGatorChomp();
      }
    }

    // 3. Castle Breach / Reached Goal
    if (h.x >= 20 * tileSize) {
      castleHp -= 1;
      audio.playCastleHit();
      heroes.splice(i, 1);
      updateUI();

      if (castleHp <= 0) {
        castleHp = 0;
        isWaveActive = false;
        alert("🏰 GAME OVER! The heroes breached your castle defense.");
        tries++;
        castleHp = maxCastleHp;
        initGrid();
        updateUI();
      }
      continue;
    }

    // 4. Hero Defeat
    if (h.hp <= 0) {
      audio.playScream();
      gold += Math.floor(h.gold * (1 + shopUpgrades.MANA_HARVEST.level * 0.25));
      kills++;
      heroes.splice(i, 1);
      updateUI();
    }
  }

  // Check Wave Completion
  if (isWaveActive && heroesToSpawn.length === 0 && heroes.length === 0) {
    isWaveActive = false;
    wave++;
    if (shopUpgrades.AUTO_REPAIR.level > 0) {
      castleHp = Math.min(maxCastleHp, castleHp + shopUpgrades.AUTO_REPAIR.level * 2);
    }
    updateUI();
  }
}

function renderTrapButtons() {
  const container = document.getElementById('trap-buttons-list');
  if (!container) return;
  
  container.innerHTML = '';
  Object.values(TRAP_TYPES).forEach((trap) => {
    const btn = document.createElement('button');
    const isSelected = !isDemolishMode && selectedTrap.id === trap.id;
    const canAfford = gold >= trap.cost;
    
    btn.className = `trap-card w-full flex items-center justify-between p-2 rounded-lg border text-left text-xs bg-slate-900 border-slate-800 ${isSelected ? 'selected' : ''} ${!canAfford ? 'disabled' : ''}`;
    btn.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-base sm:text-lg">${trap.icon}</span>
        <div>
          <div class="font-bold text-slate-200 text-xs leading-none">${trap.name}</div>
          <div class="text-[10px] text-amber-400 font-mono mt-0.5">${trap.cost} G</div>
        </div>
      </div>
    `;

    btn.addEventListener('click', () => {
      isDemolishMode = false;
      selectedTrap = trap;
      document.getElementById('demolish-btn').classList.remove('border-rose-500', 'bg-rose-950/60');
      document.getElementById('info-name').textContent = trap.name;
      document.getElementById('info-cost').textContent = `${trap.cost} G`;
      document.getElementById('info-desc').textContent = trap.desc;
      updateUI();
    });

    container.appendChild(btn);
  });
}

function renderShop() {
  const container = document.getElementById('shop-items-container');
  if (!container) return;
  container.innerHTML = '';

  Object.entries(shopUpgrades).forEach(([key, item]) => {
    const cost = item.baseCost * (item.level + 1);
    const isMax = item.level >= item.max;
    const itemEl = document.createElement('div');
    itemEl.className = 'flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs';
    itemEl.innerHTML = `
      <div class="flex items-center gap-2.5">
        <span class="text-2xl">${item.icon}</span>
        <div>
          <div class="font-bold text-slate-200">${item.name} <span class="text-amber-400 font-mono text-[10px]">(Lvl ${item.level}/${item.max})</span></div>
          <div class="text-[11px] text-slate-400 mt-0.5">${item.desc}</div>
        </div>
      </div>
      <button class="buy-upgrade-btn px-3 py-1.5 rounded-lg text-xs font-bold ${isMax ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-500 text-slate-950 border border-amber-400'}" ${isMax ? 'disabled' : ''}>
        ${isMax ? 'MAXED' : `${cost} G`}
      </button>
    `;

    const buyBtn = itemEl.querySelector('.buy-upgrade-btn');
    if (buyBtn && !isMax) {
      buyBtn.addEventListener('click', () => {
        if (gold >= cost) {
          gold -= cost;
          item.level++;
          if (key === 'FORTRESS_WALLS') {
            maxCastleHp += 10;
            castleHp = maxCastleHp;
          }
          audio.playUpgrade();
          updateUI();
          renderShop();
        }
      });
    }

    container.appendChild(itemEl);
  });
}

function handleCanvasClick(e) {
  const rect = canvas.getBoundingClientRect();
  const gx = Math.floor((e.clientX - rect.left) / tileSize);
  const gy = Math.floor((e.clientY - rect.top) / tileSize);

  if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return;

  if (isDemolishMode) {
    const demolishedTrap = trapManager.demolishTrap(gx, gy);
    if (demolishedTrap) {
      gold += Math.floor(demolishedTrap.cost * 0.75);
      audio.playBuild();
      updateUI();
    }
  } else {
    if (gold >= selectedTrap.cost && trapManager.canPlaceTrap(gx, gy, selectedTrap)) {
      if (trapManager.placeTrap(gx, gy, selectedTrap)) {
        gold -= selectedTrap.cost;
        audio.playBuild();
        updateUI();
      }
    }
  }
}

function handleCanvasRightClick(e) {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const gx = Math.floor((e.clientX - rect.left) / tileSize);
  const gy = Math.floor((e.clientY - rect.top) / tileSize);

  const demolishedTrap = trapManager.demolishTrap(gx, gy);
  if (demolishedTrap) {
    gold += Math.floor(demolishedTrap.cost * 0.75);
    audio.playBuild();
    updateUI();
  }
}

function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Draw Map Tiles & Traps
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const x = c * tileSize;
      const y = r * tileSize;
      const tile = grid[r][c];

      ctx.strokeStyle = '#1e293b';
      ctx.strokeRect(x, y, tileSize, tileSize);

      if (tile) {
        if (tile.type === 'GROUND_TILE') {
          ctx.fillStyle = '#334155';
          ctx.fillRect(x, y, tileSize, tileSize);
        } else if (tile.type === 'DIRT_TILE') {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x, y, tileSize, tileSize);
        } else if (tile.type === 'CASTLE_TILE') {
          ctx.fillStyle = '#b45309';
          ctx.fillRect(x, y, tileSize, tileSize);
        } else if (tile.type === 'WATER_PIT') {
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(x, y, tileSize, tileSize);
        } else if (tile.type === 'TRAP' && tile.isRoot) {
          const tData = TRAP_TYPES[tile.trapId];
          ctx.fillStyle = '#78350f';
          ctx.fillRect(x, y, tileSize * (tData ? tData.width : 1), tileSize);
          ctx.font = `${Math.floor(tileSize * 0.6)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(tData ? tData.icon : '❓', x + (tileSize * (tData ? tData.width : 1)) / 2, y + tileSize / 2);
        }
      }
    }
  }

  // 2. Draw Active Heroes & Health Bars
  heroes.forEach((h) => {
    ctx.fillStyle = h.color;
    ctx.fillRect(h.x, h.y, h.width, h.height);

    ctx.font = `${Math.floor(tileSize * 0.5)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(h.icon, h.x + h.width / 2, h.y + h.height / 2);

    // HP Bar Above Head
    const hpRatio = Math.max(0, h.hp / h.maxHp);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(h.x, h.y - 8, h.width, 4);
    ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : '#ef4444';
    ctx.fillRect(h.x, h.y - 8, h.width * hpRatio, 4);
  });

  // 3. Draw Placement Hover Box
  if (hoverGridX >= 0 && hoverGridX < GRID_COLS && hoverGridY >= 0 && hoverGridY < GRID_ROWS) {
    ctx.fillStyle = isDemolishMode ? 'rgba(244, 63, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)';
    ctx.fillRect(hoverGridX * tileSize, hoverGridY * tileSize, tileSize * (isDemolishMode ? 1 : selectedTrap.width), tileSize);
  }

  updateHeroes();
  requestAnimationFrame(drawGame);
}

window.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');

  initGrid();
  resizeCanvas();
  updateUI();
  renderShop();

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    hoverGridX = Math.floor((e.clientX - rect.left) / tileSize);
    hoverGridY = Math.floor((e.clientY - rect.top) / tileSize);
  });
  canvas.addEventListener('mouseleave', () => {
    hoverGridX = -1;
    hoverGridY = -1;
  });
  canvas.addEventListener('click', (e) => {
    audio.init();
    handleCanvasClick(e);
  });
  canvas.addEventListener('contextmenu', handleCanvasRightClick);

  document.getElementById('start-game-btn')?.addEventListener('click', () => {
    audio.init();
    document.getElementById('main-menu-overlay').classList.add('hidden');
    startWave();
  });

  document.getElementById('start-wave-btn')?.addEventListener('click', () => {
    audio.init();
    startWave();
  });

  document.getElementById('sound-btn')?.addEventListener('click', () => {
    audio.enabled = !audio.enabled;
    document.getElementById('sound-btn').textContent = audio.enabled ? '🔊' : '🔇';
  });

  document.getElementById('speed-btn')?.addEventListener('click', () => {
    gameSpeed = gameSpeed === 1 ? 2 : gameSpeed === 2 ? 3 : 1;
    document.getElementById('speed-btn').textContent = `⏩ ${gameSpeed}x`;
  });

  document.getElementById('demolish-btn')?.addEventListener('click', () => {
    isDemolishMode = !isDemolishMode;
    document.getElementById('demolish-btn').classList.toggle('border-rose-500', isDemolishMode);
    document.getElementById('demolish-btn').classList.toggle('border-rose-950/60', isDemolishMode);
    updateUI();
  });

  const shopModal = document.getElementById('shop-modal');
  document.getElementById('open-shop-btn')?.addEventListener('click', () => {
    renderShop();
    shopModal.classList.remove('opacity-0', 'pointer-events-none');
  });

  const closeShop = () => shopModal.classList.add('opacity-0', 'pointer-events-none');
  document.getElementById('close-shop-btn')?.addEventListener('click', closeShop);
  document.getElementById('done-shop-btn')?.addEventListener('click', closeShop);

  window.addEventListener('resize', resizeCanvas);

  requestAnimationFrame(drawGame);
});
