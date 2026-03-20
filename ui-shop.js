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

        // Legendary Core → Soul Pebble Exchange
        let legCores = globalProgression.inventory.ench_legendary || 0;
        let pebbles = globalProgression.inventory.soul_pebbles || 0;
        let canPebbleExchange = legCores >= 200;
        let pebbleDiv = document.createElement('div');
        pebbleDiv.className = 'mt-2 bg-gray-800 border border-purple-700 rounded-lg p-3 flex justify-between items-center';
        pebbleDiv.innerHTML = `
            <div>
                <div class="text-sm font-bold text-purple-300">🔮 Legendary Core → Soul Pebble Exchange</div>
                <div class="text-xs text-gray-400">200 Legendary Cores → 1 Soul Pebble</div>
                <div class="text-xs text-gray-400 mt-1">Cores: <span class="text-yellow-300">${legCores}</span> &nbsp; Pebbles: <span class="text-purple-300">${pebbles}</span></div>
            </div>
            <button onclick="exchangeLegendaryCoresForPebble(showEnchanter)" class="bg-purple-700 hover:bg-purple-600 text-white font-bold px-3 py-2 rounded text-xs transition active:scale-95 shadow-md ${canPebbleExchange ? '' : 'opacity-50 cursor-not-allowed'}" ${canPebbleExchange ? '' : 'disabled'}>EXCHANGE</button>
        `;
        mergeContainer.appendChild(pebbleDiv);
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

    // Show item stats before core options
    let statsHtml = '<div class="bg-gray-900 border border-gray-600 rounded-lg p-3 mb-3">';
    statsHtml += `<div class="text-sm font-bold text-white mb-2">📊 Current Stats — ${eq.name}</div>`;
    statsHtml += '<div class="grid grid-cols-2 gap-1 text-xs">';
    if(eq.stats) {
        const STAT_LABELS = { dmg: '⚔️ Damage', def: '🛡️ Defense', hp: '❤️ HP', critChance: '🎯 Crit%', critDmg: '💥 Crit Dmg', dodge: '💨 Dodge', armorPierce: '🗡️ Armor Pierce', dmgMitigation: '🛡️ Dmg Mitigation' };
        Object.entries(eq.stats).forEach(([key, val]) => {
            if(val && val !== 0) {
                let label = STAT_LABELS[key] || key;
                statsHtml += `<div class="text-gray-300"><span class="text-gray-500">${label}:</span> <span class="text-yellow-300 font-bold">${typeof val === 'number' && val < 1 ? (val * 100).toFixed(1) + '%' : val}</span></div>`;
            }
        });
    }
    if(eq.bonusStats && eq.bonusStats.length > 0) {
        eq.bonusStats.forEach(bs => {
            if(bs.value && bs.value !== 0) {
                let label = bs.stat || bs.key || 'Bonus';
                statsHtml += `<div class="text-purple-300"><span class="text-gray-500">${label}:</span> <span class="font-bold">+${typeof bs.value === 'number' && bs.value < 1 ? (bs.value * 100).toFixed(1) + '%' : bs.value}</span></div>`;
            }
        });
    }
    statsHtml += '</div></div>';
    list.innerHTML = statsHtml;
    
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

// --- BLACK MARKET SHOP ---
const BLACK_MARKET_TIERS = [
    {
        tier: 1, cost: 75,
        title: 'Avatar Glow Border',
        icon: '✨',
        desc: 'A radiant border glow effect surrounds your avatar in battle. Equips automatically.',
        color: 'border-yellow-400',
        reward: 'avatarGlow'
    },
    {
        tier: 2, cost: 100,
        title: 'Sixth Skill Slot',
        icon: '⚡',
        desc: 'Unlock a 6th skill slot. Equip an additional skill for greater combat flexibility.',
        color: 'border-purple-400',
        reward: 'sixthSkill'
    },
    {
        tier: 3, cost: 100,
        title: 'Stun Retaliation',
        icon: '💥',
        desc: 'Passive: When you are stunned, deal 50% base damage to all enemies when the stun ends. Applies to all classes permanently.',
        color: 'border-orange-400',
        reward: 'stunRetaliation'
    },
    {
        tier: 4, cost: 100,
        title: 'Phantom Strike',
        icon: '👻',
        desc: 'Passive: When you miss an attack, deal 50% base damage as a phantom strike. Never truly miss.',
        color: 'border-blue-400',
        reward: 'phantomStrike'
    },
    {
        tier: 5, cost: 100,
        title: 'Cooldown Mastery',
        icon: '⏱',
        desc: 'Passive: All skill cooldowns reduced by 2 (minimum 0). Your skills come back faster.',
        color: 'border-cyan-400',
        reward: 'cdMastery'
    }
];

