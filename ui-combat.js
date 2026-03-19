// --- MAIN MENU & SCREEN NAVIGATION ---
// Note: confirmNewGame, closeConfirmNewGame, confirmNewGameYes, and switchScreen are defined in game.js.

// No-Energy animation overlay
const NO_ENERGY_OVERLAY_DURATION_MS = 1500;
function showNoEnergyAnimation() {
    let existing = document.getElementById('no-energy-overlay');
    if(existing) existing.remove();
    let overlay = document.createElement('div');
    overlay.className = 'no-energy-overlay';
    overlay.id = 'no-energy-overlay';
    overlay.innerHTML = '<div class="no-energy-emoji">⚡</div><div class="no-energy-label">No Energy!</div>';
    document.body.appendChild(overlay);
    playSound('lose');
    setTimeout(() => { let el = document.getElementById('no-energy-overlay'); if(el) el.remove(); }, NO_ENERGY_OVERLAY_DURATION_MS);
}

// --- ENEMY SKILLS ---
const ENEMY_SKILL_POOL = [
    { id: 'hit', name: 'Hit', cd: 0, desc: 'Basic attack' },
    { id: 'bleed', name: 'Rend', cd: 5, desc: 'Inflicts bleed' },
    { id: 'extra_turn', name: 'Frenzy', cd: 5, desc: 'Deal damage and take an extra turn' },
    { id: 'recover', name: 'Recover', cd: 5, desc: 'Heals 10% HP' },
    { id: 'stun', name: 'Bash', cd: 5, desc: 'Stuns for 1 turn' },
    { id: 'dodge', name: 'Evasive Maneuver', cd: 5, desc: 'Dodges next attack' },
    { id: 'poison', name: 'Venom', cd: 5, desc: 'Reduces healing by 50%' },
    { id: 'burn', name: 'Ignite', cd: 5, desc: '5% max HP damage over 1 turn' },
    { id: 'guard', name: 'Guard', cd: 5, desc: 'Reduces damage by 50% for 2 turns' },
    { id: 'mend', name: 'Mend', cd: 5, desc: 'Increases own damage by 15% for 3 turns' },
    { id: 'boink', name: 'Boink', cd: 5, desc: 'Deals double damage in one hit' },
    { id: 'reflect', name: 'Reflect', cd: 5, desc: 'Reflects 15% of damage taken back for 2-3 turns' },
    { id: 'silence', name: 'Silenced', cd: 5, desc: 'Silences 1 random hero skill slot (1-5) for 1 turn' }
];

function getEnemyBracketStats(level) {
    // Returns { baseHp, baseDmg, baseDef, perLevelMult } for the given level bracket
    let bracket;
    if (level <= 20)       bracket = { baseHp: 200,  baseDmg: 80,  baseDef: 10, mult: 1.0 };
    else if (level <= 40)  bracket = { baseHp: 240,  baseDmg: 95,  baseDef: 16, mult: 1.15 };
    else if (level <= 60)  bracket = { baseHp: 290,  baseDmg: 115, baseDef: 26, mult: 1.35 };
    else if (level <= 80)  bracket = { baseHp: 350,  baseDmg: 145, baseDef: 38, mult: 1.6 };
    else                   bracket = { baseHp: 430,  baseDmg: 180, baseDef: 54, mult: 1.9 };

    // Level within the bracket (1-based)
    let bracketSize = 20;
    let bracketStart = Math.floor((Math.min(level, 100) - 1) / bracketSize) * bracketSize + 1;
    let levelWithinBracket = Math.min(level, 100) - bracketStart + 1;
    // For levels above 100, continue scaling from the 81-100 bracket
    if (level > 100) {
        levelWithinBracket = level - 80; // continual scaling from level 80
    }

    let scalingFactor = 1 + (levelWithinBracket - 1) * 0.03;
    return {
        hp:  Math.floor(bracket.baseHp  * bracket.mult * scalingFactor),
        dmg: Math.floor(bracket.baseDmg * bracket.mult * scalingFactor),
        def: Math.floor(bracket.baseDef * bracket.mult * scalingFactor)
    };
}

function assignEnemySkills(enemy) {
    let numSpecials = 0;
    if(enemy.rarity === 'rare') numSpecials = 1;
    else if(enemy.rarity === 'epic') numSpecials = 2;
    else if(enemy.rarity === 'legendary' || enemy.isBoss) numSpecials = 3;
    else if(enemy.rarity === 'mythic') numSpecials = 3;
    
    enemy.skills = ['hit']; // Always has hit
    let available = ENEMY_SKILL_POOL.map(s => s.id).filter(id => id !== 'hit');
    
    for(let i=0; i<numSpecials; i++) {
        if(available.length === 0) break;
        let pickIdx = Math.floor(Math.random() * available.length);
        enemy.skills.push(available.splice(pickIdx, 1)[0]);
    }
    
    enemy.cooldowns = {};
    enemy.skills.forEach(s => enemy.cooldowns[s] = 0);
}

// --- COMBAT & ANIMATIONS ---
function toggleAuto() { 
    if(currentMode === 'training') return; // No auto in training ground
    isAutoBattle = !isAutoBattle; 
    const btn = document.getElementById('btn-auto'); 
    if(isAutoBattle) btn.classList.add('auto-on');
    else btn.classList.remove('auto-on');
    if(isAutoBattle && isPlayerTurn && combatActive) processAutoTurn(); 
}
function returnToTown() {
    combatActive = false;
    battleEnding = false;
    isAutoBattle = false;
    // Save living enemies for persistence (exclude special modes)
    if (!NON_PERSIST_MODES.includes(currentMode) && enemies.length > 0 && enemies.some(e => e.currentHp > 0)) {
        let persistKey = currentMode === 'dungeon' ? `dungeon_${activeDungeonTier}_${activeDungeonRoom}` : currentMode;
        savedEnemies[persistKey] = enemies.map(e => structuredClone(e));
    }
    enemies = []; // Clear enemies so fresh ones spawn next battle
    const btn = document.getElementById('btn-auto');
    if(btn) { btn.classList.remove('auto-on'); btn.disabled = false; btn.classList.remove('opacity-50'); }
    showHub();
}
function fleeBattle() { returnToTown(); }
function showFloatText(targetId, text, colorClass) { const target = document.getElementById(targetId); if (!target) return; const floater = document.createElement('div'); floater.className = `float-text ${colorClass}`; floater.innerText = text; target.appendChild(floater); setTimeout(() => { if(floater.parentNode) floater.remove(); }, 900); }
function showDamageNumber(targetId, damage, isCrit) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const floater = document.createElement('div');
    floater.className = 'damage-number' + (isCrit ? ' crit' : '');
    floater.innerText = isCrit ? `CRIT! -${damage}` : `-${damage}`;
    target.appendChild(floater);
    setTimeout(() => { if (floater.parentNode) floater.remove(); }, 1000);
}


function generateEnemies() {
    // Check for persisted enemies in this mode (exclude special modes)
    if (!NON_PERSIST_MODES.includes(currentMode)) {
        let persistKey = currentMode === 'dungeon' ? `dungeon_${activeDungeonTier}_${activeDungeonRoom}` : currentMode;
        if (savedEnemies[persistKey]) {
            let saved = savedEnemies[persistKey];
            let alive = saved.filter(e => e.currentHp > 0);
            if (alive.length > 0) {
                enemies = alive.map(e => {
                    let restored = structuredClone(e);
                    restored.bleedStacks = 0; restored.bleedTurns = 0;
                    restored.burnStacks = 0; restored.burnTurns = 0;
                    restored.poisonStacks = 0; restored.poisonTurns = 0;
                    restored.defReduction = 0; restored.defReductionTurns = 0;
                    restored.stunned = 0; restored.healBlock = 0;
                    restored.dmgTakenMult = 1; restored.dmgTakenTurns = 0;
                    restored.dodgeTurns = 0; restored.skipChance = 0; restored.skipTurns = 0;
                    restored.shield = 0;
                    return restored;
                });
                activeTargetIndex = 0;
                if (enemies.some(e => e.isBoss)) playBossMusic();
                else playBattleMusic();
                return;
            } else {
                delete savedEnemies[persistKey];
            }
        }
    }

    enemies = [];
    
    if (currentMode === 'quest') { 
        for(let i=0; i<4; i++) { let e = { shield: 0, healBlock: 0, defReduction: 0, bleedStacks: 0, bleedTurns: 0, burnStacks: 0, burnTurns: 0, poisonStacks: 0, poisonTurns: 0, skipChance: 0, skipTurns: 0, dmgTakenMult: 1, dmgTakenTurns: 0, dodgeTurns: 0, rarity: 'common', lvl: 1, name: 'Weak Target', avatar: '🎯', maxHp: 1, baseDmg: 0, currentHp: 1 }; assignEnemySkills(e); enemies.push(e); } 
        activeTargetIndex = 0; return; 
    }

    if (currentMode === 'training') {
        let e = { shield: 0, healBlock: 0, defReduction: 0, bleedStacks: 0, bleedTurns: 0, burnStacks: 0, burnTurns: 0, poisonStacks: 0, poisonTurns: 0, skipChance: 0, skipTurns: 0, dmgTakenMult: 1, dmgTakenTurns: 0, dodgeTurns: 0, rarity: 'common', isBoss: false, lvl: 1, name: 'Training Dummy', avatar: '🎯', maxHp: 9999999, baseDmg: 0, skills: [] };
        e.currentHp = e.maxHp;
        enemies.push(e);
        activeTargetIndex = 0;
        return;
    }

    if (currentMode === 'graveyard') {
        let baseBoss = globalProgression.killedBosses[activeGraveyardBoss];
        let e = { shield: 0, healBlock: 0, defReduction: 0, bleedStacks: 0, bleedTurns: 0, burnStacks: 0, burnTurns: 0, poisonStacks: 0, poisonTurns: 0, skipChance: 0, skipTurns: 0, dmgTakenMult: 1, dmgTakenTurns: 0, dodgeTurns: 0, rarity: 'boss', isBoss: true };
        e.lvl = Math.max(1, player.lvl + 2);
        e.name = baseBoss.name; e.avatar = baseBoss.avatar;
        e.maxHp = Math.max(1, Math.floor(25 * baseBoss.hpMult * (1 + (e.lvl - 1) * 0.4) * 3)); 
        e.baseDmg = Math.max(1, Math.floor(e.lvl * 2 * baseBoss.dmgMult * (1 + (e.lvl - 1) * 0.01)));
        assignEnemySkills(e);
        e.currentHp = e.maxHp;
        enemies.push(e);
        activeTargetIndex = 0;
        playBossMusic();
        return;
    }

    if (currentMode === 'invasion') {
        // Invasion: always spawn up to invasionMaxOnScreen boss-type enemies
        // Level scales 100–500 based on player level
        let invasionLevel = Math.max(100, Math.min(player.lvl, 500));
        let allBossTemplates = [
            ...BOSS_TEMPLATES['hunting'], ...BOSS_TEMPLATES['pillage'],
            ...BOSS_TEMPLATES['workshop'], ...BOSS_TEMPLATES['dungeon'],
            ...BOSS_TEMPLATES['island_defense']
        ];
        for(let i = 0; i < invasionMaxOnScreen; i++) {
            let t = allBossTemplates[Math.floor(Math.random() * allBossTemplates.length)];
            let e = { shield: 0, healBlock: 0, defReduction: 0, bleedStacks: 0, bleedTurns: 0, burnStacks: 0, burnTurns: 0, poisonStacks: 0, poisonTurns: 0, skipChance: 0, skipTurns: 0, dmgTakenMult: 1, dmgTakenTurns: 0, dodgeTurns: 0, rarity: 'boss', isBoss: true };
            e.lvl = invasionLevel;
            e.name = 'Invader ' + t.name; e.avatar = t.avatar;
            e.maxHp = Math.max(1, Math.floor(25 * t.hpMult * (1 + (invasionLevel - 1) * 0.4) * 5));
            e.baseDmg = Math.max(1, Math.floor(invasionLevel * 5 * (1 + (invasionLevel - 1) * 0.01)));
            e.templateMults = { hpMult: t.hpMult, dmgMult: t.dmgMult };
            assignEnemySkills(e);
            e.currentHp = e.maxHp;
            enemies.push(e);
            invasionSpawned++;
        }
        activeTargetIndex = 0;
        playBossMusic();
        return;
    }

    let isBossFight = false;
    let count = 1;

    if (currentMode === 'dungeon' && activeDungeonRoom === 5) {
        isBossFight = true; count = 1;
    } else if ((currentMode === 'hunting' || currentMode === 'pillage' || currentMode === 'workshop' || currentMode === 'island_defense') && globalProgression.storyModeProgress[currentMode] >= 9) {
        isBossFight = true; count = 1;
    } else {
        let countRoll = Math.random();
        if(countRoll < 0.05) count = 4;       // 5% chance
        else if(countRoll < 0.10) count = 3;  // 5% chance
        else if(countRoll < 0.50) count = 2;  // 40% chance
        else count = 1;                        // 50% chance
    }

    let pool = ENEMIES_HUNT;
    if(currentMode === 'pillage') pool = ENEMIES_PILLAGE;
    if(currentMode === 'workshop') pool = ENEMIES_WORKSHOP;
    if(currentMode === 'dungeon') pool = ENEMIES_DUNGEON;
    if(currentMode === 'island_defense') pool = ENEMIES_ISLAND_DEFENSE;

    // 0.5% chance to spawn the secret mythic boss in any non-boss, non-graveyard mode
    if(!isBossFight && Math.random() < 0.005) {
        let mythicPrefixes = ['Void', 'Celestial', 'Primordial', 'Abyssal', 'Eternal', 'Cosmic', 'Ancient', 'Infernal', 'Divine', 'Sovereign'];
        let mythicSuffixes = ['Harbinger', 'Annihilator', 'Devourer', 'Destroyer', 'Colossus', 'Overlord', 'Titan', 'Ravager', 'Obliterator', 'God'];
        let mName = mythicPrefixes[Math.floor(Math.random() * mythicPrefixes.length)] + ' ' + mythicSuffixes[Math.floor(Math.random() * mythicSuffixes.length)];
        let e = { shield: 0, healBlock: 0, defReduction: 0, bleedStacks: 0, bleedTurns: 0, burnStacks: 0, burnTurns: 0, poisonStacks: 0, poisonTurns: 0, skipChance: 0, skipTurns: 0, dmgTakenMult: 1, dmgTakenTurns: 0, dodgeTurns: 0, rarity: 'mythic', isBoss: true, isMythicBoss: true };
        e.lvl = Math.max(1, player.lvl + 5);
        e.name = mName;
        e.avatar = '✨';
        // 2x harder than legendary: legendary hpMult~10, so mythic uses RARITY_MULTS.mythic=30 for base, plus boss multiplier
        let legendaryMult = RARITY_MULTS['legendary']; // 10
        let mythicBossMult = legendaryMult * 2; // 20
        e.maxHp = Math.max(1, Math.floor(25 * (1 + (e.lvl - 1) * 0.4) * mythicBossMult));
        e.baseDmg = Math.max(1, Math.floor(e.lvl * mythicBossMult * 0.5 * (1 + (e.lvl - 1) * 0.01)));
        e.templateMults = { hpMult: mythicBossMult, dmgMult: mythicBossMult };
        assignEnemySkills(e);
        if(!globalProgression.discoveredEnemies) globalProgression.discoveredEnemies = {};
        globalProgression.discoveredEnemies[mName] = true;
        if(!globalProgression.discoveredMythicBosses) globalProgression.discoveredMythicBosses = [];
        if(!globalProgression.discoveredMythicBosses.includes(mName)) globalProgression.discoveredMythicBosses.push(mName);
        e.currentHp = e.maxHp;
        enemies.push(e);
        activeTargetIndex = 0;
        playBossMusic();
        return;
    }

    for(let i=0; i<count; i++) {
        let e = { shield: 0, healBlock: 0, defReduction: 0, bleedStacks: 0, bleedTurns: 0, burnStacks: 0, burnTurns: 0, poisonStacks: 0, poisonTurns: 0, skipChance: 0, skipTurns: 0, dmgTakenMult: 1, dmgTakenTurns: 0, dodgeTurns: 0, def: 0, rarity: 'common', isBoss: false };
        
        if (currentMode === 'dungeon' && activeDungeonRoom === 5) {
            e.lvl = activeDungeonTier * 5; 
            let dBoss = BOSS_TEMPLATES['dungeon'][Math.floor(Math.random() * BOSS_TEMPLATES['dungeon'].length)];
            e.name = dBoss.name; e.avatar = dBoss.avatar;
            e.maxHp = Math.max(1, Math.floor(25 * dBoss.hpMult * (1 + (e.lvl - 1) * 0.4) * 3));
            e.baseDmg = Math.max(1, Math.floor(e.lvl * 2 * dBoss.dmgMult * (1 + (e.lvl - 1) * 0.01)));
            e.rarity = 'boss'; e.isBoss = true;
            e.templateMults = { hpMult: dBoss.hpMult, dmgMult: dBoss.dmgMult };
        } else if (isBossFight) {
            let lvlBase = player.lvl; e.lvl = Math.max(1, lvlBase + 2);
            let bPool = BOSS_TEMPLATES[currentMode] || BOSS_TEMPLATES['hunting'];
            let bTemplate = bPool[Math.floor(Math.random() * bPool.length)];
            e.name = bTemplate.name; e.avatar = bTemplate.avatar;
            e.maxHp = Math.max(1, Math.floor(25 * bTemplate.hpMult * (1 + (e.lvl - 1) * 0.4) * 3)); 
            e.baseDmg = Math.max(1, Math.floor(e.lvl * 2 * bTemplate.dmgMult * (1 + (e.lvl - 1) * 0.01))); 
            e.rarity = 'boss'; e.isBoss = true;
            e.templateMults = { hpMult: bTemplate.hpMult, dmgMult: bTemplate.dmgMult };
        } else {
            let lvlBase = currentMode === 'dungeon' ? (activeDungeonTier - 1) * 5 + activeDungeonRoom : player.lvl; 
            e.lvl = Math.max(1, lvlBase + Math.floor(Math.random() * 3) - 1);
            let t = pool[Math.floor(Math.random() * pool.length)];
            e.name = t.name; e.avatar = t.avatar;

            let rRoll = Math.random();
            if(rRoll < 0.01) e.rarity = 'mythic';
            else if(rRoll < 0.05) e.rarity = 'legendary';
            else if(rRoll < 0.15) e.rarity = 'epic';
            else if(rRoll < 0.40) e.rarity = 'rare';
            else e.rarity = 'common'; // 60% normal

            if (e.rarity !== 'common') { e.name = `${e.rarity.charAt(0).toUpperCase() + e.rarity.slice(1)} ${e.name}`; }

            let bracketStats = getEnemyBracketStats(e.lvl);
            let hpMult = (RARITY_HP_MULTS[e.rarity] || 1) * t.hpMult;
            let dmgMult = (RARITY_DMG_MULTS[e.rarity] || 1) * t.dmgMult;
            let defMult = (RARITY_DEF_MULTS[e.rarity] || 1);
            let dungeonDiffMult = 1;
            e.maxHp = Math.max(1, Math.floor(bracketStats.hp * hpMult * dungeonDiffMult));
            e.baseDmg = Math.max(1, Math.floor(bracketStats.dmg * dmgMult * dungeonDiffMult));
            e.def = Math.max(0, Math.floor(bracketStats.def * defMult));

            // Guaranteed drops for epic/legendary/mythic
            if (e.rarity === 'epic') e.guaranteedDrop = 'epic';
            else if (e.rarity === 'legendary') e.guaranteedDrop = 'legendary';
            else if (e.rarity === 'mythic') e.guaranteedDrop = 'mythic';
        }

        assignEnemySkills(e);

        let baseName = e.isBoss ? e.name : e.name.replace(/^(Rare |Epic |Legendary |Mythic )/, '');
        if(!globalProgression.discoveredEnemies) globalProgression.discoveredEnemies = {};
        globalProgression.discoveredEnemies[baseName] = true;

        e.currentHp = e.maxHp; enemies.push(e);
    }
    activeTargetIndex = 0;

    if(isBossFight) {
        playBossMusic();
    } else {
        playBattleMusic();
    }
}

