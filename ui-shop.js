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
    if(globalProgression.gold >= 100) {
        globalProgression.gold -= 100;
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
    if(type.startsWith('pot_') || type.startsWith('food_')) return;
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
