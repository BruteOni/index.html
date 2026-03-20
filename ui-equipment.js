// --- EQUIPMENT CONSTANTS ---
const GEAR_BUY_PRICES = { common: 100, rare: 200, epic: 600, legendary: 1000, mythic: 5000 };

// --- SET TIER HELPER ---
function getActiveSetTier(equippedCount) {
    let activeTier = 0;
    [4, 8, 12, 14].forEach(t => { if (equippedCount >= t) activeTier = t; });
    return activeTier;
}
// Sell prices are 50% of buy price
const GEAR_SELL_PRICES = { common: 50, rare: 100, epic: 300, legendary: 500, mythic: 2500 };

// --- EQUIPMENT UI ---
let activeEquipSlot = null;
function renderBonusStatsHtml(bonusStats) {
    if (!bonusStats || bonusStats.length === 0) return '';
    return '<div class="text-[10px] text-cyan-300 mt-0.5">' + bonusStats.map(bs => {
        // CD Reduction is in turns, not percentage
        if(bs.stat === 'bonusCdReduc') return `CD -${bs.value}t`;
        const pct = (bs.value * 100).toFixed(2);
        return `+${pct}% ${bs.label}`;
    }).join(' | ') + '</div>';
}
function renderSetBonusHtml(item) {
    if(!item || !item.setBonus) return '';
    const classId = player ? (player.classId || 'warrior') : 'warrior';
    const classSets = typeof SET_BONUS_DEFS !== 'undefined' ? SET_BONUS_DEFS[classId] : null;
    if(!classSets) return '';
    const setDef = classSets[item.setBonus.setKey];
    if(!setDef) return '';
    // Count equipped pieces of this set
    const equipped = globalProgression.equipped || {};
    const count = Object.values(equipped).filter(e => e && e.setBonus && e.setBonus.setKey === item.setBonus.setKey).length;
    const activeTier = getActiveSetTier(count);
    let html = `<div class="text-[10px] mt-0.5 ${setDef.color} font-bold">💎 Set: ${setDef.name} (${count} equipped)</div>`;
    Object.entries(setDef.bonuses).forEach(([tier, desc]) => {
        const tierNum = parseInt(tier, 10);
        const isActive = activeTier >= tierNum;
        html += `<div class="text-[9px] ${isActive ? setDef.color + ' set-bonus-active font-bold' : 'text-gray-500'}">${tierNum}pc: ${desc}</div>`;
    });
    return html;
}
function openEquipModal(slot) {
    if (!globalProgression || !globalProgression.equipped) return;
    activeEquipSlot = slot;
    const baseSlotType = slot.startsWith('ring') ? 'ring' : slot;
    
    document.getElementById('equip-modal-title').innerText = `Equip ${slot}`;
    const list = document.getElementById('equip-modal-list'); list.innerHTML = '';
    
    const currentEq = globalProgression.equipped[slot];
    
    const eqSection = document.createElement('div'); eqSection.className = 'mb-4';
    eqSection.innerHTML = `<h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Equipped</h4>`;
    
    if (currentEq) {
        const eqCard = document.createElement('div');
        eqCard.className = `bg-gray-800 border-2 rarity-${currentEq.rarity} p-3 rounded-lg flex justify-between items-center mb-2`;
        const enchTxt = currentEq.enchanted ? `<span class="text-yellow-300 ml-1 text-xs">(${sanitizeHTML(currentEq.enchanted)})</span>` : '';
        const bonusTxt = renderBonusStatsHtml(currentEq.bonusStats) + renderSetBonusHtml(currentEq);
        eqCard.innerHTML = `<div class="flex items-center gap-2"><span class="text-2xl">${currentEq.icon}</span><div><div class="font-bold text-white">${sanitizeHTML(currentEq.name)} ${enchTxt} <span class="text-[10px] text-gray-500 uppercase">${sanitizeHTML(currentEq.rarity)}</span></div>${currentEq.type === 'weapon' && currentEq.weaponBaseDmgPct ? `<div class="text-xs text-green-400">Weapon Dmg: +${(currentEq.weaponBaseDmgPct*100).toFixed(1)}%</div>` : ''}${bonusTxt}</div></div><button onclick="unequipCurrent()" class="bg-red-900 hover:bg-red-800 text-red-200 px-3 py-2 rounded text-xs font-bold transition active:scale-95 border border-red-700">Unequip</button>`;
        eqSection.appendChild(eqCard);
    } else {
        eqSection.innerHTML += `<div class="text-gray-400 text-center py-2 text-sm italic bg-gray-900 rounded-lg">Nothing Equipped</div>`;
    }
    list.appendChild(eqSection);

    const invSection = document.createElement('div');
    invSection.innerHTML = `<h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Inventory</h4>`;
    const invItems = globalProgression.equipInventory.filter(i => i.type === baseSlotType);
    
    if(invItems.length === 0) { 
        invSection.innerHTML += `<div class="text-gray-500 text-center py-4 text-sm bg-gray-900 rounded-lg">No items in bag for this slot.</div>`; 
    } else {
        // Sort by gear score
        invItems.sort((a,b) => getGearScore(b) - getGearScore(a));
        invItems.forEach(item => {
            const btn = document.createElement('div');
            const isUpgrade = currentEq ? getGearScore(item) > getGearScore(currentEq) : true;
            btn.className = `bg-gray-900 border-2 rarity-${item.rarity} p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-700 transition mb-2 relative`;
            
            const upgradeBadge = isUpgrade ? `<span class="absolute -top-2 -left-2 bg-green-600 text-white text-[10px] px-1 rounded shadow border border-green-400 font-bold tracking-widest">UPGRADE</span>` : '';
            const enchTxt = item.enchanted ? `<span class="text-yellow-300 ml-1 text-xs">(${sanitizeHTML(item.enchanted)})</span>` : '';
            const bonusTxt = renderBonusStatsHtml(item.bonusStats) + renderSetBonusHtml(item);
            
            btn.innerHTML = `${upgradeBadge}<div class="flex items-center gap-2"><span class="text-2xl">${item.icon || '📦'}</span><div><div class="font-bold text-white">${sanitizeHTML(item.name)} ${enchTxt} <span class="text-[10px] text-gray-500 uppercase">${sanitizeHTML(item.rarity)}</span></div>${item.type === 'weapon' && item.weaponBaseDmgPct ? `<div class="text-xs text-green-400">Weapon Dmg: +${(item.weaponBaseDmgPct*100).toFixed(1)}%</div>` : ''}${bonusTxt}</div></div><button class="bg-blue-800 hover:bg-blue-700 text-blue-200 px-4 py-2 rounded text-xs font-bold border border-blue-600 transition active:scale-95">Equip</button>`;
            btn.onclick = (e) => { if(e.target.tagName !== 'BUTTON') return; equipItem(item.id); }; 
            invSection.appendChild(btn);
        });
    }
    list.appendChild(invSection);
    document.getElementById('modal-equip').style.display = 'flex';
}
function closeEquipModal() { document.getElementById('modal-equip').style.display = 'none'; showCharacter(); }

