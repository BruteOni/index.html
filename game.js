// --- WEB AUDIO API & MUSIC ---
let audioCtx = null;
let activeOscillators = [];
let musicLoopTimeoutId = null;

// Legacy save key priority list (newest → oldest) used for backwards-compatible save loading
const LEGACY_SAVE_KEYS = [
    'EternalAscensionSaveDataV1',
    'fogFighterSaveDataV22',
    'fogFighterSaveDataV21',
    'fogFighterSaveDataV20'
];

function setAvatarDisplay(elementId, avatar) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (avatar && /\.(png|jpg|webp|gif)$/i.test(avatar)) {
        const img = document.createElement('img');
        img.src = avatar;
        img.alt = 'Avatar';
        img.style.width = '96px';
        img.style.height = '96px';
        img.className = 'object-contain inline-block';
        el.innerHTML = '';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.appendChild(img);
    } else {
        el.style.display = '';
        el.style.alignItems = '';
        el.style.justifyContent = '';
        el.innerText = avatar || '🧑';
    }
}

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}
window.addEventListener('click', (e) => {
    if (!audioCtx || audioCtx.state !== 'running') {
        initAudio();
    }
    if (e.target.closest('button') || e.target.closest('.equip-slot') || e.target.closest('.enemy-card')) {
        playSound('click');
    }
});

/**
 * Creates, configures, and plays a single Web Audio API oscillator node.
 * @param {string} oscType - OscillatorNode type ('sine','square','sawtooth','triangle')
 * @param {number} startFreq - Starting frequency in Hz
 * @param {number|null} endFreq - Ending frequency in Hz (null = no ramp)
 * @param {number} startGain - Initial gain value
 * @param {number} duration - Duration of the gain envelope and stop time in seconds
 * @param {number} now - audioCtx.currentTime reference
 * @param {object} [opts] - Optional overrides
 * @param {number}  [opts.endGain=0.001]     - Final gain value (must be > 0 for exponential ramp)
 * @param {string}  [opts.freqRamp='exponential'] - Frequency ramp type: 'exponential' or 'linear'
 * @param {string}  [opts.gainRamp='exponential'] - Gain ramp type: 'exponential' or 'linear'
 * @param {number}  [opts.offset=0]          - Start time offset from `now` in seconds
 * @param {number}  [opts.freqDur]           - Frequency ramp duration (defaults to `duration`)
 */
function playOscillator(oscType, startFreq, endFreq, startGain, duration, now, opts = {}) {
    const {
        endGain = 0.001,
        freqRamp = 'exponential',
        gainRamp = 'exponential',
        offset = 0,
        freqDur = duration
    } = opts;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = now + offset;
    osc.type = oscType;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(startFreq, t);
    if (endFreq !== null) {
        if (freqRamp === 'linear') {
            osc.frequency.linearRampToValueAtTime(endFreq, t + freqDur);
        } else {
            osc.frequency.exponentialRampToValueAtTime(endFreq, t + freqDur);
        }
    }
    gain.gain.setValueAtTime(startGain, t);
    if (gainRamp === 'linear') {
        gain.gain.linearRampToValueAtTime(endGain, t + duration);
    } else {
        gain.gain.exponentialRampToValueAtTime(endGain, t + duration);
    }
    osc.start(t);
    osc.stop(t + duration);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
}

function playSound(type) {
    if(typeof globalProgression === 'undefined') window.globalProgression = {};
    if(!globalProgression.settings) globalProgression.settings = { sound: true, music: true };
    if(!globalProgression.settings.sound) return;
    if (!audioCtx || audioCtx.state !== 'running') return;
    const now = audioCtx.currentTime;

    if (type === 'hit') {
        playOscillator('sawtooth', 220, 55, 0.08, 0.12, now);
    } else if (type === 'crit') {
        // Metallic crash: noise burst via rapid random frequency modulation
        const noiseOsc = audioCtx.createOscillator();
        const noiseGain = audioCtx.createGain();
        noiseOsc.type = 'square';
        noiseOsc.frequency.setValueAtTime(3000, now);
        for (let t = 0; t < 0.15; t += 0.003) {
            noiseOsc.frequency.setValueAtTime(1000 + Math.random() * 4000, now + t);
        }
        noiseOsc.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noiseGain.gain.setValueAtTime(0.06, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        noiseOsc.start(now);
        noiseOsc.stop(now + 0.15);
        noiseOsc.onended = () => { noiseOsc.disconnect(); noiseGain.disconnect(); };
        // Second noise layer (triangle) for thickness/density
        const triOsc = audioCtx.createOscillator();
        const triGain = audioCtx.createGain();
        triOsc.type = 'triangle';
        triOsc.frequency.setValueAtTime(500, now);
        for (let t = 0; t < 0.12; t += 0.003) {
            triOsc.frequency.setValueAtTime(500 + Math.random() * 1500, now + t);
        }
        triOsc.connect(triGain);
        triGain.connect(audioCtx.destination);
        triGain.gain.setValueAtTime(0.04, now);
        triGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        triOsc.start(now);
        triOsc.stop(now + 0.12);
        triOsc.onended = () => { triOsc.disconnect(); triGain.disconnect(); };
        // High-pitched descending sweep
        playOscillator('sine', 2500, 150, 0.05, 0.18, now);
        // Low thump for weight
        playOscillator('sine', 80, 40, 0.07, 0.10, now);
    } else if (type === 'heal') {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const t = now + i * 0.07;
            osc.type = 'sine';
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.0, t);
            gain.gain.linearRampToValueAtTime(0.05, t + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
            osc.start(t);
            osc.stop(t + 0.25);
            osc.onended = () => { osc.disconnect(); gain.disconnect(); };
        });
    } else if (type === 'shield' || type === 'buff') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const lfo = audioCtx.createOscillator();
        const lfoGain = audioCtx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 8;
        lfoGain.gain.value = 6;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.2);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        lfo.start(now);
        osc.stop(now + 0.3);
        lfo.stop(now + 0.3);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); lfo.disconnect(); lfoGain.disconnect(); };
    } else if (type === 'win') {
        [[523.25, 0], [659.25, 0.1], [783.99, 0.2], [1046.5, 0.3], [1318.5, 0.4]].forEach(([freq, delay]) => {
            playOscillator('triangle', freq, null, 0.05, 0.25, now, { offset: delay });
        });
    } else if (type === 'lose') {
        [[440, 0], [370, 0.15], [311, 0.3], [261, 0.45], [220, 0.6]].forEach(([freq, delay]) => {
            playOscillator('sawtooth', freq, freq * 0.7, 0.04, 0.3, now, {
                offset: delay, freqRamp: 'linear', gainRamp: 'linear', freqDur: 0.2
            });
        });
    } else if (type === 'click') {
        playOscillator('sine', 1200, 600, 0.015, 0.04, now);
    } else if (type === 'pb_clash') {
        // Meaty layered impact: low thump + metallic crunch + high burst
        playOscillator('sine', 120, 40, 0.12, 0.18, now, { freqDur: 0.15 });
        const crunch = audioCtx.createOscillator();
        const crunchG = audioCtx.createGain();
        crunch.type = 'square';
        for (let t = 0; t < 0.12; t += 0.004) {
            crunch.frequency.setValueAtTime(800 + Math.random() * 2000, now + t);
        }
        crunch.connect(crunchG);
        crunchG.connect(audioCtx.destination);
        crunchG.gain.setValueAtTime(0.07, now);
        crunchG.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        crunch.start(now);
        crunch.stop(now + 0.14);
        crunch.onended = () => { crunch.disconnect(); crunchG.disconnect(); };
        playOscillator('sawtooth', 400, 100, 0.05, 0.1, now);
    } else if (type === 'pb_shield') {
        // Resonant metallic "ting!" - high ping with long decay
        playOscillator('triangle', 2200, 1800, 0.07, 0.35, now, { freqDur: 0.3 });
        playOscillator('sine', 3400, 2800, 0.04, 0.27, now, { offset: 0.01, freqDur: 0.24 });
    } else if (type === 'pb_counter') {
        // Quick whip/whoosh: fast descending sweep + snap
        playOscillator('sawtooth', 900, 150, 0.06, 0.1, now);
        playOscillator('square', 2500, 400, 0.05, 0.06, now, { offset: 0.07, freqDur: 0.05 });
    } else if (type === 'pb_suspense') {
        // Slow ascending tone that builds anticipation
        const rise = audioCtx.createOscillator();
        const riseG = audioCtx.createGain();
        rise.type = 'sine';
        rise.frequency.setValueAtTime(200, now);
        rise.frequency.linearRampToValueAtTime(600, now + 0.45);
        rise.connect(riseG);
        riseG.connect(audioCtx.destination);
        riseG.gain.setValueAtTime(0.0, now);
        riseG.gain.linearRampToValueAtTime(0.06, now + 0.1);
        riseG.gain.linearRampToValueAtTime(0.08, now + 0.4);
        riseG.gain.linearRampToValueAtTime(0.0, now + 0.5);
        rise.start(now);
        rise.stop(now + 0.5);
        rise.onended = () => { rise.disconnect(); riseG.disconnect(); };
        const shimmer = audioCtx.createOscillator();
        const shimmerG = audioCtx.createGain();
        shimmer.type = 'triangle';
        shimmer.frequency.setValueAtTime(400, now);
        shimmer.frequency.linearRampToValueAtTime(1200, now + 0.45);
        shimmer.connect(shimmerG);
        shimmerG.connect(audioCtx.destination);
        shimmerG.gain.setValueAtTime(0.0, now);
        shimmerG.gain.linearRampToValueAtTime(0.03, now + 0.15);
        shimmerG.gain.linearRampToValueAtTime(0.0, now + 0.5);
        shimmer.start(now);
        shimmer.stop(now + 0.5);
        shimmer.onended = () => { shimmer.disconnect(); shimmerG.disconnect(); };
    } else if (type === 'pb_big_hit') {
        // Extra punchy multi-layer: deep sub + metallic crash + high shriek
        playOscillator('sine', 60, 25, 0.15, 0.22, now, { freqDur: 0.2 });
        playOscillator('sawtooth', 300, 80, 0.09, 0.2, now, { freqDur: 0.18 });
        const shriek = audioCtx.createOscillator();
        const shriekG = audioCtx.createGain();
        shriek.type = 'square';
        for (let t = 0; t < 0.16; t += 0.003) {
            shriek.frequency.setValueAtTime(1500 + Math.random() * 3000, now + t);
        }
        shriek.connect(shriekG);
        shriekG.connect(audioCtx.destination);
        shriekG.gain.setValueAtTime(0.06, now);
        shriekG.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        shriek.start(now);
        shriek.stop(now + 0.18);
        shriek.onended = () => { shriek.disconnect(); shriekG.disconnect(); };
    } else if (type === 'pb_whiff') {
        // Soft "pff" miss: gentle noise puff
        playOscillator('triangle', 500, 150, 0.03, 0.14, now, { freqDur: 0.12 });
    }
}