function getEnemySkillsText(e) {
    if(!e.skills) return 'Hit';
    return e.skills.map(s => ENEMY_SKILL_POOL.find(x => x.id === s)?.name || s).join(', ');
}

function startBattle(isNewEncounter = false) {
    // Do not start battle if player HP is 0 (dead) — they must heal first
    if (isNewEncounter && player.currentHp <= 0) {
        alert('You need at least 1 HP to start a battle. Use a potion or rest to recover.');
        returnToTown();
        return;
    }
    battleEnding = false;
    combatActive = true; generateEnemies();
    if (isNewEncounter) { 
        // Do NOT replenish HP — player enters with their current HP
        player.regenBuffs = []; player.activeBuffs = []; 
        player.stunned = 0; player.bleedStacks = 0; player.bleedTurns = 0; player.dodgeTurns = 0;
        // Reset skill cooldowns at the start of each new battle (Way of Heavens is global and persists)
        if(!player.skillCooldowns) player.skillCooldowns = {};
        Object.keys(player.skillCooldowns).forEach(k => player.skillCooldowns[k] = 0);
    } 
    player.shield = 0;
    player.rageUsed = false; player.divineShieldUsed = false; player.reflectUsed = false; player.usedConsumableThisTurn = false;
    player.reAliveArmed = false; player.reAliveUsed = false;
    player.rageActive = player.rageActive || 0;
    // Reset usable item cooldowns at battle start
    if(!player.usableCooldowns) player.usableCooldowns = {};
    Object.keys(player.usableCooldowns).forEach(k => player.usableCooldowns[k] = 0);
    // Clear any silenced slots at battle start
    player.silencedSlots = {};
    combatLog = [`Encountered ${enemies.length} enemies!`, "Fight!"]; isPlayerTurn = true;
    updateCombatUI(); renderSkills(); renderUsableSlots(); switchScreen('screen-combat');
    // Handle training mode: disable AUTO button
    const autoBtn = document.getElementById('btn-auto');
    if(currentMode === 'training') {
        isAutoBattle = false;
        if(autoBtn) { autoBtn.disabled = true; autoBtn.classList.add('opacity-50'); autoBtn.classList.remove('auto-on'); }
    } else {
        if(autoBtn) { autoBtn.disabled = false; autoBtn.classList.remove('opacity-50'); }
        if(isAutoBattle) setTimeout(processAutoTurn, 500);
    }
}

function selectTarget(index) { 
    if(enemies[index].currentHp > 0 && combatActive) { 
        activeTargetIndex = index; 
        updateCombatUI(); 
        playSound('click'); 
    } 
}

function renderConsumables() {
}

function renderUsableSlots() {
    const cont = document.getElementById('combat-usable-slots');
    if(!cont) return;
    cont.innerHTML = '';
    if(!player.equippedUsables) player.equippedUsables = [null, null, null, null, null, null, null];
    if(!player.usableCooldowns) player.usableCooldowns = {};
    let numUnlocked = Math.min(7, 1 + Math.floor(player.lvl / 4));
    for(let i = 0; i < 7; i++) {
        let wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0;';
        let slot = document.createElement('div');
        slot.style.cssText = 'width:40px;height:40px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;position:relative;';
        let actionBtn = document.createElement('button');
        actionBtn.style.cssText = 'font-size:0.75rem;padding:4px 8px;border-radius:5px;font-weight:bold;cursor:pointer;border:none;line-height:1;min-width:28px;min-height:24px;';
        if(i >= numUnlocked) {
            slot.style.cssText += 'background:#1f2937;border:1px solid #374151;color:#6b7280;cursor:not-allowed;';
            slot.innerHTML = '🔒';
            actionBtn.style.cssText += 'background:#374151;color:#6b7280;cursor:not-allowed;';
            actionBtn.innerText = '🔒';
            actionBtn.disabled = true;
        } else if(player.equippedUsables[i]) {
            let key = player.equippedUsables[i];
            let usableItem = USABLE_ITEMS[key];
            let consumableItem = CONSUMABLES[key];
            let isUsableItem = !!usableItem;
            let icon = isUsableItem ? usableItem.icon : (consumableItem ? consumableItem.icon : '?');
            let name = isUsableItem ? usableItem.name : (consumableItem ? consumableItem.name : key);
            
            if(isUsableItem) {
                // Usable item (burglar items) - uses per-item cooldown
                let amt = (globalProgression.usableItems || {})[key] || 0;
                let cdLeft = player.usableCooldowns[key] || 0;
                let onCooldown = cdLeft > 0;
                let hasItems = amt > 0;
                let canUse = !onCooldown && hasItems && isPlayerTurn && combatActive;

                slot.style.cssText += onCooldown
                    ? 'background:#1f2937;border:1px solid #6b7280;cursor:not-allowed;'
                    : (hasItems ? 'background:#1c1917;border:1px solid #ef4444;cursor:pointer;' : 'background:#1f2937;border:1px solid #374151;cursor:not-allowed;opacity:0.4;');
                slot.innerHTML = `<span>${icon}</span><span style="position:absolute;bottom:-2px;right:0;font-size:0.55rem;font-weight:bold;color:#fbbf24;">${amt}</span>`;
                
                // Cooldown overlay
                if(onCooldown) {
                    let overlay = document.createElement('div');
                    overlay.className = 'usable-cooldown-overlay';
                    overlay.innerText = cdLeft;
                    slot.appendChild(overlay);
                }
                
                slot.title = onCooldown ? `On cooldown: ${cdLeft} turns` : (hasItems ? name + ' — Click to use' : name + ' — Out of stock');
                if(canUse) slot.onclick = (e) => { e.stopPropagation(); useUsableItem(key); };
                actionBtn.style.cssText += 'background:#7f1d1d;color:#fca5a5;';
                actionBtn.innerText = '✕';
                actionBtn.title = 'Remove item';
                actionBtn.onclick = (e) => { e.stopPropagation(); player.equippedUsables[i] = null; renderUsableSlots(); };
            } else {
                // Original consumable (potions, food)
                let amt = globalProgression.inventory[key] || 0;
                let onCooldown = player.usedConsumableThisTurn;
                slot.style.cssText += onCooldown ? 'background:#1f2937;border:1px solid #6b7280;cursor:not-allowed;opacity:0.5;' : 'background:#451a03;border:1px solid #fbbf24;cursor:pointer;';
                slot.innerHTML = `<span>${icon}</span><span style="position:absolute;bottom:-2px;right:0;font-size:0.55rem;font-weight:bold;color:#fbbf24;">${amt}</span>`;
                slot.title = onCooldown ? 'Already used a consumable this turn' : name + ' — Click to use';
                slot.onclick = (e) => { e.stopPropagation(); useConsumable(key); };
                actionBtn.style.cssText += 'background:#7f1d1d;color:#fca5a5;';
                actionBtn.innerText = '✕';
                actionBtn.title = 'Remove item';
                actionBtn.onclick = (e) => { e.stopPropagation(); player.equippedUsables[i] = null; renderUsableSlots(); };
            }
        } else {
            slot.style.cssText += 'background:#1f2937;border:1px dashed #4b5563;color:#6b7280;';
            slot.innerHTML = '';
            actionBtn.style.cssText += 'background:#374151;color:#9ca3af;';
            actionBtn.innerText = '+';
            actionBtn.title = 'Add item';
            actionBtn.onclick = (e) => { e.stopPropagation(); openUsableSlotPicker(i); };
        }
        wrapper.appendChild(slot);
        wrapper.appendChild(actionBtn);
        cont.appendChild(wrapper);
    }
}

let _usablePickerSlot = -1;
function openUsableSlotPicker(slotIdx) {
    _usablePickerSlot = slotIdx;
    const cont = document.getElementById('combat-bag-list');
    cont.innerHTML = '<div class="text-xs text-gray-400 mb-2 font-bold uppercase">Assign to slot:</div>';
    let hasAny = false;
    // Show USABLE_ITEMS first (burglar items)
    Object.keys(USABLE_ITEMS).forEach(key => {
        let amt = (globalProgression.usableItems || {})[key] || 0;
        if(amt > 0) {
            hasAny = true;
            let item = USABLE_ITEMS[key];
            let btn = document.createElement('button');
            btn.className = 'w-full bg-gray-900 border border-red-800 p-2 rounded flex justify-between items-center mb-1 active:scale-95 transition';
            btn.innerHTML = `<div class="flex items-center gap-2"><span class="text-xl">${item.icon}</span><div><b class="text-red-300 text-sm">${item.name}</b><div class="text-[10px] text-gray-400">${item.desc}</div></div></div><span class="text-yellow-400 font-bold">x${amt}</span>`;
            btn.onclick = () => { if(!player.equippedUsables) player.equippedUsables = [null,null,null,null,null,null,null]; player.equippedUsables[_usablePickerSlot] = key; closeCombatBag(); renderUsableSlots(); };
            cont.appendChild(btn);
        }
    });
    // Then show CONSUMABLES (potions, food)
    Object.keys(CONSUMABLES).forEach(key => {
        let amt = globalProgression.inventory[key] || 0;
        if(amt > 0) {
            hasAny = true;
            let c = CONSUMABLES[key];
            let btn = document.createElement('button');
            btn.className = 'w-full bg-gray-900 border border-gray-700 p-2 rounded flex justify-between items-center mb-1 active:scale-95 transition';
            btn.innerHTML = `<div class="flex items-center gap-2"><span class="text-xl">${c.icon}</span><div><b class="text-white text-sm">${c.name}</b><div class="text-[10px] text-gray-400">${c.desc}</div></div></div><span class="text-yellow-400 font-bold">x${amt}</span>`;
            btn.onclick = () => { if(!player.equippedUsables) player.equippedUsables = [null,null,null,null,null,null,null]; player.equippedUsables[_usablePickerSlot] = key; closeCombatBag(); renderUsableSlots(); };
            cont.appendChild(btn);
        }
    });
    if(!hasAny) cont.innerHTML += '<p class="text-gray-500 text-center py-4 text-sm">No items available.</p>';
    document.getElementById('modal-combat-bag').style.display = 'flex';
}

function useUsableItem(key) {
    if(!isPlayerTurn || !combatActive) return;
    if(!player.usableCooldowns) player.usableCooldowns = {};
    let cdLeft = player.usableCooldowns[key] || 0;
    if(cdLeft > 0) { addLog(`${USABLE_ITEMS[key].name} is on cooldown! (${cdLeft} turns)`, 'text-gray-400'); return; }
    let amt = (globalProgression.usableItems || {})[key] || 0;
    if(amt <= 0) { addLog('No more ' + USABLE_ITEMS[key].name + '!', 'text-gray-400'); return; }

    // Consume item
    globalProgression.usableItems[key]--;
    let item = USABLE_ITEMS[key];
    // Apply cooldown
    if(item.cooldown > 0) player.usableCooldowns[key] = item.cooldown;

    let target = enemies.find(e => e.currentHp > 0);
    if(!target && item.effectType !== 'ice_block' && item.effectType !== 'mirror' && item.effectType !== 'medicine') return;
    if(target) target = enemies[activeTargetIndex]?.currentHp > 0 ? enemies[activeTargetIndex] : target;

    switch(item.effectType) {
        case 'bomb': {
            let dmg = Math.floor(target.maxHp * 0.30);
            target.currentHp = Math.max(0, target.currentHp - dmg);
            addLog(`💣 Bomb! Dealt ${dmg} damage to ${target.name}!`, 'text-orange-400');
            showFloatText('enemies-container', `-${dmg}`, 'text-orange-400');
            showDamageNumber(`enemy-card-${activeTargetIndex}`, dmg, false);
            playSound('hit');
            break;
        }
        case 'medicine': {
            player.activeBuffs.push({ type: 'medicine_reflect', turns: 1 });
            addLog('💊 Medicine! Will reflect bleed/poison/burn to enemy for 1 turn.', 'text-green-400');
            playSound('buff');
            break;
        }
        case 'knife': {
            let dmg = Math.floor(target.maxHp * 0.10);
            target.currentHp = Math.max(0, target.currentHp - dmg);
            target.bleedStacks = (target.bleedStacks || 0) + 2;
            target.bleedTurns = Math.max(target.bleedTurns || 0, 3);
            addLog(`🔪 Knife! ${dmg} damage + 2 bleed to ${target.name}!`, 'text-red-400');
            showDamageNumber(`enemy-card-${activeTargetIndex}`, dmg, false);
            playSound('hit');
            break;
        }
        case 'darkness': {
            if(target.darknessTurns && target.darknessTurns > 0) {
                addLog('🌑 Darkness already applied! Cannot stack.', 'text-gray-400');
            } else {
                target.darknessTurns = 3;
                target.darknessChance = 0.15;
                addLog(`🌑 Darkness! ${target.name} has 15% miss chance for 3 turns.`, 'text-gray-500');
            }
            playSound('buff');
            break;
        }
        case 'curse': {
            target.healBlock = Math.max(target.healBlock || 0, 1);
            addLog(`☠️ Curse! ${target.name} cannot heal for 1 turn.`, 'text-purple-400');
            playSound('buff');
            break;
        }
        case 'ice_block': {
            player.activeBuffs.push({ type: 'ice_block', turns: 1, dmgReduction: 0.50 });
            addLog('🧊 Ice Block! Incoming damage reduced by 50% for 1 turn.', 'text-cyan-400');
            playSound('buff');
            break;
        }
        case 'mirror': {
            player.activeBuffs.push({ type: 'mirror_shard', turns: 1, reflectAmt: 1.00 });
            addLog('🪞 Mirror Shard! Reflects 100% damage for 1 turn.', 'text-blue-300');
            playSound('buff');
            break;
        }
        case 'distraction': {
            enemies.forEach((e, i) => {
                if(e.currentHp > 0) {
                    let selfDmg = Math.floor(e.baseDmg || 10);
                    e.currentHp = Math.max(0, e.currentHp - selfDmg);
                    addLog(`🎭 ${e.name} attacks itself for ${selfDmg}!`, 'text-yellow-400');
                    showDamageNumber(`enemy-card-${i}`, selfDmg, false);
                }
            });
            playSound('hit');
            break;
        }
        case 'bud_butt': {
            enemies.forEach((e, i) => {
                if(e.currentHp > 0) {
                    let dmg = Math.floor(e.maxHp * 0.10);
                    e.currentHp = Math.max(0, e.currentHp - dmg);
                    addLog(`💩 Mud Butt! ${dmg} damage to ${e.name}!`, 'text-pink-400');
                    showDamageNumber(`enemy-card-${i}`, dmg, false);
                }
            });
            playSound('hit');
            break;
        }
    }
    updateCombatUI(); renderUsableSlots();
    // Check if all enemies dead
    if(enemies.every(e => e.currentHp <= 0)) { setTimeout(() => { if(combatActive) endBattle(true); }, 800); return; }
    if(isAutoBattle) setTimeout(processAutoTurn, 300);
}