function unequipCurrent() {
    if(activeEquipSlot && globalProgression.equipped[activeEquipSlot]) {
        globalProgression.equipInventory.push(globalProgression.equipped[activeEquipSlot]);
        globalProgression.equipped[activeEquipSlot] = null;
        player.maxHp = calculateMaxHp(); if(player.currentHp > player.maxHp) player.currentHp = player.maxHp;
        playSound('click'); saveGame(); 
        openEquipModal(activeEquipSlot); 
        showCharacter();
    }
}

function quickEquipAll() {
    const inventory = globalProgression.equipInventory.slice();
    EQUIP_SLOTS.forEach(slot => {
        const baseSlot = slot.startsWith('ring') ? 'ring' : slot;
        const currentEq = globalProgression.equipped[slot];
        const currentGS = currentEq ? getGearScore(currentEq) : -1;
        let bestIdx = -1;
        let bestGS = currentGS;
        inventory.forEach((item, idx) => {
            if(item.type === baseSlot) {
                const gs = getGearScore(item);
                if(gs > bestGS) { bestGS = gs; bestIdx = idx; }
            }
        });
        if(bestIdx > -1) {
            const bestItem = inventory.splice(bestIdx, 1)[0];
            const invIdx = globalProgression.equipInventory.findIndex(i => i.id === bestItem.id);
            if(invIdx > -1) globalProgression.equipInventory.splice(invIdx, 1);
            if(currentEq) globalProgression.equipInventory.push(currentEq);
            globalProgression.equipped[slot] = bestItem;
        }
    });
    player.maxHp = calculateMaxHp();
    playSound('shield');
    saveGame();
    showCharacter();
}