// BOSS & BATTLE MUSIC SYSTEM

// Boss Song 1: Dark ambient - deep bass drone with slow sine melody (loops)
function playBossSong1() {
    if(!globalProgression.settings.music) return;
    stopMusic(); if (!audioCtx || audioCtx.state !== 'running') return;
    const now = audioCtx.currentTime;
    // Bass drone
    const bass = audioCtx.createOscillator(); const bassGain = audioCtx.createGain();
    bass.type = 'sine'; bass.frequency.value = 65.41;
    bass.connect(bassGain); bassGain.connect(audioCtx.destination);
    bassGain.gain.setValueAtTime(0, now); bassGain.gain.linearRampToValueAtTime(0.04, now + 3);
    bass.start(now); const bassEntry = {osc: bass, gain: bassGain}; activeOscillators.push(bassEntry);
    bass.onended = () => { const i = activeOscillators.indexOf(bassEntry); if (i !== -1) activeOscillators.splice(i, 1); bassGain.disconnect(); };
    // Slow melody
    const mel = audioCtx.createOscillator(); const melGain = audioCtx.createGain();
    mel.type = 'sine';
    const melody = [[130.81,3],[155.56,3],[146.83,3],[130.81,3],[116.54,3],[123.47,3],[130.81,3],[110,3],[130.81,3],[155.56,3],[146.83,3],[130.81,3],[116.54,6],[130.81,3],[155.56,3],[185,3],[174.61,3],[155.56,3],[146.83,6]];
    let t = now; melody.forEach(([f, d]) => { mel.frequency.setValueAtTime(f, t); t += d; });
    mel.connect(melGain); melGain.connect(audioCtx.destination);
    melGain.gain.setValueAtTime(0, now); melGain.gain.linearRampToValueAtTime(0.025, now + 4);
    mel.start(now); const melEntry = {osc: mel, gain: melGain}; activeOscillators.push(melEntry);
    mel.onended = () => { const i = activeOscillators.indexOf(melEntry); if (i !== -1) activeOscillators.splice(i, 1); melGain.disconnect(); };
    const totalDur = melody.reduce((s, [f,d]) => s+d, 0);
    musicLoopTimeoutId = setTimeout(() => { if(globalProgression.settings.music && activeOscillators.length > 0) playBossSong1(); }, totalDur * 1000);
}

// Boss Song 2: Ethereal - triangle waves, minor pentatonic, slow (loops)
function playBossSong2() {
    if(!globalProgression.settings.music) return;
    stopMusic(); if (!audioCtx || audioCtx.state !== 'running') return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = 'triangle';
    const penta = [[220,4],[261.63,4],[293.66,4],[349.23,4],[392,4],[349.23,4],[293.66,4],[261.63,4],[220,4],[196,4],[220,4],[261.63,4],[293.66,4],[349.23,4],[392,4],[440,4],[392,4],[349.23,4],[293.66,4],[220,8]];
    let t = now; penta.forEach(([f,d]) => { osc.frequency.setValueAtTime(f, t); t += d; });
    osc.connect(gain); gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.035, now + 3);
    osc.start(now); const oscEntry = {osc, gain}; activeOscillators.push(oscEntry);
    osc.onended = () => { const i = activeOscillators.indexOf(oscEntry); if (i !== -1) activeOscillators.splice(i, 1); gain.disconnect(); };
    const totalDur = penta.reduce((s, [f,d]) => s+d, 0);
    musicLoopTimeoutId = setTimeout(() => { if(globalProgression.settings.music && activeOscillators.length > 0) playBossSong2(); }, totalDur * 1000);
}

function playBossMusic() {
    const pick = Math.floor(Math.random() * 2) + 1;
    if(pick === 1) playBossSong1();
    else playBossSong2();
}

function stopMusic() {
    if (musicLoopTimeoutId !== null) { clearTimeout(musicLoopTimeoutId); musicLoopTimeoutId = null; }
    if (!audioCtx) { activeOscillators = []; return; }
    activeOscillators.forEach(o => {
        try { 
            o.gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
            setTimeout(() => { try { o.osc.stop(); if(o.lfo) o.lfo.stop(); } catch(e){} }, 1000);
        } catch(e){}
    });
    activeOscillators = [];
}

// --- GLOBAL & PLAYER STATE ---
let globalProgression = {
    gender: 'male',
    gold: 100, kills: 0, dungeonTier: 1, tickets: 5,
    energy: 10, lastEnergyTime: Date.now(),
    questProg1: 0, questGoal1: 3, questRwd1: 50, questRarity1: 'common', questType1: 'hunting',
    questProg2: 0, questGoal2: 3, questRwd2: 100, questRarity2: 'common', questType2: 'pillage',
    questProg3: 0, questGoal3: 3, questRwd3: 150, questRarity3: 'common', questType3: 'workshop',
    questProg4: 0, questGoal4: 3, questRwd4: 200, questRarity4: 'common', questType4: 'dungeon',
    questsCompletedToday: 0, lastQuestDate: new Date().toDateString(),
    wellLastHealDate: '', wellXpBattles: 0, wellDropBattles: 0, wellLastXpDate: '', wellLastDropDate: '', wellLastEnergyDate: '', wellLastEnergy50Date: '', wellLastEnergy100Date: '',
    lastHpRegenTime: Date.now(), enemyKillCounts: {}, claimedCodexMilestones: {},
    totalExpEarned: 0, cooldowns: { herbs: 0, mine: 0, fish: 0, enchants: 0 },
    inventory: { ench_common: 0, ench_rare: 0, ench_epic: 0, ench_legendary: 0, herb_red: 0, herb_blue: 0, fish_1: 0, fish_2: 0, fish_3: 0, fish_4: 0, fish_5: 0, fish_6: 0, soul_pebbles: 0, pot_i1: 30, pot_i2: 0, pot_i3: 0, pot_r1: 0, pot_r2: 0, pot_r3: 0, food_d1: 0, food_d2: 0, food_d3: 0, food_df1: 0, food_df2: 0, food_df3: 0 },
    usableItems: {},
    equipInventory: [], equipped: { head: null, shoulders: null, chest: null, arms: null, waist: null, legs: null, boots: null, necklace: null, ring1: null, ring2: null, ring3: null, ring4: null, weapon: null, cape: null },
    newItems: {}, shopGear: [], shopLastRefresh: 0,
    attributes: { hp: 0, tenacity: 0, agility: 0, willpower: 0, resistance: 0, reflexes: 0, fury: 0, happiness: 0, rawPower: 0, force: 0, revival: 0, vampire: 0, defense: 0 },
    storyModeProgress: { hunting: 0, pillage: 0, workshop: 0, island_defense: 0 },
    settings: { sound: true, music: true, autoBattleTargetPriority: 'easy', autoBattleUsables: [] },
    discoveredEnemies: {}, claimedCodexRewards: {}, killedBosses: {}, discoveredMythicBosses: [],
    skillTreeEnhancements: [],
    burglarDailyPurchases: 0, burglarLastPurchaseDate: '',
    petsOwned: [], petBattlesWon: 0, petBattleWinStreak: 0, petBattleBestStreak: 0,
    discoveredPets: {}, claimedPetRewards: {}, ultimatePetRewardClaimed: false,
    petWinLoss: {},
    petBattleEnergy: 10, petBattleLastEnergyTime: Date.now(),
    blackMarketTier: 0,
    patchV1Applied: false,
    saveVersion: 2
};
const TREE_NODES = [];
const skillUnlockNodes = [5, 10, 15, 20, 25, 35, 47];
const regenNodes = [8, 18, 28, 38, 46];
const statCycle = ['dmg', 'def', 'hp'];
let cycleIdx = 0;
for(let i=1; i<=50; i++) {
    if(i===48) TREE_NODES.push({type: 'infinite', stat: 'hp', val: 20, cost: 1});
    else if(i===49) TREE_NODES.push({type: 'infinite', stat: 'dmg', val: 5, cost: 1});
    else if(i===50) TREE_NODES.push({type: 'infinite', stat: 'def', val: 2, cost: 1});
    else if(skillUnlockNodes.includes(i)) { let skillIdx = 3 + skillUnlockNodes.indexOf(i); TREE_NODES.push({type: 'skill', index: skillIdx, cost: 1}); } 
    else if(regenNodes.includes(i)) { TREE_NODES.push({type: 'stat', stat: 'regen', val: 1, cost: 1}); }
    else { let st = statCycle[cycleIdx % 3]; let v = st==='hp'? 10 : 1; TREE_NODES.push({type: 'stat', stat: st, val: v, cost: 1}); cycleIdx++; }
}

let player = {
    classId: 'warrior', data: CLASSES['warrior'], lvl: 0, xp: 0, maxHp: 0, currentHp: 0, shield: 0,
    statPoints: 0, treeProgress: 0, treeBonusHp: 0, treeBonusDmg: 0, treeBonusDef: 0, treeBonusRegen: 0,
    treeProgressFire: 0, treeProgressIce: 0, treeProgressOffense: 0, treeProgressDefense: 0,
    treeProgressHoly: 0, treeProgressGuardian: 0, treeProgressShadow: 0, treeProgressVenom: 0, treeProgressDivine: 0, treeProgressPlague: 0,
    treeProgressPrecision: 0, treeProgressSurvival: 0,
    skillPoints: 0, unlockedSkills: [0, 1, 2], equippedSkills: [0, 1, 2, null, null], 
    skillCooldowns: {}, regenBuffs: [], activeBuffs: [],
    stunned: 0, bleedStacks: 0, bleedTurns: 0, dodgeTurns: 0,
    wayOfHeavensCooldown: 0, rageUsed: false, rageActive: 0, divineShieldUsed: false, reflectUsed: false,
    nodeEnhancements: {},
    skillMenuProgress: 0, skillMenuBonusDmgPct: 0, skillMenuBonusDefPct: 0, skillMenuBonusHpPct: 0, skillMenuInfiniteAtk: 0
};

let enemies = []; let savedEnemies = {}; let activeTargetIndex = 0; let currentMode = 'none'; 
const NON_PERSIST_MODES = ['quest', 'training', 'graveyard', 'invasion', 'dungeon'];
let activeDungeonTier = 1; let activeDungeonRoom = 1; 
let isPlayerTurn = true; let combatLog = []; let isAutoBattle = false; let combatActive = false; let battleEnding = false;
let activeGraveyardBoss = null;
// Invasion state
let invasionTotalKills = 0; let invasionKillGoal = 10; let invasionMaxOnScreen = 4; let invasionSpawned = 0;
// Pet battle state
let petBattlePlayerPet = null; let petBattleEnemyPet = null; let petBattleActive = false;
let petBattlePlayerHp = 10; let petBattleEnemyHp = 10; let petBattleLastAction = null; let petBattleEnemyLastAction = null;
let petBattleAutoMode = false; let petBattleAutoTimer = null;

