import { GRID_COLS, GRID_ROWS, TRAP_TYPES } from './config.js';
import { audio } from './audio.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let tileSize = 40;
let gold = 350;
let castleHp = 1;
const maxCastleHp = 1;
let wave = 1;
let kills = 0;
let tries = 1;
let gameSpeed = 1;
let isWaveActive = false;
let selectedTrap = TRAP_TYPES.BRICK;
let isDemolishMode = false;
let hoverGridX = -1;
let hoverGridY = -1;

// Shop & global upgrades state
let shopUpgrades = {
  FORTRESS_WALLS: { level: 0, max: 5, baseCost: 150, name: 'Fortress Reinforcements', icon: '🏰', desc: '+10 Castle HP max & heal castle.' },
  MANA_HARVEST: { level: 0, max: 5, baseCost: 120, name: 'Mana Harvesting', icon: '🪙', desc: 'Gain +25% bonus Gold from all hero eliminations.' },
  TRAP_POWER: { level: 0, max: 5, baseCost: 200, name: 'Trap Overclocking', icon: '⚡', desc: 'Increase all trap damage by +20% globally.' },
  AUTO_REPAIR: { level: 0, max: 3, baseCost: 250, name: 'Repair Drones', icon: '🛠️', desc: 'Automatically restores 2 Castle HP after every wave.' }
};

let globalDamageMultiplier = 1.0;
let goldMultiplier = 1.0;

let grid = [];
let heroes = [];
let projectiles = [];
let particles = [];
let anvils = [];
let poisonClouds = [];
let combatTexts = [];
let teslaArcs = [];

let heroesToSpawn = [];
let spawnTimer = 0;

export function initGrid() {
  grid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));

  // Guarantee safe spawn runway on columns 0 through 3 on ground layer (row 9)
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

  // Initial Water Gator Pit positioned further away from spawn runway (column 12-13)
  grid[9][12] = null; grid[10][12] = { type: 'WATER_PIT' }; grid[11][12] = { type: 'WATER_PIT' };
  grid[9][13] = null; grid[10][13] = { type: 'WATER_PIT' }; grid[11][13] = { type: 'WATER_PIT' };
  grid[9][12] = { type: 'TRAP', trapId: 'GATOR', isRoot: true, rootX: 12, level: 1 };
  grid[9][13] = { type: 'TRAP', trapId: 'GATOR', isRoot: false, rootX: 12, level: 1 };
}

export function resizeCanvas() {
  const container = canvas.parentElement;
  if (!container) return;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  tileSize = Math.floor(Math.min(canvas.width / GRID_COLS, canvas.height / GRID_ROWS));
}

// Window Event Listeners
window.addEventListener('resize', resizeCanvas);
window.addEventListener('DOMContentLoaded', () => {
  audio.init();
  initGrid();
  resizeCanvas();
});
