// --- SKILL SLOT COLOR CONSTANTS ---
const SLOT_FIXED_COLORS = ['bg-gray-700', 'bg-green-700', 'bg-green-700', 'bg-green-700', 'bg-green-700'];

// Keep ENHANCEMENT_DEFS for backward compatibility (WoH still usable in old saves; hpBoost still read in calculateMaxHp)
const ENHANCEMENT_RARITIES = ['normal', 'rare', 'epic', 'legendary'];
const ENHANCEMENT_RARITY_COLORS = { normal: 'text-white', rare: 'text-blue-500', epic: 'text-purple-500', legendary: 'text-orange-500' };
const ENHANCEMENT_RARITY_BORDERS = { normal: 'border-gray-600', rare: 'border-blue-500', epic: 'border-purple-500', legendary: 'border-yellow-500' };

const ENHANCEMENT_DEFS = {
    rage: { name: 'Rage', icon: '😤', type: 'passive', stackable: false,
        desc: (r) => { let vals = { normal: 5, rare: 8, epic: 13, legendary: 17 }; return `+${vals[r]}% damage when HP < 30% (2 turns, once per battle)`; },
        vals: { normal: 0.05, rare: 0.08, epic: 0.13, legendary: 0.17 } },
    divineShield: { name: 'Divine Shield', icon: '🛡️', type: 'passive', stackable: false,
        desc: (r) => { let vals = { normal: 20, rare: 22, epic: 30, legendary: 40 }; return `Block ${vals[r]}% damage with ${vals[r]}% chance (once per battle)`; },
        vals: { normal: 0.20, rare: 0.22, epic: 0.30, legendary: 0.40 } },
    reflect: { name: 'Reflect', icon: '🔄', type: 'passive', stackable: false,
        desc: (r) => { let vals = { normal: 20, rare: 24, epic: 34, legendary: 44 }; return `${vals[r]}% chance to reflect ${vals[r]}% damage (once per battle)`; },
        vals: { normal: 0.20, rare: 0.24, epic: 0.34, legendary: 0.44 } },
    damageBoost: { name: 'Damage Boost', icon: '⚔️', type: 'passive', stackable: true,
        desc: (r) => { let vals = { normal: 3, rare: 5, epic: 10, legendary: 15 }; return `+${vals[r]}% all damage dealt`; },
        vals: { normal: 0.03, rare: 0.05, epic: 0.10, legendary: 0.15 } },
    hpBoost: { name: 'HP Boost', icon: '❤️', type: 'passive', stackable: true,
        desc: (r) => { let vals = { normal: 10, rare: 12, epic: 18, legendary: 27 }; return `+${vals[r]}% max HP`; },
        vals: { normal: 0.10, rare: 0.12, epic: 0.18, legendary: 0.27 } },
    xpIncrease: { name: 'XP Increase', icon: '⭐', type: 'passive', stackable: true,
        desc: (r) => { let vals = { normal: 2, rare: 3, epic: 5, legendary: 9 }; return `+${vals[r]}% XP gain`; },
        vals: { normal: 0.02, rare: 0.03, epic: 0.05, legendary: 0.09 } },
    dropRate: { name: 'Drop Rate', icon: '💎', type: 'passive', stackable: true,
        desc: (r) => { let vals = { normal: 1, rare: 2, epic: 3, legendary: 4 }; return `+${vals[r]}% drop rate`; },
        vals: { normal: 0.01, rare: 0.02, epic: 0.03, legendary: 0.04 } },
    skillCDReduc: { name: 'Skill CD Reduc', icon: '⏱️', type: 'passive', stackable: false,
        desc: (r) => `-1 Turn Cooldown for skills`,
        vals: { legendary: 1 } },
    wayOfHeavens: { name: 'Way of the Heavens', icon: '☀️', type: 'active', stackable: false,
        desc: (r) => `Strike ALL enemies for Base Damage + 20% HP + Bleed, Burn (5% HP/t), Poison. 10-turn global cooldown.`,
        vals: { legendary: 0.30 } }
};