function useConsumable(key) {
    if(!isPlayerTurn || !combatActive || (globalProgression.inventory[key]||0) <= 0) return;
    if(player.usedConsumableThisTurn) { addLog('Already used a consumable this turn!', 'text-gray-400'); return; }
    globalProgression.inventory[key]--; let c = CONSUMABLES[key];
    
    let healMult = player.activeBuffs.some(b => b.type === 'poison') ? 0.5 : 1.0;

    if(c.type === 'instant' || c.type === 'buff_hp') {
        let heal = Math.floor(player.maxHp * c.val * healMult); if(c.type === 'buff_hp') heal = Math.floor(player.maxHp * 0.2 * healMult);
        player.currentHp = Math.min(player.maxHp, player.currentHp + heal); addLog(`Ate ${c.name}! Healed ${heal} HP!`, 'text-green-400'); triggerAnim('combat-player-avatar', 'anim-heal'); showFloatText('player-avatar-container', `+${heal}`, 'text-green-400'); playSound('heal');
    } else if(c.type === 'regen') {
        let healPerTurn = Math.floor((player.maxHp * c.val * healMult) / 5); player.regenBuffs.push({ amount: Math.max(1, healPerTurn), turns: 5 }); addLog(`Ate ${c.name}! Gained Regen!`, 'text-green-400'); triggerAnim('combat-player-avatar', 'anim-heal'); playSound('heal');
    } else if(c.type === 'buff_dmg') {
        player.activeBuffs.push({ type: 'dmg', val: c.val, turns: 5 }); addLog(`Ate ${c.name}! Damage Boosted!`, 'text-orange-400'); triggerAnim('combat-player-avatar', 'anim-heal'); playSound('buff');
    } else if(c.type === 'buff_def') {
        player.activeBuffs.push({ type: 'def', val: c.val, turns: 5 }); addLog(`Ate ${c.name}! Defense Boosted!`, 'text-blue-400'); triggerAnim('combat-player-avatar', 'anim-heal'); playSound('buff');
    }
    player.usedConsumableThisTurn = true;
    // Track potion consumption for progress stats
    let psC = ensureProgressStats(); psC.potionsConsumed++;
    updateCombatUI(); renderSkills(); 
    if(isAutoBattle) setTimeout(processAutoTurn, 300);
}

function updateCombatUI() {
    document.getElementById('ui-level').innerText = `Level ${player.lvl}`;
    let modeText = currentMode === 'training' ? '🎯 Training Ground' : currentMode === 'dungeon' ? `XP Dungeon T${activeDungeonTier} (Rm ${activeDungeonRoom})` : currentMode === 'hunting' ? 'Wilderness' : currentMode === 'pillage' ? 'Pillage Village' : currentMode === 'workshop' ? 'Workshop Raid' : currentMode === 'graveyard' ? 'Graveyard' : 'Quest Marathon';
    
    if(currentMode === 'hunting' || currentMode === 'pillage' || currentMode === 'workshop') {
        modeText += ` (${globalProgression.storyModeProgress[currentMode] + 1}/10)`;
    }

    document.getElementById('ui-mode-badge').innerText = modeText;

    if (player && player.data) {
        const pAvatar = document.getElementById('combat-player-avatar'); if (pAvatar) setAvatarDisplay('combat-player-avatar', player.data.avatar);
        const pClass = document.getElementById('combat-player-class'); if (pClass) pClass.innerText = `${player.data.name} Lv.${player.lvl}`;
    }
    
    const hpText = document.getElementById('combat-player-hp-text'); if (hpText) hpText.innerText = `${Math.ceil(Math.max(0, player.currentHp))}/${player.maxHp}`;
    const hpBar = document.getElementById('combat-player-hp'); if (hpBar) hpBar.style.width = `${(Math.max(0, player.currentHp) / player.maxHp) * 100}%`;
    const xpBar = document.getElementById('combat-player-xp'); if (xpBar) xpBar.style.width = `${(player.xp / getXpForNextLevel(player.lvl)) * 100}%`;
    
    const xpBarCont = document.getElementById('combat-xp-bar-container'); if(xpBarCont) xpBarCont.style.display = currentMode === 'quest' ? 'none' : 'block';

    const shieldInd = document.getElementById('player-shield-indicator'); if (shieldInd) shieldInd.style.display = player.shield > 0 ? 'block' : 'none';
    const regenInd = document.getElementById('player-regen-indicator'); if (regenInd) regenInd.style.display = player.regenBuffs.length > 0 ? 'block' : 'none';
    const dizzyInd = document.getElementById('player-dizzy-indicator'); if (dizzyInd) dizzyInd.style.display = (player.activeBuffs && player.activeBuffs.some(b => b.type === 'healingBuff')) ? 'block' : 'none';
    const stunInd = document.getElementById('player-stun-indicator'); if (stunInd) stunInd.style.display = player.stunned > 0 ? 'block' : 'none';

    let activeBuffsHtml = '';
    if(player.activeBuffs && player.activeBuffs.some(b => b.type === 'dmg')) activeBuffsHtml += `<span class="bg-orange-900 text-xs px-1 rounded border border-orange-500 shadow-md">⚔️UP</span>`;
    if(player.activeBuffs && player.activeBuffs.some(b => b.type === 'def')) activeBuffsHtml += `<span class="bg-blue-900 text-xs px-1 rounded border border-blue-500 shadow-md">🛡️UP</span>`;
    if(player.activeBuffs && player.activeBuffs.some(b => b.type === 'def_down')) activeBuffsHtml += `<span class="bg-purple-900 text-xs px-1 rounded border border-purple-500 shadow-md">📉DEF</span>`;
    if(player.bleedStacks > 0) activeBuffsHtml += `<span class="bg-red-900 text-xs px-1 rounded border border-red-500 shadow-md">🩸${player.bleedStacks}</span>`;
    if(player.activeBuffs && player.activeBuffs.some(b => b.type === 'poison')) activeBuffsHtml += `<span class="bg-green-900 text-xs px-1 rounded border border-green-500 shadow-md">🧪Poison</span>`;
    if(player.activeBuffs && player.activeBuffs.some(b => b.type === 'burn')) activeBuffsHtml += `<span class="bg-red-800 text-xs px-1 rounded border border-red-400 shadow-md">🔥Burn</span>`;
    if(player.activeBuffs && player.activeBuffs.some(b => b.type === 'fire_shield')) activeBuffsHtml += `<span class="bg-orange-800 text-xs px-1 rounded border border-orange-400 shadow-md">🔥Shield</span>`;
    if(player.activeBuffs && player.activeBuffs.some(b => b.type === 'ice_shield')) activeBuffsHtml += `<span class="bg-cyan-800 text-xs px-1 rounded border border-cyan-400 shadow-md">❄️Shield</span>`;
    if(player.dodgeTurns > 0) activeBuffsHtml += `<span class="bg-gray-400 text-black text-xs px-1 rounded shadow-md">💨Dodge</span>`;
    if(player.activeBuffs && player.activeBuffs.some(b => b.type === 'skill_reflect')) activeBuffsHtml += `<span class="bg-orange-800 text-xs px-1 rounded border border-orange-400 shadow-md">🔄Reflect</span>`;
    if(player.activeBuffs && player.activeBuffs.some(b => b.type === 'double_damage_taken')) activeBuffsHtml += `<span class="bg-red-800 text-xs px-1 rounded border border-red-400 shadow-md">⚠️2xDmg</span>`;
    
    const buffsEl = document.getElementById('combat-active-buffs'); if (buffsEl) buffsEl.innerHTML = activeBuffsHtml;

    const eContainer = document.getElementById('enemies-container'); 
    if (eContainer) {
        eContainer.innerHTML = '';
        if(enemies[activeTargetIndex] && enemies[activeTargetIndex].currentHp <= 0) { activeTargetIndex = enemies.findIndex(e => e.currentHp > 0); if(activeTargetIndex === -1) activeTargetIndex = 0; }

        const slotPositions = [{col:'2',row:'1'},{col:'1',row:'1'},{col:'1',row:'2'},{col:'2',row:'2'}];
        enemies.slice(0, 4).forEach((e, idx) => {
            let isDead = e.currentHp <= 0; let isTarget = idx === activeTargetIndex && !isDead;
            let card = document.createElement('div'); card.id = `enemy-card-${idx}`;
            
            let borderClass = 'border-2 border-gray-600 shadow-md';
            let rarityColor = 'text-gray-300';
            let animClass = '';
            if(e.rarity === 'mythic' || e.isMythicBoss) { borderClass = 'border-2 border-white shadow-[0_0_25px_rgba(255,255,255,0.8),0_0_50px_rgba(200,200,255,0.5)]'; rarityColor = 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,1)] font-black'; animClass = 'anim-mythic-boss'; }
            else if(e.rarity === 'legendary') { borderClass = 'border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]'; rarityColor = 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]'; animClass = 'anim-legendary'; }
            else if(e.rarity === 'epic') { borderClass = 'border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]'; rarityColor = 'text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]'; animClass = 'anim-epic'; }
            else if(e.rarity === 'rare') { borderClass = 'border-2 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]'; rarityColor = 'text-blue-400'; }
            else if(e.isBoss) { borderClass = 'border-2 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]'; rarityColor = 'text-red-400'; animClass = 'anim-legendary';}

            if(isTarget) borderClass += ' enemy-target';

            // Dynamic grid placement and sizing based on enemy count
            let avatarSizeClass, nameSizeClass, bossLabelSizeClass;
            if (enemies.length === 1) {
                avatarSizeClass = 'text-6xl'; nameSizeClass = 'text-sm'; bossLabelSizeClass = 'text-xs';
            } else if (enemies.length === 2) {
                avatarSizeClass = 'text-5xl'; nameSizeClass = 'text-xs'; bossLabelSizeClass = 'text-[9px]';
            } else if (enemies.length === 3) {
                avatarSizeClass = 'text-4xl'; nameSizeClass = 'text-[10px]'; bossLabelSizeClass = 'text-[8px]';
            } else {
                avatarSizeClass = 'text-3xl'; nameSizeClass = 'text-[10px]'; bossLabelSizeClass = 'text-[8px]';
            }
            card.style.gridColumn = slotPositions[idx].col;
            card.style.gridRow = slotPositions[idx].row;

            card.className = `enemy-card bg-gray-800 p-1.5 rounded-lg cursor-pointer flex flex-col items-center overflow-visible ${borderClass} ${isDead ? 'enemy-dead' : ''}`;
            card.onclick = () => selectTarget(idx);
            
            let eStatus = '';
            if(e.shield > 0) eStatus += `🛡️`;
            if(e.healBlock > 0) eStatus += `🚫`;
            if(e.defReduction > 0) eStatus += `📉`;
            if(e.bleedStacks > 0) eStatus += `<span class="text-[10px] text-red-500">🩸${e.bleedStacks}</span>`;
            if(e.dodgeTurns > 0) eStatus += `💨`;
            if(e.stunned > 0) eStatus += `😵`;
            if(e.dmgBoostTurns > 0) eStatus += `<span class="text-[10px] text-orange-400">⚔️+</span>`;
            if(e.enemyReflectTurns > 0) eStatus += `<span class="text-[10px] text-cyan-400">🔄</span>`;
            if(e.burnTurns > 0 || e.burnStacks > 0) eStatus += `<span class="text-[10px] text-orange-400">🔥${e.burnTurns || e.burnStacks || ''}</span>`;
            if(e.poisonStacks > 0 || e.poisonTurns > 0) eStatus += `<span class="text-[10px] text-green-400">🧪${e.poisonStacks || ''}</span>`;
            if(e.darknessTurns > 0) eStatus += `<span class="text-[10px] text-purple-400">🌑${e.darknessTurns}</span>`;
            if(e.missStacks > 0) eStatus += `<span class="text-[10px] text-gray-400">🌫️</span>`;
            if(e.skipTurns > 0) eStatus += `<span class="text-[10px] text-yellow-400">⏭️${e.skipTurns}</span>`;
            if(e.dmgTakenMult > 1 && e.dmgTakenTurns > 0) eStatus += `<span class="text-[10px] text-red-400">💥</span>`;

            let bossLabel = '';
            if (e.isMythicBoss) {
                bossLabel = `<div class="${bossLabelSizeClass} font-black text-white bg-gradient-to-r from-purple-600 to-pink-500 px-1.5 py-0.5 rounded-full shadow-lg mt-0.5 inline-block">✨ MYTHIC BOSS</div>`;
            } else if (e.isBoss) {
                bossLabel = `<div class="${bossLabelSizeClass} font-black text-yellow-200 bg-red-700 px-1.5 py-0.5 rounded-full shadow-lg mt-0.5 inline-block">👑 Boss</div>`;
            }
            card.innerHTML = `<div class="relative w-full text-center overflow-hidden"><div class="absolute -top-1 -right-2 text-sm flex gap-1 z-10">${eStatus}</div><div class="${avatarSizeClass} enemy-avatar mb-1 mt-1 ${animClass} leading-none" style="max-height:5rem;">${e.avatar}</div></div>${bossLabel}<div class="${nameSizeClass} font-bold leading-tight break-words w-full text-center ${rarityColor}">Lv.${e.lvl} ${e.name}</div><div class="health-bar-container !h-1.5 !mt-1"><div class="health-bar" style="width: ${(Math.max(0, e.currentHp) / e.maxHp) * 100}%"></div></div><div class="text-[9px] text-gray-400 mt-0.5 text-center leading-tight">HP: ${Math.max(0,e.currentHp)}/${e.maxHp} | DMG: ${e.baseDmg}</div>${isDead ? '<div class="enemy-death-overlay">💀</div>' : ''}`;
            eContainer.appendChild(card);
        });
        // Add empty placeholder slots for unused grid positions
        const numSlots = Math.min(enemies.length, 4);
        for (let s = numSlots; s < 4; s++) {
            const placeholder = document.createElement('div');
            placeholder.style.gridColumn = slotPositions[s].col;
            placeholder.style.gridRow = slotPositions[s].row;
            placeholder.className = 'border-2 border-gray-700 rounded-lg bg-gray-900/30';
            eContainer.appendChild(placeholder);
        }
        // Show Next Battle button when all enemies are dead and combat still active
        const nextBattleBtn = document.getElementById('next-battle-container');
        if(nextBattleBtn) nextBattleBtn.style.display = (combatActive && enemies.length > 0 && enemies.every(e => e.currentHp <= 0)) ? 'flex' : 'none';
    }

    const turnInd = document.getElementById('turn-indicator');
    if (turnInd) {
        if (isPlayerTurn) { turnInd.innerText = isAutoBattle ? "[AUTO] YOUR TURN" : "YOUR TURN"; turnInd.className = "text-center text-xs mb-1 text-green-400 font-bold uppercase tracking-widest drop-shadow"; } 
        else { turnInd.innerText = "ENEMY TURN..."; turnInd.className = "text-center text-xs mb-1 text-red-400 uppercase tracking-widest animate-pulse drop-shadow"; }
    }
    renderUsableSlots();
}

function renderSkills() {
    const container = document.getElementById('skills-container');
    const descDisplay = document.getElementById('skill-description-display');
    const defaultDesc = 'Tap a skill to see what it does';
    const wohDesc = 'Unleash the power of the heavens upon all enemies. Deals Base Damage + 20% of each enemy\'s max HP and inflicts Bleed, Burn, and Poison. 10-turn global cooldown.';
    container.innerHTML = '';

    let wohSlotIndex = player.equippedSkills.indexOf('woh');
    let wohFound = wohSlotIndex !== -1;
    let wohUnlocked = (globalProgression.skillTreeEnhancements || []).find(e => e.type === 'wayOfHeavens');

    // Create skills grid wrapper
    const grid = document.createElement('div');
    grid.className = 'skills-grid';
    container.appendChild(grid);

    function makeEmptySlot(thin, slotNum) {
        const empty = document.createElement('div');
        const slotClass = slotNum ? `skill skill-${slotNum} ` : '';
        empty.className = thin
            ? `${slotClass}skill-btn-thin w-full py-1 px-2 rounded-lg border border-dashed border-gray-600 bg-gray-800 opacity-50`
            : `${slotClass}skill-btn flex-1 p-1 rounded-lg border border-dashed border-gray-600 bg-gray-800 opacity-50`;
        return empty;
    }

    function makeSkillBtn(slotIndex, showDesc, thin) {
        const slotNum = slotIndex + 1;
        const slotClass = `skill skill-${slotNum}`;
        const slotColor = SLOT_FIXED_COLORS[slotIndex] || 'bg-green-700';
        let skillIdx = player.equippedSkills[slotIndex];
        if (skillIdx === 'woh') {
            return makeEmptySlot(thin, slotNum);
        } else if (skillIdx !== null && skillIdx !== undefined) {
            let skill = player.data.skills[skillIdx];
            let cd = player.skillCooldowns[skillIdx] || 0;
            const btn = document.createElement('button');
            if (thin) {
                btn.className = `${slotClass} skill-slot skill-btn-thin w-full py-1 px-2 rounded-lg font-bold text-white shadow-lg active:scale-95 relative ${slotColor}`;
                const label = document.createElement('span');
                label.className = 'skill-label';
                label.textContent = skill.name;
                btn.appendChild(label);
                if (cd > 0) {
                    const cdSpan = document.createElement('span');
                    cdSpan.className = 'text-[10px] md:text-xs opacity-75 absolute right-2 top-1/2 -translate-y-1/2';
                    cdSpan.textContent = `(CD:${cd})`;
                    btn.appendChild(cdSpan);
                }
            } else if (showDesc) {
                btn.className = `${slotClass} skill-btn flex-1 p-2 rounded-lg font-bold text-white shadow-lg active:scale-95 flex flex-col items-center justify-center ${slotColor}`;
                btn.innerHTML = `<div class="text-xs md:text-sm truncate w-full px-1">${skill.name}</div><div class="text-[9px] md:text-[10px] opacity-60 w-full px-1 mt-0.5 font-normal">${skill.desc || ''}</div><div class="text-[10px] md:text-xs opacity-75 mt-0.5">${cd > 0 ? `(CD:${cd})` : ''}</div>`;
            } else {
                btn.className = `${slotClass} skill-btn flex-1 p-2 rounded-lg font-bold text-white shadow-lg active:scale-95 flex flex-col items-center justify-center ${slotColor}`;
                btn.innerHTML = `<div class="text-xs md:text-sm truncate w-full px-1">${skill.name}</div><div class="text-[10px] md:text-xs opacity-75">${cd > 0 ? `(CD:${cd})` : ''}</div>`;
            }
            btn.disabled = cd > 0 || !isPlayerTurn || isAutoBattle || !combatActive || player.stunned > 0 || (player.silencedSlots && player.silencedSlots[slotIndex] > 0);
            btn.onmouseenter = () => { if (descDisplay && skill.desc) descDisplay.innerText = skill.desc; };
            btn.onmouseleave = () => { if (descDisplay) descDisplay.innerText = defaultDesc; };
            btn.onclick = () => { if (descDisplay && skill.desc) descDisplay.innerText = skill.desc; usePlayerSkill(slotIndex); };
            return btn;
        } else {
            return makeEmptySlot(thin, slotNum);
        }
    }

    // Skills 1–5 placed directly in the grid
    grid.appendChild(makeSkillBtn(0, false, true));
    grid.appendChild(makeSkillBtn(1, true, false));
    grid.appendChild(makeSkillBtn(2, true, false));
    grid.appendChild(makeSkillBtn(3, true, false));
    grid.appendChild(makeSkillBtn(4, true, false));

    // Way of the Heavens (skill 6) — always full-width at bottom if unlocked (equipped or not)
    if (wohFound || wohUnlocked) {
        let cd = player.wayOfHeavensCooldown || 0;
        let wohBtn = document.createElement('button');
        wohBtn.className = `skill skill-6 skill-btn w-full mt-1 p-3 rounded-lg font-bold text-black bg-yellow-400 hover:bg-yellow-300 shadow-lg active:scale-95 flex items-center justify-center gap-2 text-sm`;
        wohBtn.disabled = cd > 0 || !isPlayerTurn || isAutoBattle || !combatActive || player.stunned > 0;
        wohBtn.innerHTML = `☀️ Way of the Heavens ${cd > 0 ? `(CD:${cd})` : ''}`;
        wohBtn.onmouseenter = () => { if (descDisplay) descDisplay.innerText = wohDesc; };
        wohBtn.onmouseleave = () => { if (descDisplay) descDisplay.innerText = defaultDesc; };
        wohBtn.onclick = () => {
            if (descDisplay) descDisplay.innerText = wohDesc;
            if (wohFound) usePlayerSkill(wohSlotIndex);
            else useWayOfHeavens();
        };
        grid.appendChild(wohBtn);
    }
}