// --- ENERGY SYSTEM ---

function getEl(id) {
    return document.getElementById(id);
}

function getMaxEnergy() {
    let baseCap = globalProgression.energyCapUnlocked ? 100 : 50;
    return Math.min(baseCap, 10 + Math.max(0, player.lvl - 1));
}

function updateEnergy() {
    const maxEnergy = getMaxEnergy();
    const now = Date.now();
    const msPassed = now - globalProgression.lastEnergyTime;
    const minutesPassed = Math.floor(msPassed / 60000);
    if (globalProgression.energy < maxEnergy) {
        if (minutesPassed > 0) {
            globalProgression.energy = Math.min(maxEnergy, globalProgression.energy + minutesPassed);
            globalProgression.lastEnergyTime = now - (msPassed % 60000);
        }
    } else {
        globalProgression.lastEnergyTime = now;
    }

    const eEl = getEl('hub-energy');
    if (eEl) eEl.innerText = globalProgression.energy;
    const eMxEl = getEl('hub-energy-max');
    if (eMxEl) eMxEl.innerText = maxEnergy;
    const eBar = getEl('hub-energy-bar');
    if (eBar) eBar.style.width = (maxEnergy > 0 ? Math.round((globalProgression.energy / maxEnergy) * 100) : 0) + '%';
    const seEl = getEl('story-energy');
    if (seEl) seEl.innerText = globalProgression.energy;

    // Show/hide energy cap upgrade indicator in well button
    const wellNoti = getEl('hub-well-energy-noti');
    if (wellNoti) {
        wellNoti.style.display = (!globalProgression.energyCapUnlocked && getMaxEnergy() >= 50 && globalProgression.gold >= 300) ? 'inline' : 'none';
    }

    ['herbs', 'mine', 'fish', 'enchants'].forEach(type => {
        const el = getEl(`timer-${type}`);
        if (el) {
            const cd = globalProgression.cooldowns[type] || 0;
            const remaining = cd - now;
            if (remaining > 0) {
                const min = Math.floor(remaining / 60000);
                const sec = Math.floor((remaining % 60000) / 1000);
                el.innerText = `CD: ${min}m ${sec}s`;
                el.parentElement.disabled = true;
            } else {
                el.innerText = 'Ready (1 ⚡)';
                el.parentElement.disabled = globalProgression.energy < 1;
            }
        }
    });
}
setInterval(updateEnergy, 1000);

function updateHp() {
    const now = Date.now();
    const msPassed = now - (globalProgression.lastHpRegenTime || now);
    const minutesPassed = Math.floor(msPassed / 60000);
    if (player.currentHp < player.maxHp) {
        if (minutesPassed > 0) {
            const regenAmt = Math.min(player.maxHp - player.currentHp, minutesPassed * 10);
            player.currentHp = Math.min(player.maxHp, player.currentHp + regenAmt);
            globalProgression.lastHpRegenTime = now - (msPassed % 60000);
        }
    } else {
        globalProgression.lastHpRegenTime = now;
    }
    const hpCur = getEl('hub-hp-current');
    if (hpCur) hpCur.innerText = Math.ceil(Math.max(0, player.currentHp));
    const hpMax = getEl('hub-hp-max');
    if (hpMax) hpMax.innerText = player.maxHp;
    const hpBar = getEl('hub-hp-bar');
    if (hpBar) hpBar.style.width = (player.maxHp > 0 ? Math.round((Math.max(0, player.currentHp) / player.maxHp) * 100) : 0) + '%';
    const hpTimer = getEl('hub-hp-timer');
    if (hpTimer) {
        if (player.currentHp >= player.maxHp) {
            hpTimer.innerText = 'Full';
        } else {
            const timeSinceLast = now - (globalProgression.lastHpRegenTime || now);
            const timeToNext = 60000 - (timeSinceLast % 60000);
            const sec = Math.ceil(timeToNext / 1000);
            hpTimer.innerText = `+10 in ${sec}s`;
        }
    }
}
setInterval(updateHp, 1000);
// Auto-save every 30 seconds to capture regen progress without blocking the UI
// on every single regen tick. Explicit user actions still call saveGame() directly.
setInterval(saveGame, 30000);

function consumeEnergy(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    if(globalProgression.energy >= amount) { globalProgression.energy -= amount; let maxEnergy = getMaxEnergy(); if(globalProgression.energy === maxEnergy - amount) globalProgression.lastEnergyTime = Date.now(); saveGame(); updateEnergy(); return true; }
    return false;
}

// --- INVENTORY STACK CAP ---
const INVENTORY_STACK_CAP = 99;
function addToInventory(type, amount) {
    let current = globalProgression.inventory[type] || 0;
    let newAmount = Math.min(current + amount, INVENTORY_STACK_CAP);
    globalProgression.inventory[type] = newAmount;
    return newAmount - current; // actual amount added
}

// --- PROGRESS STATS HELPERS ---
function ensureProgressStats() {
    if (!player.progressStats) {
        player.progressStats = {
            levelReached: player.lvl || 1,
            highestDmg: 0, mostDmgSurvived: 0,
            longestWinStreak: 0, currentWinStreak: 0,
            totalKills: 0, totalDeaths: 0, battlesWon: 0, battlesLost: 0,
            mythicBossFound: 0, maxDungeonCleared: 0, bossesDefeated: 0,
            goldSpent: 0, highestGold: 0,
            gamblingWins: 0, gamblingLosses: 0,
            totalPlayTimeSeconds: 0, potionsConsumed: 0,
            sessionStartTime: Date.now()
        };
    }
    return player.progressStats;
}

// --- SAVE / LOAD SYSTEM ---
function saveGame() {
    // Accumulate play time on each save
    if (player.progressStats) {
        let now = Date.now();
        let elapsed = (now - (player.progressStats.sessionStartTime || now)) / 1000;
        player.progressStats.totalPlayTimeSeconds = (player.progressStats.totalPlayTimeSeconds || 0) + Math.floor(elapsed);
        player.progressStats.sessionStartTime = now;
    }
    if (typeof clampAttributes === 'function') clampAttributes();
    const data = JSON.stringify({ global: globalProgression, pState: player });
    const checksum = btoa(data.length.toString());
    const saveString = data + "|" + checksum;
    try {
        const existing = localStorage.getItem('EternalAscensionSaveDataV1');
        if (existing) {
            localStorage.setItem('EternalAscensionSaveBackup', existing);
        }
        localStorage.setItem('EternalAscensionSaveDataV1', saveString);
    } catch(e) {
        console.error('saveGame: localStorage write failed:', e);
        alert('Warning: Your game could not be saved due to a storage error. Progress since your last save may be lost.');
    }
    // Also save to class-specific key so each class has its own independent save
    if (player && player.classId) {
        const classKey = 'EternalAscensionClassSave_' + player.classId;
        try {
            localStorage.setItem(classKey, saveString);
        } catch(e) {
            console.error('saveGame: class save write failed:', e);
        }
    }
    // Persist saved enemies so they survive page reloads
    try {
        if (savedEnemies && typeof savedEnemies === 'object' && Object.keys(savedEnemies).length > 0) {
            localStorage.setItem('EternalAscensionSavedEnemies', JSON.stringify(savedEnemies));
        } else {
            localStorage.removeItem('EternalAscensionSavedEnemies');
        }
    } catch(e) { /* ignore storage errors */ }
}
function applyDefaults(target, defaults) {
    for (const key of Object.keys(defaults)) {
        if (target[key] === undefined) {
            target[key] = structuredClone(defaults[key]);
        } else if (
            typeof defaults[key] === 'object' &&
            defaults[key] !== null &&
            !Array.isArray(defaults[key]) &&
            typeof target[key] === 'object' &&
            target[key] !== null &&
            !Array.isArray(target[key])
        ) {
            applyDefaults(target[key], defaults[key]);
        }
    }
}


/**
 * Returns a fresh globalProgression object with all default values.
 * Used as the defaults template for both new games and save migration.
 */
function makeInitialGlobalProgression() {
    return {
        gold: 100, kills: 0, dungeonTier: 1, tickets: 5,
        energy: 10, lastEnergyTime: Date.now(),
        questProg1: 0, questGoal1: 3, questRwd1: 50, questRarity1: 'common', questType1: 'hunting',
        questProg2: 0, questGoal2: 3, questRwd2: 100, questRarity2: 'common', questType2: 'pillage',
        questProg3: 0, questGoal3: 3, questRwd3: 150, questRarity3: 'common', questType3: 'workshop',
        questProg4: 0, questGoal4: 3, questRwd4: 200, questRarity4: 'common', questType4: 'dungeon',
        questsCompletedToday: 0, lastQuestDate: new Date().toDateString(),
        wellLastHealDate: '', wellXpBattles: 0, wellDropBattles: 0,
        wellLastXpDate: '', wellLastDropDate: '', wellLastEnergyDate: '',
        wellLastEnergy50Date: '', wellLastEnergy100Date: '',
        lastHpRegenTime: Date.now(),
        enemyKillCounts: {}, claimedCodexMilestones: {},
        totalExpEarned: 0,
        cooldowns: { herbs: 0, mine: 0, fish: 0, enchants: 0 },
        inventory: {
            ench_common: 0, ench_rare: 0, ench_epic: 0, ench_legendary: 0,
            herb_red: 0, herb_blue: 0,
            fish_1: 0, fish_2: 0, fish_3: 0, fish_4: 0, fish_5: 0, fish_6: 0,
            soul_pebbles: 0,
            pot_i1: 0, pot_i2: 0, pot_i3: 0,
            pot_r1: 0, pot_r2: 0, pot_r3: 0,
            food_d1: 0, food_d2: 0, food_d3: 0,
            food_df1: 0, food_df2: 0, food_df3: 0,
            magic_stone: 0
        },
        usableItems: {},
        equipInventory: [],
        equipped: {
            head: null, shoulders: null, chest: null, arms: null, waist: null,
            legs: null, boots: null, necklace: null,
            ring1: null, ring2: null, ring3: null, ring4: null,
            weapon: null, cape: null
        },
        newItems: {}, shopGear: [], shopLastRefresh: 0,
        attributes: {
            hp: 0, tenacity: 0, agility: 0, willpower: 0, resistance: 0,
            reflexes: 0, fury: 0, happiness: 0, rawPower: 0, force: 0,
            revival: 0, vampire: 0, defense: 0
        },
        storyModeProgress: { hunting: 0, pillage: 0, workshop: 0, island_defense: 0 },
        settings: { sound: true, music: true, autoBattleTargetPriority: 'easy', autoBattleUsables: [] },
        gender: 'male',
        discoveredEnemies: {}, claimedCodexRewards: {}, killedBosses: {}, discoveredMythicBosses: [],
        skillTreeEnhancements: [],
        classBaseAttributes: null,
        burglarDailyPurchases: 0, burglarLastPurchaseDate: '',
        petsOwned: [], petBattlesWon: 0, petBattleWinStreak: 0, petBattleBestStreak: 0,
        discoveredPets: {}, claimedPetRewards: {}, ultimatePetRewardClaimed: false,
        petWinLoss: {},
        petBattleEnergy: 10, petBattleLastEnergyTime: Date.now(),
        petFavorites: [],
        blackMarketTier: 0,
        pebbleBonusDmg: 0,
        pebbleBonusArmorPierce: 0,
        pebbleBonusHp: 0,
        pebbleBonusDef: 0,
        patchV1Applied: false,
        saveVersion: 2
    };
}