// --- SKILL MODAL UI (keep for equip system) ---
let activeSkillSlot = null;
function openSkillModal(slotIndex) {
    activeSkillSlot = slotIndex;
    const list = document.getElementById('skill-modal-list'); list.innerHTML = '';

    player.unlockedSkills.forEach(skillIdx => {
        let isEquipped = player.equippedSkills.includes(skillIdx);
        let skill = player.data.skills[skillIdx];
        let btn = document.createElement('button');
        btn.className = `p-3 rounded-lg flex justify-between items-center text-left ${isEquipped ? 'bg-gray-800 opacity-50 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600 transition active:scale-95 border border-gray-500'}`;
        btn.disabled = isEquipped;
        btn.innerHTML = `<div><div class="font-bold text-white">${skill.name}</div><div class="text-xs text-gray-300">${skill.desc}</div><div class="text-[10px] text-yellow-400">CD: ${skill.cd} turns</div></div> <div class="text-2xl">${isEquipped?'✅':''}</div>`;
        if(!isEquipped) btn.onclick = () => {
            player.equippedSkills[activeSkillSlot] = skillIdx;
            playSound('click'); saveGame(); closeSkillModal();
        };
        list.appendChild(btn);
    });

    // Add Way of the Heavens as equippable skill for all classes if unlocked (backward compat)
    let hasWoh = (globalProgression.skillTreeEnhancements || []).some(e => e.type === 'wayOfHeavens');
    if(hasWoh) {
        let isEquipped = player.equippedSkills.includes('woh');
        let wohBtn = document.createElement('button');
        wohBtn.className = `p-3 rounded-lg flex justify-between items-center text-left ${isEquipped ? 'bg-gray-800 opacity-50 cursor-not-allowed' : 'bg-yellow-900 hover:bg-yellow-800 transition active:scale-95 border border-yellow-500'}`;
        wohBtn.disabled = isEquipped;
        wohBtn.innerHTML = `<div><div class="font-bold text-yellow-400">☀️ Way of the Heavens</div><div class="text-xs text-gray-300">Strike ALL enemies for Base Damage + 20% HP + Bleed, Burn, Poison.</div><div class="text-[10px] text-yellow-400">CD: 10 turns | Legendary</div></div> <div class="text-2xl">${isEquipped?'✅':''}</div>`;
        if(!isEquipped) wohBtn.onclick = () => {
            player.equippedSkills[activeSkillSlot] = 'woh';
            playSound('click'); saveGame(); closeSkillModal();
        };
        list.appendChild(wohBtn);
    }

    document.getElementById('modal-skills').style.display = 'flex';
}
function unequipSkill() {
    if(activeSkillSlot !== null) { player.equippedSkills[activeSkillSlot] = null; playSound('click'); saveGame(); closeSkillModal(); }
}
function closeSkillModal() { document.getElementById('modal-skills').style.display = 'none'; showCharacter(); }

// --- SKILL UNLOCK POPUP ---
function showSkillUnlockPopup(skillIdx) {
    let skill = player.data.skills[skillIdx];
    if(!skill) return;
    let existing = document.getElementById('skill-unlock-popup');
    if(existing) existing.remove();
    let popup = document.createElement('div');
    popup.id = 'skill-unlock-popup';
    popup.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;';
    popup.innerHTML = `
        <div class="bg-gray-900 border-2 border-yellow-400 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
            <div class="text-5xl mb-3">🎯</div>
            <div class="text-xs text-yellow-400 uppercase tracking-widest mb-1">New Skill Unlocked!</div>
            <div class="text-2xl font-black ${skill.color || 'text-white'} mb-3">${skill.name}</div>
            <div class="text-sm text-gray-300 bg-gray-800 rounded-xl p-3 mb-4">${skill.desc}</div>
            <button onclick="document.getElementById('skill-unlock-popup').remove(); if(typeof showSkillTree === 'function') showSkillTree();" class="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-xl transition active:scale-95">
                Awesome!
            </button>
        </div>
    `;
    document.body.appendChild(popup);
}

// --- SKILL MENU (new 50-node linear system) ---