function addLog(msg, colorClass = "text-gray-300") {
    combatLog.push(`<span class="${colorClass}">${msg}</span>`); if (combatLog.length > 20) combatLog.shift();
    const logDiv = document.getElementById('combat-log'); logDiv.innerHTML = combatLog.map(m => `<div>${m}</div>`).join(''); logDiv.scrollTop = logDiv.scrollHeight;
}

function triggerAnim(elementId, animClass) {
    const el = document.getElementById(elementId); if(!el) return;
    el.classList.remove(animClass); void el.offsetWidth; el.classList.add(animClass);
    setTimeout(() => el.classList.remove(animClass), 600);
}

function processAutoTurn() {
    if(!isPlayerTurn || !combatActive) return;
    if(enemies.every(e => e.currentHp <= 0)) { if(combatActive) endBattle(true); return; }
    let hpPct = player.currentHp / player.maxHp; let inv = globalProgression.inventory;
    
    let healMult = player.activeBuffs.some(b => b.type === 'poison') ? 0.5 : 1.0;

    if(!player.usedConsumableThisTurn) {
        if(hpPct < 0.4) { if(inv.pot_i3 > 0) return useConsumable('pot_i3'); if(inv.pot_i2 > 0) return useConsumable('pot_i2'); if(inv.pot_i1 > 0) return useConsumable('pot_i1'); }
        if(hpPct < 0.4 && player.regenBuffs.length === 0) { if(inv.pot_r3 > 0) return useConsumable('pot_r3'); if(inv.pot_r2 > 0) return useConsumable('pot_r2'); if(inv.pot_r1 > 0) return useConsumable('pot_r1'); }
        if(!player.activeBuffs.some(b => b.type === 'dmg')) { if(inv.food_d3 > 0) return useConsumable('food_d3'); if(inv.food_d2 > 0) return useConsumable('food_d2'); if(inv.food_d1 > 0) return useConsumable('food_d1'); }
        if(!player.activeBuffs.some(b => b.type === 'def')) { if(inv.food_df3 > 0) return useConsumable('food_df3'); if(inv.food_df2 > 0) return useConsumable('food_df2'); if(inv.food_df1 > 0) return useConsumable('food_df1'); }
    }

    // Auto-battle target priority
    const RARITY_EASY = ['common', 'rare', 'epic', 'legendary', 'mythic', 'boss'];
    const RARITY_HARD = ['mythic', 'boss', 'legendary', 'epic', 'rare', 'common'];
    let priorityOrder = (globalProgression.settings.autoBattleTargetPriority === 'hard') ? RARITY_HARD : RARITY_EASY;
    let bestTarget = -1;
    let bestPriority = Infinity;
    enemies.forEach((e, idx) => {
        if(e.currentHp <= 0) return;
        let r = e.isBoss ? 'boss' : (e.rarity || 'common');
        let p = priorityOrder.indexOf(r);
        if(p === -1) p = priorityOrder.length;
        if(p < bestPriority) {
            bestPriority = p;
            bestTarget = idx;
        }
    });
    if(bestTarget !== -1) activeTargetIndex = bestTarget;
    else activeTargetIndex = enemies.findIndex(e => e.currentHp > 0);

    // Auto-use usable items (after consumables, before skills)
    let autoUsables = globalProgression.settings.autoBattleUsables || [];
    if(autoUsables.length > 0) {
        for(let uKey of autoUsables) {
            let uAmt = (globalProgression.usableItems || {})[uKey] || 0;
            let uCd = (player.usableCooldowns || {})[uKey] || 0;
            if(uAmt > 0 && uCd <= 0) {
                useUsableItem(uKey);
                return;
            }
        }
    }

    let available = [];
    for(let i=0; i<5; i++) {
        let sIdx = player.equippedSkills[i];
        // Skip silenced slots
        if(player.silencedSlots && player.silencedSlots[i] > 0) continue;
        if(sIdx === 'woh') {
            // Use a high mult so auto-battle always prioritises WoH when off cooldown
            if(!((player.wayOfHeavensCooldown || 0) > 0)) { available.push({ i: i, skill: { type: 'attack', mult: 999 }, slotPriority: 1 }); }
        } else if(sIdx !== null && sIdx !== undefined && !(player.skillCooldowns[sIdx] > 0)) {
            // Slot 0 is the basic hit - give it lower priority (slotPriority 0 = low, 1 = normal)
            available.push({ i: i, skill: player.data.skills[sIdx], slotPriority: i === 0 ? 0 : 1 });
        }
    }
    // Check standalone Way of the Heavens (6th dedicated slot — unlocked but not equipped in slots 0-4)
    let wohEnh = (globalProgression.skillTreeEnhancements || []).find(e => e.type === 'wayOfHeavens');
    let wohInSlot = player.equippedSkills.includes('woh');
    if (wohEnh && !wohInSlot && !((player.wayOfHeavensCooldown || 0) > 0)) {
        available.push({ i: 'woh6', skill: { type: 'attack', mult: 999 }, isStandaloneWoh: true, slotPriority: 1 });
    }
    if(available.length === 0) {
        isPlayerTurn = false;
        setTimeout(() => executeEnemyTurns(0), 500);
        return; 
    }
    
    // Prefer non-slot-0 skills; only fall back to slot 0 (basic hit) if nothing else available
    let nonBasicAvailable = available.filter(x => x.slotPriority > 0);
    let workingSet = nonBasicAvailable.length > 0 ? nonBasicAvailable : available;
    
    let chosen = workingSet[0]; 
    let healSkill = workingSet.find(x => x.skill.type === 'heal');
    let buffSkill = workingSet.find(x => x.skill.type === 'buff');
    
    if(healSkill && hpPct < 0.4) chosen = healSkill;
    else if(buffSkill && Math.random() < 0.3) chosen = buffSkill;
    else { let attacks = workingSet.filter(x => x.skill.type === 'attack').sort((a,b) => (b.skill.mult * (b.skill.hits || 1)) - (a.skill.mult * (a.skill.hits || 1))); if(attacks.length > 0) chosen = attacks[0]; }
    if (!chosen) { isPlayerTurn = false; setTimeout(() => executeEnemyTurns(0), 500); return; }
    if (chosen.isStandaloneWoh) { useWayOfHeavens(); } else { usePlayerSkill(chosen.i); }
}

function processRegenAndBuffs() {
    let healMult = player.activeBuffs.some(b => b.type === 'poison') ? 0.5 : 1.0;
    let a = globalProgression.attributes;
    let healingBuffMult = 1.0 + ((a.happiness || 0) * 0.0025) + getEquipBonusStat('bonusHealing');
    if(player.activeBuffs) player.activeBuffs.filter(b => b.type === 'healingBuff').forEach(b => healingBuffMult += b.val);
    // HP Regen: revival attr (0.2% per point) + gear bonusHpRegen
    let hpRegenAmt = Math.floor(player.maxHp * ((a.revival || 0) * 0.002 + getEquipBonusStat('bonusHpRegen')));
    let treeRegen = Math.floor(((player.treeBonusRegen || 0) + hpRegenAmt) * healMult * healingBuffMult);
    
    if (treeRegen > 0 && player.currentHp < player.maxHp) {
        player.currentHp = Math.min(player.maxHp, player.currentHp + treeRegen);
        showFloatText('player-avatar-container', `+${treeRegen}`, 'text-green-400');
        triggerAnim('combat-player-avatar', 'anim-heal');
    }

    if(player.regenBuffs.length > 0) {
        let totalHeal = 0; player.regenBuffs.forEach(b => { totalHeal += Math.floor(b.amount * healMult * healingBuffMult); b.turns--; });
        player.regenBuffs = player.regenBuffs.filter(b => b.turns > 0);
        if(totalHeal > 0) { player.currentHp = Math.min(player.maxHp, player.currentHp + totalHeal); addLog(`Regen restored ${totalHeal} HP!`, 'text-green-400'); triggerAnim('combat-player-avatar', 'anim-heal'); showFloatText('player-avatar-container', `+${totalHeal}`, 'text-green-400'); playSound('heal'); }
    }
    
    if(player.activeBuffs && player.activeBuffs.length > 0) { 
        let burnDmg = 0;
        // Medicine reflect: check before processing burn/poison/bleed
        let hasMedicineReflect = player.activeBuffs.some(b => b.type === 'medicine_reflect');
        
        player.activeBuffs.forEach(b => {
            if(b.type === 'burn') burnDmg += Math.floor(player.maxHp * 0.06); // 6% max HP per burn (max 1 stack)
            b.turns--; 
        });
        
        if(burnDmg > 0) {
            if(hasMedicineReflect) {
                // Reflect burn to target enemy
                let target = enemies.find(e => e.currentHp > 0);
                if(target) { target.currentHp = Math.max(0, target.currentHp - burnDmg); addLog(`💊 Medicine reflected ${burnDmg} burn damage to ${target.name}!`, 'text-green-400'); }
            } else {
                player.currentHp -= burnDmg;
                showFloatText('player-avatar-container', `-${burnDmg}`, 'text-red-500');
                addLog(`Burn damage!`, 'text-red-500');
                playSound('hit');
            }
        }

        // Poison tick damage (2% per stack, max 2 stacks, reduces healing 50%)
        let poisonBuffs = player.activeBuffs.filter(b => b.type === 'poison');
        let poisonStacks = Math.min(poisonBuffs.length, 2);
        if(poisonBuffs.length > 2) {
            let keptPoison = poisonBuffs.slice(0, 2);
            player.activeBuffs = player.activeBuffs.filter(b => b.type !== 'poison').concat(keptPoison);
        }
        let poisonDmg = poisonStacks * Math.floor(player.maxHp * 0.02);
        if(poisonDmg > 0) {
            if(hasMedicineReflect) {
                let target = enemies.find(e => e.currentHp > 0);
                if(target) { target.currentHp = Math.max(0, target.currentHp - poisonDmg); addLog(`💊 Medicine reflected ${poisonDmg} poison damage to ${target.name}!`, 'text-green-400'); }
            } else {
                player.currentHp -= poisonDmg;
                showFloatText('player-avatar-container', '-' + poisonDmg, 'text-green-500');
                addLog('Poison damage! (' + poisonStacks + ' stacks)', 'text-green-500');
                playSound('hit');
            }
        }
        
        player.activeBuffs = player.activeBuffs.filter(b => b.turns > 0); 
    }

    // Bleed on player: check medicine_reflect
    if(player.bleedTurns > 0) {
        let hasMedicineReflect2 = player.activeBuffs.some(b => b.type === 'medicine_reflect');
        if(hasMedicineReflect2) {
            let bleedDmg = Math.max(1, Math.floor(player.maxHp * 0.02 * player.bleedStacks));
            let target = enemies.find(e => e.currentHp > 0);
            if(target) { target.currentHp = Math.max(0, target.currentHp - bleedDmg); addLog(`💊 Medicine reflected ${bleedDmg} bleed to ${target.name}!`, 'text-green-400'); }
        }
    }

    // Decrement enhancement cooldowns
    if((player.rageActive || 0) > 0) player.rageActive--;
    if((player.wayOfHeavensCooldown || 0) > 0) player.wayOfHeavensCooldown--;
}