/**
 * Returns a default player state object used as the template for save migration.
 * For new games, use createFreshPlayer(classId) which includes class-specific values.
 */
function makeInitialPlayerState() {
    return {
        classId: 'warrior', lvl: 0, xp: 0, maxHp: 0, currentHp: 0, shield: 0,
        statPoints: 0, skillPoints: 0, treeProgress: 0, treeBonusHp: 0, treeBonusDmg: 0, treeBonusDef: 0, treeBonusRegen: 0,
        treeProgressFire: 0, treeProgressIce: 0, treeProgressOffense: 0, treeProgressDefense: 0,
        treeProgressHoly: 0, treeProgressGuardian: 0, treeProgressShadow: 0, treeProgressVenom: 0,
        treeProgressDivine: 0, treeProgressPlague: 0, treeProgressPrecision: 0, treeProgressSurvival: 0,
        unlockedSkills: [0, 1, 2], equippedSkills: [0, 1, 2, null, null],
        skillCooldowns: {}, regenBuffs: [], activeBuffs: [],
        stunned: 0, bleedStacks: 0, bleedTurns: 0, dodgeTurns: 0,
        equippedUsables: [null, null, null, null, null, null, null],
        wayOfHeavensCooldown: 0, rageUsed: false, rageActive: 0, divineShieldUsed: false, reflectUsed: false,
        usedConsumableThisTurn: false, nodeEnhancements: {},
        skillMenuProgress: 0, skillMenuBonusDmgPct: 0, skillMenuBonusDefPct: 0, skillMenuBonusHpPct: 0, skillMenuInfiniteAtk: 0,
        progressStats: {
            levelReached: 1, highestDmg: 0, mostDmgSurvived: 0,
            longestWinStreak: 0, currentWinStreak: 0,
            totalKills: 0, totalDeaths: 0, battlesWon: 0, battlesLost: 0,
            mythicBossFound: 0, maxDungeonCleared: 0, bossesDefeated: 0,
            goldSpent: 0, highestGold: 0, gamblingWins: 0, gamblingLosses: 0,
            totalPlayTimeSeconds: 0, potionsConsumed: 0, sessionStartTime: 0
        }
    };
}

function loadGameAndContinue() {
    try {
        if (typeof CLASSES === 'undefined') {
            console.error('loadGameAndContinue: CLASSES is not defined. Ensure data.js is loaded.');
            return;
        }
        const savedKey = LEGACY_SAVE_KEYS.find(k => localStorage.getItem(k));
        const saved = savedKey ? localStorage.getItem(savedKey) : null;
        console.log('loadGameAndContinue: saved data found =', !!saved, 'key =', savedKey);
        if (saved) {
            const savedJson = saved.includes('|') ? saved.split('|')[0] : saved;
            const data = JSON.parse(savedJson);
            globalProgression = data.global;
            player = data.pState;

            // Fill in any fields missing due to version updates
            applyDefaults(globalProgression, makeInitialGlobalProgression());
            applyDefaults(player, makeInitialPlayerState());

            // --- Deletion migrations (attributes removed in newer versions) ---
            if (globalProgression.attributes.devotion !== undefined) {
                delete globalProgression.attributes.devotion;
            }
            if (globalProgression.attributes.devastation !== undefined) {
                delete globalProgression.attributes.devastation;
            }

            // --- progressStats migration ---
            // Old saves may not have progressStats as a nested object.
            // applyDefaults already ensures it exists; here we handle value-based migrations.
            if (!player.progressStats) {
                player.progressStats = {};
            }
            applyDefaults(player.progressStats, makeInitialPlayerState().progressStats);
            // For saves that predate progressStats, seed levelReached from the existing level
            if (player.progressStats.levelReached === 1 && (player.lvl || 0) > 1) {
                player.progressStats.levelReached = player.lvl;
            }
            // Always reset the session timer on load
            player.progressStats.sessionStartTime = Date.now();

            // --- Daily quest reset ---
            if (globalProgression.lastQuestDate !== new Date().toDateString()) {
                globalProgression.questsCompletedToday = 0;
                globalProgression.lastQuestDate = new Date().toDateString();
            }

            // Re-link class data
            if (!player.classId) {
                player.classId = 'warrior';
            }
            player.data = CLASSES[player.classId];

            // Apply gender-specific avatar
            const genderAvatars = CLASS_GENDER_AVATARS[player.classId];
            if (genderAvatars) {
                player.data = { ...player.data, avatar: genderAvatars[globalProgression.gender] };
            }

            // Restore saved enemies from previous session
            try {
                const seData = localStorage.getItem('EternalAscensionSavedEnemies');
                if (seData) {
                    const parsed = JSON.parse(seData);
                    if (parsed && typeof parsed === 'object') {
                        savedEnemies = parsed;
                    }
                }
            } catch (e) { /* ignore parse errors */ }

            if (typeof clampAttributes === 'function') {
                clampAttributes();
            }

            // --- Way of the Heavens removal migration ---
            // Strip WoH from skillTreeEnhancements
            if (globalProgression.skillTreeEnhancements) {
                globalProgression.skillTreeEnhancements = globalProgression.skillTreeEnhancements.filter(e => e.type !== 'wayOfHeavens');
            }
            // Remove 'woh' from equippedSkills slots
            if (player.equippedSkills) {
                player.equippedSkills = player.equippedSkills.map(s => s === 'woh' ? null : s);
            }
            // Reset WoH cooldown
            player.wayOfHeavensCooldown = 0;
            // Reset infinite atk (removed feature)
            player.skillMenuInfiniteAtk = 0;

            // --- Patch V1: one-time attribute + skill tree reset ---
            if (!globalProgression.patchV1Applied) {
                // Respec all attributes to base values and refund points
                const patchAttrs = ['hp','tenacity','agility','willpower','resistance','reflexes','fury','rawPower','force','revival','vampire','defense','happiness'];
                let patchClassBase = getClassBaseAttributes(player.classId || 'warrior');
                let patchRefund = 0;
                patchAttrs.forEach(stat => {
                    let cur = globalProgression.attributes[stat] || 0;
                    let base = patchClassBase[stat] || 0;
                    patchRefund += Math.max(0, cur - base);
                    globalProgression.attributes[stat] = base;
                });
                // Reset skill tree
                let skillTreeRefund = (player.skillMenuProgress || 0);
                player.skillMenuProgress = 0;
                player.skillMenuBonusDmgPct = 0;
                player.skillMenuBonusDefPct = 0;
                player.skillMenuBonusHpPct = 0;
                player.skillMenuInfiniteAtk = 0;
                player.skillMenuNodeChoices = [];
                player.skillMenuLastStatChoice = null;
                player.skillMenuConsecutiveSameCount = 0;
                player.unlockedSkills = [0, 1, 2];
                player.equippedSkills = [0, 1, 2, null, null];
                // Recalculate stat points based on new formula
                let newMaxBudget = Math.min(player.lvl || 0, 50) + Math.max(0, (player.lvl || 0) - 50) * 2;
                player.statPoints = Math.max(0, newMaxBudget);
                player.skillPoints = (player.skillPoints || 0) + skillTreeRefund;
                globalProgression.patchV1Applied = true;
            }

            showHub();
        }
    } catch (err) {
        console.error('loadGameAndContinue: failed to load game:', err);
        alert('Failed to load saved game. Your save may be corrupted. Error: ' + err.message);
        try { switchScreen('screen-menu'); } catch (e) { console.error('loadGameAndContinue: fallback switchScreen failed', e); }
    }
}
window.onload = () => {
    if (LEGACY_SAVE_KEYS.some(k => localStorage.getItem(k))) {
        document.getElementById('btn-continue-save').classList.remove('hidden');
    }
    updateEnergy();
    updateHp();
};

// --- UTILS & MATH ---
function getXpForNextLevel(lvl) { 
    // Bracket-based staircase XP curve
    // battlesPerLevel = 4 + segment*10 + ceil(offset/10)
    // where segment = floor((lvl-1)/100), offset = ((lvl-1)%100)+1
    // XP per level = battlesPerLevel * 100
    if (lvl <= 0) lvl = 0; // Level 0 uses offset=1 → 5 battles * 100 = 500 XP
    let segment = Math.floor(Math.max(0, lvl - 1) / 100);
    let offset = (Math.max(0, lvl - 1) % 100) + 1;
    let battlesPerLevel = 4 + segment * 10 + Math.ceil(offset / 10);
    return battlesPerLevel * 100;
}

function getDropRateMultiplier() {
    let base = (globalProgression.wellDropBattles || 0) > 0 ? 2 : 1;
    let dropRateBonus = 0;
    let enhancements = globalProgression.skillTreeEnhancements || [];
    enhancements.forEach(e => {
        if(e.type === 'dropRate') {
            let vals = { normal: 0.01, rare: 0.02, epic: 0.03, legendary: 0.04 };
            dropRateBonus += vals[e.rarity] || 0;
        }
    });
    // Add gear bonus rare drop chance
    dropRateBonus += (typeof getEquipBonusStat === 'function') ? getEquipBonusStat('bonusRareDropChance') : 0;
    return base * (1 + dropRateBonus);
}

function rollWithDropRate(baseChance) {
    const boostedChance = Math.min(1, baseChance * getDropRateMultiplier());
    return Math.random() < boostedChance;
}

function consumeWellBattleCharges() {
    if((globalProgression.wellXpBattles || 0) > 0) globalProgression.wellXpBattles--;
    if((globalProgression.wellDropBattles || 0) > 0) globalProgression.wellDropBattles--;
}

function getGearScore(itemOrStats) {
    if(!itemOrStats) return 0;
    // If it's an item object with itemLevel and rarity, use level * rarity score
    if(itemOrStats.itemLevel && itemOrStats.rarity) {
        let rarityScore = {common: 1, rare: 2, epic: 5, legendary: 10, mythic: 30}[itemOrStats.rarity] || 1;
        return itemOrStats.itemLevel * rarityScore;
    }
    // Fallback: old flat stats (for backward compatibility)
    return (itemOrStats.hp||0)/10 + (itemOrStats.dmg||0)*2 + (itemOrStats.def||0)*5;
}