// Skill unlock nodes (0-indexed): node indices 4, 9, 14, 19, 24, 29 (display nodes 5, 10, 15, 20, 25, 30) unlock skills 3-8
const SKILL_MENU_SKILL_NODES = [4, 9, 14, 19, 24, 29];
const SKILL_MENU_TOTAL = 50;

function getSkillMenuNodeInfo(index) {
    if (index === SKILL_MENU_TOTAL - 1) return { type: 'infinite' };
    let skillPos = SKILL_MENU_SKILL_NODES.indexOf(index);
    if (skillPos !== -1) return { type: 'skill', skillIdx: 3 + skillPos };
    return { type: 'stat' };
}

function showSkillMenu() {
    if (!player || !player.data) return;
    // Ensure properties exist (backward compat)
    if (player.skillMenuProgress === undefined) player.skillMenuProgress = 0;
    if (player.skillMenuBonusDmgPct === undefined) player.skillMenuBonusDmgPct = 0;
    if (player.skillMenuBonusDefPct === undefined) player.skillMenuBonusDefPct = 0;
    if (player.skillMenuBonusHpPct === undefined) player.skillMenuBonusHpPct = 0;
    if (player.skillMenuInfiniteAtk === undefined) player.skillMenuInfiniteAtk = 0;
    if (!player.skillMenuNodeChoices) player.skillMenuNodeChoices = [];

    // Update SP counter
    let spEl = document.getElementById('tree-sp');
    if (spEl) spEl.innerText = player.skillPoints;

    // Update summary bar
    let smsDmg = document.getElementById('sms-dmg');
    let smsDef = document.getElementById('sms-def');
    let smsHp = document.getElementById('sms-hp');
    let smsAtk = document.getElementById('sms-atk');
    if (smsDmg) smsDmg.innerText = player.skillMenuBonusDmgPct;
    if (smsDef) smsDef.innerText = player.skillMenuBonusDefPct;
    if (smsHp) smsHp.innerText = player.skillMenuBonusHpPct;
    if (smsAtk) smsAtk.innerText = player.skillMenuInfiniteAtk;

    let container = document.getElementById('skill-menu-nodes');
    if (!container) return;
    container.innerHTML = '';

    let progress = player.skillMenuProgress || 0;

    for (let i = 0; i < SKILL_MENU_TOTAL; i++) {
        let nodeInfo = getSkillMenuNodeInfo(i);
        let isUnlocked = i < progress;
        let isNext = i === progress;

        let card = document.createElement('div');
        card.id = `skill-menu-node-${i}`;
        card.style.transition = 'all 0.3s';

        if (nodeInfo.type === 'infinite') {
            // Node 50 - special repeatable
            if (isNext || isUnlocked) {
                card.className = 'w-full rounded-xl border-2 px-3 py-3 shadow-md bg-yellow-900 border-yellow-400 text-yellow-200';
                card.innerHTML = `
                    <div class="flex items-center justify-between mb-1">
                        <span class="font-black text-sm">Node 50 — ∞</span>
                        <span class="text-xs font-bold text-yellow-400">Repeatable</span>
                    </div>
                    <div class="text-xs text-yellow-300 mb-2">Each SP spent gives <strong>+1% Attack</strong> permanently.<br>Times claimed: <strong>${player.skillMenuInfiniteAtk}</strong></div>
                    <button onclick="unlockSkillMenuNode('infinite')" class="w-full bg-yellow-600 hover:bg-yellow-500 active:scale-95 font-bold text-sm py-2 rounded-lg transition border border-yellow-300 shadow">
                        ✨ Spend SP (+1% ATK) — ${player.skillPoints} SP available
                    </button>`;
            } else {
                card.className = 'w-full rounded-xl border-2 px-3 py-2 opacity-40 bg-gray-800 border-gray-600 text-gray-500';
                card.innerHTML = `<div class="text-xs text-center font-bold">Node 50 — ∞ +1% ATK (Locked)</div>`;
            }
        } else if (nodeInfo.type === 'skill') {
            let skillName = player.data.skills[nodeInfo.skillIdx] ? player.data.skills[nodeInfo.skillIdx].name : '???';
            let skillDesc = player.data.skills[nodeInfo.skillIdx] ? player.data.skills[nodeInfo.skillIdx].desc : '';
            if (isUnlocked) {
                card.className = 'w-full rounded-xl border-2 px-3 py-2 bg-indigo-900 border-indigo-500 text-indigo-100 shadow';
                card.innerHTML = `
                    <div class="flex items-center gap-2">
                        <span class="text-xl">🎯</span>
                        <div>
                            <div class="font-bold text-sm">Node ${i+1} — Skill Unlocked ✅</div>
                            <div class="text-xs text-indigo-300">${skillName}: ${skillDesc}</div>
                        </div>
                    </div>`;
            } else if (isNext) {
                card.className = 'w-full rounded-xl border-2 px-3 py-3 shadow-lg bg-indigo-800 border-yellow-400 text-white skill-menu-next-glow';
                card.innerHTML = `
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-2xl animate-bounce">🎯</span>
                        <div>
                            <div class="font-black text-sm">Node ${i+1} — Unlock Skill!</div>
                            <div class="text-xs text-indigo-300 font-bold">${skillName}</div>
                            <div class="text-[10px] text-gray-300">${skillDesc}</div>
                        </div>
                    </div>
                    <button onclick="unlockSkillMenuNode('skill')" class="w-full bg-yellow-500 hover:bg-yellow-400 active:scale-95 font-bold text-sm py-2 rounded-lg transition text-gray-900 shadow">
                        🎯 Unlock ${skillName} — 1 SP
                    </button>`;
            } else {
                card.className = 'w-full rounded-xl border-2 px-3 py-2 opacity-40 bg-gray-800 border-gray-600 text-gray-500';
                card.innerHTML = `<div class="text-xs text-center font-bold">Node ${i+1} — 🎯 Skill: ${skillName} (Locked)</div>`;
            }
        } else {
            // Stat choice node
            let choiceIcon = '', choiceLabel = '';
            let stored = player.skillMenuNodeChoices ? player.skillMenuNodeChoices[i] : null;
            if (stored === 'dmg') { choiceIcon = '⚔️'; choiceLabel = '+1% DMG'; }
            else if (stored === 'def') { choiceIcon = '🛡️'; choiceLabel = '+1% DEF'; }
            else if (stored === 'hp') { choiceIcon = '❤️'; choiceLabel = '+1% HP'; }

            if (isUnlocked) {
                card.className = 'w-full rounded-xl border-2 px-3 py-2 bg-gray-700 border-gray-500 text-gray-100 shadow';
                card.innerHTML = `
                    <div class="flex items-center gap-2">
                        <span class="text-xl">${choiceIcon || '✅'}</span>
                        <div>
                            <div class="font-bold text-sm">Node ${i+1} — ${choiceLabel || 'Stat Bonus'} ✅</div>
                        </div>
                    </div>`;
            } else if (isNext) {
                card.className = 'w-full rounded-xl border-2 px-3 py-3 shadow-lg bg-gray-700 border-yellow-400 text-white skill-menu-next-glow';
                let hasPoints = player.skillPoints >= 1;
                let btnClass = hasPoints ? 'hover:bg-opacity-80 active:scale-95 cursor-pointer' : 'opacity-50 cursor-not-allowed';
                card.innerHTML = `
                    <div class="font-bold text-sm mb-2">Node ${i+1} — Choose your bonus (1 SP)</div>
                    <div class="grid grid-cols-3 gap-2">
                        <button onclick="unlockSkillMenuNode('dmg')" ${hasPoints?'':'disabled'} class="bg-orange-700 border border-orange-400 ${btnClass} font-bold text-xs py-2 rounded-lg transition text-orange-100 shadow flex flex-col items-center">
                            <span class="text-lg">⚔️</span>+1% DMG
                        </button>
                        <button onclick="unlockSkillMenuNode('def')" ${hasPoints?'':'disabled'} class="bg-blue-700 border border-blue-400 ${btnClass} font-bold text-xs py-2 rounded-lg transition text-blue-100 shadow flex flex-col items-center">
                            <span class="text-lg">🛡️</span>+1% DEF
                        </button>
                        <button onclick="unlockSkillMenuNode('hp')" ${hasPoints?'':'disabled'} class="bg-green-700 border border-green-400 ${btnClass} font-bold text-xs py-2 rounded-lg transition text-green-100 shadow flex flex-col items-center">
                            <span class="text-lg">❤️</span>+1% HP
                        </button>
                    </div>`;
            } else {
                card.className = 'w-full rounded-xl border-2 px-3 py-2 opacity-40 bg-gray-800 border-gray-600 text-gray-500';
                card.innerHTML = `<div class="text-xs text-center font-bold">Node ${i+1} — Stat Choice (Locked)</div>`;
            }
        }

        container.appendChild(card);
    }

    // Scroll to next node
    setTimeout(() => {
        let nextNode = document.getElementById(`skill-menu-node-${progress < SKILL_MENU_TOTAL ? progress : SKILL_MENU_TOTAL - 1}`);
        if (nextNode) nextNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

function unlockSkillMenuNode(choice) {
    if (!player) return;
    if (player.skillPoints < 1) { return; }

    let progress = player.skillMenuProgress || 0;
    let nodeInfo = getSkillMenuNodeInfo(progress);

    // Handle infinite node (node 50, index 49) - also allow if already at 50
    if (choice === 'infinite' || (progress >= SKILL_MENU_TOTAL - 1 && nodeInfo.type === 'infinite')) {
        if (player.skillPoints < 1) return;
        player.skillPoints--;
        player.skillMenuInfiniteAtk = (player.skillMenuInfiniteAtk || 0) + 1;
        player.maxHp = calculateMaxHp();
        saveGame();
        playSound('buff');
        // Sparkle animation
        _spawnSkillMenuSparkles(`skill-menu-node-${SKILL_MENU_TOTAL - 1}`);
        showSkillMenu();
        return;
    }

    if (progress >= SKILL_MENU_TOTAL) return;

    // Validate choice matches node type
    if (nodeInfo.type === 'skill' && choice !== 'skill') return;
    if (nodeInfo.type === 'stat' && choice === 'skill') return;

    player.skillPoints--;
    if (!player.skillMenuNodeChoices) player.skillMenuNodeChoices = [];

    if (nodeInfo.type === 'skill') {
        // Unlock the skill
        let skillIdx = nodeInfo.skillIdx;
        if (!player.unlockedSkills.includes(skillIdx)) {
            player.unlockedSkills.push(skillIdx);
        }
        player.skillMenuNodeChoices[progress] = 'skill';
        player.skillMenuProgress = progress + 1;
        player.maxHp = calculateMaxHp();
        saveGame();
        playSound('win');
        _spawnSkillMenuSparkles(`skill-menu-node-${progress}`);
        showSkillUnlockPopup(skillIdx);
        return;
    }

    // Stat choice
    if (choice === 'dmg') {
        player.skillMenuBonusDmgPct = (player.skillMenuBonusDmgPct || 0) + 1;
    } else if (choice === 'def') {
        player.skillMenuBonusDefPct = (player.skillMenuBonusDefPct || 0) + 1;
    } else if (choice === 'hp') {
        player.skillMenuBonusHpPct = (player.skillMenuBonusHpPct || 0) + 1;
    } else {
        // Invalid choice, refund
        player.skillPoints++;
        return;
    }

    player.skillMenuNodeChoices[progress] = choice;
    player.skillMenuProgress = progress + 1;
    player.maxHp = calculateMaxHp();
    saveGame();
    playSound('buff');
    _spawnSkillMenuSparkles(`skill-menu-node-${progress}`);
    showSkillMenu();
}

function resetSkillMenu() {
    if (!player) return;
    let totalRefund = (player.skillMenuProgress || 0) + (player.skillMenuInfiniteAtk || 0);
    let confirmed = confirm(`Reset Skill Menu?\nAll % bonuses and unlocked skills (after the first 3) will be reset.\nYou'll get back ${totalRefund} Skill Point${totalRefund !== 1 ? 's' : ''}.`);
    if (!confirmed) return;

    player.skillPoints = (player.skillPoints || 0) + totalRefund;
    player.skillMenuProgress = 0;
    player.skillMenuBonusDmgPct = 0;
    player.skillMenuBonusDefPct = 0;
    player.skillMenuBonusHpPct = 0;
    player.skillMenuInfiniteAtk = 0;
    player.skillMenuNodeChoices = [];

    // Reset unlocked skills to starting 3 only
    player.unlockedSkills = [0, 1, 2];
    player.equippedSkills = [0, 1, 2, null, null];

    // Reset old tree properties for save compatibility
    player.treeProgress = 0; player.treeBonusHp = 0; player.treeBonusDmg = 0; player.treeBonusDef = 0; player.treeBonusRegen = 0;
    player.treeProgressFire = 0; player.treeProgressIce = 0; player.treeProgressOffense = 0; player.treeProgressDefense = 0;
    player.treeProgressHoly = 0; player.treeProgressGuardian = 0; player.treeProgressShadow = 0; player.treeProgressVenom = 0;
    player.treeProgressDivine = 0; player.treeProgressPlague = 0; player.treeProgressPrecision = 0; player.treeProgressSurvival = 0;

    player.maxHp = calculateMaxHp();
    player.currentHp = player.maxHp;
    saveGame();
    showSkillMenu();
}

// Sparkle animation helper
function _spawnSkillMenuSparkles(nodeId) {
    let el = document.getElementById(nodeId);
    if (!el) return;
    for (let s = 0; s < 8; s++) {
        let spark = document.createElement('div');
        spark.style.cssText = `position:absolute;pointer-events:none;z-index:999;font-size:18px;animation:skillMenuSparkle 0.8s ease-out forwards;left:${20+Math.random()*60}%;top:${20+Math.random()*60}%;`;
        spark.textContent = ['✨','⭐','💫','🌟'][Math.floor(Math.random()*4)];
        el.style.position = 'relative';
        el.appendChild(spark);
        setTimeout(() => spark.remove(), 900);
    }
}

// Entry point — called by hub button
function showSkillTree() {
    switchScreen('screen-skilltree');
    showSkillMenu();
}

// Way of the Heavens — backward compat for existing saves
function useWayOfHeavens() {
    if(!combatActive || !isPlayerTurn) return;
    let woh = (globalProgression.skillTreeEnhancements || []).find(e => e.type === 'wayOfHeavens');
    if(!woh) return;
    if((player.wayOfHeavensCooldown || 0) > 0) {
        addLog(`Way of the Heavens: ${player.wayOfHeavensCooldown} turns remaining!`, 'text-gray-400');
        return;
    }
    enemies.forEach((e, i) => {
        if(e.currentHp <= 0) return;
        let dmg = getBaseDamage() + Math.floor(e.maxHp * 0.20);
        e.currentHp = Math.max(0, e.currentHp - dmg);
        e.bleedStacks = (e.bleedStacks || 0) + 1;
        e.bleedTurns = Math.max(e.bleedTurns || 0, 3);
        e.burnTurns = Math.max(e.burnTurns || 0, 1);
        e.poisonTurns = Math.max(e.poisonTurns || 0, 3);
        showDamageNumber(`enemy-card-${i}`, dmg, false);
    });
    player.wayOfHeavensCooldown = 10;
    addLog('Way of the Heavens! Strike all enemies for Base Damage + 20% HP + Bleed, Burn, Poison!', 'text-yellow-400');
    playSound('win');
    isPlayerTurn = false;
    saveGame();
    updateCombatUI(); renderSkills();
    if (currentMode === 'training') {
        if(!player.skillCooldowns) player.skillCooldowns = {};
        Object.keys(player.skillCooldowns).forEach(k => player.skillCooldowns[k] = 0);
        player.wayOfHeavensCooldown = 0;
        enemies.forEach(e => { e.currentHp = e.maxHp; });
        updateCombatUI(); renderSkills();
        setTimeout(() => startPlayerTurn(), 500);
    } else {
        setTimeout(() => executeEnemyTurns(0), 800);
    }
}
