const GRID_COLS = 24;
const GRID_ROWS = 12;

const TRAP_TYPES = {
  BRICK: {
    id: 'BRICK',
    name: 'Brick Wall',
    icon: '🧱',
    cost: 30,
    desc: 'Solid brick obstacle. Blocks paths, forcing heroes to jump into traps.',
    width: 1, height: 1
  },
  SPIKES: {
    id: 'SPIKES',
    name: 'Floor Spikes',
    icon: '🗡️',
    cost: 45,
    desc: 'Sharp iron floor spikes dealing 50% max HP damage.',
    width: 1, height: 1
  },
  ANVIL: {
    id: 'ANVIL',
    name: 'Ceiling Drop Anvil',
    icon: '🔨',
    cost: 60,
    desc: 'Triggers & falls when a hero walks under it. Devastating crush damage.',
    width: 1, height: 1
  },
  GATOR: {
    id: 'GATOR',
    name: 'Water Gator Pit',
    icon: '🐊',
    cost: 75,
    desc: 'Converts ground into a 2-tile water pit with hungry snapping alligators.',
    width: 2, height: 1
  },
  SAW: {
    id: 'SAW',
    name: 'Spinning Sawblade',
    icon: '⚙️',
    cost: 85,
    desc: 'High-speed motorized razor blade shredding ground & air heroes.',
    width: 1, height: 1
  },
  CANNON: {
    id: 'CANNON',
    name: 'Fire Sling Cannon',
    icon: '💣',
    cost: 100,
    desc: 'Artillery cannon launching explosive fireballs horizontally left.',
    width: 1, height: 1
  },
  TRAMPOLINE: {
    id: 'TRAMPOLINE',
    name: 'Reverse Springboard',
    icon: '🌀',
    cost: 55,
    desc: 'Launches heroes backward or straight up into ceiling spikes & anvils.',
    width: 1, height: 1
  },
  FREEZE: {
    id: 'FREEZE',
    name: 'Freeze Ray / Ice Floor',
    icon: '🧊',
    cost: 80,
    desc: 'Freezes heroes in place for 2 seconds & makes ground slippery.',
    width: 1, height: 1
  },
  POISON: {
    id: 'POISON',
    name: 'Poison Gas Vent',
    icon: '🧪',
    cost: 90,
    desc: 'Emits continuous toxic AOE cloud damaging all passing heroes.',
    width: 1, height: 1
  },
  ACID: {
    id: 'ACID',
    name: 'Acid Pitfall Trap',
    icon: '☣️',
    cost: 110,
    desc: 'Instant kill pit trap dissolving any unwary hero falling inside.',
    width: 1, height: 1
  },
  TESLA: {
    id: 'TESLA',
    name: 'Tesla Tower',
    icon: '⚡',
    cost: 125,
    desc: 'Zaps airborne and balloon-paragliding heroes in range with lightning.',
    width: 1, height: 1
  }
};