function hasBetterGear(slot) {
    let eq = globalProgression.equipped[slot];
    let eqGS = eq ? getGearScore(eq) : -1;
    let baseSlot = slot.startsWith('ring') ? 'ring' : slot;
    let betterInInv = globalProgression.equipInventory.some(i => i.type === baseSlot && getGearScore(i) > eqGS);
    return betterInInv;
}

function calculateMaxHp() {
    let a = globalProgression.attributes;
    // Base HP from class, level scaling, and tree bonus
    let base = player.data.baseHp + (Math.max(0, player.lvl - 1) * 15) + player.treeBonusHp;
    // HP attribute: +0.5% max HP per point
    let attrHpMult = 1 + ((a.hp || 0) * 0.005);
    base = Math.floor(base * attrHpMult);
    // Apply HP Boost enhancements
    let hpBoostMult = 1;
    if (typeof ENHANCEMENT_DEFS !== 'undefined' && ENHANCEMENT_DEFS.hpBoost && ENHANCEMENT_DEFS.hpBoost.vals) {
        (globalProgression.skillTreeEnhancements || []).forEach(enh => {
            if(enh.type === 'hpBoost') {
                hpBoostMult += ENHANCEMENT_DEFS.hpBoost.vals[enh.rarity];
            }
        });
    }
    // Apply HP% bonus from equipment (bonusHpPct stat)
    if (typeof getEquipBonusStat === 'function') {
        hpBoostMult *= (1 + getEquipBonusStat('bonusHpPct'));
    }
    return Math.floor(base * hpBoostMult * (1 + (player.skillMenuBonusHpPct || 0) / 100) * (1 + (globalProgression.pebbleBonusHp || 0) * 0.01));
}

function getBaseDamage() {
    let a = globalProgression.attributes;
    // Raw Power: +2 base dmg per point; tree bonus flat dmg
    let baseDmg = player.data.baseDmg + ((a.rawPower || 0) * 2) + player.treeBonusDmg;
    // Willpower: +0.3% increased base damage per point
    let willpowerMult = 1 + ((a.willpower || 0) * 0.003);
    baseDmg = Math.floor(baseDmg * willpowerMult);
    // Apply weapon base damage percentage bonus (from weaponBaseDmgPct property, 0.1% per level)
    let weapon = globalProgression.equipped ? globalProgression.equipped['weapon'] : null;
    let weaponPctBonus = weapon ? (weapon.weaponBaseDmgPct || 0) : 0;
    if(weaponPctBonus > 0) baseDmg = Math.floor(baseDmg * (1 + weaponPctBonus));
    // Apply bonusBaseDmgPct from gear (bonus stat for weapon/arms, 0.02% per level)
    if (typeof getEquipBonusStat === 'function') {
        let baseDmgPct = getEquipBonusStat('bonusBaseDmgPct');
        if(baseDmgPct > 0) baseDmg = Math.floor(baseDmg * (1 + baseDmgPct));
    }
    // Apply weapon enhancement flat bonus (WeaponSmith system — stored in item.stats.dmg)
    let weaponEnhanceDmg = weapon ? ((weapon.stats && weapon.stats.dmg) || 0) : 0;
    baseDmg += weaponEnhanceDmg;
    // Apply weapon enhance max bonus (+5% at level 100)
    if(weapon && weapon.weaponEnhanceMaxBonus) baseDmg = Math.floor(baseDmg * 1.05);
    // Apply skill menu % bonus
    baseDmg = Math.floor(baseDmg * (1 + ((player.skillMenuBonusDmgPct || 0) + (player.skillMenuInfiniteAtk || 0)) / 100));
    // Apply pebble exchange damage bonus
    baseDmg = Math.floor(baseDmg * (1 + (globalProgression.pebbleBonusDmg || 0) * 0.01));
    return baseDmg;
}

function getPlayerDef() {
    let a = globalProgression.attributes;
    return Math.floor((50 + (a.defense || 0) + player.treeBonusDef) * (1 + (player.skillMenuBonusDefPct || 0) / 100) * (1 + (globalProgression.pebbleBonusDef || 0) * 0.01));
}

// Returns the permanent base attributes for each class (cannot go below these)
function getClassBaseAttributes(classId) {
    return { hp: 0, tenacity: 0, agility: 0, willpower: 0, resistance: 0, reflexes: 0, fury: 0, happiness: 0, rawPower: 0, force: 0, revival: 0, vampire: 0, defense: 0 };
}

// Returns the per-class attribute caps
function getClassAttrCap(classId, attrId) {
    return 100; // Universal cap of 100 for all attributes, all classes
}

function switchScreen(screenId) {
    if (typeof clampAttributes === 'function' && typeof player !== 'undefined' && player && player.classId && typeof globalProgression !== 'undefined' && globalProgression && globalProgression.attributes) {
        try { clampAttributes(); player.maxHp = calculateMaxHp(); } catch(e) { console.error('switchScreen: clampAttributes failed', e); }
    }
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active-screen');
        s.classList.remove('hidden');
        s.style.display = '';
    });
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) targetScreen.classList.add('active-screen');
}

function showMerchants() { switchScreen('screen-merchants'); }

function showPortal() { switchScreen('screen-portal'); }


function showMenu() { try { stopMusic(); } catch(e) { console.error('Failed to stop music:', e); } switchScreen('screen-menu'); }
function showClassSelect() { switchScreen('screen-class-select'); }

function confirmNewGame() {
    const modal = document.getElementById('modal-confirm-new-game');
    modal.style.display = 'flex';
}

function closeConfirmNewGame() {
    const modal = document.getElementById('modal-confirm-new-game');
    modal.style.display = 'none';
}

function confirmNewGameYes() {
    closeConfirmNewGame();
    pendingNewGame = true;
    // Wipe ALL save data so no stale class saves persist
    localStorage.removeItem('EternalAscensionSaveDataV1');
    localStorage.removeItem('fogFighterSaveDataV22');
    localStorage.removeItem('fogFighterSaveDataV21');
    localStorage.removeItem('fogFighterSaveDataV20');
    localStorage.removeItem('EternalAscensionSavedEnemies');
    // Remove all per-class saves
    ['warrior', 'mage', 'paladin', 'ninja', 'cleric', 'archer'].forEach(cls => {
        localStorage.removeItem('EternalAscensionClassSave_' + cls);
    });
    showClassSelect();
}

function changeClass() {
    const saveKey = 'EternalAscensionClassSave_' + player.classId;
    localStorage.setItem(saveKey, JSON.stringify({ global: globalProgression, pState: player }));
    pendingNewGame = false;
    switchScreen('screen-class-select');
}

// --- GENDER / AVATAR SELECTION ---
let pendingClassId = 'warrior';
let pendingNewGame = false;

function showGenderSelect(classId) {
    pendingClassId = classId;
    // Map class IDs to video filenames
    const classVideoMap = {
        warrior: 'Videos/Warrior.mp4',
        mage: 'Videos/Mage.mp4',
        paladin: 'Videos/Paladin.mp4',
        ninja: 'Videos/Ninja.mp4'
    };
    const videoFile = classVideoMap[classId];
    if (videoFile) {
        const video = document.getElementById('class-intro-video');
        if (video) {
            const src = document.getElementById('class-intro-video-src');
            if (src) src.src = videoFile;
            video.muted = false;
            video.load();
            video.play().catch(err => {
                console.warn('Autoplay blocked:', err);
                // Try muted as fallback to allow video to play
                video.muted = true;
                video.play().catch(muteErr => {
                    console.warn('Muted autoplay also blocked, skipping video:', muteErr);
                    onClassVideoEnd();
                });
            });
            video.onended = onClassVideoEnd;
        }
        switchScreen('screen-class-intro-video');
        return;
    }
    // For classes without videos (cleric, archer), go straight to gender/avatar select
    populateAvatarGrid();
    switchScreen('screen-gender-select');
}

function onClassVideoEnd() {
    const video = document.getElementById('class-intro-video');
    if (video) {
        video.pause();
        const src = document.getElementById('class-intro-video-src');
        if (src) src.src = '';
        video.load();
        video.onended = null;
    }
    populateAvatarGrid();
    switchScreen('screen-gender-select');
}

function populateAvatarGrid() {
    const classId = pendingClassId;
    const className = classId.charAt(0).toUpperCase() + classId.slice(1);

    const maleGrid = document.getElementById('avatar-grid-male');
    const femaleGrid = document.getElementById('avatar-grid-female');

    if (maleGrid) {
        const malePath = `Images/${className}Male.png`;
        maleGrid.innerHTML = `
            <button onclick="selectAvatar('${malePath}','male')" class="p-2 rounded-xl bg-gray-800 border border-gray-700 hover:border-blue-400 active:scale-95 transition flex items-center justify-center">
                <img src="${malePath}" alt="${className} Male" style="width:80px;height:80px;object-fit:contain;">
            </button>`;
    }
    if (femaleGrid) {
        const femalePath = `Images/${className}Female.png`;
        femaleGrid.innerHTML = `
            <button onclick="selectAvatar('${femalePath}','female')" class="p-2 rounded-xl bg-gray-800 border border-gray-700 hover:border-pink-400 active:scale-95 transition flex items-center justify-center">
                <img src="${femalePath}" alt="${className} Female" style="width:80px;height:80px;object-fit:contain;">
            </button>`;
    }
}

// selectAvatar: called when a player picks an emoji from the avatar grid
function selectAvatar(emoji, gender) {
    selectGenderAndStart(gender, emoji);
}

function selectGenderAndStart(gender, chosenAvatar) {
    try {
        if (typeof CLASSES === 'undefined') {
            console.error('selectGenderAndStart: CLASSES is not defined. Ensure data.js is loaded.');
            return;
        }
        const classSaveKey = 'EternalAscensionClassSave_' + pendingClassId;
        const classSave = localStorage.getItem(classSaveKey);
        const isNewGame = pendingNewGame;
        pendingNewGame = false;

        console.log(`selectGenderAndStart: gender=${gender}, classId=${pendingClassId}, isNewGame=${isNewGame}`);

        // Determine the final avatar: use chosen emoji if provided, else fall back to class defaults
        let finalAvatar = chosenAvatar || (CLASS_GENDER_AVATARS[pendingClassId] ? CLASS_GENDER_AVATARS[pendingClassId][gender] : (gender === 'female' ? '👩' : '🧑'));

        if (!isNewGame && classSave) {
            // Load existing class-specific save — restore both globalProgression and player
            const savedJson = classSave.includes('|') ? classSave.split('|')[0] : classSave;
            const data = JSON.parse(savedJson);
            globalProgression = data.global;
            player = data.pState;
            // Apply defaults for any missing fields (same as loadGameAndContinue)
            applyDefaults(globalProgression, { petFavorites: [] });
            if(!globalProgression.inventory) globalProgression.inventory = {};
            if(globalProgression.inventory.magic_stone === undefined) globalProgression.inventory.magic_stone = 0;
            applyDefaults(player, { nodeEnhancements: {} });
            player.classId = pendingClassId;
            player.data = CLASSES[player.classId];
            globalProgression.gender = gender;
            player.data = { ...player.data, avatar: finalAvatar };
            setAvatarDisplay('hub-avatar', player.data.avatar);
        } else if (!isNewGame) {
            // Switching to a new class with no prior save: start a fresh game for that class
            startGame(pendingClassId);
            globalProgression.gender = gender;
            player.data = { ...player.data, avatar: finalAvatar };
            setAvatarDisplay('hub-avatar', player.data.avatar);
            saveGame();
            showHub();
            return;
        } else {
            // Explicit new game: full reset
            startGame(pendingClassId);
            globalProgression.gender = gender;
            player.data = { ...player.data, avatar: finalAvatar };
            setAvatarDisplay('hub-avatar', player.data.avatar);
            saveGame();
            showHub();
            return;
        }
        saveGame();
        showHub();
    } catch (err) {
        console.error('selectGenderAndStart: failed to start game:', err);
        // RECOVERY: Try to at least get to the hub
        try {
            if (typeof globalProgression !== 'undefined') {
                globalProgression.gender = gender || 'male';
            }
            showHub();
        } catch (e2) {
            console.error('selectGenderAndStart: recovery also failed:', e2);
            alert('Failed to start game. Please try refreshing the page. If the issue persists, you may need to clear your browser cache. Error: ' + err.message);
        }
    }
}

