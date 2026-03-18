// --- MAIN MENU & SCREEN NAVIGATION ---
// Note: confirmNewGame, closeConfirmNewGame, confirmNewGameYes, and switchScreen are defined in game.js.

// Fixed background color per skill slot index (slot 1=grey, slots 2-5=green; slot 6/WoH is always yellow)
const SLOT_FIXED_COLORS = ['bg-gray-700', 'bg-green-700', 'bg-green-700', 'bg-green-700', 'bg-green-700'];

// Fixed shop buy prices by rarity
const GEAR_BUY_PRICES = { common: 100, rare: 200, epic: 600, legendary: 1000, mythic: 5000 };
// Sell prices are 50% of buy price
const GEAR_SELL_PRICES = { common: 50, rare: 100, epic: 300, legendary: 500, mythic: 2500 };

// --- CHARACTER / EQUIPMENT SCREEN ---
function clearCharNotifications() { 
    globalProgression.newItems = {}; 
    saveGame(); showCharacter(); 
}

function showCharacter() {
    const lvlEl = document.getElementById('char-lvl'); if (lvlEl) lvlEl.innerText = player.lvl;
    
    document.getElementById('char-stat-hp').innerText = `${calculateMaxHp()}`;
    document.getElementById('char-stat-dmg').innerText = `${getBaseDamage()}`;
    document.getElementById('char-stat-def').innerText = `${getPlayerDef()}`;
    
    let a = globalProgression.attributes;
    // HP Regen: revival attr (0.2% per point) + gear bonusHpRegen
    let hpRegenAmt = Math.floor(player.maxHp * ((a.revival || 0) * 0.002 + getEquipBonusStat('bonusHpRegen')));
    document.getElementById('char-stat-regen').innerText = `${(player.treeBonusRegen || 0) + hpRegenAmt} HP/Turn`;
    // Gear score: based on total itemLevel * rarity across all equipped items
    let totalGS = 0;
    if(globalProgression.equipped) Object.values(globalProgression.equipped).forEach(item => { if(item) totalGS += getGearScore(item); });
    document.getElementById('char-stat-gs').innerText = totalGS;

    // Dodge: resistance 0.25% per point + gear bonusDodge
    document.getElementById('char-stat-dodge').innerText = `${(((a.resistance || 1) * 0.0025 + getEquipBonusStat('bonusDodge')) * 100).toFixed(1)}%`;
    // Hit: 80% base + reflexes 0.1% per point + gear bonusHit
    document.getElementById('char-stat-hit').innerText = `${Math.min(100, (80 + ((a.reflexes || 1) * 0.1) + (getEquipBonusStat('bonusHit') * 100))).toFixed(1)}%`;
    // Crit: force 0.5% per point + gear bonusCritRate, capped at 75%
    document.getElementById('char-stat-crit').innerText = `${Math.min(75, ((a.force || 0) * 0.5) + (getEquipBonusStat('bonusCritRate') * 100)).toFixed(1)}%`;
    // Crit Dmg: fury 0.25% per point + gear bonusCritDmg
    document.getElementById('char-stat-critdmg').innerText = `${(100 + ((a.fury || 1) * 0.25) + (getEquipBonusStat('bonusCritDmg') * 100)).toFixed(0)}%`;
    // Dmg Reduction: tenacity 0.3% per point + gear bonusDmgReduction
    document.getElementById('char-stat-dmgred').innerText = `${(((a.tenacity || 1) * 0.003 + getEquipBonusStat('bonusDmgReduction')) * 100).toFixed(1)}%`;
    // Dmg Reflect: gear bonusDmgReflect only (tenacity no longer directly gives reflect)
    document.getElementById('char-stat-reflect').innerText = `${(getEquipBonusStat('bonusDmgReflect') * 100).toFixed(2)}%`;
    // Skill Dmg: gear bonusSkillDmg
    document.getElementById('char-stat-skilldmg').innerText = `${(getEquipBonusStat('bonusSkillDmg') * 100).toFixed(1)}%`;
    // Armor Pierce: reflexes 0.3% per point + gear bonusArmorPierce
    document.getElementById('char-stat-mitigation').innerText = `${(((a.reflexes || 1) * 0.003 + getEquipBonusStat('bonusArmorPierce')) * 100).toFixed(1)}%`;
    // Life Steal: vampire 0.25% per point + gear bonusVamp
    if(document.getElementById('char-stat-lifesteal')) document.getElementById('char-stat-lifesteal').innerText = `${(((a.vampire || 0) * 0.0025 + getEquipBonusStat('bonusVamp')) * 100).toFixed(2)}%`;
    // Counter Chance: agility 0.25% per point
    if(document.getElementById('char-stat-counter')) document.getElementById('char-stat-counter').innerText = `${(((a.agility || 1) * 0.0025) * 100).toFixed(2)}%`;
    
    const pClass = document.getElementById('char-class-name'); if(pClass) pClass.innerText = player.data.name;
    const pAv = document.getElementById('char-avatar-display'); if(pAv) setAvatarDisplay('char-avatar-display', player.data.avatar);

    EQUIP_SLOTS.forEach(slot => {
        let el = document.getElementById(`slot-${slot}`);
        if(!el) return;
        
        let isBetter = hasBetterGear(slot);
        let badge = isBetter ? `<div class="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce z-10 font-bold border border-red-400">!</div>` : '';

        let item = globalProgression.equipped[slot];
        if(item) {
            el.dataset.filled = "true"; el.innerHTML = badge + (item.icon || '📦'); el.className = `equip-slot rarity-${item.rarity}`;
        } else {
            el.dataset.filled = "false"; el.className = `equip-slot`;
            let icon = '💍';
            const SLOT_DEFAULT_ICONS = { head:'🪖', shoulders:'🛡️', arms:'🦾', weapon:'⚔️', chest:'🦺', waist:'🪢', legs:'👖', boots:'🥾', necklace:'📿', cape:'🧥' };
            if (SLOT_DEFAULT_ICONS[slot]) icon = SLOT_DEFAULT_ICONS[slot];
            el.innerHTML = badge + icon;
        }
    });

    const skillSlots = document.getElementById('char-skill-slots');
    skillSlots.innerHTML = '';
    for(let i=0; i<5; i++) {
        let sIdx = player.equippedSkills[i];
        let btn = document.createElement('button');
        if(sIdx === 'woh') {
            btn.className = `p-1 rounded-lg font-bold text-black shadow-lg active:scale-95 flex flex-col items-center justify-center bg-yellow-400 h-12 w-full text-[10px] truncate leading-tight`;
            btn.innerHTML = '☀️ WoH';
        } else if(sIdx !== null && sIdx !== undefined) {
            let sInfo = player.data.skills[sIdx];
            btn.className = `p-1 rounded-lg font-bold text-white shadow-lg active:scale-95 flex flex-col items-center justify-center ${SLOT_FIXED_COLORS[i]} h-12 w-full text-[10px] truncate leading-tight`;
            btn.innerHTML = sInfo.name;
        } else {
            btn.className = `p-1 rounded-lg font-bold text-gray-500 bg-gray-800 border-2 border-dashed border-gray-600 active:scale-95 flex items-center justify-center h-12 w-full text-xl`;
            btn.innerHTML = '+';
        }
        btn.onclick = () => openSkillModal(i);
        skillSlots.appendChild(btn);
    }

    switchScreen('screen-character');
}

function showSkillGuide() {
    let classNameEl = document.getElementById('skill-guide-class-name');
    if(classNameEl) classNameEl.innerText = `${player.data.name} — all skills for this class`;
    let list = document.getElementById('skill-guide-list');
    if(!list) return;
    list.innerHTML = '';
    let skills = player.data.skills;
    // Path labels: indices 0-2 base, 3-5 first path, 6-8 second path
    let pathLabels = ['Base Skills', 'Path 1 Skills', 'Path 2 Skills'];
    let sections = [[0,1,2],[3,4,5],[6,7,8]];
    sections.forEach((indices, sIdx) => {
        let header = document.createElement('div');
        header.className = 'text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-700 pb-1 mt-1';
        header.innerText = pathLabels[sIdx];
        list.appendChild(header);
        indices.forEach(idx => {
            if(idx >= skills.length) return;
            let skill = skills[idx];
            let isUnlocked = player.unlockedSkills.includes(idx);
            let lockIcon = isUnlocked ? '✅' : '🔒';
            let lockColor = isUnlocked ? 'text-green-400' : 'text-gray-500';
            let card = document.createElement('div');
            card.className = `rounded-xl p-3 border ${isUnlocked ? 'border-green-700 bg-gray-800' : 'border-gray-700 bg-gray-900 opacity-70'}`;
            let dmgParts = [];
            if(skill.mult !== undefined && skill.mult > 0) dmgParts.push(`<span class="bg-orange-900 text-orange-300 px-1 rounded">⚔️ ${Math.round(skill.mult * 100)}% Dmg</span>`);
            if(skill.hits && skill.hits > 1) dmgParts.push(`<span class="bg-gray-700 text-gray-300 px-1 rounded">x${skill.hits} hits</span>`);
            if(skill.target === 'all') dmgParts.push(`<span class="bg-blue-900 text-blue-300 px-1 rounded">ALL enemies</span>`);
            let dmgInfo = dmgParts.join(' ');
            let cdInfo = skill.cd > 0 ? `<span class="bg-gray-700 text-yellow-300 px-1 rounded">⏱ CD: ${skill.cd}t</span>` : `<span class="bg-green-900 text-green-300 px-1 rounded">No CD</span>`;
            card.innerHTML = `
                <div class="flex items-center justify-between mb-1">
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-white text-sm">${skill.name}</span>
                        <span class="text-xs font-bold ${lockColor}">${lockIcon}</span>
                    </div>
                    <div class="flex gap-1 flex-wrap justify-end text-[10px]">${cdInfo}${dmgInfo ? ' ' + dmgInfo : ''}</div>
                </div>
                <div class="text-[11px] text-gray-300">${skill.desc}</div>
            `;
            list.appendChild(card);
        });
    });
    switchScreen('screen-skill-guide');
}

const WILLPOWER_CAP = 50;

const ENHANCEMENT_RARITIES = ['normal', 'rare', 'epic', 'legendary'];
const ENHANCEMENT_RARITY_COLORS = { normal: 'text-white', rare: 'text-blue-500', epic: 'text-purple-500', legendary: 'text-orange-500' };
const ENHANCEMENT_RARITY_BORDERS = { normal: 'border-gray-600', rare: 'border-blue-500', epic: 'border-purple-500', legendary: 'border-yellow-500' };

const ENHANCEMENT_DEFS = {
    rage: {
        name: 'Rage', icon: '😤', type: 'passive', stackable: false,
        desc: (r) => { let vals = { normal: 5, rare: 8, epic: 13, legendary: 17 }; return `+${vals[r]}% damage when HP < 30% (2 turns, once per battle)`; },
        vals: { normal: 0.05, rare: 0.08, epic: 0.13, legendary: 0.17 }
    },
    divineShield: {
        name: 'Divine Shield', icon: '🛡️', type: 'passive', stackable: false,
        desc: (r) => { let vals = { normal: 20, rare: 22, epic: 30, legendary: 40 }; return `Block ${vals[r]}% damage with ${vals[r]}% chance (once per battle)`; },
        vals: { normal: 0.20, rare: 0.22, epic: 0.30, legendary: 0.40 }
    },
    reflect: {
        name: 'Reflect', icon: '🔄', type: 'passive', stackable: false,
        desc: (r) => { let vals = { normal: 20, rare: 24, epic: 34, legendary: 44 }; return `${vals[r]}% chance to reflect ${vals[r]}% damage (once per battle)`; },
        vals: { normal: 0.20, rare: 0.24, epic: 0.34, legendary: 0.44 }
    },
    damageBoost: {
        name: 'Damage Boost', icon: '⚔️', type: 'passive', stackable: true,
        desc: (r) => { let vals = { normal: 3, rare: 5, epic: 10, legendary: 15 }; return `+${vals[r]}% all damage dealt`; },
        vals: { normal: 0.03, rare: 0.05, epic: 0.10, legendary: 0.15 }
    },
    hpBoost: {
        name: 'HP Boost', icon: '❤️', type: 'passive', stackable: true,
        desc: (r) => { let vals = { normal: 10, rare: 12, epic: 18, legendary: 27 }; return `+${vals[r]}% max HP`; },
        vals: { normal: 0.10, rare: 0.12, epic: 0.18, legendary: 0.27 }
    },
    xpIncrease: {
        name: 'XP Increase', icon: '⭐', type: 'passive', stackable: true,
        desc: (r) => { let vals = { normal: 2, rare: 3, epic: 5, legendary: 9 }; return `+${vals[r]}% XP gain`; },
        vals: { normal: 0.02, rare: 0.03, epic: 0.05, legendary: 0.09 }
    },
    dropRate: {
        name: 'Drop Rate', icon: '💎', type: 'passive', stackable: true,
        desc: (r) => { let vals = { normal: 1, rare: 2, epic: 3, legendary: 4 }; return `+${vals[r]}% drop rate`; },
        vals: { normal: 0.01, rare: 0.02, epic: 0.03, legendary: 0.04 }
    },
    skillCDReduc: {
        name: 'Skill CD Reduc', icon: '⏱️', type: 'passive', stackable: false,
        desc: (r) => `-1 Turn Cooldown for skills`,
        vals: { legendary: 1 }
    },
    wayOfHeavens: {
        name: 'Way of the Heavens', icon: '☀️', type: 'active', stackable: false,
        desc: (r) => `Strike ALL enemies for Base Damage + 20% HP + Bleed, Burn (5% HP/t), Poison. 10-turn global cooldown.`,
        vals: { legendary: 0.30 }
    }
};

function showAttributes() {
    const availEl = document.getElementById('attr-points-avail');
    if(availEl) availEl.innerText = player.statPoints;
    
    const list = document.getElementById('attr-list');
    list.innerHTML = '';
    
    const attrDefs = [
        { id: 'rawPower',   name: 'Raw Power',  desc: '+2 base damage per point', color: 'text-red-400' },
        { id: 'willpower',  name: 'Willpower',  desc: '+0.3% increased base damage per point', color: 'text-blue-400' },
        { id: 'agility',    name: 'Agility',    desc: '+0.25% chance to attack back when hit per point', color: 'text-yellow-400' },
        { id: 'fury',       name: 'Fury',       desc: '+0.25% crit damage per point', color: 'text-red-500' },
        { id: 'tenacity',   name: 'Tenacity',   desc: '+0.3% damage reduction per point', color: 'text-orange-400' },
        { id: 'resistance', name: 'Resistance', desc: '+0.25% dodge chance per point', color: 'text-purple-400' },
        { id: 'hp',         name: 'HP',         desc: '+0.5% max HP per point', color: 'text-green-300' },
        { id: 'defense',    name: 'Defense',    desc: '+1 defense per point (reduces damage by 1)', color: 'text-gray-300' },
        { id: 'reflexes',   name: 'Reflexes',   desc: '+0.3% armor pierce (ignore enemy defense) per point', color: 'text-green-400' },
        { id: 'force',      name: 'Force',      desc: '+0.5% crit rate per point', color: 'text-cyan-400' },
        { id: 'revival',    name: 'Revival',    desc: '+0.2% HP regen per turn per point', color: 'text-emerald-400' },
        { id: 'happiness',  name: 'Happiness',  desc: '+0.25% healing received per point', color: 'text-pink-400' },
        { id: 'vampire',    name: 'Vampire',    desc: '+0.25% life received per hit per point', color: 'text-violet-400' },
    ];

    attrDefs.forEach(a => {
        let zeroBaseAttrs = ['happiness', 'rawPower', 'force', 'revival', 'vampire', 'defense'];
        let isZeroBase = zeroBaseAttrs.includes(a.id);
        let currentVal = globalProgression.attributes[a.id] !== undefined ? globalProgression.attributes[a.id] : (isZeroBase ? 0 : 1);
        let classId = player.classId || 'warrior';
        let classBase = getClassBaseAttributes(classId);
        let minVal = isZeroBase ? (classBase[a.id] || 0) : (classBase[a.id] || 1);
        let attrCap = getClassAttrCap(classId, a.id);
        let cost = 1;

        // + button: disabled if can't afford or at cap
        let plusDisabled = (player.statPoints < cost) || (currentVal >= attrCap) ? 'disabled' : '';

        // +5 button disabled logic
        let plus5Disabled = (currentVal >= attrCap || player.statPoints < 5) ? 'disabled' : '';

        // +100 button disabled logic
        let plus100Disabled = (currentVal >= attrCap || player.statPoints < 100) ? 'disabled' : '';

        // - button: disabled if at class minimum (permanent base)
        let minusDisabled = currentVal <= minVal ? 'disabled' : '';

        // -5 button: disabled if fewer than 5 levels above minimum
        let minus5Disabled = (currentVal - 5) < minVal ? 'disabled' : '';

        // -100 button: disabled if fewer than 100 levels above minimum
        let minus100Disabled = (currentVal - 100) < minVal ? 'disabled' : '';

        let capDisplay = ` / ${attrCap}`;
        let levelDisplay = `Lv. ${currentVal}${capDisplay}`;
        let baseNote = (minVal > 1) ? ` <span class="text-yellow-500 text-[9px]">(base ${minVal})</span>` : '';

        let btn = document.createElement('div');
        btn.className = "flex flex-col bg-gray-900 p-2 rounded-lg border border-gray-700 shadow-sm";

        btn.innerHTML = `
            <div class="w-full mb-2">
                <div class="font-bold ${a.color} text-sm">${a.name} <span class="text-white ml-2 text-xs">${levelDisplay}</span>${baseNote}</div>
                <div class="text-[10px] text-gray-400 leading-tight mt-0.5">${a.desc}</div>
            </div>
            <div class="flex gap-2 w-full items-stretch">
                <div class="flex flex-col gap-1 flex-1">
                    <button onclick="deallocateAttribute('${a.id}',100)" class="w-full bg-red-800 hover:bg-red-700 py-1 rounded text-white font-bold transition active:scale-95 border border-red-600 text-xs disabled:opacity-50" ${minus100Disabled}>- 100</button>
                    <button onclick="deallocateAttribute('${a.id}',5)" class="w-full bg-red-800 hover:bg-red-700 py-1 rounded text-white font-bold transition active:scale-95 border border-red-600 text-xs disabled:opacity-50" ${minus5Disabled}>- 5</button>
                    <button onclick="deallocateAttribute('${a.id}',1)" class="w-full bg-red-800 hover:bg-red-700 py-1 rounded text-white font-bold transition active:scale-95 border border-red-600 text-sm disabled:opacity-50" ${minusDisabled}>-</button>
                </div>
                <div class="flex flex-col gap-1 flex-1">
                    <button onclick="allocateAttribute('${a.id}',100)" class="w-full bg-green-700 hover:bg-green-600 py-1 rounded text-white font-bold transition active:scale-95 border border-green-500 text-xs disabled:opacity-50" ${plus100Disabled}>+ 100</button>
                    <button onclick="allocateAttribute('${a.id}',5)" class="w-full bg-green-700 hover:bg-green-600 py-1 rounded text-white font-bold transition active:scale-95 border border-green-500 text-xs disabled:opacity-50" ${plus5Disabled}>+ 5</button>
                    <button onclick="allocateAttribute('${a.id}',1)" class="w-full bg-green-700 hover:bg-green-600 py-1 rounded text-white font-bold transition active:scale-95 border border-green-500 text-sm disabled:opacity-50" ${plusDisabled}>+</button>
                </div>
            </div>
        `;
        list.appendChild(btn);
    });

    switchScreen('screen-attributes');
}

