// --- CENTRALIZED CONFIGURATION ---
// Magic numbers and tuning values extracted here to avoid scattering them
// throughout the codebase. Import order: loaded before game.js.

const CONFIG = {
    // Energy system
    ENERGY_REGEN_INTERVAL_MS: 60000,   // 1 min per energy point
    ENERGY_BASE_CAP: 50,
    ENERGY_UPGRADED_CAP: 100,
    ENERGY_UPGRADE_GOLD_COST: 300,

    // HP regen system
    HP_REGEN_INTERVAL_MS: 60000,       // 1 min per regen tick
    HP_REGEN_AMOUNT: 10,               // HP regained per tick

    // UI polling intervals (setInterval)
    UI_POLL_INTERVAL_MS: 1000,

    // Combat log
    COMBAT_LOG_MAX_ENTRIES: 20,

    // Inventory
    INVENTORY_STACK_CAP: 99,

    // Auto-battle
    AUTO_BATTLE_DELAY_MS: 500,

    // Enemy bracket stats (level thresholds)
    ENEMY_BRACKETS: [
        { maxLvl: 20,  baseHp: 200, baseDmg: 80,  baseDef: 10, mult: 1.0  },
        { maxLvl: 40,  baseHp: 240, baseDmg: 95,  baseDef: 16, mult: 1.15 },
        { maxLvl: 60,  baseHp: 290, baseDmg: 115, baseDef: 26, mult: 1.35 },
        { maxLvl: 80,  baseHp: 350, baseDmg: 145, baseDef: 38, mult: 1.6  },
        { maxLvl: Infinity, baseHp: 430, baseDmg: 180, baseDef: 54, mult: 1.9 }
    ],
    ENEMY_BRACKET_LEVEL_SCALE: 0.03,   // +3% stats per level within bracket

    // Boss multipliers
    BOSS_HP_BASE: 25,                  // Multiplied by hpMult and level scaling
    BOSS_HP_LEVEL_SCALE: 0.4,         // Per-level multiplier on boss HP
    GRAVEYARD_BOSS_HP_MULT: 3,
    INVASION_BOSS_HP_MULT: 5,

    // Audio
    MAX_CONCURRENT_OSCILLATORS: 32,    // Guard against memory leaks in rapid auto-battle

    // Save system
    IDB_DB_NAME: 'EternalAscensionDB',
    IDB_DB_VERSION: 1,
    IDB_STORE_NAME: 'saves',
    SAVE_KEY: 'EternalAscensionSaveDataV1',
    SAVE_KEY_ENEMIES: 'EternalAscensionSavedEnemies',
    LEGACY_SAVE_KEYS: ['fogFighterSaveDataV22', 'fogFighterSaveDataV21', 'fogFighterSaveDataV20'],
    CLASS_SAVE_PREFIX: 'EternalAscensionClassSave_',

    // Gamble / gather
    GAMBLE_WIN_CHANCE: 0.5,

    // No-energy overlay
    NO_ENERGY_OVERLAY_DURATION_MS: 1500,
};

// --- SIMPLE PUB/SUB EVENT BUS ---
// Decouples game-logic state changes from UI re-renders.
// Usage:
//   GameEvents.on('player:hp', updateCombatUI);
//   GameEvents.emit('player:hp', { current: 50, max: 100 });
//   GameEvents.off('player:hp', updateCombatUI);
const GameEvents = (() => {
    const _listeners = {};

    function on(event, fn) {
        if (!_listeners[event]) _listeners[event] = [];
        _listeners[event].push(fn);
    }

    function off(event, fn) {
        if (!_listeners[event]) return;
        _listeners[event] = _listeners[event].filter(f => f !== fn);
    }

    function emit(event, data) {
        if (!_listeners[event]) return;
        // Shallow copy to avoid mutation issues during iteration
        _listeners[event].slice().forEach(fn => {
            try { fn(data); } catch (e) { console.error('GameEvents handler error:', event, e); }
        });
    }

    return { on, off, emit };
})();
