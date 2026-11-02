// js/app.js

let canvas, ctx;
let tileSize = 40;

let gold = 200;
let castleHp = 10;
let maxCastleHp = 10;
let wave = 1;
let kills = 0;
let gameSpeed = 1;
let isWaveActive = false;
let selectedTrap = TRAP_TYPES.BRICK;
let isDemolishMode = false;
let hoverGridX = -1;
let hoverGridY = -1;

let grid = [];
let trapManager = null;

let heroes = [];
let heroesToSpawn = [];
let particles = [];
let floatingTexts = [];
let spawnTimer = 0;
let spawnInterval = 45;
let animTimer = 0;

let shopUpgrades = {
  FORTRESS_WALLS: { level: 0, max: 5, baseCost: 200, name: 'Fortress Reinforcements', icon: '🏰', desc: '+5 Castle HP max & heal castle.' },
  MANA_HARVEST: { level: 0, max: 5, baseCost: 180, name: 'Mana Harvesting', icon: '🪙', desc: 'Gain +15% bonus Gold from all hero eliminations.' },
  TRAP_POWER: { level: 0, max: 5, baseCost: 250, name: 'Trap Overclocking', icon: '⚡', desc: 'Increase all trap damage by +10% globally.' },
  AUTO_REPAIR: { level: 0, max: 3, baseCost: 300, name: 'Repair Drones', icon: '🛠️', desc: 'Automatically restores 1 Castle HP after every wave.' }
};

const HERO_TYPES = {
  MARIO: { name: 'Super Hero', hp: 140, speed: 2.5, gold: 15, color: '#ef4444', maxJumpPower: -9.5, icon: '🏃', canDoubleJump: false },
  LUIGI: { name: 'High Jumper', hp: 110, speed: 3.0, gold: 20, color: '#22c55e', maxJumpPower: -11.5, icon: '🤸', canDoubleJump: true },
  TANK: { name: 'Armor Knight', hp: 350, speed: 1.6, gold: 30, color: '#475569', maxJumpPower: -8.0, icon: '🛡️', canDoubleJump: false }
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

function addParticle(x, y, color, count = 5) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4 - 1,
      size: Math.random() * 4 + 2,
      color: color,
      life: 20 + Math.random() * 15
    });
  }
}

function addFloatingText(text, x, y, color = '#f59e0b') {
  floatingTexts.push({
    text: text,
    x: x,
    y: y,
    vy: -1.2,
    alpha: 1.0,
    color: color
  });
}

function updateUI() {
  document.getElementById('gold-val').textContent = gold;
  document.getElementById('castle-hp-val').textContent = `${castleHp}/${maxCastleHp}`;
  document.getElementById('castle-hp-bar').style.width = `${Math.max(0, (castleHp / maxCastleHp) * 100)}%`;
  document.getElementById('wave-val').textContent = wave;
  document.getElementById('kills-val').textContent = kills;
  document.getElementById('shop-gold-display').textContent = `${gold} G`;
  
  renderTrapButtons();
}

function triggerGameOver() {
  isWaveActive = false;
  heroes = [];
  heroesToSpawn = [];
  const gameOverModal = document.getElementById('game-over-modal');
  if (gameOverModal) {
    gameOverModal.classList.remove('opacity-0', 'pointer-events-none');
  }
}

function resetBattle() {
  castleHp = maxCastleHp;
  isWaveActive = false;
  heroes = [];
  heroesToSpawn = [];
  initGrid();
  updateUI();

  const gameOverModal = document.getElementById('game-over-modal');
  if (gameOverModal) {
    gameOverModal.classList.add('opacity-0', 'pointer-events-none');
  }
}

function startWave() {
  if (isWaveActive) return;
  isWaveActive = true;
  heroesToSpawn = [];
  
  const heroCount = 6 + wave * 3;
  for (let i = 0; i < heroCount; i++) {
    if (i % 2 === 0) heroesToSpawn.push({ ...HERO_TYPES.LUIGI });
    else if (i % 4 === 0 && wave >= 2) heroesToSpawn.push({ ...HERO_TYPES.TANK });
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
    direction: 1,
    width: tileSize * 0.7,
    height: tileSize * 0.9,
    isGrounded: true,
    jumpCooldown: 0,
    hasDoubleJumped: false,
    stuckTimer: 0,
    lastHitTrapTimer: 0
  });
}

function isTileSolid(gx, gy) {
  if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return false;
  const tile = grid[gy]?.[gx];
  if (!tile) return false;
  if (tile.solid) return true;
  if (tile.type === 'TRAP' && tile.trapId === 'BRICK') return true;
  return false;
}