function equipItem(itemId) {
    const itemIdx = globalProgression.equipInventory.findIndex(i => i.id === itemId);
    if(itemIdx > -1) {
        const item = globalProgression.equipInventory.splice(itemIdx, 1)[0];
        if(globalProgression.equipped[activeEquipSlot]) globalProgression.equipInventory.push(globalProgression.equipped[activeEquipSlot]);
        globalProgression.equipped[activeEquipSlot] = item;
        player.maxHp = calculateMaxHp();
        playSound('shield'); saveGame(); 
        openEquipModal(activeEquipSlot);
        showCharacter();
    }
}

function rollEquipment(forcedRarity = null) {
    if (!player) return null;
    const slotTypes = ['head', 'shoulders', 'chest', 'arms', 'waist', 'legs', 'boots', 'necklace', 'ring', 'weapon', 'cape'];
    const sType = slotTypes[Math.floor(Math.random() * slotTypes.length)];

    let r = 'common';
    if (forcedRarity) { r = forcedRarity; } 
    else {
        const rarityRoll = Math.random();
        if (rarityRoll < 0.01) r = 'legendary'; 
        else if (rarityRoll < 0.11) r = 'epic';
        else if (rarityRoll < 0.31) r = 'rare';
    }

    // Item level: random in [playerLevel - 5, playerLevel + 5], clamped to min 1, max 100
    const itemLevel = Math.min(100, Math.max(1, player.lvl + Math.floor(Math.random() * 11) - 5));

    // Class-specific weapon naming
    let weaponName = 'Sword';
    let weaponIcon = '⚔️';
    if (sType === 'weapon') {
        const classId = player ? player.classId : 'warrior';
        if (classId === 'warrior') { weaponName = 'Axe'; weaponIcon = '🪓'; }
        else if (classId === 'mage') { weaponName = 'Staff'; weaponIcon = '🪄'; }
        else if (classId === 'paladin') { weaponName = 'Hammer'; weaponIcon = '🔨'; }
        else if (classId === 'ninja') { weaponName = 'Shuriken'; weaponIcon = '🌟'; }
        else if (classId === 'cleric') { weaponName = 'Scepter'; weaponIcon = '⛪'; }
        else if (classId === 'archer') { weaponName = 'Bow'; weaponIcon = '🏹'; }
    }

    const SLOT_ICONS = { head:'🪖', shoulders:'🛡️', chest:'🦺', arms:'🦾', waist:'🪢', legs:'👖', boots:'🥾', necklace:'📿', ring:'💍', cape:'🧥', weapon: weaponIcon };
    const e = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : 'eq_' + Date.now() + '_' + Math.floor(Math.random() * 1e9) + '_' + Math.floor(Math.random() * 1e9), type: sType, rarity: r, 
        name: sType === 'weapon' ? `${r.toUpperCase()} ${weaponName} [Lv.${itemLevel}]` : `${r.toUpperCase()} ${sType} [Lv.${itemLevel}]`,
        icon: SLOT_ICONS[sType] || '📦',
        stats: {},
        bonusStats: [],
        enchanted: false,
        itemLevel: itemLevel
    };

    // Weapons get base damage percentage (0.1% per level)
    if (sType === 'weapon') {
        e.weaponBaseDmgPct = 0.001 * itemLevel;
    }

    // Generate random bonus stats for all items
    e.bonusStats = generateBonusStats(r, itemLevel, sType);

    return e;
}

