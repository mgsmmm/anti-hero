import { TRAP_TYPES } from './config.js';

export class TrapManager {
  constructor(grid, rows, cols) {
    this.grid = grid;
    this.GRID_ROWS = rows;
    this.GRID_COLS = cols;
  }

  placeTrap(x, y, trapType) {
    if (x < 0 || y < 0 || x >= this.GRID_COLS || y >= this.GRID_ROWS) return false;
    
    // Check width constraint for multi-tile traps (e.g. Gator Pit)
    if (trapType.width > 1) {
      if (x + trapType.width > this.GRID_COLS) return false;
      for (let i = 0; i < trapType.width; i++) {
        if (this.grid[y][x + i] && this.grid[y][x + i].type === 'TRAP') return false;
      }
    }

    this.grid[y][x] = {
      type: 'TRAP',
      trapId: trapType.id,
      isRoot: true,
      rootX: x,
      level: 1
    };

    if (trapType.width > 1) {
      for (let i = 1; i < trapType.width; i++) {
        this.grid[y][x + i] = {
          type: 'TRAP',
          trapId: trapType.id,
          isRoot: false,
          rootX: x,
          level: 1
        };
      }
    }

    return true;
  }

  demolishTrap(x, y) {
    const tile = this.grid[y]?.[x];
    if (!tile || tile.type !== 'TRAP') return null;

    const rootX = tile.rootX;
    const trapData = TRAP_TYPES[tile.trapId];
    
    for (let i = 0; i < (trapData ? trapData.width : 1); i++) {
      if (this.grid[y][rootX + i]) {
        this.grid[y][rootX + i] = null;
      }
    }
    
    return trapData;
  }
}