function updateHeroes() {
  if (!isWaveActive) return;

  if (heroesToSpawn.length > 0) {
    spawnTimer += gameSpeed;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnHero(heroesToSpawn.shift());
    }
  }

  const gravity = 0.40;
  const groundY = 9 * tileSize;

  for (let i = heroes.length - 1; i >= 0; i--) {
    const h = heroes[i];
    if (h.jumpCooldown > 0) h.jumpCooldown--;
    if (h.lastHitTrapTimer > 0) h.lastHitTrapTimer--;

    const currentGX = Math.floor((h.x + h.width / 2) / tileSize);

    let obstacleDistance = -1;
    let wallHeight = 0;

    for (let dist = 1; dist <= 4; dist++) {
      const lookGX = currentGX + dist * h.direction;
      let hCount = 0;
      for (let checkY = 8; checkY >= 4; checkY--) {
        if (isTileSolid(lookGX, checkY)) hCount++;
      }

      if (hCount > 0) {
        obstacleDistance = dist;
        wallHeight = hCount;
        break;
      }
    }

    if (h.isGrounded && h.jumpCooldown <= 0) {
      if (obstacleDistance > 0 && obstacleDistance <= 3) {
        let neededPower = h.maxJumpPower;
        if (wallHeight === 1) neededPower *= 0.70;
        
        h.vy = neededPower;
        h.isGrounded = false;
        h.hasDoubleJumped = false;
        h.jumpCooldown = 20;
        audio.playSpring();
        addParticle(h.x + h.width / 2, h.y + h.height, '#94a3b8', 4);
      }
    } else if (!h.isGrounded && h.canDoubleJump && !h.hasDoubleJumped && h.vy > 0) {
      h.vy = h.maxJumpPower * 0.9;
      h.hasDoubleJumped = true;
      audio.playSpring();
      addParticle(h.x + h.width / 2, h.y + h.height, '#38bdf8', 6);
    }

    let moveSpeed = h.speed * h.direction;
    let nextX = h.x + moveSpeed * gameSpeed;
    
    const checkEdgeX = h.direction === 1 ? nextX + h.width : nextX;
    const rightGridX = Math.floor(checkEdgeX / tileSize);
    const footGridY = Math.floor((h.y + h.height - 2) / tileSize);
    const headGridY = Math.floor((h.y + 4) / tileSize);

    const hitWallFeet = isTileSolid(rightGridX, footGridY);
    const hitWallHead = isTileSolid(rightGridX, headGridY);

    if (hitWallFeet || hitWallHead) {
      if (h.direction === 1) nextX = rightGridX * tileSize - h.width - 0.1;
      else nextX = (rightGridX + 1) * tileSize + 0.1;

      h.stuckTimer++;
      
      if (h.name === 'Armor Knight' && h.stuckTimer > 25) {
        trapManager.demolishTrap(rightGridX, footGridY);
        audio.playBuild();
        addParticle(rightGridX * tileSize + tileSize / 2, footGridY * tileSize + tileSize / 2, '#b45309', 10);
        h.stuckTimer = 0;
      } else if (h.stuckTimer > 30) {
        h.hp = 0;
        addFloatingText(`☠️ CURSED!`, h.x + h.width / 2, h.y - 15, '#e11d48');
        addParticle(h.x + h.width / 2, h.y + h.height / 2, '#991b1b', 16);
      }
    } else {
      h.stuckTimer = Math.max(0, h.stuckTimer - 1);
    }

    h.x = nextX;

    h.y += h.vy * gameSpeed;
    h.vy += gravity * gameSpeed;

    const checkFeetY = Math.floor((h.y + h.height) / tileSize);
    const centerGX = Math.floor((h.x + h.width / 2) / tileSize);

    if (isTileSolid(centerGX, checkFeetY)) {
      h.y = checkFeetY * tileSize - h.height;
      h.vy = 0;
      h.isGrounded = true;
      h.hasDoubleJumped = false;
    } else if (h.y + h.height >= groundY) {
      h.y = groundY - h.height;
      h.vy = 0;
      h.isGrounded = true;
      h.hasDoubleJumped = false;
    }

    const gridX = Math.floor((h.x + h.width / 2) / tileSize);
    const gridY = Math.floor((h.y + h.height / 2) / tileSize);
    const tileUnder = grid[gridY]?.[gridX];

    if (tileUnder && tileUnder.type === 'TRAP') {
      if (tileUnder.trapId !== 'BRICK' && h.lastHitTrapTimer <= 0) {
        const dmg = Math.floor(h.maxHp * 0.15);
        h.hp -= dmg;
        h.lastHitTrapTimer = 30;

        addFloatingText(`-${dmg}`, h.x + h.width / 2, h.y - 10, '#f43f5e');
        addParticle(h.x + h.width / 2, h.y + h.height / 2, '#e11d48', 8);

        if (tileUnder.trapId === 'SPIKES' || tileUnder.trapId === 'SAW') {
          audio.playZap();
        } else if (tileUnder.trapId === 'GATOR' || tileUnder.trapId === 'ACID') {
          h.hp -= Math.floor(h.maxHp * 0.40);
          audio.playGatorChomp();
        }
      }
    }

    if (h.x >= 20 * tileSize) {
      castleHp -= 2;
      audio.playCastleHit();
      addFloatingText(`-2 HP`, h.x, h.y - 15, '#ef4444');
      addParticle(h.x, h.y, '#dc2626', 12);
      heroes.splice(i, 1);
      updateUI();

      if (castleHp <= 0) {
        castleHp = 0;
        updateUI();
        triggerGameOver();
      }
      continue;
    }

    if (h.hp <= 0) {
      audio.playScream();
      const reward = Math.floor(h.gold * (1 + shopUpgrades.MANA_HARVEST.level * 0.15));
      gold += reward;
      kills++;
      addFloatingText(`+${reward}G`, h.x + h.width / 2, h.y - 10, '#f59e0b');
      addParticle(h.x + h.width / 2, h.y + h.height / 2, '#fbbf24', 12);
      heroes.splice(i, 1);
      updateUI();
    }
  }

  if (isWaveActive && heroesToSpawn.length === 0 && heroes.length === 0) {
    isWaveActive = false;
    wave++;
    if (shopUpgrades.AUTO_REPAIR.level > 0) {
      castleHp = Math.min(maxCastleHp, castleHp + shopUpgrades.AUTO_REPAIR.level);
    }
    updateUI();
  }
}