// Generate random bonus stats for equipment — slot-category specific pools
function generateBonusStats(rarity, lvl, sType) {
    // Define per-slot-category stat pools with correct base-per-level values
    // Value at itemLevel = basePerLevel * itemLevel
    const EQUIPMENT_POOL = [
        // Equipment slots: head, shoulders, chest, waist, legs, boots
        { stat: 'bonusHpRegen',      basePerLevel: 0.0002, label: 'HP Regen' },
        { stat: 'bonusDmgReduction', basePerLevel: 0.0002, label: 'Dmg Reduction' },
        { stat: 'bonusDmgReflect',   basePerLevel: 0.0002, label: 'Dmg Reflect' },
        { stat: 'bonusDodge',        basePerLevel: 0.0002, label: 'Dodge' },
        { stat: 'bonusHealing',      basePerLevel: 0.0002, label: 'Healing' },
        { stat: 'bonusHpPct',        basePerLevel: 0.0002, label: 'Max HP' },
    ];
    const WEAPON_ARMS_POOL = [
        // Weapon and Arms slots
        { stat: 'bonusVamp',         basePerLevel: 0.0002, label: 'Vamp' },
        { stat: 'bonusSkillDmg',     basePerLevel: 0.001,  label: 'Skill Dmg' },
        { stat: 'bonusCritRate',     basePerLevel: 0.0002, label: 'Crit Chance' },
        { stat: 'bonusCritDmg',      basePerLevel: 0.0002, label: 'Crit Damage' },
        { stat: 'bonusBaseDmgPct',   basePerLevel: 0.0002, label: 'Base Damage' },
    ];
    const ACCESSORY_POOL = [
        // Accessories: rings, necklace, cape
        { stat: 'bonusXpGain',       basePerLevel: 0.001,   label: 'XP Gain' },
        { stat: 'bonusRareDropChance',basePerLevel: 0.0002,  label: 'Rare Drop Chance' },
        { stat: 'bonusHit',          basePerLevel: 0.00125, label: 'Hit Chance' },
        { stat: 'bonusCounterChance',basePerLevel: 0.0002,  label: 'Counter Chance' },
        { stat: 'bonusArmorPierce',  basePerLevel: 0.0002,  label: 'Armor Pierce' },
        { stat: 'bonusExtraTurn',    basePerLevel: 0.0002,  label: 'Extra Turn' },
    ];

    // Determine which pool to use based on slot type
    const EQUIPMENT_SLOTS = ['head', 'shoulders', 'chest', 'waist', 'legs', 'boots'];
    const WEAPON_ARMS_SLOTS = ['weapon', 'arms'];
    const ACCESSORY_SLOTS = ['ring', 'necklace', 'cape'];

    let pool;
    if (EQUIPMENT_SLOTS.includes(sType)) {
        pool = EQUIPMENT_POOL;
    } else if (WEAPON_ARMS_SLOTS.includes(sType)) {
        pool = WEAPON_ARMS_POOL;
    } else if (ACCESSORY_SLOTS.includes(sType)) {
        pool = ACCESSORY_POOL;
    } else {
        // Fallback: use equipment pool for unknown slot types
        pool = EQUIPMENT_POOL;
    }

    let numStats = rarity === 'mythic' ? 5 : rarity === 'legendary' ? 4 : rarity === 'epic' ? 3 : rarity === 'rare' ? 2 : 1;
    // Cap numStats to pool size
    numStats = Math.min(numStats, pool.length);

    const result = [];
    const available = pool.slice();
    for (let i = 0; i < numStats; i++) {
        if (available.length === 0) break;
        const idx = Math.floor(Math.random() * available.length);
        const chosen = available.splice(idx, 1)[0];
        const value = chosen.basePerLevel * lvl;
        result.push({ stat: chosen.stat, value: value, label: chosen.label, basePerLevel: chosen.basePerLevel });
    }
    // Cooldown reduction: ONLY on legendary rings
    if (rarity === 'legendary' && sType === 'ring') {
        result.push({ stat: 'bonusCdReduc', value: 3, label: 'CD Reduction (3t)' });
    }
    return result;
}

// Sum a specific bonus stat from all equipped items
function getEquipBonusStat(statName) {
    let total = 0;
    if (!globalProgression.equipped) return total;
    Object.values(globalProgression.equipped).forEach(item => {
        if (item && item.bonusStats) {
            item.bonusStats.forEach(bs => { if (bs.stat === statName) total += bs.value; });
        }
    });
    return total;
}
