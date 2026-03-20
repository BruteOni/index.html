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
        { id: 'rawPower',   name: 'Raw Power',   desc: '+2 base damage per point', color: 'text-red-400' },
        { id: 'willpower',  name: 'Willpower',   desc: '+0.3% increased base damage per point', color: 'text-blue-400' },
        { id: 'defense',    name: 'Defense',      desc: '+1 defense per point (reduces damage by 1)', color: 'text-gray-300' },
        { id: 'hp',         name: 'HP',           desc: '+0.5% max HP per point', color: 'text-green-300' },
        { id: 'reflexes',   name: 'Reflexes',     desc: '+0.3% armor pierce (ignore enemy defense) per point', color: 'text-green-400' },
        { id: 'tenacity',   name: 'Tenacity',     desc: '+0.3% damage reduction per point', color: 'text-orange-400' },
        { id: 'agility',    name: 'Agility',      desc: '+0.25% chance to attack back when hit per point', color: 'text-yellow-400' },
        { id: 'resistance', name: 'Resistance',   desc: '+0.25% dodge chance per point', color: 'text-purple-400' },
        { id: 'happiness',  name: 'Happiness',    desc: '+0.25% healing received per point', color: 'text-pink-400' },
        { id: 'vampire',    name: 'Vampire',      desc: '+0.25% life received per hit per point', color: 'text-violet-400' },
        { id: 'force',      name: 'Force',        desc: '+0.5% crit rate per point', color: 'text-cyan-400' },
        { id: 'fury',       name: 'Fury',         desc: '+0.25% crit damage per point', color: 'text-red-500' },
        { id: 'revival',    name: 'Revival',      desc: '+0.2% HP regen per turn per point', color: 'text-emerald-400' },
    ];

    attrDefs.forEach((a, idx) => {
        const currentVal = globalProgression.attributes[a.id] !== undefined ? globalProgression.attributes[a.id] : 0;
        const { classId, classBase } = getPlayerClassBase();
        const minVal = classBase[a.id] !== undefined ? classBase[a.id] : 0;
        const attrCap = getClassAttrCap(classId, a.id);
        const cost = currentVal >= ATTRIBUTE_EXPENSIVE_THRESHOLD ? 2 : 1;

        // + button: disabled if can't afford or at cap
        const plusDisabled = (player.statPoints < cost) || (currentVal >= attrCap) ? 'disabled' : '';

        // +5 button disabled logic
        const cheap5 = Math.max(0, Math.min(5, ATTRIBUTE_EXPENSIVE_THRESHOLD - currentVal));
        const plus5Cost = cheap5 + (5 - cheap5) * 2;
        const plus5Disabled = (currentVal >= attrCap || player.statPoints < plus5Cost) ? 'disabled' : '';

        // - button: disabled if at class minimum (permanent base)
        const minusDisabled = currentVal <= minVal ? 'disabled' : '';

        // -5 button: disabled if fewer than 5 levels above minimum
        const minus5Disabled = (currentVal - 5) < minVal ? 'disabled' : '';

        const capDisplay = ` / ${attrCap}`;
        const levelDisplay = `Lv. ${currentVal}${capDisplay}`;
        const baseNote = (minVal > 0) ? ` <span class="text-yellow-500 text-[9px]">(base ${minVal})</span>` : '';

        // Revival spans full width (13th attribute)
        const isRevival = a.id === 'revival';

        const btn = document.createElement('div');
        btn.className = "flex flex-col bg-gray-900 p-1.5 rounded-lg border border-gray-700 shadow-sm" + (isRevival ? " col-span-2" : "");

        btn.innerHTML = `
            <div class="w-full mb-1">
                <div class="font-bold ${a.color} text-[11px] leading-tight">${sanitizeHTML(a.name)} <span class="text-white text-[10px]">${levelDisplay}</span>${baseNote} <span class="text-[9px] text-yellow-400">Cost: ${cost} SP</span></div>
                <div class="text-[9px] text-gray-400 leading-tight">${sanitizeHTML(a.desc)}</div>
            </div>
            <div class="flex gap-1 w-full items-stretch">
                <div class="flex flex-col gap-0.5 flex-1">
                    <button onclick="deallocateAttribute('${a.id}',5)" class="w-full bg-red-800 hover:bg-red-700 py-0.5 rounded text-white font-bold transition active:scale-95 border border-red-600 text-[10px] disabled:opacity-50" ${minus5Disabled}>- 5</button>
                    <button onclick="deallocateAttribute('${a.id}',1)" class="w-full bg-red-800 hover:bg-red-700 py-0.5 rounded text-white font-bold transition active:scale-95 border border-red-600 text-[10px] disabled:opacity-50" ${minusDisabled}>-</button>
                </div>
                <div class="flex flex-col gap-0.5 flex-1">
                    <button onclick="allocateAttribute('${a.id}',5)" class="w-full bg-green-700 hover:bg-green-600 py-0.5 rounded text-white font-bold transition active:scale-95 border border-green-500 text-[10px] disabled:opacity-50" ${plus5Disabled}>+ 5</button>
                    <button onclick="allocateAttribute('${a.id}',1)" class="w-full bg-green-700 hover:bg-green-600 py-0.5 rounded text-white font-bold transition active:scale-95 border border-green-500 text-[10px] disabled:opacity-50" ${plusDisabled}>+</button>
                </div>
            </div>
        `;
        list.appendChild(btn);
    });

    switchScreen('screen-attributes');
}