function toggleGender() {
    if (!globalProgression.gender) globalProgression.gender = 'male';
    globalProgression.gender = globalProgression.gender === 'male' ? 'female' : 'male';
    let avatarMap = CLASS_GENDER_AVATARS[player.classId];
    if (avatarMap) { player.data = { ...player.data, avatar: avatarMap[globalProgression.gender] }; }
    playSound('click');
    saveGame();
    showSettings();
}

function showHub() {
    stopMusic();
    try { clampAttributes(); } catch(e) { console.error('showHub: clampAttributes failed', e); }
    try { player.maxHp = calculateMaxHp(); if(player.currentHp > player.maxHp) player.currentHp = player.maxHp; } catch(e) { console.error('showHub: calculateMaxHp failed', e); }
    player.regenBuffs = []; player.activeBuffs = []; player.skillCooldowns = {};
    player.stunned = 0; player.bleedStacks = 0; player.bleedTurns = 0; player.dodgeTurns = 0;
    player.reAliveArmed = false; player.reAliveUsed = false;
    let heroMenu = document.getElementById('hub-hero-menu');
    if(heroMenu) heroMenu.classList.add('hidden');

    try {
        document.getElementById('hub-gold').innerText = globalProgression.gold;
        document.getElementById('hub-tickets').innerText = globalProgression.tickets || 0;
        document.getElementById('hub-lvl').innerText = player.lvl;
        document.getElementById('hub-class').innerText = player.data.name;
        setAvatarDisplay('hub-avatar', player.data.avatar);
        // Apply Black Market Tier 1 avatar glow
        let hubAvatar = document.getElementById('hub-avatar');
        if (hubAvatar) {
            if ((globalProgression.blackMarketTier || 0) >= 1) {
                hubAvatar.classList.add('bm-avatar-glow');
            } else {
                hubAvatar.classList.remove('bm-avatar-glow');
            }
        }
        document.getElementById('hub-level-up-noti').classList.toggle('hidden', player.statPoints <= 0);
    } catch(e) { console.error('showHub: basic stats update failed', e); }

    try {
        // Sync hero bar notification badges
        if(document.getElementById('hub-attr-noti-hero')) document.getElementById('hub-attr-noti-hero').classList.toggle('hidden', player.statPoints <= 0);
        let skillTreeMaxed = (player.skillMenuProgress || 0) >= SKILL_MENU_TOTAL;
        if(document.getElementById('hub-skill-noti-hero')) document.getElementById('hub-skill-noti-hero').classList.toggle('hidden', player.skillPoints <= 0 || skillTreeMaxed);
        
        let hasUnequippedBetter = EQUIP_SLOTS.some(slot => hasBetterGear(slot));
        if(document.getElementById('hub-char-noti-hero')) document.getElementById('hub-char-noti-hero').classList.toggle('hidden', !hasUnequippedBetter);
    } catch(e) { console.error('showHub: hero bar badges failed', e); }

    try {
        // Sync codex checks to base names
        let allM = [...ENEMIES_HUNT, ...ENEMIES_PILLAGE, ...ENEMIES_WORKSHOP, ...ENEMIES_DUNGEON, ...ENEMIES_ISLAND_DEFENSE];
        let hasUnclaimedCodex = false;
        for(let e of allM) {
            if(globalProgression.discoveredEnemies && globalProgression.discoveredEnemies[e.name]) {
                if(!globalProgression.claimedCodexRewards || !globalProgression.claimedCodexRewards[e.name]) {
                    hasUnclaimedCodex = true; break;
                }
            }
        }
        // Also check mythic bosses for unclaimed codex rewards
        if(!hasUnclaimedCodex && globalProgression.discoveredMythicBosses) {
            for(let bossName of globalProgression.discoveredMythicBosses) {
                if(!globalProgression.claimedCodexRewards || !globalProgression.claimedCodexRewards[bossName]) {
                    hasUnclaimedCodex = true; break;
                }
            }
        }
        const codexNoti = document.getElementById('hub-codex-noti');
        if (codexNoti) codexNoti.classList.toggle('hidden', !hasUnclaimedCodex);
    } catch(e) { console.error('showHub: codex notification failed', e); }

    try {
        // Pet codex notification: show if any discovered pet has an unclaimed reward
        const petNoti = document.getElementById('hub-pet-noti');
        if(petNoti) {
            let hasUnclaimedPet = false;
            if(typeof PET_DATA !== 'undefined') {
                for(let pet of PET_DATA) {
                    let isClaimed = globalProgression.claimedPetRewards && globalProgression.claimedPetRewards[pet.name];
                    if(isPetDiscovered(pet) && !isClaimed) { hasUnclaimedPet = true; break; }
                }
            }
            petNoti.classList.toggle('hidden', !hasUnclaimedPet);
        }
    } catch(e) { console.error('showHub: pet notification failed', e); }

    try { updateQuestNotifyBadge(); } catch(e) { console.error('showHub: updateQuestNotifyBadge failed', e); }
    saveGame(); updateEnergy(); updateHp(); switchScreen('screen-hub');
}

function createFreshPlayer(classId) {
    return {
        classId: classId, data: CLASSES[classId], lvl: 0, xp: 0, maxHp: 0, currentHp: 0, shield: 0,
        statPoints: 0, skillPoints: 0, treeProgress: 0, treeBonusHp: 0, treeBonusDmg: 0, treeBonusDef: 0, treeBonusRegen: 0,
        treeProgressFire: 0, treeProgressIce: 0, treeProgressOffense: 0, treeProgressDefense: 0,
        treeProgressHoly: 0, treeProgressGuardian: 0, treeProgressShadow: 0, treeProgressVenom: 0, treeProgressDivine: 0, treeProgressPlague: 0,
        treeProgressPrecision: 0, treeProgressSurvival: 0,
        unlockedSkills: [0, 1, 2], equippedSkills: [0, 1, 2, null, null], skillCooldowns: {}, regenBuffs: [], activeBuffs: [], stunned: 0, bleedStacks: 0, bleedTurns: 0, dodgeTurns: 0,
        equippedUsables: ['pot_i1', null, null, null, null, null, null],
        wayOfHeavensCooldown: 0, rageUsed: false, rageActive: 0, divineShieldUsed: false, reflectUsed: false, usedConsumableThisTurn: false,
        nodeEnhancements: {},
        skillMenuProgress: 0, skillMenuBonusDmgPct: 0, skillMenuBonusDefPct: 0, skillMenuBonusHpPct: 0, skillMenuInfiniteAtk: 0,
        progressStats: {
            levelReached: 1, highestDmg: 0, mostDmgSurvived: 0,
            longestWinStreak: 0, currentWinStreak: 0,
            totalKills: 0, totalDeaths: 0, battlesWon: 0, battlesLost: 0,
            mythicBossFound: 0, maxDungeonCleared: 0, bossesDefeated: 0,
            goldSpent: 0, highestGold: 0, gamblingWins: 0, gamblingLosses: 0,
            totalPlayTimeSeconds: 0, potionsConsumed: 0, sessionStartTime: Date.now()
        }
    };
}

window.startGame = function(classId = 'warrior') {
    globalProgression = makeInitialGlobalProgression();
    // New games use class-specific starting attributes and starter potions
    globalProgression.attributes = getClassBaseAttributes(classId);
    globalProgression.inventory.pot_i1 = 30;
    player = createFreshPlayer(classId);
    player.maxHp = calculateMaxHp();
    player.currentHp = player.maxHp;
    // Grant one random starting pet
    if (typeof PET_DATA !== 'undefined' && PET_DATA.length > 0) {
        const randomPet = PET_DATA[Math.floor(Math.random() * PET_DATA.length)];
        globalProgression.petsOwned.push(randomPet.id);
        globalProgression.discoveredPets[randomPet.name] = true;
    }
    saveGame();
    showHub();
};

// --- SETTINGS ---
function showSettings() {
    document.getElementById('toggle-sound-btn').innerText = globalProgression.settings.sound ? 'ON' : 'OFF';
    document.getElementById('toggle-sound-btn').className = `px-6 py-2 rounded font-bold text-white transition active:scale-95 ${globalProgression.settings.sound ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`;
    
    document.getElementById('toggle-music-btn').innerText = globalProgression.settings.music ? 'ON' : 'OFF';
    document.getElementById('toggle-music-btn').className = `px-6 py-2 rounded font-bold text-white transition active:scale-95 ${globalProgression.settings.music ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`;

    let gender = globalProgression.gender || 'male';
    let genderBtn = document.getElementById('toggle-gender-btn');
    if (genderBtn) {
        genderBtn.innerText = gender === 'male' ? '♂ Male' : '♀ Female';
        genderBtn.className = `px-6 py-2 rounded font-bold text-white transition active:scale-95 ${gender === 'male' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-pink-600 hover:bg-pink-500'}`;
    }

    switchScreen('screen-settings');
}

function toggleSetting(type) {
    globalProgression.settings[type] = !globalProgression.settings[type];
    playSound('click');
    saveGame();
    showSettings();
}