function usePlayerSkill(slotIndex) {
    if (!isPlayerTurn || !combatActive || player.stunned > 0) return;
    // Check if this slot is silenced
    if(player.silencedSlots && player.silencedSlots[slotIndex] > 0) {
        addLog(`Skill slot ${slotIndex + 1} is Silenced!`, 'text-purple-400');
        return;
    }
    let skillIdx = player.equippedSkills[slotIndex];
    if(skillIdx === null || skillIdx === undefined) return;
    // Handle Way of the Heavens equipped in a slot
    if(skillIdx === 'woh') { useWayOfHeavens(); return; }
    let skill = player.data.skills[skillIdx]; 
    if (player.skillCooldowns[skillIdx] > 0) return;

    isPlayerTurn = false; addLog(`Used <b>${skill.name}</b>!`, "text-white");

    let _pendingDamageNumbers = [];
    try {
    // SET COOLDOWN IMMEDIATELY so no branch can skip it
    let cdReduc = Math.floor(getEquipBonusStat('bonusCdReduc'));
    (globalProgression.skillTreeEnhancements || []).forEach(enh => {
        if(enh.type === 'skillCDReduc') cdReduc += ENHANCEMENT_DEFS.skillCDReduc.vals[enh.rarity] || 0;
    });
    player.skillCooldowns[skillIdx] = Math.max(0, skill.cd + 1 - cdReduc);

    let baseDmg = getBaseDamage();
    let buffDmgMult = 1.0; 
    if (player.activeBuffs) player.activeBuffs.filter(b => b.type === 'dmg').forEach(b => buffDmgMult *= b.val);
    let a = globalProgression.attributes;
    let skillDmgMult = 1 + getEquipBonusStat('bonusSkillDmg');
    
    let scaledPower = Math.max(1, Math.floor(baseDmg * skill.mult * buffDmgMult * skillDmgMult));
    let hits = skill.hits || 1;

    // Apply Damage Boost enhancements
    let dmgBoostMult = 1;
    (globalProgression.skillTreeEnhancements || []).forEach(enh => {
        if(enh.type === 'damageBoost') dmgBoostMult += ENHANCEMENT_DEFS.damageBoost.vals[enh.rarity];
    });

    // Rage enhancement
    let rageEnh = globalProgression.skillTreeEnhancements ? globalProgression.skillTreeEnhancements.find(e => e.type === 'rage') : null;
    if(rageEnh && !player.rageUsed && player.currentHp / player.maxHp < 0.30) {
        dmgBoostMult += ENHANCEMENT_DEFS.rage.vals[rageEnh.rarity];
        player.rageUsed = true;
        player.rageActive = 2;
        addLog(`Rage activates! +${(ENHANCEMENT_DEFS.rage.vals[rageEnh.rarity]*100).toFixed(0)}% damage!`, 'text-red-400');
    }
    if((player.rageActive || 0) > 0 && rageEnh) {
        dmgBoostMult += ENHANCEMENT_DEFS.rage.vals[rageEnh.rarity];
    }
    scaledPower = Math.max(1, Math.floor(scaledPower * dmgBoostMult));

    // Infection buff: +5% dmg per effect stack (bleed, poison, burn) on active target
    let infectionBuff = player.activeBuffs ? player.activeBuffs.find(b => b.type === 'infection') : null;
    if(infectionBuff) {
        let target = enemies[activeTargetIndex];
        if(target && target.currentHp > 0) {
            let effectStacks = (target.bleedStacks || 0) + (target.poisonStacks || 0) + (target.burnStacks || 0);
            if(effectStacks > 0) {
                let infectionMult = 1 + effectStacks * 0.05;
                scaledPower = Math.max(1, Math.floor(scaledPower * infectionMult));
            }
        }
    }

    if (skill.type === 'attack') {
        
        let totalDmg = 0;
        for(let i=0; i<hits; i++) {
            let targets = [];
            if (skill.target === 'all') {
                targets = enemies.map((e,idx) => ({e,idx})).filter(x => x.e.currentHp > 0);
            } else if (skill.target === 'random') {
                let alive = enemies.map((e,idx) => ({e,idx})).filter(x => x.e.currentHp > 0);
                if(alive.length > 0) targets.push(alive[Math.floor(Math.random()*alive.length)]);
            } else {
                if(enemies[activeTargetIndex] && enemies[activeTargetIndex].currentHp > 0) {
                    targets.push({e: enemies[activeTargetIndex], idx: activeTargetIndex});
                }
            }

            if(targets.length === 0) break;

            playSound('hit'); triggerAnim('combat-player-avatar', 'anim-avatar-attack'); 

            targets.forEach(tObj => {
                let target = tObj.e;
                let tIdx = tObj.idx;

                setTimeout(() => triggerAnim(`enemy-card-${tIdx}`, 'anim-shake'), 150 * (i+1));
                
                // Hit chance: 80% base + reflexes 0.1% per point + gear bonusHit
                let hitChance = 0.80 + ((a.reflexes || 0) * 0.001) + getEquipBonusStat('bonusHit');
                if(target.dodgeTurns > 0 || Math.random() > hitChance) {
                    addLog(`Missed ${target.name}!`, "text-gray-500");
                    showFloatText(`enemy-card-${tIdx}`, `MISS`, 'text-gray-400');
                    if(target.dodgeTurns > 0) target.dodgeTurns--;
                    return; 
                }
                
                // Armor Pierce: reflexes 0.3% per point + bonusArmorPierce from accessories
                let armorPierce = (a.reflexes || 0) * 0.003 + getEquipBonusStat('bonusArmorPierce');
                let defDownDebuff = target.defReduction || 0;
                let defMult = 1 + Math.min(0.95, armorPierce + defDownDebuff);
                let hitDmg = Math.floor(scaledPower * defMult * (target.dmgTakenMult || 1));
                if(!Number.isFinite(hitDmg) || hitDmg < 0) hitDmg = 0;
                
                // vs_bleeding bonus damage
                if(target.bleedStacks > 0) {
                    let vsBleedingBuff = player.activeBuffs ? player.activeBuffs.find(b => b.type === 'vs_bleeding') : null;
                    if(vsBleedingBuff) hitDmg = Math.floor(hitDmg * vsBleedingBuff.val);
                }

                if(skill.special === 'hpPctDmg') {
                    hitDmg = Math.max(1, Math.floor(target.maxHp * (skill.hpPctDmg || 0.25)));
                }

                // Self HP% bonus damage (Weapon Throw, Knockout)
                if(skill.selfHpPctBonus) {
                    hitDmg += Math.floor(player.maxHp * skill.selfHpPctBonus);
                }

                if (target.shield > 0) { hitDmg = Math.floor(hitDmg * (1 - target.shield)); target.shield = 0; }

                // Apply enemy flat defense (subtract from damage)
                let enemyDef = target.def || 0;
                if(enemyDef > 0) hitDmg = Math.max(1, hitDmg - enemyDef);
                
                // Crit chance: force 0.5% per point + gear bonusCritRate
                let critChance = Math.min(0.75, ((a.force || 0) * 0.005) + getEquipBonusStat('bonusCritRate'));
                let isCrit = Math.random() < critChance;
                if(isCrit) {
                    // Crit damage: fury 0.25% per point + gear bonusCritDmg
                    let critMult = (100 + ((a.fury || 0) * 0.25) + (getEquipBonusStat('bonusCritDmg') * 100)) / 100;
                    hitDmg = Math.floor(hitDmg * critMult);
                    addLog(`CRITICAL HIT!`, "text-yellow-400 font-bold");
                    playSound('crit');
                }
                
                target.currentHp -= Math.max(1, hitDmg); 
                totalDmg += hitDmg;
                _pendingDamageNumbers.push({ id: `enemy-card-${tIdx}`, dmg: hitDmg, crit: isCrit });

                // Vampire: life steal from attribute (0.25% per point) + gear bonusVamp
                let vampPct = ((a.vampire || 0) * 0.0025) + getEquipBonusStat('bonusVamp');
                if(vampPct > 0 && hitDmg > 0) {
                    let healingBuffMult = 1.0 + ((a.happiness || 0) * 0.0025) + getEquipBonusStat('bonusHealing');
                    let vampHeal = Math.max(1, Math.floor(hitDmg * vampPct * healingBuffMult));
                    player.currentHp = Math.min(player.maxHp, player.currentHp + vampHeal);
                    showFloatText('player-avatar-container', `+${vampHeal} 🧛`, 'text-violet-400');
                }

                // Apply enemy reflect (from Reflect skill)
                if(target.enemyReflect > 0 && target.currentHp > 0) {
                    let reflectedDmg = Math.max(1, Math.floor(hitDmg * target.enemyReflect));
                    player.currentHp = Math.max(0, player.currentHp - reflectedDmg);
                    showFloatText('player-avatar-container', `-${reflectedDmg} 🔄`, 'text-cyan-400');
                    addLog(`${target.name}'s Reflect dealt ${reflectedDmg} damage back!`, 'text-cyan-400');
                }

                // Eruption buff: each hit inflicts 1 bleed stack
                let eruptionBuff = player.activeBuffs ? player.activeBuffs.find(b => b.type === 'eruption') : null;
                if(eruptionBuff) {
                    target.bleedStacks = Math.min(5, (target.bleedStacks || 0) + 1);
                    target.bleedTurns = Math.max(target.bleedTurns || 0, 5);
                    showFloatText('enemy-card-' + tIdx, `🌋🩸`, 'text-red-400');
                }

                if(skill.effect) {
                    if(skill.effect.bleed) {
                        let bleedChance = skill.effect.chance !== undefined ? skill.effect.chance : 1.0;
                        if(Math.random() < bleedChance) {
                            target.bleedStacks = (target.bleedStacks || 0) + 1; target.bleedTurns = skill.effect.turns;
                        }
                    }
                    if(skill.effect.defDown) {
                        let maxDefDown = 5 * (skill.effect.defDown || 0);
                        target.defReduction = Math.min(maxDefDown, (target.defReduction || 0) + skill.effect.defDown);
                        // Refresh turns if defDownTurns provided
                        if(skill.effect.defDownTurns) target.defReductionTurns = skill.effect.defDownTurns;
                    }
                    if(skill.effect.healBlock) { target.healBlock = skill.effect.healBlock; }
                    if(skill.effect.stunChance && Math.random() < skill.effect.stunChance) {
                        target.stunned = (target.stunned || 0) + (skill.effect.stunTurns || 1);
                        showFloatText(`enemy-card-${tIdx}`, `STUNNED`, 'text-yellow-400');
                    }
                    if(skill.effect.poison) {
                        let currentPoison = target.poisonTurns || 0;
                        target.poisonTurns = Math.max(currentPoison, skill.effect.poisonTurns || 2);
                        target.healBlock = Math.max(target.healBlock || 0, skill.effect.poisonTurns || 2);
                        showFloatText('enemy-card-' + tIdx, 'POISON', 'text-green-400');
                    }
                    if(skill.effect.bleedStacks) {
                        target.bleedStacks = Math.min(5, (target.bleedStacks || 0) + skill.effect.bleedStacks);
                        target.bleedTurns = Math.max(target.bleedTurns || 0, skill.effect.bleedTurns || 5);
                        showFloatText('enemy-card-' + tIdx, `🩸x${skill.effect.bleedStacks}`, 'text-red-500');
                    }
                    if(skill.effect.burnStacks) {
                        // Burn max 1 stack
                        target.burnStacks = Math.min(1, (target.burnStacks || 0) + skill.effect.burnStacks);
                        target.burnTurns = Math.max(target.burnTurns || 0, skill.effect.burnTurns || 3);
                        showFloatText('enemy-card-' + tIdx, `🔥`, 'text-orange-500');
                    }
                    if(skill.effect.poisonStacks) {
                        // Poison max 2 stacks
                        target.poisonStacks = Math.min(2, (target.poisonStacks || 0) + skill.effect.poisonStacks);
                        target.poisonTurns = Math.max(target.poisonTurns || 0, skill.effect.poisonTurns || 2);
                        // Poison reduces healing (handled in processRegenAndBuffs via target.healBlock)
                        target.healBlock = Math.max(target.healBlock || 0, skill.effect.poisonTurns || 2);
                        showFloatText('enemy-card-' + tIdx, `☠️x${skill.effect.poisonStacks}`, 'text-green-500');
                    }
                    if(skill.effect.missStacks) {
                        // Miss: 40% chance to skip next attack, 1 turn (configurable via skill.effect.missChance)
                        target.skipChance = skill.effect.missChance || 0.40;
                        target.skipTurns = (target.skipTurns || 0) + 1;
                        showFloatText('enemy-card-' + tIdx, `MISS`, 'text-gray-400');
                    }
                }
            });
        }
        if(totalDmg > 0) {
            addLog(`Used <b>${skill.name}</b>! Dealt ${totalDmg} dmg!`, "text-blue-400 font-bold");
            let ps = ensureProgressStats(); if (totalDmg > (ps.highestDmg || 0)) ps.highestDmg = totalDmg;
        }

        // Extra Turn: chance to take another turn after attacking (from accessories bonusExtraTurn)
        let extraTurnChance = getEquipBonusStat('bonusExtraTurn');
        if(extraTurnChance > 0 && Math.random() < extraTurnChance && enemies.some(e => e.currentHp > 0)) {
            addLog(`⚡ Extra Turn triggered!`, 'text-yellow-300 font-bold');
            isPlayerTurn = true; // Keep player turn active
        }

        // Poke special: remove HP% from target and heal self for HP%
        if(skill.special === 'poke') {
            let pokeTarget = enemies[activeTargetIndex];
            if(pokeTarget && pokeTarget.currentHp > 0) {
                let pokeEnemyPct = skill.pokeEnemyHpPct || skill.pokePct || 0.10;
                let pokeSelfPct = skill.pokeSelfHealPct || pokeEnemyPct;
                let pokeDmg = Math.floor(pokeTarget.maxHp * pokeEnemyPct);
                pokeTarget.currentHp = Math.max(0, pokeTarget.currentHp - pokeDmg);
                let healMult = player.activeBuffs.some(b => b.type === 'poison') ? 0.5 : 1.0;
                let healingBuffMult = 1.0 + ((globalProgression.attributes.happiness || 0) * 0.0025) + getEquipBonusStat('bonusHealing');
                if(player.activeBuffs) player.activeBuffs.filter(b => b.type === 'healingBuff').forEach(b => healingBuffMult += b.val);
                let pokeHeal = Math.floor(player.maxHp * pokeSelfPct * healMult * healingBuffMult);
                player.currentHp = Math.min(player.maxHp, player.currentHp + pokeHeal);
                showFloatText('player-avatar-container', `+${pokeHeal}`, 'text-green-400');
                showFloatText(`enemy-card-${activeTargetIndex}`, `-${pokeDmg}`, 'text-fuchsia-400');
                addLog(`Poke! Removed ${pokeDmg} HP from ${pokeTarget.name}, healed ${pokeHeal}!`, 'text-fuchsia-400 font-bold');
            }
        }

    } else if (skill.type === 'heal') {
        let healMult = player.activeBuffs.some(b => b.type === 'poison') ? 0.5 : 1.0;
        let healingBuffMult = 1.0 + ((globalProgression.attributes.happiness || 0) * 0.0025) + getEquipBonusStat('bonusHealing');
        if(player.activeBuffs) player.activeBuffs.filter(b => b.type === 'healingBuff').forEach(b => healingBuffMult += b.val);
        let actualHeal = Math.floor(scaledPower * healMult * healingBuffMult);
        playSound('heal'); triggerAnim('combat-player-avatar', 'anim-heal'); 
        player.currentHp = Math.min(player.maxHp, player.currentHp + actualHeal); addLog(`Used ${skill.name}! Recovered ${actualHeal} HP!`, "text-green-400 font-bold"); showFloatText('player-avatar-container', `+${actualHeal}`, 'text-green-400');
    } else if (skill.type === 'shield') { 
        playSound('shield'); player.shield = skill.power; addLog(`Used ${skill.name}! Guarding!`, "text-blue-300 font-bold"); 
    } else if (skill.type === 'buff') {
        playSound('buff'); triggerAnim('combat-player-avatar', 'anim-heal'); addLog(`Used ${skill.name}!`, "text-white font-bold");
        if(skill.baseDmgHit) {
            // Intentionally deals raw base damage (ignoring defense) as a flat bonus hit
            let target = enemies[activeTargetIndex];
            if(target && target.currentHp > 0) {
                let dmg = getBaseDamage();
                target.currentHp = Math.max(0, target.currentHp - dmg);
                showDamageNumber(`enemy-card-${activeTargetIndex}`, dmg, false);
                addLog(`${skill.name} also dealt ${dmg} damage!`, 'text-yellow-400');
            }
        }
    } else if (skill.type === 'debuff') {
        playSound('buff'); addLog(`Used ${skill.name}!`, "text-purple-400 font-bold");
        let target = enemies[activeTargetIndex];
        if(target && target.currentHp > 0 && skill.effect) {
            if(skill.effect.skipChance && skill.effect.skipTurns) {
                target.skipChance = skill.effect.skipChance;
                target.skipTurns = (target.skipTurns || 0) + skill.effect.skipTurns;
                addLog(`${target.name} has ${Math.floor(skill.effect.skipChance*100)}% to skip turns for ${skill.effect.skipTurns}t!`, 'text-yellow-400');
            }
            if(skill.effect.dmgTaken) {
                target.dmgTakenMult = (target.dmgTakenMult || 1) + skill.effect.dmgTaken;
                target.dmgTakenTurns = (target.dmgTakenTurns || 0) + (skill.effect.dmgTakenTurns || 3);
                addLog(`${target.name} takes ${Math.floor(skill.effect.dmgTaken*100)}% more damage for ${skill.effect.dmgTakenTurns || 3}t!`, 'text-orange-400');
            }
        }
    }

    if(skill.special === 'smokeBomb') {
        let smBaseDmg = getBaseDamage();
        enemies.forEach((e, i) => {
            if(e.currentHp <= 0) return;
            e.currentHp = Math.max(0, e.currentHp - smBaseDmg);
            e.poisonTurns = Math.max(e.poisonTurns || 0, 2);
            e.healBlock = Math.max(e.healBlock || 0, 2);
            showFloatText('enemy-card-' + i, '-' + smBaseDmg, 'text-yellow-300');
        });
        player.dodgeTurns = 3;
        addLog('Smoke Bomb! Dodge 3t, damaged & poisoned all enemies!', 'text-gray-300 font-bold');
    }

    if(skill.self_effect) {
        let healMult = player.activeBuffs.some(b => b.type === 'poison') ? 0.5 : 1.0;
        let healingBuffMult = 1.0 + ((globalProgression.attributes.happiness || 0) * 0.0025) + getEquipBonusStat('bonusHealing');
        if(player.activeBuffs) player.activeBuffs.filter(b => b.type === 'healingBuff').forEach(b => healingBuffMult += b.val);
        if(skill.self_effect.healPct) { let h = Math.floor(player.maxHp * skill.self_effect.healPct * healMult * healingBuffMult); player.currentHp = Math.min(player.maxHp, player.currentHp + h); showFloatText('player-avatar-container', `+${h}`, 'text-green-400'); }
        if(skill.self_effect.fullHeal) { player.currentHp = player.maxHp; showFloatText('player-avatar-container', `FULL HEAL!`, 'text-green-400 font-bold'); playSound('heal'); addLog(`Full HP restored!`, 'text-green-400 font-bold'); }
        if(skill.self_effect.defDown) { player.activeBuffs.push({ type: 'def_down', val: 1 - skill.self_effect.defDown, turns: skill.self_effect.turns }); }
        if(skill.self_effect.regenPct) { player.regenBuffs.push({ amount: Math.floor(player.maxHp * skill.self_effect.regenPct), turns: skill.self_effect.regenTurns || skill.self_effect.turns }); }
        if(skill.self_effect.defUp) { player.activeBuffs.push({ type: 'def', val: 1 + skill.self_effect.defUp, turns: skill.self_effect.defUpTurns || skill.self_effect.turns }); }
        if(skill.self_effect.fireShield) { player.activeBuffs.push({ type: 'fire_shield', turns: skill.self_effect.turns }); }
        if(skill.self_effect.iceShield) { player.activeBuffs.push({ type: 'ice_shield', turns: skill.self_effect.turns }); }
        if(skill.self_effect.dmgUp) { player.activeBuffs.push({ type: 'dmg', val: 1 + skill.self_effect.dmgUp, turns: skill.self_effect.dmgUpTurns || skill.self_effect.turns }); }
        if(skill.self_effect.dmgBuff) { player.activeBuffs.push({ type: 'dmg', val: 1 + skill.self_effect.dmgBuff, turns: skill.self_effect.dmgBuffTurns || skill.self_effect.turns || 3 }); addLog(`+${Math.floor(skill.self_effect.dmgBuff*100)}% Damage buff!`, 'text-orange-400 font-bold'); }
        if(skill.self_effect.healingBuff) { player.activeBuffs.push({ type: 'healingBuff', val: skill.self_effect.healingBuff, turns: skill.self_effect.healingBuffTurns || skill.self_effect.turns || 3 }); addLog(`Healing +${Math.floor(skill.self_effect.healingBuff*100)}% for ${skill.self_effect.healingBuffTurns||skill.self_effect.turns||3}t! 💫`, 'text-pink-400 font-bold'); }
        if(skill.self_effect.reAlive) { player.reAliveArmed = true; addLog(`Re Alive armed! Will revive at 50% HP on death!`, 'text-yellow-400 font-bold'); }
        if(skill.self_effect.blockHit) {
            if(Math.random() < (skill.self_effect.blockChance || 0.50)) {
                player.activeBuffs.push({ type: 'block_hit', turns: skill.self_effect.blockTurns || 3 });
                addLog(`Block stance! May block next hit!`, 'text-blue-300 font-bold');
            }
        }
        if(skill.self_effect.block) {
            // Block ALL incoming damage for N turns (Stomp)
            player.activeBuffs.push({ type: 'block_all', turns: skill.self_effect.block });
            addLog(`Block! All incoming damage ignored for ${skill.self_effect.block}t!`, 'text-blue-300 font-bold');
        }
        if(skill.self_effect.reflect) {
            player.activeBuffs.push({ type: 'skill_reflect', val: skill.self_effect.reflect, turns: skill.self_effect.reflectTurns || 1 });
            addLog('Reflecting ' + Math.floor(skill.self_effect.reflect * 100) + '% damage!', 'text-orange-300 font-bold');
        }
        if(skill.self_effect.doubleDamageTaken) {
            player.activeBuffs.push({ type: 'double_damage_taken', turns: skill.self_effect.turns || 1 });
            addLog('Taking double damage!', 'text-red-400 font-bold');
        }
        if(skill.self_effect.dodgeTurns) {
            player.dodgeTurns = (player.dodgeTurns || 0) + skill.self_effect.dodgeTurns;
        }
        if(skill.self_effect.dodgePct) {
            // Percentage dodge chance buff (Bandaid)
            player.activeBuffs.push({ type: 'dodge_pct', val: skill.self_effect.dodgePct, turns: skill.self_effect.dodgePctTurns || skill.self_effect.turns || 2 });
            addLog(`+${Math.floor(skill.self_effect.dodgePct*100)}% Dodge (${skill.self_effect.dodgePctTurns||skill.self_effect.turns||2}t)!`, 'text-gray-300 font-bold');
        }
        if(skill.self_effect.vsBleeding) {
            // Bonus damage vs bleeding targets (Ruthless Bash)
            player.activeBuffs.push({ type: 'vs_bleeding', val: 1 + skill.self_effect.vsBleeding, turns: skill.self_effect.vsBleedingTurns || skill.self_effect.turns || 5 });
            addLog(`+${Math.floor(skill.self_effect.vsBleeding*100)}% damage vs bleeding enemies (${skill.self_effect.vsBleedingTurns||5}t)!`, 'text-red-300 font-bold');
        }
        if(skill.self_effect.selfDefDown) {
            // Reduce own def (Knockout)
            player.activeBuffs.push({ type: 'def_down', val: 1 - skill.self_effect.selfDefDown, turns: skill.self_effect.selfDefDownTurns || 3 });
            addLog(`Own DEF reduced by ${Math.floor(skill.self_effect.selfDefDown*100)}% for ${skill.self_effect.selfDefDownTurns||3}t!`, 'text-red-400');
        }
        if(skill.self_effect.eruption) {
            // Eruption buff: hits inflict bleed stacks
            player.activeBuffs.push({ type: 'eruption', turns: skill.self_effect.eruptionTurns || skill.self_effect.turns || 4 });
            addLog(`Eruption active! Hits inflict Bleed (${skill.self_effect.eruptionTurns||4}t)!`, 'text-red-400 font-bold');
        }
        if(skill.self_effect.infectionBuff) {
            // Infection buff: +5% dmg per active effect stack on enemy (bleed/poison/burn)
            player.activeBuffs.push({ type: 'infection', turns: skill.self_effect.infectionTurns || 5 });
            addLog(`Infection active! +5% dmg per enemy effect stack (${skill.self_effect.infectionTurns||5}t)!`, 'text-green-400 font-bold');
        }
    }

    } catch(err) {
        console.error('Combat error in usePlayerSkill:', err);
        isPlayerTurn = false;
    }

    updateCombatUI(); renderSkills();
    _pendingDamageNumbers.forEach(n => showDamageNumber(n.id, n.dmg, n.crit));
    
    if (currentMode === 'training') {
        // In training mode: skip enemy turn, reset cooldowns, restore dummy HP
        if(!player.skillCooldowns) player.skillCooldowns = {};
        Object.keys(player.skillCooldowns).forEach(k => player.skillCooldowns[k] = 0);
        enemies.forEach(e => { e.currentHp = e.maxHp; });
        updateCombatUI(); renderSkills();
        setTimeout(() => startPlayerTurn(), 500);
    } else if (isPlayerTurn && enemies.some(e => e.currentHp > 0)) {
        // Extra turn triggered — give player another action immediately
        setTimeout(() => startPlayerTurn(), 600);
    } else {
        let enemyDelay = currentMode === 'quest' ? 200 : 800;
        if (enemies.every(e => e.currentHp <= 0)) setTimeout(() => { if(combatActive) endBattle(true); }, 1000); else setTimeout(() => executeEnemyTurns(0), enemyDelay);
    }
}

