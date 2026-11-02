class TrapManager {
  constructor(grid, rows, cols) {
    this.grid = grid;
    this.GRID_ROWS = rows;
    this.GRID_COLS = cols;
  }

  canPlaceTrap(x, y, trapType) {
    if (x < 0 || y < 0 || x >= this.GRID_COLS || y >= this.GRID_ROWS) return false;
    
    for (let i = 0; i < trapType.width; i++) {
      const targetX = x + i;
      if (targetX >= this.GRID_COLS) return false;
      const cell = this.grid[y][targetX];
      if (cell && (cell.type === 'TRAP' || cell.type === 'CASTLE_TILE')) {
        return false;
      }
    }
    return true;
  }

  placeTrap(x, y, trapType) {
    if (!this.canPlaceTrap(x, y, trapType)) return false;

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
    
    const width = trapData ? trapData.width : 1;
    for (let i = 0; i < width; i++) {
      if (this.grid[y][rootX + i]) {
        this.grid[y][rootX + i] = null;
      }
    }
    
    return trapData;
  }
}