function openAutoBattleSettings() {
    const modal = document.getElementById('modal-autobattle-settings');
    if(!modal) return;
    renderAutoBattleSettingsModal();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeAutoBattleSettings() {
    const modal = document.getElementById('modal-autobattle-settings');
    if(!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function setAutoBattleTargetPriority(value) {
    globalProgression.settings.autoBattleTargetPriority = value;
    saveGame();
    renderAutoBattleSettingsModal();
}

function toggleAutoBattleUsable(key) {
    if(!globalProgression.settings.autoBattleUsables) globalProgression.settings.autoBattleUsables = [];
    let arr = globalProgression.settings.autoBattleUsables;
    let idx = arr.indexOf(key);
    if(idx !== -1) {
        arr.splice(idx, 1);
    } else {
        if(arr.length >= 3) {
            const warn = document.getElementById('autobattle-usable-warn');
            if(warn) { warn.classList.remove('hidden'); setTimeout(() => warn.classList.add('hidden'), 2000); }
            return;
        }
        arr.push(key);
    }
    saveGame();
    renderAutoBattleSettingsModal();
}

function renderAutoBattleSettingsModal() {
    const priority = globalProgression.settings.autoBattleTargetPriority || 'easy';
    const selected = globalProgression.settings.autoBattleUsables || [];

    // Render priority buttons
    const easyBtn = document.getElementById('abt-btn-easy');
    const hardBtn = document.getElementById('abt-btn-hard');
    if(easyBtn && hardBtn) {
        if(priority === 'easy') {
            easyBtn.className = 'flex-1 py-2 rounded font-bold text-white transition active:scale-95 bg-green-600 hover:bg-green-500';
            hardBtn.className = 'flex-1 py-2 rounded font-bold text-white transition active:scale-95 bg-gray-700 hover:bg-gray-600';
        } else {
            easyBtn.className = 'flex-1 py-2 rounded font-bold text-white transition active:scale-95 bg-gray-700 hover:bg-gray-600';
            hardBtn.className = 'flex-1 py-2 rounded font-bold text-white transition active:scale-95 bg-red-600 hover:bg-red-500';
        }
    }

    // Render usable items list
    const list = document.getElementById('abt-usables-list');
    if(!list) return;
    list.innerHTML = '';
    let hasAny = false;
    Object.keys(USABLE_ITEMS).forEach(key => {
        let amt = (globalProgression.usableItems || {})[key] || 0;
        if(amt <= 0) return;
        hasAny = true;
        let item = USABLE_ITEMS[key];
        let isSel = selected.includes(key);
        let row = document.createElement('div');
        row.className = 'flex items-center justify-between py-2 border-b border-gray-700';
        row.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-xl">${item.icon || '🎒'}</span>
                <div>
                    <div class="text-sm font-bold text-white">${item.name}</div>
                    <div class="text-xs text-gray-400">Owned: ${amt}</div>
                </div>
            </div>
            <button onclick="toggleAutoBattleUsable('${key}')" class="px-3 py-1 rounded font-bold text-sm transition active:scale-95 ${isSel ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}">
                ${isSel ? '✔ Selected' : 'Select'}
            </button>`;
        list.appendChild(row);
    });
    if(!hasAny) {
        list.innerHTML = '<div class="text-gray-500 text-sm text-center py-3">No usable items owned.</div>';
    }
}

// --- CODEX ---
function showCodex() {
    document.getElementById('codex-gold-display').innerText = globalProgression.gold;
    const list = document.getElementById('codex-list'); list.innerHTML = '';
    let allM = [...ENEMIES_HUNT, ...ENEMIES_PILLAGE, ...ENEMIES_WORKSHOP, ...ENEMIES_DUNGEON, ...ENEMIES_ISLAND_DEFENSE];
    
    // Mythic bosses section — render FIRST, sort so unclaimed (claimable) bosses appear first
    let discoveredMythicBosses = (globalProgression.discoveredMythicBosses || []).slice().sort((a, b) => {
        let aClaimed = globalProgression.claimedCodexRewards && globalProgression.claimedCodexRewards[a];
        let bClaimed = globalProgression.claimedCodexRewards && globalProgression.claimedCodexRewards[b];
        if (!aClaimed && bClaimed) return -1;
        if (aClaimed && !bClaimed) return 1;
        return 0;
    });
    if(discoveredMythicBosses.length > 0) {
        list.innerHTML += `<div class="col-span-full text-center text-white font-black text-sm mt-3 mb-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">✨ MYTHIC ENCOUNTERS ✨</div>`;
        discoveredMythicBosses.forEach(bossName => {
            let kills = (globalProgression.enemyKillCounts || {})[bossName] || 0;
            let isClaimed = globalProgression.claimedCodexRewards && globalProgression.claimedCodexRewards[bossName];
            let html = `<div class="bg-gray-900 border-2 border-white rounded-lg p-3 flex flex-col items-center shadow-md relative" style="box-shadow:0 0 20px rgba(255,255,255,0.6),0 0 40px rgba(200,200,255,0.3);">`;
            html += `<div class="text-4xl mb-1">✨</div>`;
            html += `<div class="font-black text-sm text-white drop-shadow-[0_0_8px_rgba(255,255,255,1)]">${bossName}</div>`;
            html += `<div class="text-[10px] text-gray-300 mb-1">⚠️ MYTHIC BOSS</div>`;
            html += `<div class="text-[10px] text-pink-300 mb-1">Kills: ${kills}</div>`;
            if(!isClaimed) {
                html += `<button onclick="claimCodexReward('${bossName}')" class="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs py-1 rounded shadow-lg animate-pulse transition">Claim 100G</button>`;
            } else {
                html += `<div class="text-xs text-gray-500 italic mt-auto">Claimed ✓</div>`;
            }
            html += `</div>`;
            list.innerHTML += html;
        });
    }

    // Filter unique by base name
    let uniqueEnemies = [];
    let seenNames = new Set();
    allM.forEach(e => {
        if(!seenNames.has(e.name)) {
            seenNames.add(e.name);
            uniqueEnemies.push(e);
        }
    });

    uniqueEnemies.sort((a, b) => {
        let aDiscovered = globalProgression.discoveredEnemies && globalProgression.discoveredEnemies[a.name];
        let bDiscovered = globalProgression.discoveredEnemies && globalProgression.discoveredEnemies[b.name];
        let aClaimed = globalProgression.claimedCodexRewards && globalProgression.claimedCodexRewards[a.name];
        let bClaimed = globalProgression.claimedCodexRewards && globalProgression.claimedCodexRewards[b.name];
        let aPriority = !aDiscovered ? 3 : (!aClaimed ? 1 : 2);
        let bPriority = !bDiscovered ? 3 : (!bClaimed ? 1 : 2);
        return aPriority - bPriority;
    });

    uniqueEnemies.forEach(e => {
        let isDiscovered = globalProgression.discoveredEnemies && globalProgression.discoveredEnemies[e.name];
        let isClaimed = globalProgression.claimedCodexRewards && globalProgression.claimedCodexRewards[e.name];
        
        let html = `<div class="bg-gray-800 border border-gray-600 rounded-lg p-3 flex flex-col items-center shadow-md relative">`;
        
        if (isDiscovered) {
            let kills = (globalProgression.enemyKillCounts || {})[e.name] || 0;
            let milestoneProgress = kills % 100;
            html += `<div class="text-4xl mb-1 drop-shadow-lg">${e.avatar}</div><div class="font-bold text-sm text-white">${e.name}</div><div class="text-[10px] text-gray-400 mb-1">HPx${e.hpMult} Dmgx${e.dmgMult}</div><div class="text-[10px] text-blue-400 mb-1">Kills: ${kills} (${milestoneProgress}/100)</div>`;
            if (!isClaimed) {
                html += `<button onclick="claimCodexReward('${e.name}')" class="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-xs py-1 rounded shadow-lg animate-pulse transition">Claim 20G</button>`;
            } else {
                html += `<div class="text-xs text-gray-500 italic mt-auto">Claimed ✓</div>`;
            }
        } else {
            html += `<div class="text-4xl mb-1 text-gray-700 opacity-50">❓</div><div class="font-bold text-sm text-gray-600 text-center">Undiscovered<br>Enemy</div>`;
        }
        
        html += `</div>`;
        list.innerHTML += html;
    });

    switchScreen('screen-codex');
}

function claimCodexReward(enemyName) {
    if(!globalProgression.claimedCodexRewards) globalProgression.claimedCodexRewards = {};
    if(!globalProgression.claimedCodexRewards[enemyName]) {
        globalProgression.claimedCodexRewards[enemyName] = true;
        let isMythicBoss = (globalProgression.discoveredMythicBosses || []).includes(enemyName);
        globalProgression.gold += isMythicBoss ? 100 : 20;
        playSound('win');
        saveGame();
        showCodex();
    }
}

function claimAllCodexRewards() {
    let allEnemies = [...(ENEMIES_HUNT || []), ...(ENEMIES_PILLAGE || []), ...(ENEMIES_WORKSHOP || []), ...(ENEMIES_DUNGEON || []), ...(ENEMIES_ISLAND_DEFENSE || [])];
    let mythicBosses = globalProgression.discoveredMythicBosses || [];
    if(!globalProgression.claimedCodexRewards) globalProgression.claimedCodexRewards = {};
    let claimedAny = false;
    allEnemies.forEach(e => {
        let isDiscovered = globalProgression.discoveredEnemies && globalProgression.discoveredEnemies[e.name];
        let isClaimed = globalProgression.claimedCodexRewards[e.name];
        let isMythic = mythicBosses.includes(e.name);
        if(isDiscovered && !isClaimed && !isMythic) {
            globalProgression.claimedCodexRewards[e.name] = true;
            globalProgression.gold += 20;
            claimedAny = true;
        }
    });
    if(claimedAny) {
        playSound('win');
        saveGame();
    }
    showCodex();
}

function isPetDiscovered(pet) {
    return !!(globalProgression.discoveredPets && globalProgression.discoveredPets[pet.name]);
}

function showPetCodex() {
    document.getElementById('pet-gold-display').innerText = globalProgression.gold;
    const petNoti = document.getElementById('hub-pet-noti');
    if(petNoti) petNoti.classList.add('hidden');
    const list = document.getElementById('pet-codex-list');
    list.innerHTML = '';
    const allPets = (typeof PET_DATA !== 'undefined') ? PET_DATA : [];
    let totalDiscovered = 0;

    // Sort: unclaimed discovered first, then claimed discovered, then undiscovered
    const sortedPets = allPets.slice().sort((a, b) => {
        let aDisc = isPetDiscovered(a);
        let bDisc = isPetDiscovered(b);
        let aClaimed = globalProgression.claimedPetRewards && globalProgression.claimedPetRewards[a.name];
        let bClaimed = globalProgression.claimedPetRewards && globalProgression.claimedPetRewards[b.name];
        // Unclaimed+discovered first
        if (aDisc && !aClaimed && !(bDisc && !bClaimed)) return -1;
        if (bDisc && !bClaimed && !(aDisc && !aClaimed)) return 1;
        // Claimed+discovered second
        if (aDisc && !bDisc) return -1;
        if (bDisc && !aDisc) return 1;
        return 0;
    });

    sortedPets.forEach(pet => {
        let isDiscovered = isPetDiscovered(pet);
        let isClaimed = globalProgression.claimedPetRewards && globalProgression.claimedPetRewards[pet.name];
        if(isDiscovered) totalDiscovered++;
        let card = document.createElement('div');
        card.className = 'bg-gray-800 border ' + (isDiscovered ? 'border-pink-500' : 'border-gray-600') + ' rounded-lg p-3 flex flex-col items-center shadow-md';
        let emojiDiv = document.createElement('div');
        emojiDiv.className = 'text-4xl mb-2' + (isDiscovered ? '' : ' opacity-30');
        emojiDiv.textContent = pet.emoji || '🐾';
        let nameDiv = document.createElement('div');
        nameDiv.className = 'font-bold text-xs text-center ' + (isDiscovered ? 'text-white' : 'text-gray-500');
        nameDiv.textContent = isDiscovered ? pet.name : '???';
        card.appendChild(emojiDiv);
        card.appendChild(nameDiv);
        if(isDiscovered && !isClaimed) {
            let btn = document.createElement('button');
            btn.className = 'mt-2 w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-xs py-1 rounded active:scale-95 transition';
            btn.textContent = 'Claim 20G';
            btn.addEventListener('click', (function(name) { return function() { claimPetReward(name); }; })(pet.name));
            card.appendChild(btn);
        } else if(isClaimed) {
            let claimedDiv = document.createElement('div');
            claimedDiv.className = 'text-xs text-gray-500 mt-2 italic';
            claimedDiv.textContent = 'Claimed ✓';
            card.appendChild(claimedDiv);
        }
        list.appendChild(card);
    });
    if(allPets.length > 0 && totalDiscovered === allPets.length && !globalProgression.ultimatePetRewardClaimed) {
        let ultimate = document.createElement('button');
        ultimate.className = 'col-span-2 md:col-span-3 bg-gradient-to-r from-yellow-500 to-red-500 text-white font-black py-4 rounded-xl shadow-2xl animate-bounce mb-4 w-full';
        ultimate.textContent = '🏆 CLAIM ULTIMATE REWARD: 10,000 GOLD 🏆';
        ultimate.onclick = claimUltimatePetReward;
        list.prepend(ultimate);
    }
    switchScreen('screen-pet-codex');
}

function claimPetReward(petName) {
    if(!globalProgression.claimedPetRewards) globalProgression.claimedPetRewards = {};
    if(!globalProgression.claimedPetRewards[petName]) {
        globalProgression.claimedPetRewards[petName] = true;
        globalProgression.gold += 20;
        playSound('win');
        saveGame();
        showPetCodex();
    }
}

function claimUltimatePetReward() {
    if(!globalProgression.ultimatePetRewardClaimed) {
        globalProgression.ultimatePetRewardClaimed = true;
        globalProgression.gold += 10000;
        playSound('win');
        saveGame();
        showPetCodex();
    }
}

// --- STORY MODE & GATHERING ---
function showStoryMode() { 
    document.getElementById('story-prog-hunting').innerText = globalProgression.storyModeProgress.hunting || 0;
    document.getElementById('story-prog-pillage').innerText = globalProgression.storyModeProgress.pillage || 0;
    document.getElementById('story-prog-workshop').innerText = globalProgression.storyModeProgress.workshop || 0;
    document.getElementById('story-prog-island').innerText = globalProgression.storyModeProgress.island_defense || 0;
    updateEnergy(); switchScreen('screen-story'); 
}

function gatherAction(type) {
    if(!consumeEnergy(1)) return;
    
    // Show animation overlay
    let overlay = document.createElement('div');
    overlay.className = 'gather-anim-overlay';
    overlay.id = 'gather-overlay';
    
    if(type === 'herbs') {
        overlay.innerHTML = `
            <div class="gather-emoji" style="animation-delay:0s">🌱</div>
            <div class="gather-emoji" style="animation-delay:0.3s; animation: herb-grow 1s ease forwards, gather-bounce 0.5s 1s infinite">🌿</div>
            <div class="gather-emoji" style="animation-delay:1.5s; animation: herb-grow 1s 1.5s ease forwards, gather-bounce 0.5s 2.5s infinite; opacity:0">🌺</div>
            <div class="gather-label">Foraging herbs...</div>
        `;
    } else if(type === 'fish') {
        overlay.innerHTML = `
            <div class="gather-emoji" style="animation-delay:0s">🎣</div>
            <div class="gather-emoji" style="animation: fish-cast 0.8s 0.8s ease forwards; opacity:0">🐟</div>
            <div class="gather-emoji" style="animation: gather-bounce 0.3s 1.6s ease infinite; opacity:1; font-size:2rem">💧💧</div>
            <div class="gather-label">Fishing...</div>
        `;
    } else if(type === 'enchants') {
        overlay.innerHTML = `
            <div class="gather-emoji" style="animation: gather-bounce 0.6s ease-in-out infinite">✨</div>
            <div class="gather-emoji" style="animation: gather-bounce 0.6s 0.3s ease-in-out infinite; opacity:0.7">💎</div>
            <div class="gather-label">Gathering enchanting cores...</div>
        `;
    }
    
    document.body.appendChild(overlay);
    
    // Disable gather buttons
    let herbBtn = document.getElementById('btn-gather-herbs');
    let fishBtn = document.getElementById('btn-gather-fish');
    let enchBtn = document.getElementById('btn-gather-enchants');
    if(herbBtn) herbBtn.disabled = true;
    if(fishBtn) fishBtn.disabled = true;
    if(enchBtn) enchBtn.disabled = true;
    
    globalProgression.cooldowns[type] = Date.now() + (10 * 60 * 1000);
    
    setTimeout(() => {
        // Remove overlay
        let ol = document.getElementById('gather-overlay');
        if(ol) ol.remove();
        if(herbBtn) herbBtn.disabled = false;
        if(fishBtn) fishBtn.disabled = false;
        if(enchBtn) enchBtn.disabled = false;
        
        let log = document.getElementById('story-log'); playSound('heal');
        
        // Gold & XP gains
        let xpGain = Math.floor(getXpForNextLevel(player.lvl) * 0.10);
        let gatherGold = 5 + Math.floor(player.lvl / 10);
        globalProgression.gold += gatherGold;
        player.xp += xpGain;

        showFloatText(`btn-gather-${type}`, `+${xpGain} XP`, 'text-yellow-400');

        if(type === 'herbs') {
            let r1 = (Math.floor(Math.random()*3)+1) * 5; let r2 = (Math.floor(Math.random()*3)+1) * 5;
            addToInventory('herb_red', r1); addToInventory('herb_blue', r2);
            if(log) log.innerHTML = `<span class="text-green-400">Gathered ${r1} Crimson & ${r2} Azure Herbs! (+${gatherGold}G, +${xpGain}XP)</span>`;
        } else if (type === 'fish') {
            let types = [1,2,3,4,5,6];
            let pick1 = types.splice(Math.floor(Math.random()*types.length), 1)[0]; let pick2 = types.splice(Math.floor(Math.random()*types.length), 1)[0];
            let a1 = (Math.floor(Math.random()*2)+1) * 5; let a2 = (Math.floor(Math.random()*2)+1) * 5;
            addToInventory(`fish_${pick1}`, a1); addToInventory(`fish_${pick2}`, a2);
            if(log) log.innerHTML = `<span class="text-blue-400">Caught ${a1} ${MAT_NAMES['fish_'+pick1]} & ${a2} ${MAT_NAMES['fish_'+pick2]}! (+${gatherGold}G, +${xpGain}XP)</span>`;
        } else if (type === 'enchants') {
            let roll = Math.random();
            let eTier = roll < 0.05 ? 'ench_legendary' : roll < 0.20 ? 'ench_epic' : roll < 0.50 ? 'ench_rare' : 'ench_common';
            addToInventory(eTier, 5);
            if(log) log.innerHTML = `<span class="text-purple-400">Found 5 ${MAT_NAMES[eTier]}! (+${gatherGold}G, +${xpGain}XP)</span>`;
        }
        
        checkLevelUp();
        saveGame(); updateEnergy();
    }, 3000);
}

function gambleGold(amount) {
    let log = document.getElementById('story-log');
    if(globalProgression.gold < amount) {
        log.innerHTML = `<span class="text-red-500">Not enough gold to gamble ${amount}G!</span>`;
        playSound('lose');
        return;
    }
    // Resolve the bet immediately so closing the browser cannot cause gold loss without a win chance
    const won = Math.random() < 0.5;
    globalProgression.gold -= amount;
    let ps = ensureProgressStats();
    ps.goldSpent += amount;
    if(won) {
        globalProgression.gold += (amount * 2);
        ps.gamblingWins++;
    } else {
        ps.gamblingLosses++;
    }
    saveGame();
    // Disable gamble buttons during animation
    document.querySelectorAll('[onclick^="gambleGold"]').forEach(b => b.disabled = true);
    // Show gamble animation overlay
    let overlay = document.createElement('div');
    overlay.className = 'gamble-anim-overlay';
    overlay.id = 'gamble-overlay';
    overlay.innerHTML = `<div class="gamble-emoji">🎲</div><div class="gamble-label">Gambling ${amount}G...</div>`;
    document.body.appendChild(overlay);
    setTimeout(() => {
        let ol = document.getElementById('gamble-overlay');
        if(ol) ol.remove();
        document.querySelectorAll('[onclick^="gambleGold"]').forEach(b => b.disabled = false);
        if(won) {
            log.innerHTML = `<span class="text-yellow-400 font-bold">You won the gamble! +${amount}G</span>`;
            playSound('win');
        } else {
            log.innerHTML = `<span class="text-gray-500">You lost the gamble... -${amount}G</span>`;
            playSound('lose');
        }
    }, 1000);
}

function checkLevelUp() {
    let levelsGained = 0;
    // Cap at 5 levels per call to prevent huge jumps from large XP gains (e.g. quest rewards)
    const MAX_LEVELS_PER_CHECK = 5;
    while (player.lvl < 500 && levelsGained < MAX_LEVELS_PER_CHECK) {
        const xpNeeded = getXpForNextLevel(player.lvl);
        if (player.xp < xpNeeded) break;
        player.lvl++;
        player.xp -= xpNeeded;
        // Levels 1-50 give 1 stat point each; levels above 50 give 2 stat points each
        player.statPoints += (player.lvl <= 50 ? 1 : 2);
        player.skillPoints++;
        levelsGained++;
    }
    if (levelsGained > 0) {
        player.maxHp = calculateMaxHp();
        player.currentHp = player.maxHp;
        if (typeof clampAttributes === 'function') clampAttributes();
        playSound('win');
        document.getElementById('hub-level-up-noti').classList.remove('hidden');
    }
}

window.confirmNewGame = confirmNewGame;
window.closeConfirmNewGame = closeConfirmNewGame;
window.confirmNewGameYes = confirmNewGameYes;
window.loadGameAndContinue = loadGameAndContinue;
window.selectGenderAndStart = selectGenderAndStart;
window.showGenderSelect = showGenderSelect;
window.onClassVideoEnd = onClassVideoEnd;
console.log("Game.js loaded successfully");