function executeEnemyTurns(enemyIdx, extraTurns = 0) {
    if(!combatActive) return; 
    if(player.currentHp <= 0) { endBattle(false); return; }
    if(enemyIdx >= enemies.length) { startPlayerTurn(); return; }

    let e = enemies[enemyIdx]; if(e.currentHp <= 0) { executeEnemyTurns(enemyIdx + 1); return; }

    if(currentMode === 'quest' || currentMode === 'training') {
        if(currentMode === 'training') { e.currentHp = e.maxHp; }
        else { addLog(`${e.name} stares blankly...`, "text-gray-500"); }
        updateCombatUI(); setTimeout(() => executeEnemyTurns(enemyIdx + 1), currentMode === 'training' ? 50 : 200);
        return;
    }

    if(e.stunned > 0 && extraTurns === 0) {
        e.stunned--;
        addLog(`${e.name} is Stunned!`, "text-yellow-400");
        showFloatText(`enemy-card-${enemyIdx}`, `STUNNED`, 'text-yellow-400');
        updateCombatUI();
        setTimeout(() => executeEnemyTurns(enemyIdx + 1), 500);
        return;
    }

    if(extraTurns === 0 && e.bleedTurns > 0) {
        // Bleed: 2% of max HP per stack per turn, reduces def by 2% per stack
        let bDmg = Math.max(1, Math.floor(e.maxHp * 0.02 * e.bleedStacks)); e.currentHp -= bDmg; e.bleedTurns--; showFloatText(`enemy-card-${enemyIdx}`, `-${bDmg}`, 'text-red-600');
        if(e.currentHp <= 0) { updateCombatUI(); setTimeout(() => executeEnemyTurns(enemyIdx + 1), 400); return; }
    }
    if(extraTurns === 0 && e.burnTurns > 0) {
        // Burn: 6% max HP per turn, max 1 stack
        let burnStacks = Math.min(1, e.burnStacks || 1);
        let burnDmg = Math.max(1, Math.floor(e.maxHp * 0.06 * burnStacks)); e.currentHp -= burnDmg; e.burnTurns--; if(e.burnTurns <= 0) e.burnStacks = 0; showFloatText(`enemy-card-${enemyIdx}`, `-${burnDmg}🔥`, 'text-orange-500');
        if(e.currentHp <= 0) { updateCombatUI(); setTimeout(() => executeEnemyTurns(enemyIdx + 1), 400); return; }
    }
    if(extraTurns === 0 && e.poisonTurns > 0) {
        // Poison: 2% HP per stack per turn, max 2 stacks
        let poisonStacks = Math.min(2, e.poisonStacks || 1);
        let poisonDmg = Math.max(1, Math.floor(e.maxHp * 0.02 * poisonStacks)); e.currentHp -= poisonDmg; e.poisonTurns--; if(e.poisonTurns <= 0) e.poisonStacks = 0; showFloatText(`enemy-card-${enemyIdx}`, `-${poisonDmg}☠️`, 'text-green-500');
        if(e.currentHp <= 0) { updateCombatUI(); setTimeout(() => executeEnemyTurns(enemyIdx + 1), 400); return; }
    }
    if(extraTurns === 0 && e.dmgTakenTurns > 0) { e.dmgTakenTurns--; if(e.dmgTakenTurns <= 0) e.dmgTakenMult = 1; }
    // Tick down def reduction turns
    if(extraTurns === 0 && (e.defReductionTurns || 0) > 0) { e.defReductionTurns--; if(e.defReductionTurns <= 0) e.defReduction = 0; }

    // Decrement CD
    if(e.cooldowns) {
        Object.keys(e.cooldowns).forEach(k => { if(e.cooldowns[k] > 0) e.cooldowns[k]--; });
    }

    // Skip turn chance (Cleric Mud debuff)
    if(extraTurns === 0 && (e.skipTurns || 0) > 0) {
        e.skipTurns--;
        if(Math.random() < (e.skipChance || 0.50)) {
            addLog(`${e.name} is confused and skips their turn!`, 'text-yellow-400');
            showFloatText(`enemy-card-${enemyIdx}`, `SKIP`, 'text-yellow-400');
            updateCombatUI(); setTimeout(() => executeEnemyTurns(enemyIdx + 1), 400); return;
        }
    }

    let availableSkills = e.skills ? e.skills.filter(s => !e.cooldowns[s]) : ['hit'];
    if(availableSkills.length === 0) availableSkills = ['hit'];
    
    let action = availableSkills[Math.floor(Math.random() * availableSkills.length)];

    if(e.healBlock > 0) { if(action==='recover') action = 'hit'; e.healBlock--; }
    if(e.dodgeTurns > 0) e.dodgeTurns--;

    // Darkness debuff: 15% miss chance for the enemy
    if(e.darknessTurns && e.darknessTurns > 0) {
        e.darknessTurns--;
        if(Math.random() < (e.darknessChance || 0.15)) {
            addLog(`🌑 ${e.name} missed due to Darkness!`, 'text-gray-500');
            showFloatText(`enemy-card-${enemyIdx}`, 'MISS', 'text-gray-400');
            updateCombatUI(); setTimeout(() => executeEnemyTurns(enemyIdx + 1), 500); return;
        }
    }

    try {
    if (action === 'stun') {
        playSound('hit'); triggerAnim(`enemy-card-${enemyIdx}`, 'anim-strike'); setTimeout(() => triggerAnim('combat-player-avatar', 'anim-shake'), 150);
        let turns = 1;
        player.stunned = (player.stunned || 0) + turns;
        addLog(`${e.name} used Bash! Stunned for ${turns}t!`, "text-yellow-400 font-bold");
        let dmg = Math.floor(e.baseDmg * 0.5); 
        dealDamageToPlayer(dmg, e);
        e.cooldowns['stun'] = 5;
    } 
    else if (action === 'bleed') {
        playSound('hit'); triggerAnim(`enemy-card-${enemyIdx}`, 'anim-strike'); setTimeout(() => triggerAnim('combat-player-avatar', 'anim-shake'), 150);
        let stacks = 1;
        player.bleedStacks = (player.bleedStacks || 0) + stacks; player.bleedTurns = 3;
        addLog(`${e.name} inflicted Rend!`, "text-red-500 font-bold");
        let dmg = Math.floor(e.baseDmg * 0.8); 
        dealDamageToPlayer(dmg, e);
        e.cooldowns['bleed'] = 5;
    }
    else if (action === 'guard') { 
        playSound('shield'); e.shield = 0.5; addLog(`${e.name} uses Guard!`, "text-blue-400"); 
        e.cooldowns['guard'] = 5;
    }
    else if (action === 'extra_turn') {
        playSound('hit'); triggerAnim(`enemy-card-${enemyIdx}`, 'anim-strike'); setTimeout(() => triggerAnim('combat-player-avatar', 'anim-shake'), 150);
        let frenzyDmg = Math.floor(e.baseDmg * (0.8 + Math.random() * 0.4));
        let frenzyDmgMult = e.dmgBoostMult || 1;
        frenzyDmg = Math.floor(frenzyDmg * frenzyDmgMult);
        dealDamageToPlayer(frenzyDmg, e);
        addLog(`${e.name} enters a Frenzy! (${frenzyDmg} dmg + extra turn)`, "text-purple-400 font-bold");
        e.cooldowns['extra_turn'] = 5;
        updateCombatUI(); setTimeout(() => executeEnemyTurns(enemyIdx, 2), 500); 
        return;
    }
    else if (action === 'dodge') {
        e.dodgeTurns = 2; addLog(`${e.name} prepares to dodge!`, "text-gray-400");
        e.cooldowns['dodge'] = 5;
    }
    else if (action === 'poison') {
        playSound('hit'); triggerAnim(`enemy-card-${enemyIdx}`, 'anim-strike'); setTimeout(() => triggerAnim('combat-player-avatar', 'anim-shake'), 150);
        player.activeBuffs.push({type: 'poison', turns: 2});
        addLog(`${e.name} used Venom!`, "text-green-500 font-bold");
        let dmg = Math.floor(e.baseDmg * 0.5); 
        dealDamageToPlayer(dmg, e);
        e.cooldowns['poison'] = 5;
    }
    else if (action === 'burn') {
        playSound('hit'); triggerAnim(`enemy-card-${enemyIdx}`, 'anim-strike'); setTimeout(() => triggerAnim('combat-player-avatar', 'anim-shake'), 150);
        if(!player.activeBuffs.some(b => b.type === 'burn')) {
            player.activeBuffs.push({type: 'burn', turns: 2}); 
            addLog(`${e.name} used Ignite!`, "text-orange-500 font-bold");
        } else {
            addLog(`${e.name} failed to Ignite!`, "text-gray-500");
        }
        let dmg = Math.floor(e.baseDmg * 0.5);
        dealDamageToPlayer(dmg, e);
        e.cooldowns['burn'] = 5;
    }
    else if (action === 'recover') {
        playSound('heal'); let healAmt = Math.floor(e.maxHp * 0.1); e.currentHp = Math.min(e.maxHp, e.currentHp + healAmt); addLog(`${e.name} recovers!`, "text-green-400"); showFloatText(`enemy-card-${enemyIdx}`, `+${healAmt}`, 'text-green-400');
        e.cooldowns['recover'] = 5;
    }
    else if (action === 'mend') {
        e.dmgBoostMult = (e.dmgBoostMult || 1) * 1.15;
        e.dmgBoostTurns = (e.dmgBoostTurns || 0) + 3;
        addLog(`${e.name} used Mend! +15% damage for 3 turns!`, "text-orange-400 font-bold");
        showFloatText(`enemy-card-${enemyIdx}`, `+15% DMG`, 'text-orange-400');
        e.cooldowns['mend'] = 5;
    }
    else if (action === 'boink') {
        playSound('hit'); triggerAnim(`enemy-card-${enemyIdx}`, 'anim-strike'); setTimeout(() => triggerAnim('combat-player-avatar', 'anim-shake'), 150);
        let boinkDmg = Math.floor(e.baseDmg * 2 * (0.8 + Math.random() * 0.4));
        let boinkDmgMult = e.dmgBoostMult || 1;
        boinkDmg = Math.floor(boinkDmg * boinkDmgMult);
        dealDamageToPlayer(boinkDmg, e);
        addLog(`${e.name} used Boink! Double damage: ${boinkDmg}!`, "text-yellow-300 font-bold");
        e.cooldowns['boink'] = 5;
    }
    else if (action === 'reflect') {
        let reflectTurns = 2 + Math.floor(Math.random() * 2); // 2 or 3 turns
        e.enemyReflect = 0.15;
        e.enemyReflectTurns = reflectTurns;
        addLog(`${e.name} activates Reflect! 15% damage reflected for ${reflectTurns} turns!`, "text-cyan-400 font-bold");
        showFloatText(`enemy-card-${enemyIdx}`, `REFLECT`, 'text-cyan-400');
        e.cooldowns['reflect'] = 5;
    }
    else if (action === 'silence') {
        // Silence a random skill slot 0-4 (not slot 5/WoH) for 1 turn
        if(!player.silencedSlots) player.silencedSlots = {};
        let slotToSilence = Math.floor(Math.random() * 5); // slots 0-4
        player.silencedSlots[slotToSilence] = 1;
        addLog(`${e.name} used Silenced! Skill slot ${slotToSilence + 1} is silenced for 1 turn!`, "text-purple-400 font-bold");
        showFloatText('player-avatar-container', `SILENCED!`, 'text-purple-400');
        e.cooldowns['silence'] = 5;
    }
    else { // hit
        playSound('hit'); triggerAnim(`enemy-card-${enemyIdx}`, 'anim-strike'); setTimeout(() => triggerAnim('combat-player-avatar', 'anim-shake'), 150);
        let dmg = Math.floor(e.baseDmg * (0.8 + Math.random() * 0.4));
        // Apply mend damage boost
        if(e.dmgBoostMult && e.dmgBoostMult > 1) dmg = Math.floor(dmg * e.dmgBoostMult);
        // Enemy crit chance: 5% base
        let eCritChance = 0.05 + (e.isBoss ? 0.05 : 0) + (e.isMythicBoss ? 0.10 : 0);
        let eCrit = Math.random() < eCritChance;
        if (eCrit) { dmg = Math.floor(dmg * 1.5); playSound('crit'); }
        dealDamageToPlayer(dmg, e, eCrit);
        addLog(`${e.name} hits for ${dmg} dmg${eCrit ? ' (CRIT!)' : ''}!`, eCrit ? "text-red-300 font-black" : "text-red-400 font-bold"); 
        e.cooldowns['hit'] = 0;
    }

    // Tick down mend damage boost
    if(e.dmgBoostTurns > 0) { e.dmgBoostTurns--; if(e.dmgBoostTurns === 0) e.dmgBoostMult = 1; }
    // Tick down enemy reflect
    if(e.enemyReflectTurns > 0) { e.enemyReflectTurns--; if(e.enemyReflectTurns === 0) e.enemyReflect = 0; }
    } catch(err) {
        console.error('Combat error in executeEnemyTurns:', err);
        // Ensure combat loop continues despite error
        updateCombatUI();
        if(extraTurns > 0) {
            setTimeout(() => executeEnemyTurns(enemyIdx, extraTurns - 1), 700);
        } else {
            setTimeout(() => executeEnemyTurns(enemyIdx + 1), 700);
        }
        return;
    }

    updateCombatUI(); 
    if(extraTurns > 0) {
        setTimeout(() => executeEnemyTurns(enemyIdx, extraTurns - 1), 700);
    } else {
        setTimeout(() => executeEnemyTurns(enemyIdx + 1), 700);
    }
}

