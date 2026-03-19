// --- ATTRIBUTE CONSTANTS ---
const ATTRIBUTE_KEYS = ['hp','tenacity','agility','willpower','resistance','reflexes','fury','rawPower','force','revival','vampire','defense','happiness'];

function getPlayerClassBase() {
    const classId = player.classId || 'warrior';
    return { classId, classBase: getClassBaseAttributes(classId) };
}

function showAttributes() {
    clampAttributes();
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

    const currentCost = getTotalSpentPoints() >= 50 ? 2 : 1;

    attrDefs.forEach(a => {
        let currentVal = globalProgression.attributes[a.id] !== undefined ? globalProgression.attributes[a.id] : 0;
        const { classId, classBase } = getPlayerClassBase();
        let minVal = classBase[a.id] !== undefined ? classBase[a.id] : 0;
        let attrCap = getClassAttrCap(classId, a.id);
        const cost = currentCost;

        // + button: disabled if can't afford or at cap
        let plusDisabled = (player.statPoints < cost) || (currentVal >= attrCap) ? 'disabled' : '';

        // +5 button disabled logic
        let plus5Disabled = (currentVal >= attrCap || player.statPoints < 5 * cost) ? 'disabled' : '';

        // +50 button disabled logic
        let plus50Disabled = (currentVal >= attrCap || player.statPoints < 50 * cost) ? 'disabled' : '';

        // - button: disabled if at class minimum (permanent base)
        let minusDisabled = currentVal <= minVal ? 'disabled' : '';

        // -5 button: disabled if fewer than 5 levels above minimum
        let minus5Disabled = (currentVal - 5) < minVal ? 'disabled' : '';

        // -50 button: disabled if fewer than 50 levels above minimum
        let minus50Disabled = (currentVal - 50) < minVal ? 'disabled' : '';

        let capDisplay = ` / ${attrCap}`;
        let levelDisplay = `Lv. ${currentVal}${capDisplay}`;
        let baseNote = (minVal > 0) ? ` <span class="text-yellow-500 text-[9px]">(base ${minVal})</span>` : '';

        let btn = document.createElement('div');
        btn.className = "flex flex-col bg-gray-900 p-2 rounded-lg border border-gray-700 shadow-sm";

        btn.innerHTML = `
            <div class="w-full mb-2">
                <div class="font-bold ${a.color} text-sm">${a.name} <span class="text-white ml-2 text-xs">${levelDisplay}</span>${baseNote} <span class="text-xs text-yellow-400 ml-1">Cost: ${cost} SP</span></div>
                <div class="text-[10px] text-gray-400 leading-tight mt-0.5">${a.desc}</div>
            </div>
            <div class="flex gap-2 w-full items-stretch">
                <div class="flex flex-col gap-1 flex-1">
                    <button onclick="deallocateAttribute('${a.id}',50)" class="w-full bg-red-800 hover:bg-red-700 py-1 rounded text-white font-bold transition active:scale-95 border border-red-600 text-xs disabled:opacity-50" ${minus50Disabled}>- 50</button>
                    <button onclick="deallocateAttribute('${a.id}',5)" class="w-full bg-red-800 hover:bg-red-700 py-1 rounded text-white font-bold transition active:scale-95 border border-red-600 text-xs disabled:opacity-50" ${minus5Disabled}>- 5</button>
                    <button onclick="deallocateAttribute('${a.id}',1)" class="w-full bg-red-800 hover:bg-red-700 py-1 rounded text-white font-bold transition active:scale-95 border border-red-600 text-sm disabled:opacity-50" ${minusDisabled}>-</button>
                </div>
                <div class="flex flex-col gap-1 flex-1">
                    <button onclick="allocateAttribute('${a.id}',50)" class="w-full bg-green-700 hover:bg-green-600 py-1 rounded text-white font-bold transition active:scale-95 border border-green-500 text-xs disabled:opacity-50" ${plus50Disabled}>+ 50</button>
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
    const { classId, classBase } = getPlayerClassBase();
    const cost = getTotalSpentPoints() >= 50 ? 2 : 1;
    let attrCap = getClassAttrCap(classId, id);

    let defaultMin = classBase[id] !== undefined ? classBase[id] : 0;
    let currentVal = globalProgression.attributes[id] !== undefined ? globalProgression.attributes[id] : defaultMin;
    let canAllocate = Math.min(count, attrCap - currentVal, Math.floor(player.statPoints / cost));
    // Enforce total attribute budget
    let maxBudget = getMaxAttributePoints() - getTotalSpentPoints();
    canAllocate = Math.min(canAllocate, Math.max(0, maxBudget));
    if (canAllocate <= 0) return;
    player.statPoints -= canAllocate * cost;
    globalProgression.attributes[id] = currentVal + canAllocate;

    recalcAndClampHp();
    saveGame();
    playSound('click');
    showAttributes();
}

function deallocateAttribute(id, count) {
    count = count || 1;
    const { classBase } = getPlayerClassBase();
    let defaultMin = classBase[id] !== undefined ? classBase[id] : 0;
    let minVal = defaultMin;
    let currentVal = globalProgression.attributes[id] !== undefined ? globalProgression.attributes[id] : minVal;
    let canRemove = Math.min(count, currentVal - minVal);
    if (canRemove <= 0) return;

    const cost = getTotalSpentPoints() >= 50 ? 2 : 1;
    globalProgression.attributes[id] = currentVal - canRemove;
    player.statPoints += canRemove * cost;

    recalcAndClampHp();
    saveGame();
    playSound('click');
    showAttributes();
}

function respecAttributes() {
    const { classBase } = getPlayerClassBase();
    let totalRefund = 0;
    ATTRIBUTE_KEYS.forEach(stat => {
        let currentVal = globalProgression.attributes[stat] !== undefined ? globalProgression.attributes[stat] : 0;
        let baseVal = classBase[stat] !== undefined ? classBase[stat] : 0;
        totalRefund += Math.max(0, currentVal - baseVal);
        globalProgression.attributes[stat] = baseVal;
    });
    player.statPoints += totalRefund;
    recalcAndClampHp();
    saveGame();
    playSound('click');
    showAttributes();
}


// --- ATTRIBUTE BUDGET HELPERS ---
function recalcAndClampHp() {
    const oldMaxHp = player.maxHp;
    player.maxHp = calculateMaxHp();
    // Clamp currentHp to the new max without scaling — no free healing from stat changes
    player.currentHp = Math.min(player.currentHp, player.maxHp);
    // Keep dead players dead
    if (player.currentHp <= 0 && oldMaxHp > 0) player.currentHp = 0;
}

function getTotalSpentPoints() {
    const { classBase } = getPlayerClassBase();
    let total = 0;
    ATTRIBUTE_KEYS.forEach(stat => {
        total += Math.max(0, (globalProgression.attributes[stat] || 0) - (classBase[stat] || 0));
    });
    return total;
}

function getMaxAttributePoints() {
    // Levels 1-50 contribute 1 point each; levels above 50 contribute 2 points each
    return Math.min(player.lvl, 50) + Math.max(0, player.lvl - 50) * 2;
}

function clampAttributes() {
    let maxPoints = getMaxAttributePoints();
    const { classBase } = getPlayerClassBase();

    let spent = getTotalSpentPoints();
    let totalUsed = spent + Math.max(0, player.statPoints);

    if (totalUsed > maxPoints) {
        // First, reduce unspent points
        let excess = totalUsed - maxPoints;
        let reducedFromUnspent = Math.min(player.statPoints, excess);
        player.statPoints -= reducedFromUnspent;
        excess -= reducedFromUnspent;

        // Then trim from allocated attributes (highest above base first)
        while (excess > 0) {
            let highest = null, highestVal = 0;
            ATTRIBUTE_KEYS.forEach(stat => {
                let cur = globalProgression.attributes[stat] || 0;
                let base = classBase[stat] || 0;
                if (cur - base > highestVal) { highestVal = cur - base; highest = stat; }
            });
            if (!highest) break;
            globalProgression.attributes[highest]--;
            excess--;
        }
    } else if (totalUsed < maxPoints) {
        // Restore missing points to unspent pool
        player.statPoints = maxPoints - spent;
    }

    player.statPoints = Math.max(0, player.statPoints);
    // Recalculate maxHp and clamp currentHp in case the hp attribute was trimmed
    recalcAndClampHp();
}