function showBlackMarket() {
    if (!globalProgression.blackMarketTier) globalProgression.blackMarketTier = 0;
    const currentTier = globalProgression.blackMarketTier;
    const spEl = document.getElementById('bm-sp-display');
    if (spEl) spEl.innerText = player.skillPoints;

    const list = document.getElementById('bm-tier-list');
    if (!list) return;
    list.innerHTML = '';

    BLACK_MARKET_TIERS.forEach((t) => {
        let isPurchased = currentTier >= t.tier;
        let isNext = currentTier === t.tier - 1;
        let isLocked = !isPurchased && !isNext;
        let canAfford = player.skillPoints >= t.cost;

        let div = document.createElement('div');
        div.className = `bg-gray-900 border-2 ${isPurchased ? 'border-green-500' : isNext ? t.color : 'border-gray-700'} rounded-xl p-4 flex flex-col gap-2 shadow-lg ${isLocked ? 'opacity-50' : ''}`;

        let statusBadge = isPurchased
            ? `<span class="text-green-400 font-bold text-sm">✅ Purchased</span>`
            : isNext
                ? `<span class="text-yellow-300 font-bold text-sm">🎯 Available — ${t.cost} SP</span>`
                : `<span class="text-gray-500 font-bold text-sm">🔒 Locked (complete previous tier)</span>`;

        div.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-3xl">${t.icon}</span>
                <div class="flex-1">
                    <div class="font-black text-white text-base">Tier ${t.tier}: ${t.title}</div>
                    <div class="text-xs text-gray-300 mt-0.5">${t.desc}</div>
                </div>
                ${statusBadge}
            </div>
            ${isNext && !isPurchased ? `<button onclick="buyBlackMarketTier(${t.tier})" class="w-full bg-purple-700 hover:bg-purple-600 border border-purple-400 text-white font-bold py-2 rounded-xl transition active:scale-95 text-sm shadow-md ${canAfford ? '' : 'opacity-50 cursor-not-allowed'}" ${canAfford ? '' : 'disabled'}>
                Purchase — ${t.cost} Skill Points
            </button>` : ''}
        `;
        list.appendChild(div);
    });

    // Soul Pebble Exchange section
    const pebbleExchangeEl = document.getElementById('bm-pebble-exchange');
    if (pebbleExchangeEl) {
        let pebbleCount = globalProgression.inventory.soul_pebbles || 0;
        let canExchange = pebbleCount >= 50;
        pebbleExchangeEl.innerHTML = `
            <div class="bg-gray-900 border-2 border-purple-700 rounded-xl p-4 flex flex-col gap-2 shadow-lg">
                <h3 class="font-bold text-purple-300 text-center uppercase tracking-widest text-sm">🔮 Soul Pebble Exchange</h3>
                <p class="text-xs text-gray-400 text-center">50 Soul Pebbles → 1% permanent bonus (random: Damage, Armor Pierce, HP, or Defense)</p>
                <div class="text-center text-sm text-purple-200 font-bold">Soul Pebbles: <span class="text-purple-400">${pebbleCount}</span></div>
                <button onclick="exchangeSoulPebbles()" class="w-full bg-purple-800 hover:bg-purple-700 border border-purple-500 text-white font-bold py-2 rounded-xl transition active:scale-95 text-sm shadow-md ${canExchange ? '' : 'opacity-50 cursor-not-allowed'}" ${canExchange ? '' : 'disabled'}>
                    Exchange 50 Soul Pebbles
                </button>
            </div>
        `;
    }

    // Pebble bonus stats table
    const pebbleStatsEl = document.getElementById('bm-pebble-stats');
    if (pebbleStatsEl) {
        let dmg = globalProgression.pebbleBonusDmg || 0;
        let pierce = globalProgression.pebbleBonusArmorPierce || 0;
        let hp = globalProgression.pebbleBonusHp || 0;
        let def = globalProgression.pebbleBonusDef || 0;
        pebbleStatsEl.innerHTML = `
            <div class="bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-lg">
                <h3 class="font-bold text-gray-300 text-center uppercase tracking-widest text-xs mb-3">Pebble Exchange Bonuses</h3>
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <div class="bg-gray-800 rounded-lg p-2 text-center"><span class="text-red-400">🗡️ Bonus Damage</span><br><span class="font-bold text-white">${dmg}%</span></div>
                    <div class="bg-gray-800 rounded-lg p-2 text-center"><span class="text-yellow-300">🏹 Armor Pierce</span><br><span class="font-bold text-white">${pierce}%</span></div>
                    <div class="bg-gray-800 rounded-lg p-2 text-center"><span class="text-green-400">❤️ Bonus HP</span><br><span class="font-bold text-white">${hp}%</span></div>
                    <div class="bg-gray-800 rounded-lg p-2 text-center"><span class="text-blue-300">🛡️ Bonus Defense</span><br><span class="font-bold text-white">${def}%</span></div>
                </div>
            </div>
        `;
    }

    switchScreen('screen-black-market');
}

function exchangeSoulPebbles() {
    if ((globalProgression.inventory.soul_pebbles || 0) < 50) { playSound('lose'); return; }
    globalProgression.inventory.soul_pebbles -= 50;
    const bonusTypes = ['dmg', 'armorPierce', 'hp', 'def'];
    const chosen = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
    const keyMap = { dmg: 'pebbleBonusDmg', armorPierce: 'pebbleBonusArmorPierce', hp: 'pebbleBonusHp', def: 'pebbleBonusDef' };
    const labelMap = { dmg: '+1% DMG!', armorPierce: '+1% Pierce!', hp: '+1% HP!', def: '+1% DEF!' };
    const colorMap = { dmg: 'text-red-400', armorPierce: 'text-yellow-300', hp: 'text-green-400', def: 'text-blue-300' };
    const key = keyMap[chosen];
    globalProgression[key] = (globalProgression[key] || 0) + 1;
    // Show floating animation on the stats table
    const statsEl = document.getElementById('bm-pebble-stats');
    if (statsEl) {
        statsEl.style.position = 'relative';
        showFloatText('bm-pebble-stats', labelMap[chosen], colorMap[chosen]);
    }
    playSound('win');
    saveGame();
    showBlackMarket();
}

function exchangeLegendaryCoresForPebble(refreshFn) {
    if ((globalProgression.inventory.ench_legendary || 0) < 200) { playSound('lose'); return; }
    globalProgression.inventory.ench_legendary -= 200;
    globalProgression.inventory.soul_pebbles = (globalProgression.inventory.soul_pebbles || 0) + 1;
    playSound('win');
    saveGame();
    if (refreshFn) refreshFn();
}

function buyBlackMarketTier(tier) {
    let t = BLACK_MARKET_TIERS[tier - 1];
    if (!t) return;
    if ((globalProgression.blackMarketTier || 0) !== tier - 1) return; // must be next tier
    if (player.skillPoints < t.cost) { playSound('lose'); return; }

    player.skillPoints -= t.cost;
    globalProgression.blackMarketTier = tier;

    // Apply immediate effects
    if (t.reward === 'sixthSkill') {
        // Ensure equippedSkills has 6 slots
        while (player.equippedSkills.length < 6) player.equippedSkills.push(null);
    }

    playSound('win');
    saveGame();
    showBlackMarket();
}