function dealDamageToPlayer(baseDmg, attackerEnemy, isCritHit = false) {
    baseDmg = Number.isFinite(baseDmg) ? Math.max(0, baseDmg) : 0;
    let a = globalProgression.attributes;

    // Block ALL incoming damage (Stomp block effect)
    let blockAllBuff = player.activeBuffs ? player.activeBuffs.find(b => b.type === 'block_all') : null;
    if(blockAllBuff) {
        // Block all attacks during this turn — turns decremented by processRegenAndBuffs
        addLog(`Blocked all damage!`, 'text-blue-300 font-bold');
        showFloatText('player-avatar-container', `BLOCK`, 'text-blue-300');
        playSound('shield');
        return;
    }

    // Dodge: resistance 0.25% per point + gear bonusDodge
    let dodgeChance = (a.resistance || 0) * 0.0025 + getEquipBonusStat('bonusDodge');
    // Check percentage dodge buff (Bandaid)
    let dodgePctBuff = player.activeBuffs ? player.activeBuffs.find(b => b.type === 'dodge_pct') : null;
    if(dodgePctBuff) dodgeChance += dodgePctBuff.val;

    if(player.dodgeTurns > 0 || Math.random() < dodgeChance) {
        addLog(`You dodged!`, "text-gray-400 font-bold");
        showFloatText('player-avatar-container', `DODGE`, 'text-gray-400');
        if(player.dodgeTurns > 0) player.dodgeTurns--;
        return;
    }

    // Check for block hit
    let blockBuff = player.activeBuffs.find(b => b.type === 'block_hit');
    if(blockBuff) {
        player.activeBuffs = player.activeBuffs.filter(b => b !== blockBuff);
        addLog(`Blocked the hit!`, "text-blue-400 font-bold");
        showFloatText('player-avatar-container', `BLOCKED`, 'text-blue-400');
        playSound('shield');
        return;
    }

    // Mirror Shard: reflect 100% damage, no damage taken
    let mirrorBuff = player.activeBuffs.find(b => b.type === 'mirror_shard');
    if(mirrorBuff) {
        mirrorBuff.turns--;
        if(mirrorBuff.turns <= 0) player.activeBuffs = player.activeBuffs.filter(b => b !== mirrorBuff);
        if(attackerEnemy) {
            attackerEnemy.currentHp = Math.max(0, attackerEnemy.currentHp - baseDmg);
            let eIdx = enemies.indexOf(attackerEnemy);
            addLog(`🪞 Mirror Shard reflected ${baseDmg} damage to ${attackerEnemy.name}!`, 'text-blue-300 font-bold');
            if(eIdx >= 0) showFloatText('enemy-card-' + eIdx, '-' + baseDmg, 'text-blue-300');
            if(attackerEnemy.currentHp <= 0) {
                setTimeout(() => {
                    updateCombatUI();
                    if(combatActive && enemies.every(e => e.currentHp <= 0)) { endBattle(true); }
                }, 200);
            }
        }
        showFloatText('player-avatar-container', 'REFLECTED!', 'text-blue-300');
        return; // No damage to player
    }

    let buffDefMult = 1.0; 
    if (player.activeBuffs) player.activeBuffs.filter(b => b.type === 'def' || b.type === 'def_down').forEach(b => buffDefMult *= b.val);
    
    // Damage reduction: tenacity 0.3% per point + gear bonusDmgReduction
    let tenacityReduction = 1 - ((a.tenacity || 0) * 0.003 + getEquipBonusStat('bonusDmgReduction'));
    let dmg = Math.floor(baseDmg * tenacityReduction);
    
    // Divine Shield enhancement
    let divineEnh = globalProgression.skillTreeEnhancements ? globalProgression.skillTreeEnhancements.find(e => e.type === 'divineShield') : null;
    if(divineEnh && !player.divineShieldUsed) {
        if(Math.random() < ENHANCEMENT_DEFS.divineShield.vals[divineEnh.rarity]) {
            let blocked = Math.floor(dmg * ENHANCEMENT_DEFS.divineShield.vals[divineEnh.rarity]);
            dmg -= blocked;
            addLog(`Divine Shield blocked ${blocked} damage!`, 'text-blue-400');
            player.divineShieldUsed = true;
        }
    }
    
    if (player.shield > 0) { dmg = Math.floor(dmg * (1 - player.shield)); player.shield = 0; }
    
    let pDef = getPlayerDef();
    dmg = Math.max(1, dmg - pDef); 
    dmg = Math.max(1, Math.floor(dmg / buffDefMult));
    
    if(player.activeBuffs.some(b => b.type === 'ice_shield')) {
        dmg = Math.max(1, Math.floor(dmg * 0.5));
    }

    // Ice Block: reduces incoming damage by 50% for 1 turn
    let iceBlockBuff = player.activeBuffs.find(b => b.type === 'ice_block');
    if(iceBlockBuff) {
        dmg = Math.max(1, Math.floor(dmg * 0.5));
        iceBlockBuff.turns--;
        if(iceBlockBuff.turns <= 0) player.activeBuffs = player.activeBuffs.filter(b => b !== iceBlockBuff);
        addLog(`🧊 Ice Block reduced damage by 50%!`, 'text-cyan-400');
    }

    // Double damage taken (Shield Explosion)
    let doubleBuff = player.activeBuffs.find(b => b.type === 'double_damage_taken');
    if(doubleBuff) { dmg = dmg * 2; }
    
    dmg = Number.isFinite(dmg) ? Math.max(1, dmg) : 1;
    player.currentHp -= dmg;

    // Re Alive passive (Cleric)
    if(player.currentHp <= 0 && player.reAliveArmed && !player.reAliveUsed) {
        player.reAliveUsed = true;
        player.reAliveArmed = false;
        player.currentHp = Math.floor(player.maxHp * 0.50);
        player.activeBuffs.push({ type: 'dmg', val: 1.30, turns: 999 });
        showFloatText('player-avatar-container', `RE ALIVE! 🌟`, 'text-yellow-400 font-black');
        addLog(`Re Alive triggered! Revived at 50% HP with +30% damage!`, 'text-yellow-400 font-bold');
        playSound('win');
    }
    // Track most damage survived (only if player survives the hit)
    if (player.currentHp > 0) {
        let ps = ensureProgressStats(); if (dmg > (ps.mostDmgSurvived || 0)) ps.mostDmgSurvived = dmg;
    }

    let reflectBuff = player.activeBuffs.find(b => b.type === 'skill_reflect');
    if(reflectBuff && attackerEnemy) {
        let reflectDmg = Math.floor(dmg * reflectBuff.val);
        attackerEnemy.currentHp = Math.max(0, attackerEnemy.currentHp - reflectDmg);
        addLog('Reflected ' + reflectDmg + ' damage!', 'text-orange-400 font-bold');
        let eIdx = enemies.indexOf(attackerEnemy);
        if(eIdx >= 0) showFloatText('enemy-card-' + eIdx, '-' + reflectDmg, 'text-orange-400');
    }

    // Crit received: larger, more vigorous animation and sound
    if (isCritHit) {
        showDamageNumber('player-avatar-container', dmg, true);
        triggerAnim('combat-player-avatar', 'anim-crit');
        playSound('crit');
        // Extra screen shake for received crit
        let screen = document.getElementById('screen-combat');
        if(screen) { screen.classList.add('screen-shake'); setTimeout(() => screen.classList.remove('screen-shake'), 500); }
    } else {
        showDamageNumber('player-avatar-container', dmg, false);
    }

    // Reflect: from gear bonusDmgReflect (tenacity no longer directly provides reflect)
    let reflectPct = getEquipBonusStat('bonusDmgReflect');
    let fireShieldActive = player.activeBuffs && player.activeBuffs.some(b => b.type === 'fire_shield');
    if(fireShieldActive) reflectPct += 1.0; // Fire Shield reflects 100%

    // Reflect enhancement
    let reflectEnh = globalProgression.skillTreeEnhancements ? globalProgression.skillTreeEnhancements.find(e => e.type === 'reflect') : null;
    if(reflectEnh && !player.reflectUsed && Math.random() < ENHANCEMENT_DEFS.reflect.vals[reflectEnh.rarity]) {
        reflectPct += ENHANCEMENT_DEFS.reflect.vals[reflectEnh.rarity];
        player.reflectUsed = true;
    }

    if(reflectPct > 0 && attackerEnemy) {
        let reflectDmg = Math.max(1, Math.floor(dmg * reflectPct));
        if(attackerEnemy.currentHp > 0) {
            attackerEnemy.currentHp -= reflectDmg;
            showFloatText(`enemy-card-${activeTargetIndex}`, `-${reflectDmg}`, 'text-orange-400');
            if(fireShieldActive) {
                attackerEnemy.burnTurns = 1;
                addLog(`${attackerEnemy.name} was Burned by Fire Shield!`, 'text-orange-500');
            }
        }
    }

    // Counter Attack: agility 0.25% per point + bonusCounterChance from accessories
    if(player.currentHp > 0 && attackerEnemy && attackerEnemy.currentHp > 0) {
        let counterChance = ((a.agility || 0) * 0.0025) + getEquipBonusStat('bonusCounterChance');
        if(counterChance > 0 && Math.random() < counterChance) {
            let counterDmg = Math.max(1, getBaseDamage());
            attackerEnemy.currentHp = Math.max(0, attackerEnemy.currentHp - counterDmg);
            let eIdx = enemies.indexOf(attackerEnemy);
            if(eIdx >= 0) showFloatText('enemy-card-' + eIdx, '-' + counterDmg + ' ↩️', 'text-yellow-300');
            addLog(`Counter Attack! Dealt ${counterDmg} dmg back to ${attackerEnemy.name}!`, 'text-yellow-300 font-bold');
        }
    }
}

function startPlayerTurn() {
    if(!combatActive || player.currentHp <= 0) return;
    // Safety watchdog: if all enemies are dead, end battle
    if(enemies.length > 0 && enemies.every(e => e.currentHp <= 0)) { endBattle(true); return; }
    
    if(player.bleedTurns > 0) {
        let bDmg = Math.max(1, Math.floor(player.maxHp * 0.02 * player.bleedStacks));
        player.currentHp -= bDmg; player.bleedTurns--; 
        showFloatText(`player-avatar-container`, `-${bDmg}`, 'text-red-600'); addLog(`Bleed damage!`, 'text-red-600');
        if(player.currentHp <= 0) { updateCombatUI(); setTimeout(() => endBattle(false), 500); return; }
    }

    processRegenAndBuffs();
    if(!player.skillCooldowns) player.skillCooldowns = {};
    Object.keys(player.skillCooldowns).forEach(k => { if(player.skillCooldowns[k] > 0) player.skillCooldowns[k]--; });
    // Decrement usable item cooldowns each player turn
    if(!player.usableCooldowns) player.usableCooldowns = {};
    Object.keys(player.usableCooldowns).forEach(k => { if(player.usableCooldowns[k] > 0) player.usableCooldowns[k]--; });
    // Decrement silenced slot turns
    if(player.silencedSlots) {
        Object.keys(player.silencedSlots).forEach(k => { if(player.silencedSlots[k] > 0) player.silencedSlots[k]--; });
        player.silencedSlots = Object.fromEntries(Object.entries(player.silencedSlots).filter(([,v]) => v > 0));
    }
    updateCombatUI(); 

    if(player.stunned > 0) {
        player.stunned--; addLog(`You are Stunned!`, 'text-yellow-400 font-bold');
        isPlayerTurn = false; setTimeout(() => executeEnemyTurns(0), 800); return;
    }

    player.usedConsumableThisTurn = false;
    isPlayerTurn = true; renderSkills(); renderUsableSlots();
    let autoDelay = 800; 
    if(isAutoBattle && currentMode !== 'training') setTimeout(processAutoTurn, autoDelay);
}