function allocateAttribute(id, count) {
    count = count || 1;
    let classId = player.classId || 'warrior';
    let cost = 1;
    let attrCap = getClassAttrCap(classId, id);

    let classBase = getClassBaseAttributes(classId);
    // New attrs (rawPower, force, revival, vampire, defense) start at 0; happiness starts at 0; others at 1
    let zeroBaseAttrs = ['happiness', 'rawPower', 'force', 'revival', 'vampire', 'defense'];
    let defaultMin = zeroBaseAttrs.includes(id) ? 0 : 1;
    let currentVal = globalProgression.attributes[id] !== undefined ? globalProgression.attributes[id] : defaultMin;
    let canAllocate = Math.min(count, attrCap - currentVal, Math.floor(player.statPoints / cost));
    if (canAllocate <= 0) return;
    player.statPoints -= canAllocate * cost;
    globalProgression.attributes[id] = currentVal + canAllocate;

    player.maxHp = calculateMaxHp(); player.currentHp = player.maxHp;
    saveGame();
    playSound('click');
    showAttributes();
}

function deallocateAttribute(id, count) {
    count = count || 1;
    let classId = player.classId || 'warrior';
    let classBase = getClassBaseAttributes(classId);
    let zeroBaseAttrs = ['happiness', 'rawPower', 'force', 'revival', 'vampire', 'defense'];
    let defaultMin = zeroBaseAttrs.includes(id) ? 0 : 1;
    let minVal = (classBase[id] !== undefined) ? classBase[id] : defaultMin;
    let currentVal = globalProgression.attributes[id] !== undefined ? globalProgression.attributes[id] : minVal;
    let canRemove = Math.min(count, currentVal - minVal);
    if (canRemove <= 0) return;

    player.statPoints += canRemove;
    globalProgression.attributes[id] = currentVal - canRemove;

    player.maxHp = calculateMaxHp(); player.currentHp = player.maxHp;
    saveGame();
    playSound('click');
    showAttributes();
}

function respecAttributes() {
    let classId = player.classId || 'warrior';
    let classBase = getClassBaseAttributes(classId);
    const normalAttrs = ['hp', 'tenacity', 'agility', 'willpower', 'resistance', 'reflexes', 'fury', 'rawPower', 'force', 'revival', 'vampire', 'defense'];
    let totalRefund = 0;
    normalAttrs.forEach(stat => {
        let currentVal = globalProgression.attributes[stat] !== undefined ? globalProgression.attributes[stat] : (classBase[stat] || 0);
        let baseVal = classBase[stat] !== undefined ? classBase[stat] : 0;
        totalRefund += Math.max(0, currentVal - baseVal);
        globalProgression.attributes[stat] = baseVal;
    });
    let happinessVal = globalProgression.attributes['happiness'] || 0;
    totalRefund += happinessVal;
    globalProgression.attributes['happiness'] = 0;
    player.statPoints += totalRefund;
    player.maxHp = calculateMaxHp(); player.currentHp = player.maxHp;
    saveGame();
    playSound('click');
    showAttributes();
}