function allocateAttribute(id, count) {
    if (!ATTRIBUTE_KEYS.includes(id)) return;
    count = count || 1;
    const { classId, classBase } = getPlayerClassBase();
    const attrCap = getClassAttrCap(classId, id);

    const defaultMin = classBase[id] !== undefined ? classBase[id] : 0;
    const currentVal = globalProgression.attributes[id] !== undefined ? globalProgression.attributes[id] : defaultMin;

    // Determine how many levels we can afford, accounting for threshold at ATTRIBUTE_EXPENSIVE_THRESHOLD
    let affordable;
    if (currentVal >= ATTRIBUTE_EXPENSIVE_THRESHOLD) {
        affordable = Math.floor(player.statPoints / 2);
    } else {
        const cheapCapacity = ATTRIBUTE_EXPENSIVE_THRESHOLD - currentVal; // levels available at cost 1 SP
        if (player.statPoints <= cheapCapacity) {
            affordable = player.statPoints;
        } else {
            affordable = cheapCapacity + Math.floor((player.statPoints - cheapCapacity) / 2);
        }
    }

    const canAllocate = Math.min(count, attrCap - currentVal, affordable);
    if (canAllocate <= 0) return;

    // Calculate actual SP cost, accounting for threshold crossing
    const cheap = Math.max(0, Math.min(canAllocate, ATTRIBUTE_EXPENSIVE_THRESHOLD - currentVal));
    const expensive = Math.max(0, canAllocate - cheap);
    const totalCost = cheap + expensive * 2;

    player.statPoints -= totalCost;
    globalProgression.attributes[id] = currentVal + canAllocate;

    recalcAndClampHp();
    saveGame();
    playSound('click');
    showAttributes();
}

function deallocateAttribute(id, count) {
    if (!ATTRIBUTE_KEYS.includes(id)) return;
    count = count || 1;
    const { classBase } = getPlayerClassBase();
    const defaultMin = classBase[id] !== undefined ? classBase[id] : 0;
    const minVal = defaultMin;
    const currentVal = globalProgression.attributes[id] !== undefined ? globalProgression.attributes[id] : minVal;
    const canRemove = Math.min(count, currentVal - minVal);
    if (canRemove <= 0) return;

    // Calculate refund: levels above ATTRIBUTE_EXPENSIVE_THRESHOLD refund 2 SP each, levels at/below refund 1 SP each
    const expensiveRemoved = Math.min(canRemove, Math.max(0, currentVal - ATTRIBUTE_EXPENSIVE_THRESHOLD));
    const cheapRemoved = canRemove - expensiveRemoved;
    const totalRefund = cheapRemoved + expensiveRemoved * 2;

    globalProgression.attributes[id] = currentVal - canRemove;
    player.statPoints += totalRefund;

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
        let cheapLevels = Math.max(0, Math.min(ATTRIBUTE_EXPENSIVE_THRESHOLD, currentVal) - baseVal);
        let expensiveLevels = Math.max(0, currentVal - Math.max(ATTRIBUTE_EXPENSIVE_THRESHOLD, baseVal));
        totalRefund += cheapLevels + expensiveLevels * 2;
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
        let cur = globalProgression.attributes[stat] || 0;
        let base = classBase[stat] || 0;
        // Levels from base up to ATTRIBUTE_EXPENSIVE_THRESHOLD cost 1 SP each
        let cheapLevels = Math.max(0, Math.min(ATTRIBUTE_EXPENSIVE_THRESHOLD, cur) - base);
        // Levels from ATTRIBUTE_EXPENSIVE_THRESHOLD up to cur cost 2 SP each
        let expensiveLevels = Math.max(0, cur - Math.max(ATTRIBUTE_EXPENSIVE_THRESHOLD, base));
        total += cheapLevels + expensiveLevels * 2;
    });
    return total;
}

function getMaxAttributePoints() {
    return player.lvl * STAT_POINTS_PER_LEVEL;
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
            let curLevel = globalProgression.attributes[highest] || 0;
            let trimCost = curLevel > ATTRIBUTE_EXPENSIVE_THRESHOLD ? 2 : 1;
            globalProgression.attributes[highest]--;
            excess -= trimCost;
        }
        // If trimming overshot (excess < 0), return the extra SP to the unspent pool
        if (excess < 0) {
            player.statPoints += -excess;
        }
    } else if (totalUsed < maxPoints) {
        // Restore missing points to unspent pool
        player.statPoints = maxPoints - spent;
    }

    player.statPoints = Math.max(0, player.statPoints);
    // Recalculate maxHp and clamp currentHp in case the hp attribute was trimmed
    recalcAndClampHp();
}