// --- BATTLE REWARDS ---
function endBattle(playerWon) {
    if(!combatActive || battleEnding) return;  // Already ended or ending — prevent double-fire
    battleEnding = true;
    stopMusic();
    combatActive = false; 
    
    if(!playerWon) {
        isAutoBattle = false; const autoBtn = document.getElementById('btn-auto'); if(autoBtn) autoBtn.classList.remove('auto-on');
    }
    
    const title = document.getElementById('end-title'); const desc = document.getElementById('end-desc');
    const btnNext = document.getElementById('btn-end-next'); const xpCont = document.getElementById('xp-gain-container');
    const lvlUp = document.getElementById('levelup-text'); const spTxt = document.getElementById('skillpoint-text');
    const rwdCont = document.getElementById('rewards-container');
    
    lvlUp.classList.add('hidden'); spTxt.classList.add('hidden'); rwdCont.classList.add('hidden'); rwdCont.innerHTML = '';
    let endGoldCont = document.getElementById('end-gold-container'); if(endGoldCont) endGoldCont.style.display = 'none';

    if (playerWon) {
        playSound('win');
        let killCount = enemies.length;

        // Clear persisted enemies for this mode since all were defeated
        let persistKey = currentMode === 'dungeon' ? `dungeon_${activeDungeonTier}_${activeDungeonRoom}` : currentMode;
        if (savedEnemies[persistKey]) delete savedEnemies[persistKey];

        // Progress tracking: win
        let ps = ensureProgressStats();
        ps.battlesWon++;
        ps.currentWinStreak = (ps.currentWinStreak || 0) + 1;
        if (ps.currentWinStreak > ps.longestWinStreak) ps.longestWinStreak = ps.currentWinStreak;
        ps.totalKills += killCount;
        enemies.forEach(e => { if (e.isBoss) ps.bossesDefeated++; if (e.isMythicBoss) ps.mythicBossFound++; });
        if (currentMode === 'dungeon' && activeDungeonRoom === 5 && activeDungeonTier > (ps.maxDungeonCleared || 0)) ps.maxDungeonCleared = activeDungeonTier;
        if (player.lvl > (ps.levelReached || 0)) ps.levelReached = player.lvl;
        if (globalProgression.gold > (ps.highestGold || 0)) ps.highestGold = globalProgression.gold;
        
        if(globalProgression.questType1 === currentMode || currentMode === 'quest') { if(globalProgression.questProg1 < globalProgression.questGoal1) globalProgression.questProg1 += killCount; }
        if(globalProgression.questType2 === currentMode || currentMode === 'quest') { if(globalProgression.questProg2 < globalProgression.questGoal2) globalProgression.questProg2 += killCount; }
        if(globalProgression.questType3 === currentMode || currentMode === 'quest') { if(globalProgression.questProg3 < globalProgression.questGoal3) globalProgression.questProg3 += killCount; }
        if(globalProgression.questType4 === currentMode || currentMode === 'quest') { if(globalProgression.questProg4 < globalProgression.questGoal4) globalProgression.questProg4 += killCount; }

        if(currentMode === 'quest') {
            consumeWellBattleCharges();
            title.innerText = "WAVE CLEARED!"; title.className = "text-5xl font-bold mb-2 text-yellow-500 drop-shadow-md"; 
            desc.innerText = "More targets approaching...";
            btnNext.innerText = "Next Wave"; btnNext.classList.remove('hidden'); xpCont.classList.add('hidden');
            switchScreen('screen-end');
            saveGame(); 
            if(isAutoBattle) { btnNext.innerText = "Auto-Continuing in 4s..."; setTimeout(() => { if(isAutoBattle) startBattle(false); }, 4000); }
            return; 
        }

        // Track enemy kills for codex milestones
        enemies.forEach(e => {
            let baseName = e.isMythicBoss ? e.name : e.name.replace(/^(Rare |Epic |Legendary |Mythic )/, '');
            if(!globalProgression.enemyKillCounts) globalProgression.enemyKillCounts = {};
            globalProgression.enemyKillCounts[baseName] = (globalProgression.enemyKillCounts[baseName] || 0) + 1;
            let milestoneKey = baseName + '_' + globalProgression.enemyKillCounts[baseName];
            if((globalProgression.enemyKillCounts[baseName] % 100 === 0) && !((globalProgression.claimedCodexMilestones || {})[milestoneKey])) {
                if(!globalProgression.claimedCodexMilestones) globalProgression.claimedCodexMilestones = {};
                globalProgression.claimedCodexMilestones[milestoneKey] = true;
                globalProgression.gold += 1000;
            }
        });

        globalProgression.kills += killCount;
        if(currentMode !== 'invasion') globalProgression.gold += killCount;
        // Track highest gold held
        { let ps = ensureProgressStats(); if (globalProgression.gold > (ps.highestGold || 0)) ps.highestGold = globalProgression.gold; }
        if(currentMode === 'hunting' || currentMode === 'pillage' || currentMode === 'workshop' || currentMode === 'island_defense') {
            globalProgression.storyModeProgress[currentMode]++;
        }

        if(currentMode !== 'invasion') {
            rwdCont.innerHTML += `<div class="bg-gray-800 px-3 py-1 rounded border border-yellow-700 text-yellow-400 font-bold shadow-md">+${killCount} Gold</div>`;
        }
        rwdCont.innerHTML += `<div class="bg-gray-800 px-3 py-1 rounded border border-red-700 text-red-400 font-bold shadow-md">+${killCount} Kills</div>`;

        // --- INVASION MODE ---
        if(currentMode === 'invasion') {
            invasionTotalKills += killCount;
            // Per-kill rewards: scaled gold + 1 Magic Stone per kill
            let invasionGoldGain = Math.floor(killCount * (10 + player.lvl * 2));
            globalProgression.gold += invasionGoldGain;
            globalProgression.inventory.magic_stone = (globalProgression.inventory.magic_stone || 0) + killCount;
            rwdCont.innerHTML += `<div class="bg-gray-800 px-3 py-1 rounded border border-orange-700 text-orange-400 font-bold shadow-md">⚔️ +${invasionGoldGain} Gold</div>`;
            rwdCont.innerHTML += `<div class="bg-gray-800 px-3 py-1 rounded border border-blue-600 text-blue-300 font-bold shadow-md">💎 +${killCount} Magic Stone${killCount > 1 ? 's' : ''}</div>`;

            // Invasion is continuous — check if player has energy to continue
            let hasEnergy = (globalProgression.energy || 0) >= 1;
            title.innerText = "WAVE CLEARED!"; title.className = "text-4xl font-bold mb-2 text-orange-400 drop-shadow-lg";
            desc.innerText = `Invaders defeated: ${invasionTotalKills}. ${hasEnergy ? 'Fight on!' : 'No energy left!'}`;
            if(hasEnergy) {
                btnNext.innerText = `Next Wave (⚡1) — ${invasionTotalKills} kills`;
                btnNext.classList.remove('hidden');
            } else {
                btnNext.classList.add('hidden');
            }
            rwdCont.classList.remove('hidden');
            xpCont.classList.remove('hidden');
        } else {

        if (currentMode === 'graveyard') {
            globalProgression.inventory.soul_pebbles = (globalProgression.inventory.soul_pebbles || 0) + 1;
            rwdCont.innerHTML += `<div class="bg-gray-800 px-3 py-1 rounded border border-purple-700 text-purple-400 font-bold shadow-md">+1 Soul Pebble</div>`;
        }

        enemies.forEach(e => {
            let isBoss = e.isBoss;
            if(isBoss && currentMode !== 'graveyard') {
                if(!globalProgression.killedBosses) globalProgression.killedBosses = {};
                globalProgression.killedBosses[e.name] = { name: e.name, avatar: e.avatar, hpMult: e.templateMults?.hpMult || 3, dmgMult: e.templateMults?.dmgMult || 2 };
            }

            // Mythic boss: guaranteed mythic gear drop
            if(e.isMythicBoss) {
                let mythicEquip = rollEquipment('mythic');
                globalProgression.equipInventory.push(mythicEquip);
                globalProgression.newItems[mythicEquip.type.startsWith('ring') ? 'ring' : mythicEquip.type] = true;
                rwdCont.innerHTML += `<div class="bg-gray-900 px-3 py-2 rounded border-2 rarity-mythic text-pink-300 font-bold shadow-md anim-mythic-gear">✨ MYTHIC DROP: ${mythicEquip.icon} ${mythicEquip.name}!</div>`;
                return; // skip normal drops for mythic boss
            }

            if (currentMode === 'hunting') {
                let herb = Math.random() < 0.5 ? 'herb_red' : 'herb_blue';
                globalProgression.inventory[herb]++;
                rwdCont.innerHTML += `<div class="bg-gray-800 px-3 py-1 rounded border border-green-700 text-green-400 font-bold shadow-md">+1 ${MAT_ICONS[herb]}</div>`;
                // 20% chance to drop a random potion
                if (Math.random() < 0.20) {
                    let potionIds = ['pot_i1', 'pot_i2', 'pot_i3', 'pot_r1', 'pot_r2', 'pot_r3'];
                    let droppedPot = potionIds[Math.floor(Math.random() * potionIds.length)];
                    if ((globalProgression.inventory[droppedPot] || 0) < INVENTORY_STACK_CAP) {
                        globalProgression.inventory[droppedPot] = (globalProgression.inventory[droppedPot] || 0) + 1;
                        let potData = CONSUMABLES[droppedPot];
                        rwdCont.innerHTML += `<div class="bg-gray-800 px-3 py-1 rounded border border-green-500 text-green-300 font-bold shadow-md">+1 ${potData.icon} ${potData.name}</div>`;
                    }
                }
            }
            else if (currentMode === 'island_defense') {
                let fishTypes = [1,2,3,4,5,6];
                let pick = fishTypes[Math.floor(Math.random()*fishTypes.length)];
                globalProgression.inventory[`fish_${pick}`] = (globalProgression.inventory[`fish_${pick}`] || 0) + 1;
                rwdCont.innerHTML += `<div class="bg-gray-800 px-3 py-1 rounded border border-blue-700 text-blue-400 font-bold shadow-md">+1 ${MAT_NAMES['fish_'+pick]}</div>`;
                // 20% chance to drop a random food buff
                if (Math.random() < 0.20) {
                    let foodIds = ['food_d1', 'food_d2', 'food_d3', 'food_df1', 'food_df2', 'food_df3'];
                    let droppedFood = foodIds[Math.floor(Math.random() * foodIds.length)];
                    if ((globalProgression.inventory[droppedFood] || 0) < INVENTORY_STACK_CAP) {
                        globalProgression.inventory[droppedFood] = (globalProgression.inventory[droppedFood] || 0) + 1;
                        let foodData = CONSUMABLES[droppedFood];
                        rwdCont.innerHTML += `<div class="bg-gray-800 px-3 py-1 rounded border border-blue-500 text-blue-300 font-bold shadow-md">+1 ${foodData.icon} ${foodData.name}</div>`;
                    }
                }
            }
            else if (currentMode === 'pillage' || currentMode === 'graveyard') {
                let forceRarity = 'common';
                let shouldDrop = true;
                
                if(isBoss) {
                    let bRoll = Math.random();
                    if(bRoll < 0.40) forceRarity = 'legendary'; else if(bRoll < 0.60) forceRarity = 'epic'; else if (bRoll < 0.70) forceRarity = 'rare';
                } else {
                    if (e.rarity === 'mythic') { forceRarity = 'mythic'; }
                    else if (e.rarity === 'legendary') forceRarity = 'legendary';
                    else if (e.rarity === 'epic') forceRarity = 'epic';
                    else if (e.rarity === 'rare') forceRarity = 'rare';
                    else if (rollWithDropRate(0.50)) {
                        if (currentMode === 'pillage') {
                            let rRoll = Math.random();
                            if (rRoll < 0.01) forceRarity = 'legendary';
                            else if (rRoll < 0.20) forceRarity = 'epic';
                            else if (rRoll < 0.40) forceRarity = 'rare';
                            else forceRarity = 'common';
                        } else {
                            forceRarity = 'common';
                        }
                    }
                    else shouldDrop = false;
                }
                
                if(shouldDrop) {
                    let newEquip = rollEquipment(forceRarity);
                    globalProgression.equipInventory.push(newEquip);
                    globalProgression.newItems[newEquip.type.startsWith('ring') ? 'ring' : newEquip.type] = true; 
                    rwdCont.innerHTML += `<div class="bg-gray-800 px-3 py-1 rounded border-2 rarity-${newEquip.rarity} text-gray-300 font-bold shadow-md">+1 Gear (${newEquip.icon})</div>`;
                }
            }
            else if (currentMode === 'workshop') {
                let eTier = 'ench_common';
                let shouldDrop = true;
                if(isBoss) {
                    let bRoll = Math.random();
                    if(bRoll < 0.40) eTier = 'ench_legendary'; else if(bRoll < 0.60) eTier = 'ench_epic'; else if (bRoll < 0.70) eTier = 'ench_rare';
                } else {
                    if (e.rarity === 'rare') eTier = 'ench_rare';
                    else if (e.rarity === 'epic') eTier = 'ench_epic';
                    else if (e.rarity === 'legendary') eTier = 'ench_legendary';
                    else if (rollWithDropRate(0.50)) eTier = 'ench_common';
                    else shouldDrop = false;
                }
                if(shouldDrop) {
                    globalProgression.inventory[eTier] = (globalProgression.inventory[eTier] || 0) + 1;
                    rwdCont.innerHTML += `<div class="bg-gray-800 px-3 py-1 rounded border border-purple-500 text-purple-300 font-bold shadow-md">+1 ${MAT_NAMES[eTier]}</div>`;
                }
            }
        });

        } // end else (non-invasion per-enemy drops)

        // 5% pet drop chance from any game mode except invasion
        if(currentMode !== 'invasion' && Math.random() < 0.05) {
            let allPetIds = PET_DATA.map(p => p.id);
            if(!globalProgression.petsOwned) globalProgression.petsOwned = [];
            let ownedPets = globalProgression.petsOwned;
            let unownedPets = allPetIds.filter(id => !ownedPets.includes(id));
            if(unownedPets.length > 0) {
                let newPetId = unownedPets[Math.floor(Math.random() * unownedPets.length)];
                globalProgression.petsOwned.push(newPetId);
                let petData = PET_DATA.find(p => p.id === newPetId);
                if(!globalProgression.discoveredPets) globalProgression.discoveredPets = {};
                globalProgression.discoveredPets[petData.name] = true;
                const petNoti = document.getElementById('hub-pet-noti');
                if(petNoti) petNoti.classList.remove('hidden');
                rwdCont.innerHTML += `<div class="bg-gray-900 px-3 py-2 rounded border-2 border-pink-700 text-pink-300 font-bold shadow-md animate-pulse">🐾 NEW PET: ${petData.emoji} ${petData.name}!</div>`;
            }
        }

        if(currentMode !== 'invasion') {
            title.innerText = "VICTORY!"; 
            title.className = "text-5xl font-bold mb-2 text-green-500 drop-shadow-lg"; 
        }
        rwdCont.classList.remove('hidden'); 

        if (currentMode === 'invasion') {
            // Already handled above
        } else if (currentMode === 'dungeon') {
            if (activeDungeonRoom === 5) { 
                desc.innerText = `You conquered Tier ${activeDungeonTier}!`; btnNext.classList.add('hidden'); 
                
                if(activeDungeonTier === globalProgression.dungeonTier) globalProgression.dungeonTier++; 
            } else { desc.innerText = "Room cleared. Proceed deeper."; btnNext.innerText = "Next Room"; btnNext.classList.remove('hidden'); }
        } else if (currentMode === 'graveyard') {
            desc.innerText = "Boss Soul Harvested.";
            btnNext.classList.add('hidden');
        } else {
            if(globalProgression.storyModeProgress[currentMode] >= 10) {
                desc.innerText = "Boss defeated! Progress Reset."; 
                globalProgression.storyModeProgress[currentMode] = 0;
            } else {
                desc.innerText = "Enemies slain. Returning to town is safe."; 
            }
            btnNext.innerText = "Hunt Another"; btnNext.classList.remove('hidden'); 
        }

        xpCont.classList.remove('hidden');
        let totalXp = 0; 
        let nextLvlXp = getXpForNextLevel(player.lvl);
        
        enemies.forEach(e => { 
            if(currentMode === 'invasion') {
                // Level 500 mob XP (capped to prevent JS precision issues)
                let lvl500Xp = Math.min(getXpForNextLevel(500), 9007199254740991);
                totalXp += Math.floor(Math.min(lvl500Xp * 0.05, 9007199254740991)); // 5% of level 500 XP per mob
            } else if (e.isMythicBoss) {
                totalXp += Math.floor(nextLvlXp * 2.00); // Mythic boss gives 200% of a level
            } else if (e.isBoss) {
                totalXp += Math.floor(nextLvlXp * 0.20); // Bosses give 20% of level
            } else {
                if (e.rarity === 'mythic') totalXp += Math.floor(nextLvlXp * 1.00); // Mythic gives 100% of level XP
                else if (e.rarity === 'legendary') totalXp += Math.floor(nextLvlXp * 0.50); // Legendary gives 50%
                else if (e.rarity === 'epic') totalXp += Math.floor(nextLvlXp * 0.25); // Epic gives 25%
                else if (e.rarity === 'rare') totalXp += 200; // Rare gives 200 base XP
                else totalXp += 100; // Normal gives 100 base XP (1 battle = 1/battlesPerLevel of a level)
            }
        });
        
        if((globalProgression.wellXpBattles || 0) > 0) totalXp *= 2;
        // Dungeons give 2x XP
        if(currentMode === 'dungeon') totalXp *= 2;
        // Apply XP Increase enhancements + XP Gain from accessories
        let xpMult = 1 + getEquipBonusStat('bonusXpGain');
        (globalProgression.skillTreeEnhancements || []).forEach(enh => {
            if(enh.type === 'xpIncrease') xpMult += ENHANCEMENT_DEFS.xpIncrease.vals[enh.rarity];
        });
        totalXp = Math.floor(totalXp * xpMult);
        document.getElementById('end-xp-amount').innerText = totalXp; globalProgression.totalExpEarned += totalXp;

        // Gold per kill (not in quest, training, or dungeon mode)
        let endGold = 0;
        if(currentMode !== 'quest' && currentMode !== 'training' && currentMode !== 'dungeon') {
            let goldPerKill = 2 + Math.floor(player.lvl / 5);
            endGold = enemies.filter(e => e.currentHp <= 0).length * goldPerKill;
            if(currentMode === 'invasion') endGold *= 3;
            globalProgression.gold += endGold;
        }
        document.getElementById('end-gold-amount').innerText = endGold;
        document.getElementById('end-gold-container').style.display = endGold > 0 ? 'block' : 'none';

        consumeWellBattleCharges();

        let xpNeeded = getXpForNextLevel(player.lvl); let endXpBar = document.getElementById('end-xp-bar');
        endXpBar.style.transition = 'none'; endXpBar.style.width = `${(player.xp / xpNeeded) * 100}%`; void endXpBar.offsetWidth; player.xp += totalXp;
        
        setTimeout(() => {
            endXpBar.style.transition = 'width 1s ease-out';
            if (player.xp >= xpNeeded && player.lvl < 500) {
                endXpBar.style.width = '100%';
                setTimeout(() => {
                    playSound('win');
                    player.lvl++; player.xp -= xpNeeded; player.statPoints += 5; 
                    player.skillPoints++; spTxt.classList.remove('hidden');
                    player.maxHp = calculateMaxHp(); player.currentHp = player.maxHp;
                    lvlUp.classList.remove('hidden'); endXpBar.style.transition = 'none'; endXpBar.style.width = '0%';
                    setTimeout(() => { endXpBar.style.transition = 'width 0.5s ease-out'; endXpBar.style.width = `${(player.xp / getXpForNextLevel(player.lvl)) * 100}%`; }, 50);
                }, 1000);
            } else { endXpBar.style.width = `${(player.xp / xpNeeded) * 100}%`; }
        }, 100);

        saveGame(); 
        if(isAutoBattle && !btnNext.classList.contains('hidden')) {
            btnNext.innerText = "Auto-Continuing in 4s...";
            setTimeout(() => { if(isAutoBattle) handleEndNext(); }, 4000);
        }

    } else {
        playSound('lose');
        consumeWellBattleCharges();
        let psL = ensureProgressStats();
        psL.battlesLost++;
        psL.totalDeaths++;
        psL.currentWinStreak = 0;
        isAutoBattle = false;
        const autoBtn = document.getElementById('btn-auto'); if(autoBtn) autoBtn.classList.remove('auto-on');
        // Save living enemies for persistence on defeat (exclude special modes)
        if (!NON_PERSIST_MODES.includes(currentMode) && enemies.length > 0 && enemies.some(e => e.currentHp > 0)) {
            let persistKey = currentMode === 'dungeon' ? `dungeon_${activeDungeonTier}_${activeDungeonRoom}` : currentMode;
            savedEnemies[persistKey] = enemies.map(e => structuredClone(e));
        }
        enemies = [];
        saveGame();
        title.innerText = "💀 DEFEAT";
        title.className = "text-5xl font-bold mb-2 text-red-500 drop-shadow-lg";
        desc.innerText = "You were defeated in battle.";
        btnNext.classList.add('hidden');
        xpCont.classList.add('hidden');
        rwdCont.classList.add('hidden');
    }
    switchScreen('screen-end');
    // Auto-return to graveyard menu after a graveyard battle
    if(currentMode === 'graveyard') {
        let gravBtn = document.getElementById('btn-end-hub');
        if(gravBtn) { gravBtn.innerText = '⚰️ Return to Graveyard'; gravBtn.onclick = showGraveyard; }
        setTimeout(() => showGraveyard(), 3500);
    }
}

function handleEndNext() { 
    if (currentMode === 'dungeon') {
        if (activeDungeonRoom < 5) { 
            activeDungeonRoom++; 
            // Restore some HP before next room (full restore before boss room 5)
            if (activeDungeonRoom === 5) {
                player.currentHp = player.maxHp;
                player.regenBuffs = []; player.activeBuffs = [];
                player.stunned = 0; player.bleedStacks = 0; player.bleedTurns = 0; player.dodgeTurns = 0;
            } else {
                player.currentHp = Math.min(player.maxHp, Math.ceil(player.currentHp + player.maxHp * 0.20));
            }
            startBattle(false); 
        }
        else { returnToTown(); }
    } else if (currentMode === 'invasion') {
        // Invasion is continuous — check energy before starting next wave
        if(consumeEnergy(1)) {
            startBattle(true);
        } else {
            showNoEnergyAnimation();
            returnToTown();
        }
    } else {
        startBattle(true);
    }
}