// --- EQUIPMENT UI ---
let activeEquipSlot = null;
function renderBonusStatsHtml(bonusStats) {
    if (!bonusStats || bonusStats.length === 0) return '';
    return '<div class="text-[10px] text-cyan-300 mt-0.5">' + bonusStats.map(bs => {
        // CD Reduction is in turns, not percentage
        if(bs.stat === 'bonusCdReduc') return `CD -${bs.value}t`;
        let pct = (bs.value * 100).toFixed(2);
        return `+${pct}% ${bs.label}`;
    }).join(' | ') + '</div>';
}
function openEquipModal(slot) {
    activeEquipSlot = slot;
    let baseSlotType = slot.startsWith('ring') ? 'ring' : slot;
    
    document.getElementById('equip-modal-title').innerText = `Equip ${slot}`;
    const list = document.getElementById('equip-modal-list'); list.innerHTML = '';
    
    const currentEq = globalProgression.equipped[slot];
    
    let eqSection = document.createElement('div'); eqSection.className = 'mb-4';
    eqSection.innerHTML = `<h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Equipped</h4>`;
    
    if (currentEq) {
        let eqCard = document.createElement('div');
        eqCard.className = `bg-gray-800 border-2 rarity-${currentEq.rarity} p-3 rounded-lg flex justify-between items-center mb-2`;
        let enchTxt = currentEq.enchanted ? `<span class="text-yellow-300 ml-1 text-xs">(${currentEq.enchanted})</span>` : '';
        let bonusTxt = renderBonusStatsHtml(currentEq.bonusStats);
        eqCard.innerHTML = `<div class="flex items-center gap-2"><span class="text-2xl">${currentEq.icon}</span><div><div class="font-bold text-white">${currentEq.name} ${enchTxt} <span class="text-[10px] text-gray-500 uppercase">${currentEq.rarity}</span></div>${currentEq.type === 'weapon' && currentEq.weaponBaseDmgPct ? `<div class="text-xs text-green-400">Weapon Dmg: +${(currentEq.weaponBaseDmgPct*100).toFixed(1)}%</div>` : ''}${bonusTxt}</div></div><button onclick="unequipCurrent()" class="bg-red-900 hover:bg-red-800 text-red-200 px-3 py-2 rounded text-xs font-bold transition active:scale-95 border border-red-700">Unequip</button>`;
        eqSection.appendChild(eqCard);
    } else {
        eqSection.innerHTML += `<div class="text-gray-400 text-center py-2 text-sm italic bg-gray-900 rounded-lg">Nothing Equipped</div>`;
    }
    list.appendChild(eqSection);

    let invSection = document.createElement('div');
    invSection.innerHTML = `<h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Inventory</h4>`;
    let invItems = globalProgression.equipInventory.filter(i => i.type === baseSlotType);
    
    if(invItems.length === 0) { 
        invSection.innerHTML += `<div class="text-gray-500 text-center py-4 text-sm bg-gray-900 rounded-lg">No items in bag for this slot.</div>`; 
    } else {
        // Sort by gear score
        invItems.sort((a,b) => getGearScore(b) - getGearScore(a));
        invItems.forEach(item => {
            let btn = document.createElement('div');
            let isUpgrade = currentEq ? getGearScore(item) > getGearScore(currentEq) : true;
            btn.className = `bg-gray-900 border-2 rarity-${item.rarity} p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-700 transition mb-2 relative`;
            
            let upgradeBadge = isUpgrade ? `<span class="absolute -top-2 -left-2 bg-green-600 text-white text-[10px] px-1 rounded shadow border border-green-400 font-bold tracking-widest">UPGRADE</span>` : '';
            let enchTxt = item.enchanted ? `<span class="text-yellow-300 ml-1 text-xs">(${item.enchanted})</span>` : '';
            let bonusTxt = renderBonusStatsHtml(item.bonusStats);
            
            btn.innerHTML = `${upgradeBadge}<div class="flex items-center gap-2"><span class="text-2xl">${item.icon || '📦'}</span><div><div class="font-bold text-white">${item.name} ${enchTxt} <span class="text-[10px] text-gray-500 uppercase">${item.rarity}</span></div>${item.type === 'weapon' && item.weaponBaseDmgPct ? `<div class="text-xs text-green-400">Weapon Dmg: +${(item.weaponBaseDmgPct*100).toFixed(1)}%</div>` : ''}${bonusTxt}</div></div><button class="bg-blue-800 hover:bg-blue-700 text-blue-200 px-4 py-2 rounded text-xs font-bold border border-blue-600 transition active:scale-95">Equip</button>`;
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
    let inventory = globalProgression.equipInventory.slice();
    EQUIP_SLOTS.forEach(slot => {
        let baseSlot = slot.startsWith('ring') ? 'ring' : slot;
        let currentEq = globalProgression.equipped[slot];
        let currentGS = currentEq ? getGearScore(currentEq) : -1;
        let bestIdx = -1;
        let bestGS = currentGS;
        inventory.forEach((item, idx) => {
            if(item.type === baseSlot) {
                let gs = getGearScore(item);
                if(gs > bestGS) { bestGS = gs; bestIdx = idx; }
            }
        });
        if(bestIdx > -1) {
            let bestItem = inventory.splice(bestIdx, 1)[0];
            let invIdx = globalProgression.equipInventory.findIndex(i => i.id === bestItem.id);
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
    let itemIdx = globalProgression.equipInventory.findIndex(i => i.id === itemId);
    if(itemIdx > -1) {
        let item = globalProgression.equipInventory.splice(itemIdx, 1)[0];
        if(globalProgression.equipped[activeEquipSlot]) globalProgression.equipInventory.push(globalProgression.equipped[activeEquipSlot]);
        globalProgression.equipped[activeEquipSlot] = item;
        player.maxHp = calculateMaxHp();
        playSound('shield'); saveGame(); 
        openEquipModal(activeEquipSlot);
        showCharacter();
    }
}

function rollEquipment(forcedRarity = null) {
    let slotTypes = ['head', 'shoulders', 'chest', 'arms', 'waist', 'legs', 'boots', 'necklace', 'ring', 'weapon', 'cape'];
    let sType = slotTypes[Math.floor(Math.random() * slotTypes.length)];

    let r = 'common';
    if (forcedRarity) { r = forcedRarity; } 
    else {
        let rarityRoll = Math.random();
        if (rarityRoll < 0.01) r = 'legendary'; 
        else if (rarityRoll < 0.11) r = 'epic';
        else if (rarityRoll < 0.31) r = 'rare';
    }

    // Item level: random in [playerLevel - 5, playerLevel + 5], clamped to min 1, max 100
    let itemLevel = Math.min(100, Math.max(1, player.lvl + Math.floor(Math.random() * 11) - 5));

    // Class-specific weapon naming
    let weaponName = 'Sword';
    let weaponIcon = '⚔️';
    if (sType === 'weapon') {
        let classId = player ? player.classId : 'warrior';
        if (classId === 'warrior') { weaponName = 'Axe'; weaponIcon = '🪓'; }
        else if (classId === 'mage') { weaponName = 'Staff'; weaponIcon = '🪄'; }
        else if (classId === 'paladin') { weaponName = 'Hammer'; weaponIcon = '🔨'; }
        else if (classId === 'ninja') { weaponName = 'Shuriken'; weaponIcon = '🌟'; }
        else if (classId === 'cleric') { weaponName = 'Scepter'; weaponIcon = '⛪'; }
        else if (classId === 'archer') { weaponName = 'Bow'; weaponIcon = '🏹'; }
    }

    let SLOT_ICONS = { head:'🪖', shoulders:'🛡️', chest:'🦺', arms:'🦾', waist:'🪢', legs:'👖', boots:'🥾', necklace:'📿', ring:'💍', cape:'🧥', weapon: weaponIcon };
    let e = {
        id: 'eq_' + Date.now() + Math.floor(Math.random()*1000), type: sType, rarity: r, 
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

    let result = [];
    let available = pool.slice();
    for (let i = 0; i < numStats; i++) {
        if (available.length === 0) break;
        let idx = Math.floor(Math.random() * available.length);
        let chosen = available.splice(idx, 1)[0];
        let value = chosen.basePerLevel * lvl;
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

// --- SKILL UI ---
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

    // Add Way of the Heavens as equippable skill for all classes if unlocked
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

// Helper: get the stored enhancement for a specific path and node index
function getNodeEnhancement(path, i) {
    return (player.nodeEnhancements?.[path] || {})[i] || null;
}

// Helper: render content into a tree node button based on its state and stored enhancements
function renderTreeNodeContent(btn, path, i, isUnlocked, isNext, skillIcon, skillIdx) {
    let isSkillNode = (i === 4 || i === 9 || i === 14);
    if (isSkillNode) {
        let skillName = player.data.skills[skillIdx]?.name || 'Skill';
        btn.innerHTML = `<span class="text-lg">${skillIcon}</span><br>Unlock:<br>${skillName}`;
        btn.classList.add('h-20');
        btn.disabled = !isNext;
        if (isNext) btn.onclick = () => unlockNextNode(path, i);
    } else if (isUnlocked) {
        let enh = getNodeEnhancement(path, i);
        if (enh) {
            let def = ENHANCEMENT_DEFS[enh.type];
            let rarityColor = ENHANCEMENT_RARITY_COLORS[enh.rarity];
            let canReroll = enh.rarity !== 'legendary';
            btn.id = `node-enh-${path}-${i}`;
            btn.classList.add('h-20');
            let rerollHint = canReroll ? '<br><span class="text-[9px] text-yellow-400">🎲 Reroll 20G</span>' : '';
            btn.innerHTML = `<span class="text-base leading-none">${def.icon}</span><br>`
                + `<span class="${rarityColor} text-xs font-bold leading-none">${def.name}</span><br>`
                + `<span class="text-[9px] uppercase opacity-75">${enh.rarity}</span>${rerollHint}`;
            btn.disabled = !canReroll;
            if (canReroll) btn.onclick = () => rerollEnhancement(path, i);
        } else {
            // Retroactively roll and store enhancement for old save data
            let newEnh = rollEnhancement();
            if(!player.nodeEnhancements[path]) player.nodeEnhancements[path] = {};
            player.nodeEnhancements[path][i] = newEnh;
            globalProgression.skillTreeEnhancements.push(newEnh);
            _retroEnhancementsDirty = true;
            let def = ENHANCEMENT_DEFS[newEnh.type];
            let rarityColor = ENHANCEMENT_RARITY_COLORS[newEnh.rarity];
            let canReroll = newEnh.rarity !== 'legendary';
            btn.id = `node-enh-${path}-${i}`;
            btn.classList.add('h-20');
            let rerollHint = canReroll ? '<br><span class="text-[9px] text-yellow-400">🎲 Reroll 20G</span>' : '';
            btn.innerHTML = `<span class="text-base leading-none">${def.icon}</span><br>`
                + `<span class="${rarityColor} text-xs font-bold leading-none">${def.name}</span><br>`
                + `<span class="text-[9px] uppercase opacity-75">${newEnh.rarity}</span>${rerollHint}`;
            btn.disabled = !canReroll;
            if (canReroll) btn.onclick = () => rerollEnhancement(path, i);
        }
    } else {
        btn.innerHTML = `❓ Random<br>Enhancement`;
        btn.disabled = !isNext;
        if (isNext) btn.onclick = () => unlockNextNode(path, i);
    }
}

// --- SKILL TREE ---
let _retroEnhancementsDirty = false;

// Build one skill path column and return the DOM element
function buildSkillTreePath(pathName, progressProp, skillStart, pathColor, pathLabel, skillIcon) {
    let progress = player[progressProp] || 0;
    let section = document.createElement('div');
    section.className = 'flex-1 min-w-0 flex flex-col';

    let header = document.createElement('div');
    header.className = `text-center font-bold text-sm py-2 rounded-t-xl mb-1 ${pathColor.header}`;
    header.textContent = pathLabel;
    section.appendChild(header);

    let scrollBox = document.createElement('div');
    scrollBox.className = 'flex-1 overflow-y-auto p-1 rounded-xl bg-gray-900 border border-gray-700 shadow-inner';
    scrollBox.style.maxHeight = '70vh';

    for (let i = 0; i < 25; i++) {
        let isUnlocked = i < progress;
        let isNext = i === progress;
        let skillIdx = i === 4 ? skillStart : i === 9 ? (skillStart + 1) : i === 14 ? (skillStart + 2) : null;

        let btn = document.createElement('button');
        btn.type = 'button';
        btn.className = [
            'w-full mb-1 p-2 rounded text-xs font-bold border-2 transition-all shadow text-center',
            isUnlocked ? pathColor.unlocked
                       : isNext    ? 'bg-gray-700 border-yellow-400 text-white animate-pulse shadow-[0_0_10px_rgba(250,204,21,0.5)]'
                                   : 'bg-gray-800 border-gray-600 text-gray-500 opacity-50'
        ].join(' ');

        // Render content
        renderTreeNodeContent(btn, pathName, i, isUnlocked, isNext, skillIcon, skillIdx);
        scrollBox.appendChild(btn);
    }

    section.appendChild(scrollBox);
    return section;
}

function showSkillTree() {
    switchScreen('screen-skilltree');
    try {
        if (!player || !player.data) return;
        document.getElementById('tree-sp').innerText = player.skillPoints;

        // Hide all per-class tree divs
        ['tree-warrior','tree-mage','tree-paladin','tree-ninja','tree-cleric','tree-archer'].forEach(id => {
            let el = document.getElementById(id); if (el) el.classList.add('hidden');
        });

        // Per-class config: [path1Name, path1Prop, path1SkillStart, path1Color, path1Label, path1Icon,
        //                    path2Name, path2Prop, path2SkillStart, path2Color, path2Label, path2Icon]
        const TREE_CONFIGS = {
            warrior:  ['offense','treeProgressOffense', 3, {header:'bg-red-900 text-red-200 border-b-2 border-red-500',   unlocked:'bg-red-900 border-red-500 text-red-200'},   'OFFENSE PATH','⚔️',
                       'defense','treeProgressDefense', 6, {header:'bg-blue-900 text-blue-200 border-b-2 border-blue-500', unlocked:'bg-blue-900 border-blue-500 text-blue-200'}, 'DEFENSE PATH','🛡️'],
            mage:     ['fire','treeProgressFire',3,{header:'bg-orange-900 text-orange-200 border-b-2 border-orange-500',unlocked:'bg-orange-900 border-orange-500 text-orange-200'},'FIRE PATH','🔥',
                       'ice', 'treeProgressIce', 6,{header:'bg-cyan-900 text-cyan-200 border-b-2 border-cyan-500',      unlocked:'bg-cyan-900 border-cyan-500 text-cyan-200'},    'ICE PATH','❄️'],
            paladin:  ['holy','treeProgressHoly',3,{header:'bg-yellow-900 text-yellow-200 border-b-2 border-yellow-500',unlocked:'bg-yellow-900 border-yellow-500 text-yellow-200'},'HOLY PATH','✨',
                       'guardian','treeProgressGuardian',6,{header:'bg-emerald-900 text-emerald-200 border-b-2 border-emerald-500',unlocked:'bg-emerald-900 border-emerald-500 text-emerald-200'},'GUARDIAN PATH','🛡️'],
            ninja:    ['shadow','treeProgressShadow',3,{header:'bg-violet-900 text-violet-200 border-b-2 border-violet-500',unlocked:'bg-violet-900 border-violet-500 text-violet-200'},'SHADOW PATH','🌑',
                       'venom','treeProgressVenom',6,{header:'bg-lime-900 text-lime-200 border-b-2 border-lime-500',unlocked:'bg-lime-900 border-lime-500 text-lime-200'},'VENOM PATH','🐍'],
            cleric:   ['divine','treeProgressDivine',3,{header:'bg-pink-900 text-pink-200 border-b-2 border-pink-500',unlocked:'bg-pink-900 border-pink-500 text-pink-200'},'DIVINE PATH','✨',
                       'plague','treeProgressPlague',6,{header:'bg-green-900 text-green-200 border-b-2 border-green-700',unlocked:'bg-green-900 border-green-700 text-green-200'},'PLAGUE PATH','☠️'],
            archer:   ['precision','treeProgressPrecision',3,{header:'bg-sky-900 text-sky-200 border-b-2 border-sky-500',unlocked:'bg-sky-900 border-sky-500 text-sky-200'},'PRECISION PATH','🎯',
                       'survival','treeProgressSurvival',6,{header:'bg-amber-900 text-amber-200 border-b-2 border-amber-500',unlocked:'bg-amber-900 border-amber-500 text-amber-200'},'SURVIVAL PATH','🪤'],
        };

        let classId = player.classId || 'warrior';
        let treeEl = document.getElementById('tree-' + classId);
        if (!treeEl) return;
        treeEl.classList.remove('hidden');

        let cfg = TREE_CONFIGS[classId];
        if (!cfg) return;

        // Get or create dual-path container inside the class tree element
        let dualContainer = treeEl.querySelector('.dual-path-container');
        if (!dualContainer) {
            dualContainer = document.createElement('div');
            dualContainer.className = 'dual-path-container flex gap-2 w-full';
            // Insert after the header row (which is the first child)
            let header = treeEl.querySelector('.tree-class-header');
            if (header) header.insertAdjacentElement('afterend', dualContainer);
            else treeEl.appendChild(dualContainer);
        }
        dualContainer.innerHTML = '';

        // Build Path 1 section
        let path1 = buildSkillTreePath(cfg[0], cfg[1], cfg[2], cfg[3], cfg[4], cfg[5]);
        // Build Path 2 section
        let path2 = buildSkillTreePath(cfg[6], cfg[7], cfg[8], cfg[9], cfg[10], cfg[11]);

        dualContainer.appendChild(path1);
        dualContainer.appendChild(path2);

        // Clear old enhancements container (kept for layout compatibility)
        let enhContainer = document.getElementById('skill-tree-enhancements');
        if (enhContainer) enhContainer.innerHTML = '';

        if (_retroEnhancementsDirty) { _retroEnhancementsDirty = false; saveGame(); }
    } catch(e) {
        console.error('Error rendering skill tree:', e);
    }
}

function unlockNextNode(path, index=0) {
    if(player.skillPoints < 1) return;
    function storeRolledEnhancement(p, idx) {
        let enh = rollEnhancement();
        globalProgression.skillTreeEnhancements.push(enh);
        if(!player.nodeEnhancements[p]) player.nodeEnhancements[p] = {};
        player.nodeEnhancements[p][idx] = enh;
        showEnhancementPopup(enh);
    }
    
    if (path === 'offense' || path === 'defense') {
        player.skillPoints--;
        let attrs = ['hp', 'tenacity', 'agility', 'willpower', 'resistance', 'reflexes', 'fury', 'rawPower', 'force', 'revival', 'vampire'];
        let picked = attrs[Math.floor(Math.random() * attrs.length)];
        
        if(path === 'offense') {
            player.treeProgressOffense = (player.treeProgressOffense||0) + 1;
            if(index === 4) { if(!player.unlockedSkills.includes(3)) player.unlockedSkills.push(3); }
            else if(index === 9) { if(!player.unlockedSkills.includes(4)) player.unlockedSkills.push(4); }
            else if(index === 14) { if(!player.unlockedSkills.includes(5)) player.unlockedSkills.push(5); }
            else {
                globalProgression.attributes[picked] = (globalProgression.attributes[picked] || 0) + 1;
                showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-red-400');
                storeRolledEnhancement(path, index);
            }
        } else {
            player.treeProgressDefense = (player.treeProgressDefense||0) + 1;
            if(index === 4) { if(!player.unlockedSkills.includes(6)) player.unlockedSkills.push(6); }
            else if(index === 9) { if(!player.unlockedSkills.includes(7)) player.unlockedSkills.push(7); }
            else if(index === 14) { if(!player.unlockedSkills.includes(8)) player.unlockedSkills.push(8); }
            else {
                globalProgression.attributes[picked] = (globalProgression.attributes[picked] || 0) + 1;
                showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-blue-400');
                storeRolledEnhancement(path, index);
            }
        }
    }
    else if (path === 'fire' || path === 'ice') {
        player.skillPoints--;
        let attrs = ['hp', 'tenacity', 'agility', 'willpower', 'resistance', 'reflexes', 'fury', 'rawPower', 'force', 'revival', 'vampire'];
        let picked = attrs[Math.floor(Math.random() * attrs.length)];
        
        if(path === 'fire') {
            player.treeProgressFire = (player.treeProgressFire||0) + 1;
            if(index === 4) { if(!player.unlockedSkills.includes(3)) player.unlockedSkills.push(3); }
            else if(index === 9) { if(!player.unlockedSkills.includes(4)) player.unlockedSkills.push(4); }
            else if(index === 14) { if(!player.unlockedSkills.includes(5)) player.unlockedSkills.push(5); }
            else {
                globalProgression.attributes[picked] = (globalProgression.attributes[picked] || 0) + 1;
                showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-orange-400');
                storeRolledEnhancement(path, index);
            }
        } else {
            player.treeProgressIce = (player.treeProgressIce||0) + 1;
            if(index === 4) { if(!player.unlockedSkills.includes(6)) player.unlockedSkills.push(6); }
            else if(index === 9) { if(!player.unlockedSkills.includes(7)) player.unlockedSkills.push(7); }
            else if(index === 14) { if(!player.unlockedSkills.includes(8)) player.unlockedSkills.push(8); }
            else {
                globalProgression.attributes[picked] = (globalProgression.attributes[picked] || 0) + 1;
                showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-cyan-400');
                storeRolledEnhancement(path, index);
            }
        }
    }
    else if (path === 'holy' || path === 'guardian') {
        player.skillPoints--;
        let attrs = ['hp', 'tenacity', 'agility', 'willpower', 'resistance', 'reflexes', 'fury', 'rawPower', 'force', 'revival', 'vampire'];
        let picked = attrs[Math.floor(Math.random() * attrs.length)];
        if(path === 'holy') {
            player.treeProgressHoly = (player.treeProgressHoly||0) + 1;
            if(index === 4) { if(!player.unlockedSkills.includes(3)) player.unlockedSkills.push(3); }
            else if(index === 9) { if(!player.unlockedSkills.includes(4)) player.unlockedSkills.push(4); }
            else if(index === 14) { if(!player.unlockedSkills.includes(5)) player.unlockedSkills.push(5); }
            else {
                globalProgression.attributes[picked] = (globalProgression.attributes[picked] || 0) + 1;
                showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-yellow-400');
                storeRolledEnhancement(path, index);
            }
        } else {
            player.treeProgressGuardian = (player.treeProgressGuardian||0) + 1;
            if(index === 4) { if(!player.unlockedSkills.includes(6)) player.unlockedSkills.push(6); }
            else if(index === 9) { if(!player.unlockedSkills.includes(7)) player.unlockedSkills.push(7); }
            else if(index === 14) { if(!player.unlockedSkills.includes(8)) player.unlockedSkills.push(8); }
            else {
                globalProgression.attributes[picked] = (globalProgression.attributes[picked] || 0) + 1;
                showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-emerald-400');
                storeRolledEnhancement(path, index);
            }
        }
    }
    else if (path === 'shadow' || path === 'venom') {
        player.skillPoints--;
        let attrs = ['hp', 'tenacity', 'agility', 'willpower', 'resistance', 'reflexes', 'fury', 'rawPower', 'force', 'revival', 'vampire'];
        let picked = attrs[Math.floor(Math.random() * attrs.length)];
        if(path === 'shadow') {
            player.treeProgressShadow = (player.treeProgressShadow||0) + 1;
            if(index === 4) { if(!player.unlockedSkills.includes(3)) player.unlockedSkills.push(3); }
            else if(index === 9) { if(!player.unlockedSkills.includes(4)) player.unlockedSkills.push(4); }
            else if(index === 14) { if(!player.unlockedSkills.includes(5)) player.unlockedSkills.push(5); }
            else {
                globalProgression.attributes[picked] = (globalProgression.attributes[picked] || 0) + 1;
                showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-violet-400');
                storeRolledEnhancement(path, index);
            }
        } else {
            player.treeProgressVenom = (player.treeProgressVenom||0) + 1;
            if(index === 4) { if(!player.unlockedSkills.includes(6)) player.unlockedSkills.push(6); }
            else if(index === 9) { if(!player.unlockedSkills.includes(7)) player.unlockedSkills.push(7); }
            else if(index === 14) {
                if(player.data.skills[8] && !player.unlockedSkills.includes(8)) {
                    player.unlockedSkills.push(8);
                } else {
                    globalProgression.attributes[picked] = (globalProgression.attributes[picked] || 0) + 1;
                    showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-lime-400');
                    storeRolledEnhancement(path, index);
                }
            } else {
                globalProgression.attributes[picked] = (globalProgression.attributes[picked] || 0) + 1;
                showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-lime-400');
                storeRolledEnhancement(path, index);
            }
        }
    }
    else if (path === 'divine' || path === 'plague') {
        player.skillPoints--;
        let attrs = ['hp', 'tenacity', 'agility', 'willpower', 'resistance', 'reflexes', 'fury', 'happiness', 'rawPower', 'force', 'revival', 'vampire'];
        let picked = attrs[Math.floor(Math.random() * attrs.length)];
        if(path === 'divine') {
            player.treeProgressDivine = (player.treeProgressDivine||0) + 1;
            if(index === 4) { if(!player.unlockedSkills.includes(3)) player.unlockedSkills.push(3); }
            else if(index === 9) { if(!player.unlockedSkills.includes(4)) player.unlockedSkills.push(4); }
            else if(index === 14) { if(!player.unlockedSkills.includes(5)) player.unlockedSkills.push(5); }
            else {
                globalProgression.attributes[picked] = (globalProgression.attributes[picked] || 0) + 1;
                showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-pink-400');
                storeRolledEnhancement(path, index);
            }
        } else {
            player.treeProgressPlague = (player.treeProgressPlague||0) + 1;
            if(index === 4) { if(!player.unlockedSkills.includes(6)) player.unlockedSkills.push(6); }
            else if(index === 9) { if(!player.unlockedSkills.includes(7)) player.unlockedSkills.push(7); }
            else if(index === 14) { if(!player.unlockedSkills.includes(8)) player.unlockedSkills.push(8); }
            else {
                globalProgression.attributes[picked] = (globalProgression.attributes[picked] || 0) + 1;
                showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-green-600');
                storeRolledEnhancement(path, index);
            }
        }
    }
    else if (path === 'precision' || path === 'survival') {
        player.skillPoints--;
        let stats = ['hp', 'tenacity', 'agility', 'willpower', 'resistance', 'reflexes', 'fury'];
        let picked = stats[Math.floor(Math.random() * stats.length)];
        if(path === 'precision') {
            player.treeProgressPrecision = (player.treeProgressPrecision||0) + 1;
            if(index === 4) { if(!player.unlockedSkills.includes(3)) player.unlockedSkills.push(3); }
            else if(index === 9) { if(!player.unlockedSkills.includes(4)) player.unlockedSkills.push(4); }
            else if(index === 14) { if(!player.unlockedSkills.includes(5)) player.unlockedSkills.push(5); }
            else {
                globalProgression.attributes[picked] = (globalProgression.attributes[picked] || 0) + 1;
                showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-sky-400');
                storeRolledEnhancement(path, index);
            }
        } else {
            player.treeProgressSurvival = (player.treeProgressSurvival||0) + 1;
            if(index === 4) { if(!player.unlockedSkills.includes(6)) player.unlockedSkills.push(6); }
            else if(index === 9) { if(!player.unlockedSkills.includes(7)) player.unlockedSkills.push(7); }
            else if(index === 14) { if(!player.unlockedSkills.includes(8)) player.unlockedSkills.push(8); }
            else {
                globalProgression.attributes[picked] = (globalProgression.attributes[picked] || 0) + 1;
                showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-amber-400');
                storeRolledEnhancement(path, index);
            }
        }
    }
    
    player.maxHp = calculateMaxHp(); 
    playSound('win');
    saveGame(); 
    showSkillTree();
}

function unlockInfinite(stat) {
    if(player.skillPoints < 1) return; player.skillPoints--;
    if(stat === 'hp') { player.treeBonusHp += 20; player.currentHp += 20; } if(stat === 'dmg') player.treeBonusDmg += 5; if(stat === 'def') player.treeBonusDef += 2;
    player.maxHp = calculateMaxHp(); saveGame(); showSkillTree();
}

function rollEnhancement() {
    let rarityRoll = Math.random();
    let rarity;
    if(rarityRoll < 0.01) rarity = 'legendary';
    else if(rarityRoll < 0.11) rarity = 'epic';
    else if(rarityRoll < 0.31) rarity = 'rare';
    else rarity = 'normal';
    
    let typeRoll = Math.random() * 100;
    let enhType;
    if(typeRoll < 35) enhType = 'damageBoost';
    else if(typeRoll < 70) enhType = 'hpBoost';
    else if(typeRoll < 75) enhType = 'wayOfHeavens';
    else if(typeRoll < 78) enhType = 'rage';
    else if(typeRoll < 81) enhType = 'divineShield';
    else if(typeRoll < 84) enhType = 'reflect';
    else if(typeRoll < 89) enhType = 'xpIncrease';
    else if(typeRoll < 97) enhType = 'dropRate';
    else enhType = 'skillCDReduc';
    
    if(enhType === 'wayOfHeavens' || enhType === 'skillCDReduc') rarity = 'legendary';

    if(enhType === 'wayOfHeavens') {
        let hasWoH = globalProgression.skillTreeEnhancements.some(e => e.type === 'wayOfHeavens');
        if(hasWoH) {
            if(typeRoll < 75) enhType = 'damageBoost';
            else if(typeRoll < 89) enhType = 'hpBoost';
            else enhType = 'xpIncrease';
        }
    }

    if(enhType === 'rage') {
        let hasRage = globalProgression.skillTreeEnhancements.some(e => e.type === 'rage');
        if(hasRage) {
            if(typeRoll < 78) enhType = 'damageBoost';
            else if(typeRoll < 84) enhType = 'hpBoost';
            else enhType = 'xpIncrease';
        }
    }

    if(enhType === 'divineShield') {
        let hasDS = globalProgression.skillTreeEnhancements.some(e => e.type === 'divineShield');
        if(hasDS) {
            if(typeRoll < 81) enhType = 'damageBoost';
            else if(typeRoll < 89) enhType = 'hpBoost';
            else enhType = 'xpIncrease';
        }
    }

    if(enhType === 'reflect') {
        let hasReflect = globalProgression.skillTreeEnhancements.some(e => e.type === 'reflect');
        if(hasReflect) {
            if(typeRoll < 84) enhType = 'damageBoost';
            else if(typeRoll < 89) enhType = 'hpBoost';
            else enhType = 'xpIncrease';
        }
    }

    if(enhType === 'skillCDReduc') {
        let hasCDR = globalProgression.skillTreeEnhancements.some(e => e.type === 'skillCDReduc');
        if(hasCDR) {
            if(typeRoll < 89) enhType = 'dropRate';
            else enhType = 'xpIncrease';
        }
    }
    
    if(enhType !== 'wayOfHeavens' && enhType !== 'skillCDReduc' && enhType !== 'dropRate') rarity = 'normal';
    
    return { type: enhType, rarity: rarity };
}

function showEnhancementPopup(enh) {
    let def = ENHANCEMENT_DEFS[enh.type];
    let rarityColor = ENHANCEMENT_RARITY_COLORS[enh.rarity];
    let popup = document.createElement('div');
    popup.id = 'enhancement-popup';
    popup.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;';
    popup.innerHTML = `
        <div class="bg-gray-900 border-2 ${ENHANCEMENT_RARITY_BORDERS[enh.rarity]} rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
            <div class="text-5xl mb-3">${def.icon}</div>
            <div class="text-xs text-gray-400 uppercase tracking-widest mb-1">New Enhancement Unlocked!</div>
            <div class="text-2xl font-black ${rarityColor} mb-1">${def.name}</div>
            <div class="text-sm font-bold ${rarityColor} uppercase tracking-widest mb-3">${enh.rarity}</div>
            <div class="text-sm text-gray-300 bg-gray-800 rounded-xl p-3 mb-4">${def.desc(enh.rarity)}</div>
            <button onclick="document.getElementById('enhancement-popup').remove()" class="w-full bg-indigo-700 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl transition active:scale-95">
                Awesome!
            </button>
        </div>
    `;
    document.body.appendChild(popup);
}

let rerollOnCooldown = false;

function rerollEnhancement(path, nodeIndex) {
    if(rerollOnCooldown) return;
    let enh = getNodeEnhancement(path, nodeIndex);
    if(!enh || enh.rarity === 'legendary') return;
    if(globalProgression.gold < 20) { alert('Not enough gold! Need 20G to re-roll.'); return; }
    rerollOnCooldown = true;
    globalProgression.gold -= 20;
    { let ps = ensureProgressStats(); ps.goldSpent += 20; }
    let rarityRoll = Math.random();
    let newRarity;
    if(rarityRoll < 0.01) newRarity = 'legendary';
    else if(rarityRoll < 0.11) newRarity = 'epic';
    else if(rarityRoll < 0.31) newRarity = 'rare';
    else newRarity = 'normal';
    let rarityIndex = ENHANCEMENT_RARITIES.indexOf(enh.rarity);
    let newRarityIndex = ENHANCEMENT_RARITIES.indexOf(newRarity);
    let success = newRarityIndex > rarityIndex;
    if(success) {
        enh.rarity = newRarity;
        if(newRarity === 'legendary') showEnhancementPopup({ type: enh.type, rarity: 'legendary' });
    }
    player.maxHp = calculateMaxHp();
    saveGame();
    let nodeEl = document.getElementById(`node-enh-${path}-${nodeIndex}`);
    if(nodeEl) {
        let animClass = success ? 'enh-reroll-success' : 'enh-reroll-fail';
        nodeEl.classList.add(animClass);
        showFloatText(`node-enh-${path}-${nodeIndex}`, success ? '⬆️ UPGRADED!' : '❌ FAILED', success ? 'text-green-400' : 'text-red-400');
        setTimeout(() => { rerollOnCooldown = false; showSkillTree(); }, 500);
    } else {
        rerollOnCooldown = false;
        showSkillTree();
    }
}

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
        showFloatText(`enemy-card-${i}`, `-${dmg}`, 'text-yellow-400');
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

// --- ENCHANTER ---
function showEnchanter() {
    let p = globalProgression;
    const list = document.getElementById('enchant-modal-list'); list.innerHTML = '';
    document.getElementById('ench-list').innerHTML = '';
    
    let hasGear = false;
    EQUIP_SLOTS.forEach(slot => {
        let eq = globalProgression.equipped[slot];
        if(eq) {
            hasGear = true;
            let btn = document.createElement('div');
            btn.className = `bg-gray-800 border-2 rarity-${eq.rarity} p-3 rounded-lg flex justify-between items-center shadow-md`;
            let enchStatus = eq.enchanted ? `<span class="text-xs text-yellow-300 bg-gray-900 px-2 py-1 rounded">(${eq.enchanted})</span>` : 
                `<button onclick="openEnchantModal('${slot}')" class="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded text-xs font-bold transition active:scale-95 shadow-md">Enchant</button>`;
            
            btn.innerHTML = `<div class="flex items-center gap-2"><span class="text-3xl">${eq.icon}</span><div><div class="font-bold text-white">${eq.name}</div>${eq.type === 'weapon' && eq.weaponBaseDmgPct ? `<div class="text-xs text-green-400">Weapon Dmg: +${(eq.weaponBaseDmgPct*100).toFixed(1)}%</div>` : ''}</div></div> ${enchStatus}`;
            document.getElementById('ench-list').appendChild(btn);
        }
    });

    if(!hasGear) document.getElementById('ench-list').innerHTML = `<div class="text-gray-500 text-center py-4 bg-gray-900 rounded-lg shadow-inner">You must equip gear first to enchant it.</div>`;

    // Soul Core Fusion section
    const mergeContainer = document.getElementById('ench-core-merge');
    if(mergeContainer) {
        mergeContainer.innerHTML = `<div class="border-t border-gray-700 pt-4"><h3 class="font-bold text-purple-300 mb-3 text-center uppercase tracking-widest text-sm">⚗️ Soul Core Fusion</h3></div>`;
        const merges = [
            { from: 'ench_common',     to: 'ench_rare',       fromName: 'Normal Cores',  toName: 'Rare Core' },
            { from: 'ench_rare',       to: 'ench_epic',       fromName: 'Rare Cores',    toName: 'Epic Core' },
            { from: 'ench_epic',       to: 'ench_legendary',  fromName: 'Epic Cores',    toName: 'Legendary Core' }
        ];
        merges.forEach(m => {
            let amt = globalProgression.inventory[m.from] || 0;
            let canMerge = amt >= 20;
            let div = document.createElement('div');
            div.className = 'bg-gray-800 border border-purple-700 rounded-lg p-3 flex justify-between items-center';
            div.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="text-2xl">${MAT_ICONS[m.from]}</span>
                    <div>
                        <div class="text-sm font-bold text-white">20 ${m.fromName} → 1 ${m.toName}</div>
                        <div class="text-xs text-gray-400">Owned: ${amt} / 20</div>
                    </div>
                    <span class="text-lg px-2">➡️</span>
                    <span class="text-2xl">${MAT_ICONS[m.to]}</span>
                </div>
                <button onclick="mergeSoulCores('${m.from}','${m.to}')" class="bg-purple-700 hover:bg-purple-600 text-white font-bold px-3 py-2 rounded text-xs transition active:scale-95 shadow-md ${canMerge ? '' : 'opacity-50 cursor-not-allowed'}" ${canMerge ? '' : 'disabled'}>MERGE</button>
            `;
            mergeContainer.appendChild(div);
        });
    }
    
    switchScreen('screen-enchanter');
}

function mergeSoulCores(fromId, toId) {
    if((globalProgression.inventory[fromId] || 0) < 20) return;
    globalProgression.inventory[fromId] -= 20;
    globalProgression.inventory[toId] = (globalProgression.inventory[toId] || 0) + 1;
    playSound('win');
    saveGame();
    showEnchanter();
}

let activeEnchantSlot = null;
function openEnchantModal(slot) {
    activeEnchantSlot = slot;
    const eq = globalProgression.equipped[slot];
    if(!eq || eq.enchanted) return;

    document.getElementById('enchant-modal-title').innerText = `Enchant ${eq.name}`;
    const list = document.getElementById('enchant-modal-list'); list.innerHTML = '';
    
    const cores = [
        { id: 'ench_common', name: 'Normal Core', boost: 5, color: 'gray', mult: 1.05 },
        { id: 'ench_rare', name: 'Rare Core', boost: 10, color: 'blue', mult: 1.10 },
        { id: 'ench_epic', name: 'Epic Core', boost: 20, color: 'purple', mult: 1.20 },
        { id: 'ench_legendary', name: 'Legendary Core', boost: 40, color: 'yellow', mult: 1.40 }
    ];

    cores.forEach(c => {
        let amt = globalProgression.inventory[c.id] || 0;
        let btn = document.createElement('button');
        let canEnch = amt > 0;
        btn.className = `bg-gray-900 border-2 border-${c.color}-500 p-3 rounded-lg flex justify-between items-center transition ${canEnch ? 'hover:bg-gray-700 active:scale-95' : 'opacity-50 cursor-not-allowed'}`;
        btn.disabled = !canEnch;
        btn.innerHTML = `
            <div class="text-left flex items-center gap-3">
                <span class="text-2xl">${MAT_ICONS[c.id]}</span>
                <div><div class="font-bold text-${c.color}-400">${c.name} <span class="text-white text-xs ml-1">x${amt}</span></div><div class="text-[10px] text-gray-400">+${c.boost}% Stats</div></div>
            </div>
            <div class="text-xs font-bold text-white bg-${c.color}-700 px-3 py-1 rounded shadow">USE</div>
        `;
        if(canEnch) { btn.onclick = () => { applyEnchant(c.id, c.mult, c.name); }; }
        list.appendChild(btn);
    });

    document.getElementById('modal-enchant').style.display = 'flex';
}
function closeEnchantModal() { document.getElementById('modal-enchant').style.display = 'none'; document.getElementById('ench-list').innerHTML=''; showEnchanter(); }

function applyEnchant(coreId, mult, coreName) {
    let eq = globalProgression.equipped[activeEnchantSlot];
    if(eq && !eq.enchanted && globalProgression.inventory[coreId] > 0) {
        globalProgression.inventory[coreId]--;
        eq.enchanted = coreName;
        // Enhance weapon base damage percentage for new gear system
        if(eq.weaponBaseDmgPct) {
            eq.weaponBaseDmgPct = eq.weaponBaseDmgPct * mult;
        }
        // Enhance bonus stats values
        if(eq.bonusStats) {
            eq.bonusStats.forEach(bs => { if(bs.stat !== 'bonusCdReduc') bs.value = bs.value * mult; });
        }
        // Legacy flat stats (old save data compatibility)
        if(eq.stats) {
            if(eq.stats.hp) eq.stats.hp = Math.floor(eq.stats.hp * mult) + 1;
            if(eq.stats.dmg) eq.stats.dmg = Math.floor(eq.stats.dmg * mult) + 1;
            if(eq.stats.def) eq.stats.def = Math.floor(eq.stats.def * mult) + 1;
        }
        playSound('win'); player.maxHp = calculateMaxHp(); saveGame(); closeEnchantModal();
    }
}

// --- INVENTORY, SHOP, ETC ---
function openCombatBag() {
    let inv = globalProgression.inventory;
    const list = document.getElementById('combat-bag-list'); list.innerHTML = '';
    
    let hasAny = false;
    // Show Consumables only
    Object.keys(CONSUMABLES).forEach(key => {
        let amt = inv[key] || 0;
        if(amt > 0) {
            hasAny = true;
            let c = CONSUMABLES[key];
            list.innerHTML += `<div class="bg-gray-900 border border-gray-700 p-2 rounded flex justify-between items-center"><div class="flex items-center gap-2"><span class="text-xl">${c.icon}</span> <div><b class="text-white text-sm">${c.name}</b><div class="text-[10px] text-gray-400">${c.desc}</div></div></div> <span class="text-yellow-400 font-bold">x${amt}</span></div>`;
        }
    });

    if(!hasAny) list.innerHTML = '<p class="text-gray-500 text-center py-4 text-sm">No consumables in bag.</p>';
    
    document.getElementById('modal-combat-bag').style.display = 'flex';
}
function closeCombatBag() {
    document.getElementById('modal-combat-bag').style.display = 'none';
}

function showInventory() {
    let inv = globalProgression.inventory;
    const matList = document.getElementById('inv-materials-list'); matList.innerHTML = '';
    let hasMats = false;
    ['ench_common', 'ench_rare', 'ench_epic', 'ench_legendary', 'herb_red', 'herb_blue', 'fish_1', 'fish_2', 'fish_3', 'fish_4', 'fish_5', 'fish_6', 'soul_pebbles', 'titan_shard'].forEach(key => {
        if(inv[key] > 0) { hasMats = true; matList.innerHTML += `<div class="bag-item p-3 rounded-xl flex justify-between items-center shadow-inner"><span class="text-lg">${MAT_ICONS[key]} ${MAT_NAMES[key]}</span> <span class="text-yellow-400 font-bold">${inv[key]}</span></div>`; }
    });
    document.getElementById('inv-mats-header').style.display = hasMats ? 'block' : 'none';
    if(!hasMats) matList.innerHTML = '<p class="text-stone-500 text-sm">No materials.</p>';

    const consList = document.getElementById('inv-potions-list'); consList.innerHTML = '';
    let hasCons = false;
    Object.keys(CONSUMABLES).forEach(key => {
        let c = CONSUMABLES[key]; let amt = inv[key] || 0;
        if (amt > 0) { hasCons = true; consList.innerHTML += `<div class="bag-item p-3 rounded-xl flex justify-between items-center shadow-inner"><div class="flex items-center gap-3"><span class="text-3xl bg-black bg-opacity-30 p-2 rounded-lg">${c.icon}</span> <div><div class="font-bold text-stone-200">${c.name}</div><div class="text-xs text-stone-400">${c.desc}</div></div></div><div class="font-bold text-xl text-yellow-400 bg-black bg-opacity-40 px-3 py-1 rounded-lg border border-stone-600">x${amt}</div></div>`; }
    });
    document.getElementById('inv-cons-header').style.display = hasCons ? 'block' : 'none';
    if (!hasCons) consList.innerHTML = '<p class="text-stone-500 text-sm">No consumables.</p>';
    
    switchScreen('screen-inventory');
}

function showShop() {
    let p = globalProgression; document.getElementById('shop-gold-display').innerText = p.gold; document.getElementById('shop-owned-tickets').innerText = p.tickets || 0;
    
    // Daily Gear Generation
    const gearList = document.getElementById('shop-gear-list'); gearList.innerHTML = '';
    let now = Date.now();
    if(!p.shopGear || p.shopGear.length === 0 || now - (p.shopLastRefresh||0) > 24*60*60*1000) {
        p.shopLastRefresh = now;
        generateShopGear();
    }
    
    p.shopGear.forEach((g, idx) => {
        let div = document.createElement('div');
        if(g.bought) {
            div.className = `bg-gray-900 border-2 border-gray-700 p-3 rounded-lg flex justify-between items-center opacity-50`;
            div.innerHTML = `<div class="flex items-center gap-2"><span class="text-2xl">${g.item.icon}</span><span class="text-gray-500 line-through">${g.item.name}</span></div> <span class="text-xs font-bold text-gray-500">SOLD OUT</span>`;
        } else {
            div.className = `bg-gray-800 border-2 rarity-${g.item.rarity} p-3 rounded-lg flex justify-between items-center shadow-md`;
            div.innerHTML = `<div class="flex items-center gap-2"><span class="text-2xl">${g.item.icon}</span><div><div class="font-bold text-white">${g.item.name} <span class="text-[10px] text-gray-500 uppercase">${g.item.rarity}</span></div>${g.item.type === 'weapon' && g.item.weaponBaseDmgPct ? `<div class="text-xs text-green-400">Weapon Dmg: +${(g.item.weaponBaseDmgPct*100).toFixed(1)}%</div>` : ''}</div></div><button onclick="buyShopGear(${idx})" class="bg-blue-800 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold transition active:scale-95 shadow-md flex items-center gap-1"><span>Buy</span><span class="text-yellow-400">💰${g.cost}</span></button>`;
        }
        gearList.appendChild(div);
    });

    const sellList = document.getElementById('shop-sell-list'); sellList.innerHTML = '';
    
    // Gear Selling only (grouped by Name+Rarity) — no consumables
    let gearGroups = {};
    p.equipInventory.forEach(eq => {
        let key = `${eq.name}_${eq.rarity}`;
        if(!gearGroups[key]) gearGroups[key] = { count: 0, rarity: eq.rarity, name: eq.name, icon: eq.icon, ids: [] };
        gearGroups[key].count++;
        gearGroups[key].ids.push(eq.id);
    });

    const gearKeys = Object.keys(gearGroups);
    if(gearKeys.length > 0) {
        let totalGearValue = gearKeys.reduce((sum, key) => sum + (gearGroups[key].count * getGearSellPrice(gearGroups[key].rarity)), 0);
        let sellAllBtn = document.createElement('button');
        sellAllBtn.className = 'w-full bg-red-800 hover:bg-red-700 border border-red-600 text-white font-bold py-2 px-4 rounded text-sm transition active:scale-95 mb-3';
        sellAllBtn.innerHTML = `Sell All Gear (${totalGearValue}G)`;
        sellAllBtn.onclick = () => sellAllGear();
        sellList.appendChild(sellAllBtn);
    }

    gearKeys.forEach(key => {
        let g = gearGroups[key];
        let price = getGearSellPrice(g.rarity);
        let div = document.createElement('div'); div.className = "flex justify-between items-center mb-2 border-b border-gray-700 pb-2 last:border-0";
        div.innerHTML = `<div><span class="text-xl mr-1">${g.icon}</span> <span class="font-bold text-white">${g.name}</span> <span class="text-yellow-400 font-bold ml-2">x${g.count}</span><br><span class="text-[10px] text-gray-400 uppercase">Sells for ${price}G each</span></div><div class="flex gap-2"><button onclick="sellGear('${key}', 1)" class="bg-gray-700 hover:bg-gray-600 border border-gray-500 px-3 py-1 rounded text-xs font-bold transition active:scale-95">Sell 1</button><button onclick="sellGear('${key}', 'all')" class="bg-yellow-700 hover:bg-yellow-600 border border-yellow-500 px-3 py-1 rounded text-xs font-bold transition active:scale-95">Sell All</button></div>`;
        sellList.appendChild(div);
    });

    if(gearKeys.length === 0) sellList.innerHTML = '<p class="text-gray-500 text-sm text-center">No gear to sell.</p>';
    switchScreen('screen-shop');
}

function generateShopGear() {
    globalProgression.shopGear = [];
    for(let i=0; i<3; i++) {
        let roll = Math.random();
        let rarity = 'common';
        if(roll < 0.01) rarity = 'mythic';
        else if(roll < 0.02) rarity = 'legendary';
        else if(roll < 0.12) rarity = 'epic';
        else if(roll < 0.32) rarity = 'rare';
        
        let item = rollEquipment(rarity);
        let cost = GEAR_BUY_PRICES[rarity] || GEAR_BUY_PRICES.common;
        globalProgression.shopGear.push({ item: item, cost: cost, bought: false });
    }
    saveGame();
}

function refreshShopGear() {
    if(globalProgression.gold >= 20) {
        globalProgression.gold -= 20;
        playSound('click');
        globalProgression.shopLastRefresh = Date.now();
        generateShopGear();
        showShop();
    } else {
        playSound('lose');
    }
}

function buyShopGear(idx) {
    let sg = globalProgression.shopGear[idx];
    if(!sg.bought && globalProgression.gold >= sg.cost) {
        globalProgression.gold -= sg.cost;
        sg.bought = true;
        let ps = ensureProgressStats(); ps.goldSpent += sg.cost;
        globalProgression.equipInventory.push(sg.item);
        globalProgression.newItems[sg.item.type.startsWith('ring') ? 'ring' : sg.item.type] = true; 
        playSound('win'); saveGame(); showShop();
    } else if(globalProgression.gold < sg.cost) {
        playSound('lose');
    }
}

function sellItem(type, amount) {
    let invAmount = globalProgression.inventory[type] || 0; let sellCount = amount === 'all' ? invAmount : amount;
    if (sellCount > 0 && invAmount >= sellCount) { globalProgression.inventory[type] -= sellCount; globalProgression.gold += (sellCount * MAT_PRICES[type]); playSound('click'); saveGame(); showShop(); }
}

function sellGear(groupKey, amount) {
    let p = globalProgression;
    let matchingIds = [];
    let pricePer = 0;
    
    p.equipInventory.forEach(eq => {
        if(`${eq.name}_${eq.rarity}` === groupKey) {
            matchingIds.push(eq.id);
            pricePer = getGearSellPrice(eq.rarity);
        }
    });

    let sellCount = amount === 'all' ? matchingIds.length : amount;
    if(sellCount > 0 && matchingIds.length >= sellCount) {
        let idsToRemove = matchingIds.slice(0, sellCount);
        p.equipInventory = p.equipInventory.filter(eq => !idsToRemove.includes(eq.id));
        p.gold += (sellCount * pricePer);
        playSound('click'); saveGame(); showShop();
    }
}

function getGearSellPrice(rarity) {
    return GEAR_SELL_PRICES[rarity] || GEAR_SELL_PRICES.common;
}

function sellAllGear() {
    let p = globalProgression;
    let totalGold = p.equipInventory.reduce((sum, eq) => sum + getGearSellPrice(eq.rarity), 0);
    if(totalGold > 0) {
        p.equipInventory = [];
        p.gold += totalGold;
        playSound('click'); saveGame(); showShop();
    }
}

function buyTicket(source = 'shop') {
    if(globalProgression.gold >= 100) { globalProgression.gold -= 100; let ps = ensureProgressStats(); ps.goldSpent += 100; globalProgression.tickets = (globalProgression.tickets||0) + 1; playSound('win'); saveGame(); if(source === 'dungeon') showDungeons(); else if(source === 'invasion') showInvasion(); else showShop(); }
    else { playSound('lose'); }
}

function showAlchemist() {
    let p = globalProgression; document.getElementById('alch-gold-display').innerText = p.gold; document.getElementById('alch-herb-red').innerText = p.inventory.herb_red || 0; document.getElementById('alch-herb-blue').innerText = p.inventory.herb_blue || 0;
    const list = document.getElementById('alch-craft-list'); list.innerHTML = '';
    RECIPES_ALCHEMIST.forEach(rec => {
        let pot = CONSUMABLES[rec.id]; let btn = document.createElement('button'); btn.className = `bg-gray-800 p-2 rounded-lg flex justify-between items-center border border-gray-700 hover:border-green-500 transition active:scale-95`;
        let canCraft = p.gold >= rec.gold && (p.inventory[rec.herb] || 0) >= rec.herbAmt;
        btn.disabled = !canCraft; if(!canCraft) btn.classList.add('opacity-50');
        let herbIcon = rec.herb === 'herb_red' ? '🌺' : '💠';
        btn.innerHTML = `<div class="text-left flex items-center gap-2"><span class="text-2xl">${pot.icon}</span> <div><b class="text-white">${pot.name}</b><br><span class="text-[10px] text-gray-400">${pot.desc}</span></div></div><div class="text-yellow-400 font-bold bg-gray-900 px-2 py-1 rounded shadow-inner text-xs flex flex-col items-center gap-1"><span>${herbIcon} ${rec.herbAmt}</span><span>💰 ${rec.gold}</span></div>`;
        btn.onclick = () => { p.gold -= rec.gold; p.inventory[rec.herb] -= rec.herbAmt; p.inventory[rec.id] = (p.inventory[rec.id] || 0) + 1; playSound('heal'); saveGame(); showAlchemist(); };
        list.appendChild(btn);
    });
    switchScreen('screen-alchemist');
}

function showChef() {
    let p = globalProgression; document.getElementById('chef-gold-display').innerText = p.gold; const list = document.getElementById('chef-craft-list'); list.innerHTML = '';
    RECIPES_CHEF.forEach(rec => {
        let food = CONSUMABLES[rec.id]; let btn = document.createElement('button'); btn.className = `bg-gray-800 p-2 rounded-lg flex justify-between items-center border border-gray-700 hover:border-orange-500 transition active:scale-95`;
        let canCraft = p.gold >= rec.gold && (p.inventory[rec.fish] || 0) >= rec.fishAmt;
        btn.disabled = !canCraft; if(!canCraft) btn.classList.add('opacity-50');
        btn.innerHTML = `<div class="text-left flex items-center gap-2"><span class="text-2xl">${food.icon}</span> <div><b class="text-white">${food.name}</b><br><span class="text-[10px] text-gray-400">${food.desc}</span></div></div><div class="text-yellow-400 font-bold bg-gray-900 px-2 py-1 rounded shadow-inner text-xs flex flex-col items-center gap-1"><span>${MAT_ICONS[rec.fish]} ${rec.fishAmt}</span><span>💰 ${rec.gold}</span></div>`;
        btn.onclick = () => { p.gold -= rec.gold; p.inventory[rec.fish] -= rec.fishAmt; p.inventory[rec.id] = (p.inventory[rec.id] || 0) + 1; playSound('win'); saveGame(); showChef(); };
        list.appendChild(btn);
    });
    switchScreen('screen-chef');
}

// --- WORKSHOP MERCHANT ---
function showWorkshop() {
    document.getElementById('workshop-pebbles').innerText = globalProgression.inventory.soul_pebbles || 0;
    const list = document.getElementById('workshop-items-list');
    list.innerHTML = '';

    // Collect ALL mythic items (equipped + in inventory)
    let mythicItems = [];
    // Equipped items
    Object.values(globalProgression.equipped).forEach(item => {
        if(item && item.rarity === 'mythic') mythicItems.push({ item, source: 'equipped' });
    });
    // Inventory items
    (globalProgression.equipInventory || []).forEach((item, idx) => {
        if(item.rarity === 'mythic') mythicItems.push({ item, source: 'inventory', idx });
    });

    if(mythicItems.length === 0) {
        list.innerHTML = '<div class="text-gray-500 text-center py-8 bg-gray-900 rounded-xl border border-gray-700">No Mythic items found. Defeat Mythic Bosses to get them!</div>';
    } else {
        mythicItems.forEach(({ item, source }) => {
            let itemLvl = item.lvl || 1;
            let alreadyMaxed = itemLvl >= player.lvl;
            let hasPebbles = (globalProgression.inventory.soul_pebbles || 0) >= 10;
            let canEnhance = !alreadyMaxed && hasPebbles;

            let card = document.createElement('div');
            card.className = 'bg-gray-900 border-2 border-white rounded-xl p-4 flex justify-between items-center shadow-lg';
            card.style.boxShadow = '0 0 15px rgba(255,255,255,0.3)';
            card.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-3xl">${item.icon || '✨'}</span>
                    <div>
                        <div class="font-black text-white text-sm drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">${item.name}</div>
                        <div class="text-xs text-gray-300">Slot: ${item.type}</div>
                        <div class="text-xs mt-1">
                            <span class="text-cyan-300">Item Lvl: ${itemLvl}</span>
                            <span class="text-gray-400 mx-1">→</span>
                            <span class="text-green-300">Your Lvl: ${player.lvl}</span>
                        </div>
                        <div class="text-xs text-gray-400">${source === 'equipped' ? '📦 Equipped' : '🧳 In Bag'}</div>
                    </div>
                </div>
                <div class="flex flex-col items-center gap-2">
                    ${alreadyMaxed
                        ? '<span class="text-xs text-green-400 font-bold text-center">✓ Already<br>at level</span>'
                        : `<button onclick="workshopEnhance(this)" data-item-name="${item.name}" data-source="${source}" class="bg-cyan-700 hover:bg-cyan-600 text-white font-bold px-3 py-2 rounded-lg transition active:scale-95 text-sm border border-cyan-400 shadow-md ${canEnhance ? '' : 'opacity-50 cursor-not-allowed'}" ${canEnhance ? '' : 'disabled'}>
                            Scale Enhance<br><span class="text-xs text-purple-300">🔮 10</span>
                           </button>`
                    }
                </div>
            `;
            list.appendChild(card);
        });
    }
    switchScreen('screen-workshop');
}

function workshopEnhance(btn) {
    if((globalProgression.inventory.soul_pebbles || 0) < 10) return;
    let itemName = btn.dataset.itemName;
    let source = btn.dataset.source;

    // Find and update the item
    let found = false;
    function recalcMythicItem(item) {
        let newLvl = player.lvl;
        item.lvl = newLvl;
        item.itemLevel = newLvl;
        // Recalculate weapon base damage percentage
        if(item.type === 'weapon') {
            item.weaponBaseDmgPct = 0.001 * newLvl;
        }
        // Recalculate all bonus stat values based on basePerLevel
        if(item.bonusStats) {
            item.bonusStats.forEach(bs => {
                if(bs.basePerLevel) bs.value = bs.basePerLevel * newLvl;
            });
        }
        // Update item name to reflect new level
        let namePrefix = item.name.split(' [Lv.')[0];
        item.name = `${namePrefix} [Lv.${newLvl}]`;
    }
    if(source === 'equipped') {
        Object.values(globalProgression.equipped).forEach(item => {
            if(item && item.name && item.name.includes(itemName.split(' [Lv.')[0]) && item.rarity === 'mythic') {
                recalcMythicItem(item);
                found = true;
            }
        });
    } else {
        (globalProgression.equipInventory || []).forEach(item => {
            if(item && item.name && item.name.includes(itemName.split(' [Lv.')[0]) && item.rarity === 'mythic') {
                recalcMythicItem(item);
                found = true;
            }
        });
    }

    if(found) {
        globalProgression.inventory.soul_pebbles -= 10;
        playSound('win');
        // Success animation on button
        btn.innerText = '✨ Scaled!';
        btn.style.background = 'linear-gradient(135deg, #0891b2, #0e7490)';
        btn.disabled = true;
        saveGame();
        setTimeout(() => showWorkshop(), 1000);
    }
}

// --- BURGLAR MERCHANT ---
function showBurglar() {
    const today = new Date().toDateString();
    if(globalProgression.burglarLastPurchaseDate !== today) {
        globalProgression.burglarDailyPurchases = 0;
        globalProgression.burglarLastPurchaseDate = today;
    }
    document.getElementById('burglar-gold-display').innerText = globalProgression.gold;
    document.getElementById('burglar-daily-count').innerText = globalProgression.burglarDailyPurchases || 0;

    const list = document.getElementById('burglar-items-list');
    list.innerHTML = '';

    Object.values(USABLE_ITEMS).forEach(item => {
        let canBuy = globalProgression.gold >= item.price && (globalProgression.burglarDailyPurchases || 0) < 2;
        let ownedAmt = (globalProgression.usableItems || {})[item.id] || 0;

        let card = document.createElement('div');
        card.className = 'bg-gray-800 border border-gray-600 rounded-xl p-3 flex justify-between items-center transition hover:border-red-600';
        card.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-3xl">${item.icon}</span>
                <div>
                    <div class="font-bold text-white text-sm">${item.name}</div>
                    <div class="text-[10px] text-gray-400">${item.desc}</div>
                    <div class="text-[10px] mt-1">
                        ${item.cooldown > 0 ? `<span class="text-blue-300">⏱ ${item.cooldown}t cooldown</span>` : '<span class="text-green-300">⚡ No cooldown</span>'}
                        ${item.immuneToCDR ? '<span class="text-yellow-400 ml-1">🔒 CDR immune</span>' : ''}
                    </div>
                    <div class="text-[10px] text-gray-500">Owned: ${ownedAmt}</div>
                </div>
            </div>
            <button onclick="burglarBuy('${item.id}')" class="bg-red-700 hover:bg-red-600 text-white font-bold px-3 py-2 rounded-lg transition active:scale-95 text-sm flex flex-col items-center border border-red-500 ${canBuy ? '' : 'opacity-50 cursor-not-allowed'}" ${canBuy ? '' : 'disabled'}>
                BUY<span class="text-yellow-400 text-xs">💰${item.price}</span>
            </button>
        `;
        list.appendChild(card);
    });
    switchScreen('screen-burglar');
}

function burglarBuy(itemId) {
    const today = new Date().toDateString();
    if(globalProgression.burglarLastPurchaseDate !== today) {
        globalProgression.burglarDailyPurchases = 0;
        globalProgression.burglarLastPurchaseDate = today;
    }
    if((globalProgression.burglarDailyPurchases || 0) >= 2) return;
    let item = USABLE_ITEMS[itemId];
    if(!item || globalProgression.gold < item.price) return;

    globalProgression.gold -= item.price;
    if(!globalProgression.usableItems) globalProgression.usableItems = {};
    globalProgression.usableItems[itemId] = (globalProgression.usableItems[itemId] || 0) + 1;
    if (!player.equippedUsables) player.equippedUsables = [null, null, null, null, null, null, null];
    let numUnlocked = Math.min(7, 1 + Math.floor(player.lvl / 4));
    let emptySlot = -1;
    for (let i = 0; i < numUnlocked; i++) {
        if (player.equippedUsables[i] === null) { emptySlot = i; break; }
    }
    if (emptySlot !== -1) player.equippedUsables[emptySlot] = itemId;
    globalProgression.burglarDailyPurchases = (globalProgression.burglarDailyPurchases || 0) + 1;
    let ps = ensureProgressStats(); ps.goldSpent += item.price;
    playSound('win');
    saveGame();
    showBurglar();
}

// --- WEAPON SMITH ---
function showWeaponSmith() {
    const p = globalProgression;
    document.getElementById('ws-gold-display').innerText = p.gold;
    document.getElementById('ws-shards-display').innerText = p.inventory.titan_shard || 0;
    document.getElementById('ws-log').innerText = '';

    const list = document.getElementById('ws-weapon-list');
    list.innerHTML = '';

    // Get all equipped and inventory weapons
    let weapons = [];
    if(p.equipped) {
        let w = p.equipped['weapon'];
        if(w) weapons.push({ item: w, source: 'equipped', label: '(Equipped)' });
    }
    (p.equipInventory || []).filter(e => e.type === 'weapon').forEach(e => {
        weapons.push({ item: e, source: 'inventory', label: '(Inventory)' });
    });

    if(weapons.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-sm text-center">No weapons found. Equip or obtain a weapon first.</p>';
        switchScreen('screen-weaponsmith');
        return;
    }

    weapons.forEach(({ item, source, label }) => {
        let enhLvl = item.weaponEnhance || 0;
        let isMaxed = enhLvl >= 100;
        let enhBonus = enhLvl > 0 ? 5 * enhLvl * (5 + enhLvl) : 0; // cumulative: 30 at lv1, 70 at lv2, 120 at lv3...
        let enhLabel = enhLvl > 0 ? `+${enhBonus} dmg` : 'Not Enhanced';
        let maxBonus = isMaxed ? ' (+5% dmg bonus!)' : '';
        let canEnhance = !isMaxed && (p.inventory.titan_shard || 0) >= 1 && p.gold >= 50;

        let div = document.createElement('div');
        div.className = `bg-gray-800 border-2 rarity-${item.rarity} p-3 rounded-lg shadow-md`;
        div.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">${item.icon}</span>
                    <div>
                        <div class="font-bold text-white text-sm">${item.name} ${label}</div>
                        <div class="text-xs text-yellow-300">Enhance Lv. ${enhLvl}/100${isMaxed ? ' (MAX)' : ''}</div>
                        <div class="text-xs text-green-400">${enhLabel}${maxBonus}</div>
                    </div>
                </div>
                <button onclick="enhanceWeapon('${item.id}')" 
                    class="bg-yellow-700 hover:bg-yellow-600 text-white px-3 py-2 rounded font-bold text-xs transition active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    ${canEnhance ? '' : 'disabled'}>
                    🔨 Enhance<br><span class="text-yellow-300">50💰 + 1🔱</span>
                </button>
            </div>
            <div class="text-[10px] text-gray-400">Next level: +${30 + enhLvl * 10} dmg (${isMaxed ? 'MAX' : '40% fail rate'})</div>
        `;
        list.appendChild(div);
    });

    switchScreen('screen-weaponsmith');
}

function enhanceWeapon(itemId) {
    const p = globalProgression;
    const log = document.getElementById('ws-log');

    // Find weapon by id
    let item = null;
    if(p.equipped && p.equipped['weapon'] && p.equipped['weapon'].id === itemId) {
        item = p.equipped['weapon'];
    }
    if(!item) {
        item = (p.equipInventory || []).find(e => e.id === itemId && e.type === 'weapon');
    }

    if(!item) { log.innerText = 'Weapon not found!'; return; }
    let enhLvl = item.weaponEnhance || 0;
    if(enhLvl >= 100) { log.innerText = 'Already at max enhancement level!'; return; }
    if((p.inventory.titan_shard || 0) < 1) { log.innerText = 'Not enough Titan Shards!'; playSound('lose'); return; }
    if(p.gold < 50) { log.innerText = 'Not enough Gold! (50 needed)'; playSound('lose'); return; }

    // Consume resources
    p.gold -= 50;
    p.inventory.titan_shard = (p.inventory.titan_shard || 0) - 1;

    // 40% failure rate
    if(Math.random() < 0.40) {
        log.className = 'anim-enhance-fail';
        void log.offsetWidth; // force reflow to restart animation
        log.innerText = '💥 Enhancement failed! Resources consumed.';
        playSound('lose');
    } else {
        let newLvl = enhLvl + 1;
        item.weaponEnhance = newLvl;
        // Apply bonus damage: level N adds (30 + (N-1)*10) damage
        let dmgAdd = 30 + enhLvl * 10; // +30 at lv1, +40 at lv2, +50 at lv3, etc.
        item.stats.dmg = (item.stats.dmg || 0) + dmgAdd;
        log.className = 'anim-enhance-success';
        void log.offsetWidth; // force reflow to restart animation
        if(newLvl === 100) {
            item.weaponEnhanceMaxBonus = true; // flag for +5% dmg
            log.innerText = `⭐ MAX ENHANCE reached! +5% damage bonus granted!`;
        } else {
            log.innerText = `✅ Enhancement success! Lv.${newLvl} (+${dmgAdd} dmg added)`;
        }
        playSound('win');
    }

    saveGame();
    showWeaponSmith();
}

// --- INVASION ---
function showInvasion() {
    document.getElementById('invasion-gold-display').innerText = globalProgression.gold;
    document.getElementById('invasion-tickets-display').innerText = globalProgression.tickets || 0;
    switchScreen('screen-invasion');
}

function startInvasion() {
    if((globalProgression.tickets || 0) <= 0) {
        playSound('lose');
        alert('You need a Dungeon Ticket to start the Invasion!');
        return;
    }
    globalProgression.tickets--;
    invasionTotalKills = 0;
    invasionSpawned = 0;
    invasionKillGoal = 10;
    invasionMaxOnScreen = 4;
    currentMode = 'invasion';
    saveGame();
    startBattle(true);
}

// --- PET BATTLE ---
function showPetBattle() {
    document.getElementById('pet-battle-gold-display').innerText = globalProgression.gold;
    petBattleActive = false;
    petBattlePlayerPet = null;

    // Show select area, hide battle area
    document.getElementById('pet-select-area').classList.remove('hidden');
    document.getElementById('pet-battle-area').classList.add('hidden');

    const ownedList = document.getElementById('pet-owned-list');
    const noMsg = document.getElementById('pet-no-pets-msg');
    ownedList.innerHTML = '';

    let owned = globalProgression.petsOwned || [];
    if(owned.length === 0) {
        noMsg.classList.remove('hidden');
    } else {
        noMsg.classList.add('hidden');
        owned.forEach(petId => {
            let pet = PET_DATA.find(p => p.id === petId);
            if(!pet) return;
            let btn = document.createElement('button');
            btn.className = 'bg-gray-800 border border-pink-700 hover:border-pink-400 rounded-xl p-2 flex flex-col items-center transition active:scale-95';
            btn.innerHTML = `<span class="text-3xl">${pet.emoji}</span><span class="text-xs text-pink-300 font-bold mt-1">${pet.name}</span>`;
            btn.onclick = () => startPetBattle(petId);
            ownedList.appendChild(btn);
        });
    }
    switchScreen('screen-pet-battle');
}

function startPetBattle(playerPetId) {
    // Cancel any active auto-battle before entering pet battle
    if(typeof isAutoBattle !== 'undefined' && isAutoBattle) {
        isAutoBattle = false;
        combatActive = false;
        const autoBtn = document.getElementById('btn-auto');
        if(autoBtn) autoBtn.classList.remove('auto-on');
    }
    petBattlePlayerPet = PET_DATA.find(p => p.id === playerPetId);
    // Random enemy pet from full pool
    petBattleEnemyPet = PET_DATA[Math.floor(Math.random() * PET_DATA.length)];
    petBattleActive = true;
    petBattlePlayerHp = 10;
    petBattleEnemyHp = 10;
    petBattleLastAction = null;
    petBattleEnemyLastAction = null;

    document.getElementById('pet-select-area').classList.add('hidden');
    document.getElementById('pet-battle-area').classList.remove('hidden');
    document.getElementById('pb-player-emoji').innerText = petBattlePlayerPet.emoji;
    document.getElementById('pb-player-name').innerText = petBattlePlayerPet.name;
    document.getElementById('pb-enemy-emoji').innerText = petBattleEnemyPet.emoji;
    document.getElementById('pb-enemy-name').innerText = petBattleEnemyPet.name;
    updatePetBattleUI();
    updatePetBattleRecords();
    document.getElementById('pb-result-text').innerText = 'Choose your action!';
    // Enable all action buttons
    ['attack', 'block', 'counter'].forEach(action => {
        let btn = document.getElementById(`pb-btn-${action}`);
        if(btn) { btn.disabled = false; btn.classList.remove('opacity-50'); }
    });
    document.getElementById('pb-cooldown-info').innerText = '';
    if(petBattleAutoMode) schedulePetAutoAction();
}

function updatePetBattleUI() {
    document.getElementById('pb-player-hp').innerText = Math.max(0, petBattlePlayerHp).toFixed(1);
    document.getElementById('pb-enemy-hp').innerText = Math.max(0, petBattleEnemyHp).toFixed(1);
    document.getElementById('pb-player-hp-bar').style.width = Math.max(0, (petBattlePlayerHp / 10) * 100) + '%';
    document.getElementById('pb-enemy-hp-bar').style.width = Math.max(0, (petBattleEnemyHp / 10) * 100) + '%';
    document.getElementById('pb-player-hp-bar').className = `h-2 rounded-full transition-all ${petBattlePlayerHp > 5 ? 'bg-green-500' : petBattlePlayerHp > 2 ? 'bg-yellow-500' : 'bg-red-500'}`;
    document.getElementById('pb-enemy-hp-bar').className = `h-2 rounded-full transition-all ${petBattleEnemyHp > 5 ? 'bg-green-500' : petBattleEnemyHp > 2 ? 'bg-yellow-500' : 'bg-red-500'}`;

    // Update cooldown info and button visuals
    let cdText = (petBattleLastAction && petBattleLastAction !== 'attack') ? `⏱ ${petBattleLastAction.charAt(0).toUpperCase() + petBattleLastAction.slice(1)} is on cooldown for 1 turn` : '';
    document.getElementById('pb-cooldown-info').innerText = cdText;

    ['attack', 'block', 'counter'].forEach(action => {
        let btn = document.getElementById(`pb-btn-${action}`);
        if(btn) {
            btn.disabled = !petBattleActive || (action !== 'attack' && action === petBattleLastAction);
            let lbl = btn.querySelector('.text-xs');
            if(action !== 'attack' && action === petBattleLastAction && petBattleActive) {
                btn.classList.add('opacity-50');
                if(lbl) lbl.innerText = '(1 turn CD)';
            } else {
                btn.classList.remove('opacity-50');
                if(lbl) lbl.innerText = action.charAt(0).toUpperCase() + action.slice(1);
            }
        }
    });
}

function updatePetBattleRecords() {
    if(!globalProgression.petWinLoss) globalProgression.petWinLoss = {};
    let playerRec = petBattlePlayerPet ? (globalProgression.petWinLoss[petBattlePlayerPet.id] || {wins:0,losses:0}) : {wins:0,losses:0};
    let enemyRec = petBattleEnemyPet ? (globalProgression.petWinLoss[petBattleEnemyPet.id] || {wins:0,losses:0}) : {wins:0,losses:0};
    let playerRecEl = document.getElementById('pb-player-record');
    let enemyRecEl = document.getElementById('pb-enemy-record');
    if(playerRecEl) playerRecEl.innerText = `W: ${playerRec.wins} / L: ${playerRec.losses}`;
    if(enemyRecEl) enemyRecEl.innerText = `W: ${enemyRec.wins} / L: ${enemyRec.losses}`;
}

function petBattleAction(playerAction) {
    if(!petBattleActive || (playerAction !== 'attack' && playerAction === petBattleLastAction)) return;

    // Disable all buttons during animation
    ['attack', 'block', 'counter'].forEach(action => {
        let btn = document.getElementById(`pb-btn-${action}`);
        if(btn) btn.disabled = true;
    });

    // Add animation to emojis
    let animClass = playerAction === 'attack' ? 'anim-pet-attack' : playerAction === 'block' ? 'anim-pet-block' : 'anim-pet-counter';
    let playerEmojiEl = document.getElementById('pb-player-emoji');
    let enemyEmojiEl = document.getElementById('pb-enemy-emoji');
    if(playerEmojiEl) playerEmojiEl.classList.add(animClass);
    if(enemyEmojiEl) enemyEmojiEl.classList.add('anim-pet-attack');

    // Play action sound
    if(playerAction === 'block') playSound('buff'); else playSound('hit');

    // Show emoji particle
    showPetParticle(playerAction);

    // Enemy picks random action excluding its last action
    let actions = ['attack', 'block', 'counter'];
    let enemyChoices = actions.filter(a => a !== petBattleEnemyLastAction);
    let enemyAction = enemyChoices[Math.floor(Math.random() * enemyChoices.length)];

    let actionIcons = { attack: '⚔️', block: '🛡️', counter: '🔄' };
    document.getElementById('pb-result-text').innerText = `You: ${actionIcons[playerAction]} | Enemy: ${actionIcons[enemyAction]}\nResolving...`;

    setTimeout(() => {
        try {
        // Remove animation classes
        if(playerEmojiEl) playerEmojiEl.classList.remove(animClass);
        if(enemyEmojiEl) enemyEmojiEl.classList.remove('anim-pet-attack');

        // Resolve damage
        let playerDmg = 0, enemyDmg = 0;
        let resultText = '';

        // Damage matrix
        if(playerAction === 'attack' && enemyAction === 'attack')   { playerDmg = 1; enemyDmg = 1; resultText = '⚔️ Both attacked! Both take 1 damage.'; }
        else if(playerAction === 'attack' && enemyAction === 'block')   { playerDmg = 0.5; enemyDmg = 0; resultText = '⚔️ vs 🛡️ — Blocked! Attacker takes 0.5 damage.'; }
        else if(playerAction === 'attack' && enemyAction === 'counter') { playerDmg = 0; enemyDmg = 1; resultText = '⚔️ vs 🔄 — Attack beats counter! Counter takes 1 damage.'; }
        else if(playerAction === 'block' && enemyAction === 'attack')   { playerDmg = 0; enemyDmg = 1; resultText = '🛡️ vs ⚔️ — Block beats attack! Attacker takes 1 damage.'; }
        else if(playerAction === 'block' && enemyAction === 'block')    { playerDmg = 0.5; enemyDmg = 0.5; resultText = '🛡️ vs 🛡️ — Both blocked! Both take 0.5 damage.'; }
        else if(playerAction === 'block' && enemyAction === 'counter')  { playerDmg = 0; enemyDmg = 1; resultText = '🛡️ vs 🔄 — Block beats counter! Counter takes 1 damage.'; }
        else if(playerAction === 'counter' && enemyAction === 'attack') { playerDmg = 1; enemyDmg = 0; resultText = '🔄 vs ⚔️ — Counter loses to attack! Counter takes 1 damage.'; }
        else if(playerAction === 'counter' && enemyAction === 'block')  { playerDmg = 1; enemyDmg = 0; resultText = '🔄 vs 🛡️ — Block beats counter! Counter takes 1 damage.'; }
        else if(playerAction === 'counter' && enemyAction === 'counter'){ playerDmg = 0.5; enemyDmg = 0.5; resultText = '🔄 vs 🔄 — Both countered! Both take 0.5 damage.'; }

        petBattlePlayerHp -= playerDmg;
        petBattleEnemyHp -= enemyDmg;
        petBattleLastAction = playerAction === 'attack' ? null : playerAction;
        petBattleEnemyLastAction = enemyAction;

        let resultEl = document.getElementById('pb-result-text');
        if(resultEl) resultEl.innerText = `You: ${actionIcons[playerAction]} | Enemy: ${actionIcons[enemyAction]}\n${resultText}`;

        updatePetBattleUI();
        showRoundResultFlash(playerDmg, enemyDmg);

        // Check win/loss
        if(petBattlePlayerHp <= 0 && petBattleEnemyHp <= 0) {
            // Both dead - draw, restart round
            setTimeout(() => { petBattleRoundEnd(false); }, 1200);
        } else if(petBattleEnemyHp <= 0) {
            // Player wins round
            setTimeout(() => { petBattleRoundEnd(true); }, 1200);
        } else if(petBattlePlayerHp <= 0) {
            // Player loses
            setTimeout(() => { petBattleLose(); }, 1200);
        } else {
            // Round continues — schedule next auto action if auto mode is on
            if(petBattleAutoMode) schedulePetAutoAction();
        }
        } catch(err) {
            console.error('Pet battle action error:', err);
            // Re-enable buttons so the battle is never permanently frozen
            ['attack', 'block', 'counter'].forEach(action => {
                let btn = document.getElementById(`pb-btn-${action}`);
                if(btn) btn.disabled = !petBattleActive || (action !== 'attack' && action === petBattleLastAction);
            });
        }
    }, 1000);
}

function petBattleRoundEnd(playerWon) {
    // Disable buttons while round ends and new enemy loads
    ['attack', 'block', 'counter'].forEach(action => {
        let btn = document.getElementById(`pb-btn-${action}`);
        if(btn) btn.disabled = true;
    });
    if(playerWon) {
        globalProgression.gold += 50;
        // Drop a Titan Shard for winning
        globalProgression.inventory.titan_shard = (globalProgression.inventory.titan_shard || 0) + 1;
        let xpGain = Math.floor(getXpForNextLevel(player.lvl) * 0.01);
        player.xp += xpGain;
        globalProgression.petBattlesWon = (globalProgression.petBattlesWon || 0) + 1;
        globalProgression.petBattleWinStreak = (globalProgression.petBattleWinStreak || 0) + 1;
        // Record win for player pet, loss for enemy pet
        if(!globalProgression.petWinLoss) globalProgression.petWinLoss = {};
        if(petBattlePlayerPet) {
            if(!globalProgression.petWinLoss[petBattlePlayerPet.id]) globalProgression.petWinLoss[petBattlePlayerPet.id] = {wins:0,losses:0};
            globalProgression.petWinLoss[petBattlePlayerPet.id].wins++;
        }
        if(petBattleEnemyPet) {
            if(!globalProgression.petWinLoss[petBattleEnemyPet.id]) globalProgression.petWinLoss[petBattleEnemyPet.id] = {wins:0,losses:0};
            globalProgression.petWinLoss[petBattleEnemyPet.id].losses++;
        }
        if(globalProgression.petBattleWinStreak > (globalProgression.petBattleBestStreak || 0)) {
            globalProgression.petBattleBestStreak = globalProgression.petBattleWinStreak;
        }
        checkLevelUp();
        let ps = ensureProgressStats();
        ps.battlesWon = (ps.battlesWon || 0) + 1;
        document.getElementById('pb-result-text').innerText = `🎉 You won! +50 Gold, +1 🔱 Titan Shard, +${xpGain} XP\nStreak: ${globalProgression.petBattleWinStreak}`;
        playSound('win');
        showPetBattleVictory();
        saveGame();
        document.getElementById('pet-battle-gold-display').innerText = globalProgression.gold;
        // Heal and start next round
        setTimeout(() => {
            petBattlePlayerHp = 10;
            petBattleEnemyHp = 10;
            petBattleLastAction = null;
            petBattleEnemyLastAction = null;
            // New enemy pet
            petBattleEnemyPet = PET_DATA[Math.floor(Math.random() * PET_DATA.length)];
            document.getElementById('pb-enemy-emoji').innerText = petBattleEnemyPet.emoji;
            document.getElementById('pb-enemy-name').innerText = petBattleEnemyPet.name;
            updatePetBattleUI();
            updatePetBattleRecords();
            document.getElementById('pb-result-text').innerText = '✨ New enemy appeared! Choose your action.';
            // Re-enable action buttons now that a new pet is generated
            ['attack', 'block', 'counter'].forEach(action => {
                let btn = document.getElementById(`pb-btn-${action}`);
                if(btn) { btn.disabled = false; btn.classList.remove('opacity-50'); }
            });
            if(petBattleAutoMode) schedulePetAutoAction();
        }, 2000);
    } else {
        // Draw
        document.getElementById('pb-result-text').innerText = "Draw! Both pets fell — healing for next round.";
        setTimeout(() => {
            petBattlePlayerHp = 10;
            petBattleEnemyHp = 10;
            petBattleLastAction = null;
            petBattleEnemyLastAction = null;
            updatePetBattleUI();
            document.getElementById('pb-result-text').innerText = '✨ Round reset! Choose your action.';
            // Re-enable action buttons
            ['attack', 'block', 'counter'].forEach(action => {
                let btn = document.getElementById(`pb-btn-${action}`);
                if(btn) { btn.disabled = false; btn.classList.remove('opacity-50'); }
            });
            if(petBattleAutoMode) schedulePetAutoAction();
        }, 2000);
    }
}

function petBattleLose() {
    petBattleActive = false;
    petBattleAutoMode = false;
    if(petBattleAutoTimer) { clearTimeout(petBattleAutoTimer); petBattleAutoTimer = null; }
    let autoBtn = document.getElementById('pb-btn-auto');
    if(autoBtn) { autoBtn.classList.remove('auto-on'); autoBtn.innerText = '🤖 Auto'; }
    globalProgression.petBattleWinStreak = 0;
    // Record loss for player pet, win for enemy pet
    if(!globalProgression.petWinLoss) globalProgression.petWinLoss = {};
    if(petBattlePlayerPet) {
        if(!globalProgression.petWinLoss[petBattlePlayerPet.id]) globalProgression.petWinLoss[petBattlePlayerPet.id] = {wins:0,losses:0};
        globalProgression.petWinLoss[petBattlePlayerPet.id].losses++;
    }
    if(petBattleEnemyPet) {
        if(!globalProgression.petWinLoss[petBattleEnemyPet.id]) globalProgression.petWinLoss[petBattleEnemyPet.id] = {wins:0,losses:0};
        globalProgression.petWinLoss[petBattleEnemyPet.id].wins++;
    }
    updatePetBattleRecords();
    let ps = ensureProgressStats();
    ps.battlesLost = (ps.battlesLost || 0) + 1;
    playSound('lose');
    showPetBattleDefeat();
    saveGame();
    document.getElementById('pb-result-text').innerText = '💀 You lost! Your pet was defeated.';
    // Disable action buttons until a new pet battle is started
    ['attack', 'block', 'counter'].forEach(action => {
        let btn = document.getElementById(`pb-btn-${action}`);
        if(btn) btn.disabled = true;
    });
    document.getElementById('pb-cooldown-info').innerText = 'Game over. Leave and try again.';
}

function showPetBattleVictory() {
    let overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 flex items-center justify-center z-50 pointer-events-none';
    overlay.innerHTML = '<div class="text-6xl font-black text-yellow-400 anim-victory drop-shadow-lg">🎉 VICTORY!</div>';
    document.body.appendChild(overlay);
    let screen = document.getElementById('screen-pet-battle');
    if(screen) screen.classList.add('anim-screen-shake');
    setTimeout(() => { overlay.remove(); if(screen) screen.classList.remove('anim-screen-shake'); }, 2000);
}

function showPetBattleDefeat() {
    let overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 flex items-center justify-center z-50 pointer-events-none';
    overlay.innerHTML = '<div class="text-6xl font-black text-red-500 anim-defeat drop-shadow-lg">💀 DEFEAT</div>';
    document.body.appendChild(overlay);
    let screen = document.getElementById('screen-pet-battle');
    if(screen) screen.classList.add('anim-screen-shake');
    setTimeout(() => { overlay.remove(); if(screen) screen.classList.remove('anim-screen-shake'); }, 2000);
}

function showPetBattleStart() {
    let overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 flex items-center justify-center z-50 pointer-events-none';
    overlay.innerHTML = '<div class="text-6xl font-black text-green-400 drop-shadow-lg" style="animation: petStartPulse 0.6s ease-in-out 3 alternate;">⚡ START!</div>';
    document.body.appendChild(overlay);
    setTimeout(() => {
        overlay.remove();
        // Re-enable buttons after START animation
        ['attack', 'block', 'counter'].forEach(action => {
            let btn = document.getElementById(`pb-btn-${action}`);
            if(btn) {
                btn.disabled = false;
                btn.classList.remove('opacity-50');
                let lbl = btn.querySelector('.text-xs');
                if(lbl) lbl.innerText = action.charAt(0).toUpperCase() + action.slice(1);
            }
        });
        document.getElementById('pb-cooldown-info').innerText = '';
    }, 1800);
}

function togglePetBattleAuto() {
    petBattleAutoMode = !petBattleAutoMode;
    let btn = document.getElementById('pb-btn-auto');
    if(petBattleAutoMode) {
        if(btn) { btn.classList.add('auto-on'); btn.innerText = '⏹ Stop Auto'; }
        if(petBattleActive) schedulePetAutoAction();
    } else {
        if(btn) { btn.classList.remove('auto-on'); btn.innerText = '🤖 Auto'; }
        if(petBattleAutoTimer) { clearTimeout(petBattleAutoTimer); petBattleAutoTimer = null; }
    }
}

function schedulePetAutoAction() {
    if(!petBattleAutoMode || !petBattleActive) return;
    petBattleAutoTimer = setTimeout(() => {
        if(!petBattleAutoMode || !petBattleActive) return;
        // Check if buttons are usable
        let attackBtn = document.getElementById('pb-btn-attack');
        if(attackBtn && attackBtn.disabled) { schedulePetAutoAction(); return; }
        let actions = ['attack', 'block', 'counter'];
        let available = actions.filter(a => !(a !== 'attack' && a === petBattleLastAction));
        let action = available[Math.floor(Math.random() * available.length)];
        petBattleAction(action);
    }, 1200);
}


function showRoundResultFlash(playerDmg, enemyDmg) {
    let el = document.createElement('div');
    el.className = 'round-result-flash';
    if (enemyDmg > playerDmg) {
        el.style.color = '#4ade80';
        el.style.borderColor = '#4ade80';
        el.innerText = '✅ WIN';
    } else if (playerDmg > enemyDmg) {
        el.style.color = '#ef4444';
        el.style.borderColor = '#ef4444';
        el.innerText = '❌ LOSE';
    } else {
        el.style.color = '#9ca3af';
        el.innerText = '➖ TIE';
    }
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
}

function showPetParticle(action) {
    let emoji = action === 'attack' ? '⚔️' : action === 'block' ? '🛡️' : '🔄';
    let pEl = document.getElementById('pb-player-emoji');
    if(!pEl) return;
    let rect = pEl.getBoundingClientRect();
    let particle = document.createElement('div');
    particle.className = 'anim-particle';
    particle.style.left = (rect.left + rect.width / 2 - 16) + 'px';
    particle.style.top = (rect.top - 10) + 'px';
    particle.innerText = emoji;
    document.body.appendChild(particle);
    setTimeout(() => { if(particle.parentNode) particle.remove(); }, 1000);
}

function leavePetBattle() {
    petBattleActive = false;
    petBattleAutoMode = false;
    if(petBattleAutoTimer) { clearTimeout(petBattleAutoTimer); petBattleAutoTimer = null; }
    let autoBtn = document.getElementById('pb-btn-auto');
    if(autoBtn) { autoBtn.classList.remove('auto-on'); autoBtn.innerText = '🤖 Auto'; }
    showPortal();
}

function showWell() {
    const today = new Date().toDateString();
    const canUseXp = (globalProgression.wellLastXpDate || '') !== today;
    const canUseDrop = (globalProgression.wellLastDropDate || '') !== today;
    const canUseEnergy50 = (globalProgression.wellLastEnergy50Date || '') !== today;
    const canUseEnergy100 = (globalProgression.wellLastEnergy100Date || '') !== today;
    const p = globalProgression;

    document.getElementById('well-gold-display').innerText = p.gold;
    document.getElementById('well-xp-status').innerText = !canUseXp ? 'Used Today' : p.wellXpBattles > 0 ? `${p.wellXpBattles} battles left` : 'Inactive';
    document.getElementById('well-drop-status').innerText = !canUseDrop ? 'Used Today' : p.wellDropBattles > 0 ? `${p.wellDropBattles} battles left` : 'Inactive';
    document.getElementById('well-energy50-status').innerText = canUseEnergy50 ? 'Ready' : 'Used Today';
    document.getElementById('well-energy100-status').innerText = canUseEnergy100 ? 'Ready' : 'Used Today';
    document.getElementById('well-energy-cap-status').innerText = p.energyCapUnlocked ? '✅ Unlocked' : 'Locked';
    
    const healBtn = document.getElementById('well-heal-btn');
    const xpBtn = document.getElementById('well-xp-btn');
    const dropBtn = document.getElementById('well-drop-btn');
    const energy50Btn = document.getElementById('well-energy50-btn');
    const energy100Btn = document.getElementById('well-energy100-btn');
    const energyCapBtn = document.getElementById('well-energy-cap-btn');
    healBtn.disabled = p.gold < 50;
    xpBtn.disabled = !canUseXp || p.gold < 20;
    dropBtn.disabled = !canUseDrop || p.gold < 20;
    energy50Btn.disabled = !canUseEnergy50 || p.gold < 50;
    energy100Btn.disabled = !canUseEnergy100 || p.gold < 100;
    energyCapBtn.disabled = p.energyCapUnlocked || p.gold < 300 || getMaxEnergy() < 50;

    document.getElementById('well-log').innerText = '';
    switchScreen('screen-well');
}

function useWellHeal() {
    const log = document.getElementById('well-log');
    if(globalProgression.gold < 50) { log.innerText = 'Not enough Gold.'; playSound('lose'); return; }

    globalProgression.gold -= 50;
    player.maxHp = calculateMaxHp();
    player.currentHp = player.maxHp;
    log.innerText = 'You feel renewed. HP fully restored!';
    playSound('heal');
    saveGame();
    showWell();
}

function buyWellXpBuff() {
    const today = new Date().toDateString();
    const log = document.getElementById('well-log');
    if((globalProgression.wellLastXpDate || '') === today) { log.innerText = 'XP Blessing already used today.'; playSound('lose'); return; }
    if(globalProgression.gold < 20) { log.innerText = 'Not enough Gold.'; playSound('lose'); return; }
    globalProgression.gold -= 20;
    globalProgression.wellXpBattles = 10;
    globalProgression.wellLastXpDate = today;
    log.innerText = '2x XP blessing is active for 10 battles!';
    playSound('win');
    saveGame();
    showWell();
}

function buyWellDropBuff() {
    const today = new Date().toDateString();
    const log = document.getElementById('well-log');
    if((globalProgression.wellLastDropDate || '') === today) { log.innerText = 'Drop Blessing already used today.'; playSound('lose'); return; }
    if(globalProgression.gold < 20) { log.innerText = 'Not enough Gold.'; playSound('lose'); return; }
    globalProgression.gold -= 20;
    globalProgression.wellDropBattles = 10;
    globalProgression.wellLastDropDate = today;
    log.innerText = '2x drop blessing is active for 10 battles!';
    playSound('win');
    saveGame();
    showWell();
}
function useWellEnergy50() {
    const p = globalProgression; const today = new Date().toDateString();
    const log = document.getElementById('well-log');
    if((p.wellLastEnergy50Date || '') === today) { log.innerText = 'Energy refill (50g) already used today.'; playSound('lose'); return; }
    if(p.gold < 50) { log.innerText = 'Not enough Gold!'; playSound('lose'); return; }
    let maxEnergy = getMaxEnergy();
    p.gold -= 50; p.energy = maxEnergy; p.wellLastEnergy50Date = today; saveGame(); updateEnergy();
    log.innerText = `⚡ Energy refilled to ${maxEnergy}!`; playSound('chest');
    showWell();
}
function useWellEnergy100() {
    const p = globalProgression; const today = new Date().toDateString();
    const log = document.getElementById('well-log');
    if((p.wellLastEnergy100Date || '') === today) { log.innerText = 'Energy refill (100g) already used today.'; playSound('lose'); return; }
    if(p.gold < 100) { log.innerText = 'Not enough Gold!'; playSound('lose'); return; }
    let maxEnergy = getMaxEnergy();
    p.gold -= 100; p.energy = maxEnergy; p.wellLastEnergy100Date = today; saveGame(); updateEnergy();
    log.innerText = `⚡ Energy refilled to ${maxEnergy}!`; playSound('chest');
    showWell();
}

function unlockEnergyCapUpgrade() {
    const p = globalProgression;
    const log = document.getElementById('well-log');
    if(p.energyCapUnlocked) { log.innerText = 'Energy cap already unlocked!'; return; }
    if(getMaxEnergy() < 50) { log.innerText = `Reach 50 Energy first! (You currently have ${getMaxEnergy()} max energy)`; playSound('lose'); return; }
    if(p.gold < 300) { log.innerText = 'Not enough Gold! (Need 300)'; playSound('lose'); return; }
    p.gold -= 300;
    p.energyCapUnlocked = true;
    log.innerText = '❗ Energy cap upgraded to 100! Level up to reach energies 51-100.';
    playSound('win');
    saveGame();
    updateEnergy();
    showWell();
}

// --- QUESTS ---
function generateQuest(qNum) {
    let roll = Math.random(); 
    let rarity = 'common'; let mult = 1;
    if (roll < 0.01) { rarity = 'legendary'; mult = 7; } 
    else if (roll < 0.11) { rarity = 'epic'; mult = 3; } 
    else if (roll < 0.31) { rarity = 'rare'; mult = 1.5; } 

    globalProgression[`questRarity${qNum}`] = rarity; 
    globalProgression[`questProg${qNum}`] = 0;
    globalProgression[`questGoal${qNum}`] = 3; 
    
    let baseReward = 50;
    if(qNum === 2) baseReward = 100;
    if(qNum === 3) baseReward = 150;
    if(qNum === 4) baseReward = 200;

    globalProgression[`questRwd${qNum}`] = Math.floor(baseReward * mult);
}

function updateQuestUI(qNum) {
    let prog = globalProgression[`questProg${qNum}`]; let goal = globalProgression[`questGoal${qNum}`]; let rarity = globalProgression[`questRarity${qNum}`] || 'common';
    
    const container = document.getElementById(`quest-container-${qNum}`);
    if(!container) return; 
    
    const titleEl = document.getElementById(`quest-${qNum}-title`); const rwdEl = document.getElementById(`quest-${qNum}-rwd`);
    if(!titleEl || !rwdEl) return;

    if(globalProgression.questsCompletedToday >= 10) {
        container.innerHTML = `<div class="text-center py-6 text-gray-500 font-bold bg-gray-900 rounded-xl">Come back tomorrow!</div>`;
        return;
    }

    if(rarity === 'legendary') { container.className = "bg-quest-legendary border-2 border-yellow-400 rounded-xl p-5 shadow-[0_0_20px_rgba(251,191,36,0.6)] mb-4 transition-colors"; titleEl.className = "text-lg font-bold text-yellow-400 uppercase tracking-wider"; } 
    else if (rarity === 'epic') { container.className = "bg-quest-epic border-2 border-purple-500 rounded-xl p-5 shadow-[0_0_15px_rgba(168,85,247,0.5)] mb-4 transition-colors"; titleEl.className = "text-lg font-bold text-purple-300 uppercase"; } 
    else if (rarity === 'rare') { container.className = "bg-quest-rare border-2 border-blue-500 rounded-xl p-5 shadow-lg mb-4 transition-colors"; titleEl.className = "text-lg font-bold text-blue-300 uppercase"; } 
    else { container.className = "bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg mb-4 transition-colors"; titleEl.className = "text-lg font-bold text-white"; }

    rwdEl.innerText = `💰 ${globalProgression[`questRwd${qNum}`]} G`; document.getElementById(`quest-${qNum}-text`).innerText = `${prog} / ${goal}`; document.getElementById(`quest-${qNum}-bar`).style.width = `${(prog / goal) * 100}%`;
    
    let btn = document.getElementById(`btn-claim-q${qNum}`);
    if(btn) {
        if(prog >= goal) { btn.disabled = false; btn.innerText = `CLAIM REWARD`; btn.className = 'w-full py-2 bg-yellow-500 text-black font-bold rounded animate-pulse transition active:scale-95 text-sm shadow-md'; } 
        else { btn.disabled = true; btn.innerText = "In Progress"; btn.className = 'w-full py-2 bg-gray-600 text-gray-400 font-bold rounded transition text-sm shadow-inner'; }
    }
    updateQuestNotifyBadge();
}

function checkDailyQuestReset() {
    let today = new Date().toDateString();
    if(globalProgression.lastQuestDate !== today) {
        globalProgression.questsCompletedToday = 0;
        globalProgression.lastQuestDate = today;
        generateQuest(1); generateQuest(2); generateQuest(3); generateQuest(4);
    }
}

function showQuests() { 
    checkDailyQuestReset();
    document.getElementById('quest-daily-limit').innerText = `${globalProgression.questsCompletedToday}/10`;

    // Sort quest slots: completed (claimable) quests first, then in-progress
    let questOrder = [1, 2, 3, 4].sort((a, b) => {
        let aComplete = globalProgression[`questProg${a}`] >= globalProgression[`questGoal${a}`];
        let bComplete = globalProgression[`questProg${b}`] >= globalProgression[`questGoal${b}`];
        if (aComplete && !bComplete) return -1;
        if (!aComplete && bComplete) return 1;
        return 0;
    });

    for(let idx = 0; idx < questOrder.length; idx++) {
        let i = questOrder[idx];
        const container = document.getElementById(`quest-container-${idx + 1}`);
        if (!container) continue;
        // Always rebuild to ensure correct order
        if (globalProgression.questsCompletedToday >= 10) {
            container.innerHTML = `<div class="text-center py-4 text-gray-500 font-bold bg-gray-900 rounded-xl">Come back tomorrow!</div>`;
            continue;
        }
        container.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div>
                    <h3 id="quest-title-${i}" class="text-lg font-bold text-white">Quest</h3>
                    <p id="quest-desc-${i}" class="text-xs text-gray-400">Desc</p>
                </div>
                <div id="quest-rwd-${i}" class="font-bold text-yellow-400 bg-black bg-opacity-40 px-2 py-1 rounded shadow-inner border border-gray-600">💰 0 G</div>
            </div>
            <div class="w-full bg-gray-900 h-5 rounded mt-2 mb-3 border border-gray-700 overflow-hidden relative shadow-inner">
                <div id="quest-bar-${i}" class="bg-blue-600 h-full transition-all duration-300" style="width: 0%"></div>
                <div id="quest-text-${i}" class="absolute top-0 left-0 w-full h-full flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">0 / 3</div>
            </div>
            <button id="btn-claim-q${i}-slot${idx+1}" onclick="claimQuest(${i})" class="w-full py-2 bg-gray-600 text-gray-400 font-bold rounded transition text-sm shadow-inner border border-gray-500" disabled>In Progress</button>
        `;

        let type = globalProgression[`questType${i}`];
        let goal = globalProgression[`questGoal${i}`];
        let qt = document.getElementById(`quest-title-${i}`);
        let qd = document.getElementById(`quest-desc-${i}`);
        if(qt && qd) {
            if (type === 'hunting') { qt.innerText = 'Wilderness Hunter'; qd.innerText = `Slay ${goal} beasts in the Wilderness.`; }
            if (type === 'pillage') { qt.innerText = 'Village Pillager'; qd.innerText = `Defeat ${goal} foes in Pillage Village.`; }
            if (type === 'workshop') { qt.innerText = 'Workshop Raider'; qd.innerText = `Destroy ${goal} constructs in the Workshop.`; }
            if (type === 'dungeon') { qt.innerText = 'Dungeon Delver'; qd.innerText = `Destroy ${goal} aliens in the Dungeon Portal.`; }
        }
        // Update progress bar via the new IDs
        let prog = globalProgression[`questProg${i}`];
        let rwd = globalProgression[`questRwd${i}`];
        let rwdEl = document.getElementById(`quest-rwd-${i}`);
        if (rwdEl) rwdEl.innerText = `💰 ${rwd} G`;
        let barEl = document.getElementById(`quest-bar-${i}`);
        let txtEl = document.getElementById(`quest-text-${i}`);
        let btnEl = document.getElementById(`btn-claim-q${i}-slot${idx+1}`);
        if (barEl) barEl.style.width = `${Math.min(100, Math.floor((prog / goal) * 100))}%`;
        if (txtEl) txtEl.innerText = `${Math.min(prog, goal)} / ${goal}`;
        if (btnEl) {
            if (prog >= goal) {
                btnEl.disabled = false;
                btnEl.className = 'w-full py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded transition text-sm shadow-lg border border-green-400 animate-pulse';
                btnEl.innerText = '✅ CLAIM REWARD';
            } else {
                btnEl.disabled = true;
                btnEl.className = 'w-full py-2 bg-gray-600 text-gray-400 font-bold rounded transition text-sm shadow-inner border border-gray-500';
                btnEl.innerText = 'In Progress';
            }
        }
    }
    
    updateQuestNotifyBadge();
    switchScreen('screen-quests'); 
}

function claimQuest(qNum) {
    let prog = globalProgression[`questProg${qNum}`]; let goal = globalProgression[`questGoal${qNum}`]; let rwd = globalProgression[`questRwd${qNum}`];
    if(prog >= goal && globalProgression.questsCompletedToday < 10) { 
        globalProgression.gold += rwd; 
        globalProgression.questsCompletedToday++;
        generateQuest(qNum); playSound('win'); saveGame(); showQuests(); 
    }
    updateQuestNotifyBadge();
}

function updateQuestNotifyBadge() {
    let badge = document.getElementById('quest-notify-badge');
    if (!badge) return;
    let hasClaimable = false;
    for (let i = 1; i <= 4; i++) {
        let prog = globalProgression[`questProg${i}`];
        let goal = globalProgression[`questGoal${i}`];
        if (prog >= goal && globalProgression.questsCompletedToday < 10) {
            hasClaimable = true;
            break;
        }
    }
    badge.style.display = hasClaimable ? 'flex' : 'none';
}

// --- DUNGEONS ---
function showDungeons() {
    document.getElementById('dungeon-gold-display').innerText = globalProgression.gold; document.getElementById('dungeon-tickets-display').innerText = globalProgression.tickets || 0;
    let buyBtn = document.getElementById('btn-buy-ticket-dungeon');
    if(buyBtn) { buyBtn.disabled = globalProgression.gold < 100; if(globalProgression.gold < 100) buyBtn.classList.add('opacity-50'); else buyBtn.classList.remove('opacity-50'); }
    const list = document.getElementById('dungeon-list'); list.innerHTML = '';
    
    // Show max 6 dungeons: up to 5 unlocked + 1 locked (next tier)
    // Sliding window: once 6th tier unlocks, tier 1 disappears; always 6 shown max
    let maxShow = globalProgression.dungeonTier + 1; // next locked tier
    let minShow = Math.max(1, maxShow - 5); // at most 6 total
    
    for(let i = minShow; i <= maxShow; i++) {
        let isLocked = i > globalProgression.dungeonTier;
        let btn = document.createElement('button');
        btn.className = `p-4 rounded-xl border flex justify-between items-center transition ${isLocked ? 'bg-gray-900 border-gray-800 opacity-70 cursor-not-allowed' : 'bg-gray-800 border-red-900 hover:border-red-500 active:scale-95 shadow-lg'}`; btn.disabled = isLocked;
        btn.innerHTML = `<div class="text-left"><div class="font-bold text-lg ${isLocked ? 'text-gray-500' : 'text-red-400'}">Tier ${i} Portal</div><div class="text-xs text-gray-400">${isLocked ? 'Defeat previous boss to unlock' : `Lvl ${1+(i-1)*5} - ${5+(i-1)*5} · 5 Rooms · 1.5x Harder`}</div></div><div class="text-2xl">${isLocked ? '🔒' : '🌌'}</div>`;
        if(!isLocked) { btn.onclick = () => { if(globalProgression.tickets > 0) { globalProgression.tickets--; currentMode = 'dungeon'; activeDungeonTier = i; activeDungeonRoom = 1; startBattle(true); } else { alert("You need a Dungeon Ticket from the Shop!"); } }; } list.appendChild(btn);
    }
    switchScreen('screen-dungeons');
}

// --- GRAVEYARD ---
function showGraveyard() {
    document.getElementById('graveyard-gold-display').innerText = globalProgression.gold;
    const list = document.getElementById('graveyard-list'); list.innerHTML = '';
    
    let bosses = Object.values(globalProgression.killedBosses || {});
    const today = new Date().toDateString();
    
    if(bosses.length === 0) {
        list.innerHTML = `<div class="text-center text-gray-500 py-6 bg-gray-900 rounded-xl">No bosses have been defeated yet.</div>`;
    } else {
        bosses.forEach(b => {
            let btn = document.createElement('div');
            btn.className = `bg-gray-800 border-2 border-gray-700 p-4 rounded-xl flex justify-between items-center shadow-md mb-2`;
            let canFight = globalProgression.gold >= 20;
            let revivedToday = (globalProgression.graveyardRevivalDates || {})[b.name] === today;
            let canRevive = canFight && !revivedToday;
            let statusText = revivedToday ? '<span class="text-xs text-gray-500 ml-1">(Revived today)</span>' : '';
            
            btn.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-4xl filter grayscale drop-shadow-lg">${b.avatar}</span>
                    <div>
                        <div class="font-bold text-gray-300">${b.name}</div>
                        <div class="text-xs text-gray-500">Defeated Boss${statusText}</div>
                    </div>
                </div>
                <button onclick="fightGraveyardBoss('${b.name}')" class="bg-indigo-900 hover:bg-indigo-800 text-indigo-200 px-4 py-2 rounded font-bold transition active:scale-95 border border-indigo-700 shadow flex items-center gap-1 ${canRevive ? '' : 'opacity-50 cursor-not-allowed'}" ${canRevive ? '' : 'disabled'}>
                    <span>Resurrect</span><span class="text-yellow-400 text-xs">💰20</span>
                </button>
            `;
            list.appendChild(btn);
        });
    }
    switchScreen('screen-graveyard');
}

function fightGraveyardBoss(bossName) {
    const today = new Date().toDateString();
    if(!globalProgression.graveyardRevivalDates) globalProgression.graveyardRevivalDates = {};
    if(globalProgression.graveyardRevivalDates[bossName] === today) {
        playSound('lose');
        return; // Already revived today
    }
    if(globalProgression.gold >= 20) {
        globalProgression.gold -= 20;
        globalProgression.graveyardRevivalDates[bossName] = today;
        playSound('click');
        currentMode = 'graveyard';
        activeGraveyardBoss = bossName;
        startBattle(true);
    } else {
        playSound('lose');
    }
}

function startBattleMode(mode) {
    if(consumeEnergy(1)){ currentMode = mode; startBattle(true); } 
}

// --- TRAINING GROUND ---
function showTrainingGround() {
    switchScreen('screen-training-ground');
}

function startTraining() {
    currentMode = 'training';
    startBattle(true);
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
    else if (level <= 40)  bracket = { baseHp: 260,  baseDmg: 110, baseDef: 20, mult: 1.3 };
    else if (level <= 60)  bracket = { baseHp: 340,  baseDmg: 150, baseDef: 35, mult: 1.7 };
    else if (level <= 80)  bracket = { baseHp: 440,  baseDmg: 200, baseDef: 50, mult: 2.2 };
    else                   bracket = { baseHp: 560,  baseDmg: 260, baseDef: 70, mult: 2.8 };

    // Level within the bracket (1-based)
    let bracketSize = 20;
    let bracketStart = Math.floor((Math.min(level, 100) - 1) / bracketSize) * bracketSize + 1;
    let levelWithinBracket = Math.min(level, 100) - bracketStart + 1;
    // For levels above 100, continue scaling from the 81-100 bracket
    if (level > 100) {
        levelWithinBracket = level - 80; // continual scaling from level 80
    }

    let scalingFactor = 1 + (levelWithinBracket - 1) * 0.05;
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
    isAutoBattle = false;
    const btn = document.getElementById('btn-auto');
    if(btn) { btn.classList.remove('auto-on'); btn.disabled = false; btn.classList.remove('opacity-50'); }
    showHub();
}
function fleeBattle() { returnToTown(); }
function showFloatText(targetId, text, colorClass) { const target = document.getElementById(targetId); if (!target) return; const floater = document.createElement('div'); floater.className = `float-text ${colorClass}`; floater.innerText = text; target.appendChild(floater); setTimeout(() => { if(floater.parentNode) floater.remove(); }, 900); }

function generateEnemies() {
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
        // Spawn up to invasionMaxOnScreen enemies (max 4), but only if total spawned < 10
        let spawnCount = Math.min(invasionMaxOnScreen, invasionKillGoal - invasionSpawned);
        let pool = [...ENEMIES_DUNGEON, ...ENEMIES_PILLAGE];
        for(let i = 0; i < spawnCount; i++) {
            let t = pool[Math.floor(Math.random() * pool.length)];
            let e = { shield: 0, healBlock: 0, defReduction: 0, bleedStacks: 0, bleedTurns: 0, burnStacks: 0, burnTurns: 0, poisonStacks: 0, poisonTurns: 0, skipChance: 0, skipTurns: 0, dmgTakenMult: 1, dmgTakenTurns: 0, dodgeTurns: 0, rarity: 'epic', isBoss: false };
            let invasionLevel = Math.max(100, Math.min(player.lvl, 500));
            e.lvl = invasionLevel;
            e.name = 'Invader ' + t.name; e.avatar = t.avatar;
            e.maxHp = Math.max(1, Math.floor(25 * t.hpMult * (1 + (invasionLevel - 1) * 0.4) * 5));
            e.baseDmg = Math.max(1, Math.floor(invasionLevel * 5 * (1 + (invasionLevel - 1) * 0.01)));
            assignEnemySkills(e);
            e.currentHp = e.maxHp;
            enemies.push(e);
            invasionSpawned++;
        }
        activeTargetIndex = 0;
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
            // Dungeon difficulty: Tier N = max(1, (N-1)*2.5) multiplier relative to Tier 1
            let dungeonDiffMult = activeDungeonTier === 1 ? 1 : (activeDungeonTier - 1) * 2.5;
            e.lvl = activeDungeonTier * 5; 
            let dBoss = BOSS_TEMPLATES['dungeon'][Math.floor(Math.random() * BOSS_TEMPLATES['dungeon'].length)];
            e.name = dBoss.name; e.avatar = dBoss.avatar;
            e.maxHp = Math.floor(150 * dungeonDiffMult * dBoss.hpMult * 1.5); 
            e.baseDmg = Math.max(1, Math.floor(e.lvl * 3 * dBoss.dmgMult * 1.5 * dungeonDiffMult));
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
            let dungeonDiffMult = currentMode === 'dungeon' ? (activeDungeonTier === 1 ? 1.5 : (activeDungeonTier - 1) * 2.5 * 1.5) : 1;
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
    combatActive = true; generateEnemies();
    if (isNewEncounter) { 
        if(!(player.currentHp > 0)) player.currentHp = player.maxHp;
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
            enemies.forEach(e => {
                if(e.currentHp > 0) {
                    let selfDmg = Math.floor(e.baseDmg || 10);
                    e.currentHp = Math.max(0, e.currentHp - selfDmg);
                    addLog(`🎭 ${e.name} attacks itself for ${selfDmg}!`, 'text-yellow-400');
                }
            });
            playSound('hit');
            break;
        }
        case 'bud_butt': {
            enemies.forEach(e => {
                if(e.currentHp > 0) {
                    let dmg = Math.floor(e.maxHp * 0.10);
                    e.currentHp = Math.max(0, e.currentHp - dmg);
                    addLog(`💩 Mud Butt! ${dmg} damage to ${e.name}!`, 'text-pink-400');
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
    let modeText = currentMode === 'training' ? '🎯 Training Ground' : currentMode === 'dungeon' ? `Tier ${activeDungeonTier} (Rm ${activeDungeonRoom})` : currentMode === 'hunting' ? 'Wilderness' : currentMode === 'pillage' ? 'Pillage Village' : currentMode === 'workshop' ? 'Workshop Raid' : currentMode === 'graveyard' ? 'Graveyard' : 'Quest Marathon';
    
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
                avatarSizeClass = 'text-4xl'; nameSizeClass = 'text-sm'; bossLabelSizeClass = 'text-xs';
            } else if (enemies.length === 2) {
                avatarSizeClass = 'text-3xl'; nameSizeClass = 'text-xs'; bossLabelSizeClass = 'text-[9px]';
            } else if (enemies.length === 3) {
                avatarSizeClass = 'text-2xl'; nameSizeClass = 'text-[10px]'; bossLabelSizeClass = 'text-[8px]';
            } else {
                avatarSizeClass = 'text-xl'; nameSizeClass = 'text-[10px]'; bossLabelSizeClass = 'text-[8px]';
            }
            card.style.gridColumn = slotPositions[idx].col;
            card.style.gridRow = slotPositions[idx].row;

            card.className = `enemy-card bg-gray-800 p-1.5 rounded-lg cursor-pointer flex flex-col items-center overflow-hidden ${borderClass} ${isDead ? 'enemy-dead' : ''}`;
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

            let bossLabel = '';
            if (e.isMythicBoss) {
                bossLabel = `<div class="${bossLabelSizeClass} font-black text-white bg-gradient-to-r from-purple-600 to-pink-500 px-1.5 py-0.5 rounded-full shadow-lg mt-0.5 inline-block">✨ MYTHIC BOSS</div>`;
            } else if (e.isBoss) {
                bossLabel = `<div class="${bossLabelSizeClass} font-black text-yellow-200 bg-red-700 px-1.5 py-0.5 rounded-full shadow-lg mt-0.5 inline-block">👑 Boss</div>`;
            }
            card.innerHTML = `<div class="relative w-full text-center overflow-hidden"><div class="absolute -top-1 -right-2 text-sm flex gap-1 z-10">${eStatus}</div><div class="${avatarSizeClass} enemy-avatar mb-1 mt-1 ${animClass} leading-none" style="max-height:3rem;">${e.avatar}</div></div>${bossLabel}<div class="${nameSizeClass} font-bold leading-tight break-words w-full text-center ${rarityColor}">Lv.${e.lvl} ${e.name}</div><div class="health-bar-container !h-1.5 !mt-1"><div class="health-bar" style="width: ${(Math.max(0, e.currentHp) / e.maxHp) * 100}%"></div></div><div class="text-[9px] text-gray-400 mt-0.5 text-center leading-tight">HP: ${Math.max(0,e.currentHp)}/${e.maxHp} | DMG: ${e.baseDmg}</div>${isDead ? '<div class="enemy-death-overlay">💀</div>' : ''}`;
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
    grid.appendChild(makeSkillBtn(3, false, false));
    grid.appendChild(makeSkillBtn(4, false, false));

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
        if(hpPct < 0.40) { if(inv.pot_i3 > 0) return useConsumable('pot_i3'); if(inv.pot_i2 > 0) return useConsumable('pot_i2'); if(inv.pot_i1 > 0) return useConsumable('pot_i1'); }
        if(hpPct < 0.5 && player.regenBuffs.length === 0) { if(inv.pot_r3 > 0) return useConsumable('pot_r3'); if(inv.pot_r2 > 0) return useConsumable('pot_r2'); if(inv.pot_r1 > 0) return useConsumable('pot_r1'); }
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
    
    if(healSkill && hpPct < 0.5) chosen = healSkill;
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

    try {
    // SET COOLDOWN IMMEDIATELY so no branch can skip it
    let cdReduc = Math.floor(getEquipBonusStat('bonusCdReduc'));
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

            playSound('hit'); triggerAnim('combat-player-avatar', 'anim-strike'); 

            targets.forEach(tObj => {
                let target = tObj.e;
                let tIdx = tObj.idx;

                setTimeout(() => triggerAnim(`enemy-card-${tIdx}`, 'anim-shake'), 150 * (i+1));
                
                // Hit chance: 80% base + reflexes 0.1% per point + gear bonusHit
                let hitChance = 0.80 + ((a.reflexes || 1) * 0.001) + getEquipBonusStat('bonusHit');
                if(target.dodgeTurns > 0 || Math.random() > hitChance) {
                    addLog(`Missed ${target.name}!`, "text-gray-500");
                    showFloatText(`enemy-card-${tIdx}`, `MISS`, 'text-gray-400');
                    if(target.dodgeTurns > 0) target.dodgeTurns--;
                    return; 
                }
                
                // Armor Pierce: reflexes 0.3% per point + bonusArmorPierce from accessories
                let armorPierce = (a.reflexes || 1) * 0.003 + getEquipBonusStat('bonusArmorPierce');
                let effectiveDefReduction = Math.max(0, (target.defReduction || 0) - armorPierce);
                let defMult = 1 - Math.min(0.95, effectiveDefReduction); 
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
                    let critMult = (100 + ((a.fury || 1) * 0.25) + (getEquipBonusStat('bonusCritDmg') * 100)) / 100;
                    hitDmg = Math.floor(hitDmg * critMult);
                    addLog(`CRITICAL HIT!`, "text-yellow-400 font-bold");
                    playSound('crit');
                }
                
                target.currentHp -= Math.max(1, hitDmg); 
                totalDmg += hitDmg;
                showFloatText(`enemy-card-${tIdx}`, `-${hitDmg}`, isCrit ? 'text-orange-400 font-black text-2xl drop-shadow-[0_0_8px_rgba(251,146,60,0.9)]' : 'text-yellow-300 font-bold');

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
    let dodgeChance = (a.resistance || 1) * 0.0025 + getEquipBonusStat('bonusDodge');
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
    let tenacityReduction = 1 - ((a.tenacity || 1) * 0.003 + getEquipBonusStat('bonusDmgReduction'));
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
        showFloatText('player-avatar-container', `-${dmg} CRIT!`, 'text-red-400 font-black text-2xl drop-shadow-[0_0_10px_rgba(239,68,68,0.9)]');
        triggerAnim('combat-player-avatar', 'anim-crit');
        playSound('crit');
        // Extra screen shake for received crit
        let screen = document.getElementById('screen-combat');
        if(screen) { screen.classList.add('screen-shake'); setTimeout(() => screen.classList.remove('screen-shake'), 500); }
    } else {
        showFloatText('player-avatar-container', `-${dmg}`, 'text-red-500');
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
        let counterChance = ((a.agility || 1) * 0.0025) + getEquipBonusStat('bonusCounterChance');
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
    if(!combatActive) return;  // Already ended — prevent double-fire
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

    if (playerWon) {
        playSound('win');
        let killCount = enemies.length;

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

        globalProgression.gold += killCount; globalProgression.kills += killCount;
        // Track highest gold held
        { let ps = ensureProgressStats(); if (globalProgression.gold > (ps.highestGold || 0)) ps.highestGold = globalProgression.gold; }
        if(currentMode === 'hunting' || currentMode === 'pillage' || currentMode === 'workshop' || currentMode === 'island_defense') {
            globalProgression.storyModeProgress[currentMode]++;
        }

        rwdCont.innerHTML += `<div class="bg-gray-800 px-3 py-1 rounded border border-yellow-700 text-yellow-400 font-bold shadow-md">+${killCount} Gold</div>`;
        rwdCont.innerHTML += `<div class="bg-gray-800 px-3 py-1 rounded border border-red-700 text-red-400 font-bold shadow-md">+${killCount} Kills</div>`;

        // --- INVASION MODE ---
        if(currentMode === 'invasion') {
            invasionTotalKills += killCount;
            // Per-kill rewards: 30 gold + 1 random usable item
            let invasionGoldGain = killCount * 30;
            globalProgression.gold += invasionGoldGain;
            rwdCont.innerHTML += `<div class="bg-gray-800 px-3 py-1 rounded border border-orange-700 text-orange-400 font-bold shadow-md">⚔️ +${invasionGoldGain} Invasion Gold</div>`;
            for(let k = 0; k < killCount; k++) {
                let randomUsableKey = BURGLAR_ITEM_POOL[Math.floor(Math.random() * BURGLAR_ITEM_POOL.length)];
                if(!globalProgression.usableItems) globalProgression.usableItems = {};
                globalProgression.usableItems[randomUsableKey] = (globalProgression.usableItems[randomUsableKey] || 0) + 1;
                let usableItem = USABLE_ITEMS[randomUsableKey];
                rwdCont.innerHTML += `<div class="bg-gray-800 px-2 py-1 rounded border border-red-700 text-red-300 font-bold shadow-md text-xs">+1 ${usableItem.icon} ${usableItem.name}</div>`;
            }
            
            // Check invasion completion
            if(invasionTotalKills >= invasionKillGoal) {
                globalProgression.inventory.soul_pebbles = (globalProgression.inventory.soul_pebbles || 0) + 1;
                rwdCont.innerHTML += `<div class="bg-gray-900 px-3 py-2 rounded border-2 border-purple-600 text-purple-300 font-bold shadow-md">🎉 INVASION COMPLETE! +1 Soul Pebble</div>`;
                // Invasion completion bonuses: 1 legendary gear, 5 legendary cores, 0.5% mythic gear
                let invasionGear = rollEquipment('legendary');
                globalProgression.equipInventory.push(invasionGear);
                globalProgression.newItems[invasionGear.type.startsWith('ring') ? 'ring' : invasionGear.type] = true;
                rwdCont.innerHTML += `<div class="bg-gray-800 px-3 py-1 rounded border-2 rarity-legendary text-yellow-300 font-bold shadow-md">⚔️ INVASION REWARD: 1 Legendary Gear (${invasionGear.icon})</div>`;
                globalProgression.inventory.ench_legendary = (globalProgression.inventory.ench_legendary || 0) + 5;
                rwdCont.innerHTML += `<div class="bg-gray-800 px-3 py-1 rounded border border-yellow-600 text-yellow-300 font-bold shadow-md">⚔️ INVASION REWARD: +5 Legendary Cores</div>`;
                if(Math.random() < 0.005) {
                    let mythicGear = rollEquipment('mythic');
                    globalProgression.equipInventory.push(mythicGear);
                    globalProgression.newItems[mythicGear.type.startsWith('ring') ? 'ring' : mythicGear.type] = true;
                    rwdCont.innerHTML += `<div class="bg-gray-900 px-3 py-2 rounded border-2 rarity-mythic text-pink-300 font-bold shadow-md anim-mythic-gear">✨ MYTHIC DROP: ${mythicGear.icon} ${mythicGear.name}!</div>`;
                }
                // End screen - invasion done
                title.innerText = "INVASION COMPLETE!"; title.className = "text-4xl font-bold mb-2 text-orange-400 drop-shadow-lg";
                desc.innerText = `All 10 invaders defeated! Invasion complete.`;
                btnNext.classList.add('hidden');
            } else {
                // More enemies remain - continue
                let remaining = invasionKillGoal - invasionTotalKills;
                let moreToSpawn = Math.min(invasionMaxOnScreen, invasionKillGoal - invasionSpawned);
                desc.innerText = `Enemies defeated: ${invasionTotalKills}/${invasionKillGoal}. ${remaining} remain!`;
                if(moreToSpawn > 0) {
                    btnNext.innerText = `Next Wave (${invasionTotalKills}/${invasionKillGoal})`;
                    btnNext.classList.remove('hidden');
                } else {
                    btnNext.classList.add('hidden');
                }
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
            }
            else if (currentMode === 'island_defense') {
                let fishTypes = [1,2,3,4,5,6];
                let pick = fishTypes[Math.floor(Math.random()*fishTypes.length)];
                globalProgression.inventory[`fish_${pick}`] = (globalProgression.inventory[`fish_${pick}`] || 0) + 1;
                rwdCont.innerHTML += `<div class="bg-gray-800 px-3 py-1 rounded border border-blue-700 text-blue-400 font-bold shadow-md">+1 ${MAT_NAMES['fish_'+pick]}</div>`;
            }
            else if (currentMode === 'pillage' || currentMode === 'dungeon' || currentMode === 'graveyard') {
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

        // 5% pet drop chance from any game mode
        if(Math.random() < 0.05) {
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
                
                let dRwd = rollEquipment('rare'); globalProgression.equipInventory.push(dRwd); globalProgression.newItems[dRwd.type.startsWith('ring') ? 'ring' : dRwd.type] = true; 
                rwdCont.innerHTML += `<div class="bg-gray-800 px-3 py-1 rounded border-2 rarity-rare text-blue-300 font-bold shadow-[0_0_10px_rgba(59,130,246,0.3)]">Dungeon Clear: 1 Gear (${dRwd.icon})</div>`;
                // Award 400 gold for dungeon completion
                globalProgression.gold += 400;
                rwdCont.innerHTML += `<div class="bg-gray-800 px-3 py-1 rounded border border-yellow-600 text-yellow-300 font-bold shadow-md">+400 💰 Gold</div>`;

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
        // Dungeons give 3x XP
        if(currentMode === 'dungeon') totalXp *= 3;
        // Apply XP Increase enhancements + XP Gain from accessories
        let xpMult = 1 + getEquipBonusStat('bonusXpGain');
        (globalProgression.skillTreeEnhancements || []).forEach(enh => {
            if(enh.type === 'xpIncrease') xpMult += ENHANCEMENT_DEFS.xpIncrease.vals[enh.rarity];
        });
        totalXp = Math.floor(totalXp * xpMult);
        document.getElementById('end-xp-amount').innerText = totalXp; globalProgression.totalExpEarned += totalXp;

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
                    if(player.lvl % 2 === 0) { player.skillPoints++; spTxt.classList.remove('hidden'); }
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
        if(invasionTotalKills < invasionKillGoal && invasionSpawned < invasionKillGoal) {
            startBattle(false); // spawn next wave
        } else {
            showPortal();
        }
    } else {
        if(!consumeEnergy(1)) { returnToTown(); return; }
        startBattle(true);
    }
}

// --- PROGRESS MENU ---
function showProgressMenu() {
    let ps = ensureProgressStats();
    // Update level reached
    if (player.lvl > (ps.levelReached || 0)) ps.levelReached = player.lvl;
    // Update highest gold
    if (globalProgression.gold > (ps.highestGold || 0)) ps.highestGold = globalProgression.gold;

    function fmtTime(secs) {
        let s = Math.floor(secs || 0);
        let h = Math.floor(s / 3600); let m = Math.floor((s % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    const rows = [
        { label: 'Level Reached', value: ps.levelReached || 1 },
        { label: 'Highest Damage Ever', value: ps.highestDmg || 0 },
        { label: 'Most Damage Survived', value: ps.mostDmgSurvived || 0 },
        { label: 'Longest Win Streak', value: ps.longestWinStreak || 0 },
        { label: 'Total Kills', value: ps.totalKills || 0 },
        { label: 'Total Deaths', value: ps.totalDeaths || 0 },
        { label: 'Battles Won', value: ps.battlesWon || 0 },
        { label: 'Battles Lost', value: ps.battlesLost || 0 },
        { label: 'Mythic Boss Found', value: ps.mythicBossFound || 0 },
        { label: 'MAX Dungeon Cleared', value: ps.maxDungeonCleared ? `Tier ${ps.maxDungeonCleared}` : 'None' },
        { label: 'Bosses Defeated', value: ps.bossesDefeated || 0 },
        { label: 'Gold Spent', value: ps.goldSpent || 0 },
        { label: 'Highest Gold Held', value: ps.highestGold || 0 },
        { label: 'Gambling Wins / Losses', value: `${ps.gamblingWins || 0} / ${ps.gamblingLosses || 0}` },
        { label: 'Total Play Time', value: fmtTime(ps.totalPlayTimeSeconds) },
        { label: 'Potions Consumed', value: ps.potionsConsumed || 0 },
        { label: '🐾 Pets Found', value: (globalProgression.petsOwned || []).length },
        { label: '🐾 Pet Battles Won', value: globalProgression.petBattlesWon || 0 },
        { label: '🐾 Pet Battle Win Streak', value: `${globalProgression.petBattleWinStreak || 0} (Best: ${globalProgression.petBattleBestStreak || 0})` },
    ];

    let html = rows.map(r =>
        `<div class="flex items-center py-1 border-b border-gray-700 last:border-0 gap-4">
            <span class="text-gray-400 text-xs flex-grow">${r.label}</span>
            <span class="text-yellow-300 font-bold text-xs pr-4">${r.value}</span>
        </div>`
    ).join('');

    document.getElementById('progress-menu-class').innerText = `${player.data.name} — Progress`;
    document.getElementById('progress-menu-rows').innerHTML = html;
    document.getElementById('modal-progress').style.display = 'flex';
}

function closeProgressMenu() {
    document.getElementById('modal-progress').style.display = 'none';
}

// --- EXPORT / IMPORT SAVE ---
function showExport() {
    saveGame();
    let saveData = localStorage.getItem('EternalAscensionSaveDataV1') || localStorage.getItem('fogFighterSaveDataV22') || localStorage.getItem('fogFighterSaveDataV21') || localStorage.getItem('fogFighterSaveDataV20');
    let encoded = btoa(unescape(encodeURIComponent(saveData)));
    
    document.getElementById('sl-modal-title').innerText = "Export Save Data";
    document.getElementById('sl-modal-desc').innerText = "Copy this text to save your progress elsewhere.";
    document.getElementById('sl-modal-text').value = encoded;
    document.getElementById('sl-modal-text').readOnly = true;
    let btn = document.getElementById('sl-modal-btn');
    btn.innerText = "Copy to Clipboard";
    btn.className = "w-full bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 rounded transition active:scale-95 border border-blue-500";
    btn.onclick = () => {
        let ta = document.getElementById('sl-modal-text');
        ta.select();
        document.execCommand('copy');
        btn.innerText = "Copied!";
        playSound('click');
        setTimeout(() => btn.innerText = "Copy to Clipboard", 2000);
    };
    document.getElementById('modal-save-load').style.display = 'flex';
}

function showImport() {
    document.getElementById('sl-modal-title').innerText = "Import Save Data";
    document.getElementById('sl-modal-desc').innerHTML = "<span class='text-red-400 font-bold'>Warning:</span> This will overwrite your current progress! Paste your code below.";
    document.getElementById('sl-modal-text').value = "";
    document.getElementById('sl-modal-text').readOnly = false;
    let btn = document.getElementById('sl-modal-btn');
    btn.innerText = "Load Save Data";
    btn.className = "w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded transition active:scale-95 border border-red-500";
    btn.onclick = () => {
        try {
            let encoded = document.getElementById('sl-modal-text').value.trim();
            if(!encoded) return;
            let decoded = decodeURIComponent(escape(atob(encoded)));
            let jsonData = decoded;
            if (decoded.includes('|')) {
                const parts = decoded.split('|');
                jsonData = parts[0];
                const checksum = parts[1];
                if (checksum !== btoa(jsonData.length.toString())) {
                    throw new Error("Checksum mismatch");
                }
            }
            let parsed = JSON.parse(jsonData); 
            if(parsed.global && parsed.pState) {
                localStorage.setItem('EternalAscensionSaveDataV1', decoded);
                closeSaveLoadModal();
                playSound('win');
                loadGameAndContinue(); 
                showHub(); 
            } else {
                throw new Error("Invalid format");
            }
        } catch(e) {
            playSound('lose');
            btn.innerText = e.message === "Checksum mismatch" ? "Save Data Corrupted!" : "Invalid Save Code!";
            btn.classList.add('bg-gray-600', 'border-gray-500');
            btn.classList.remove('bg-red-700', 'border-red-500');
            setTimeout(() => {
                btn.innerText = "Load Save Data";
                btn.classList.remove('bg-gray-600', 'border-gray-500');
                btn.classList.add('bg-red-700', 'border-red-500');
            }, 2000);
        }
    };
    document.getElementById('modal-save-load').style.display = 'flex';
}

function closeSaveLoadModal() {
    document.getElementById('modal-save-load').style.display = 'none';
}