function updateParticlesAndText() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }

  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.vy;
    ft.alpha -= 0.02;
    if (ft.alpha <= 0) floatingTexts.splice(i, 1);
  }
}

function drawGame() {
  animTimer += 0.05;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, '#090d16');
  bgGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const x = c * tileSize;
      const y = r * tileSize;
      const tile = grid[r][c];

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, tileSize, tileSize);

      if (tile) {
        if (tile.type === 'GROUND_TILE') {
          ctx.fillStyle = '#334155';
          ctx.fillRect(x, y, tileSize, tileSize);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(x, y, tileSize, 4);
        } else if (tile.type === 'DIRT_TILE') {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x, y, tileSize, tileSize);
        } else if (tile.type === 'CASTLE_TILE') {
          ctx.fillStyle = '#b45309';
          ctx.fillRect(x, y, tileSize, tileSize);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
        } else if (tile.type === 'WATER_PIT') {
          const waveOffset = Math.sin(animTimer + c) * 3;
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(x, y + waveOffset, tileSize, tileSize - waveOffset);
        } else if (tile.type === 'TRAP' && tile.isRoot) {
          const tData = TRAP_TYPES[tile.trapId];
          const w = tileSize * (tData ? tData.width : 1);
          
          if (tile.trapId === 'BRICK') {
            ctx.fillStyle = '#d97706';
            ctx.fillRect(x, y, w, tileSize);
            ctx.strokeStyle = '#78350f';
            ctx.strokeRect(x + 2, y + 2, w - 4, tileSize - 4);
          } else {
            ctx.fillStyle = '#3f3f46';
            ctx.fillRect(x, y, w, tileSize);
          }

          ctx.font = `${Math.floor(tileSize * 0.55)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(tData ? tData.icon : '❓', x + w / 2, y + tileSize / 2);
        }
      }
    }
  }

  heroes.forEach((h) => {
    ctx.fillStyle = h.color;
    ctx.fillRect(h.x, h.y, h.width, h.height);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(h.x, h.y, h.width, h.height);

    ctx.font = `${Math.floor(tileSize * 0.5)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(h.icon, h.x + h.width / 2, h.y + h.height / 2);

    const hpRatio = Math.max(0, h.hp / h.maxHp);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(h.x, h.y - 8, h.width, 4);
    ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : '#ef4444';
    ctx.fillRect(h.x, h.y - 8, h.width * hpRatio, 4);
  });

  particles.forEach((p) => {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });

  floatingTexts.forEach((ft) => {
    ctx.save();
    ctx.globalAlpha = ft.alpha;
    ctx.font = 'bold 12px "Press Start 2P", sans-serif';
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  });

  if (hoverGridX >= 0 && hoverGridX < GRID_COLS && hoverGridY >= 0 && hoverGridY < GRID_ROWS) {
    ctx.fillStyle = isDemolishMode ? 'rgba(244, 63, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)';
    ctx.fillRect(hoverGridX * tileSize, hoverGridY * tileSize, tileSize * (isDemolishMode ? 1 : selectedTrap.width), tileSize);
  }

  updateHeroes();
  updateParticlesAndText();
  requestAnimationFrame(drawGame);
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
            maxCastleHp += 5;
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
  });

  document.getElementById('start-wave-btn')?.addEventListener('click', () => {
    audio.init();
    startWave();
  });

  document.getElementById('retry-btn')?.addEventListener('click', () => {
    audio.init();
    resetBattle();
  });

  document.getElementById('main-menu-btn')?.addEventListener('click', () => {
    audio.init();
    resetBattle();
    document.getElementById('main-menu-overlay').classList.remove('hidden');
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
