function showAlchemist() {
    const p = globalProgression; document.getElementById('alch-gold-display').innerText = p.gold; document.getElementById('alch-herb-red').innerText = p.inventory.herb_red || 0; document.getElementById('alch-herb-blue').innerText = p.inventory.herb_blue || 0;
    const list = document.getElementById('alch-craft-list'); list.innerHTML = '';
    RECIPES_ALCHEMIST.forEach(rec => {
        const pot = CONSUMABLES[rec.id];
        const herbIcon = rec.herb === 'herb_red' ? '🌺' : '💠';
        const canCraft1 = p.gold >= rec.gold && (p.inventory[rec.herb] || 0) >= rec.herbAmt && (p.inventory[rec.id] || 0) < INVENTORY_STACK_CAP;
        const canCraft5 = p.gold >= rec.gold * 5 && (p.inventory[rec.herb] || 0) >= rec.herbAmt * 5 && (p.inventory[rec.id] || 0) + 5 <= INVENTORY_STACK_CAP;
        const isFull = (p.inventory[rec.id] || 0) >= INVENTORY_STACK_CAP;
        const row = document.createElement('div');
        row.className = `bg-gray-800 p-2 rounded-lg flex justify-between items-center border border-gray-700 hover:border-green-500 transition gap-2`;
        row.innerHTML = `<div class="text-left flex items-center gap-2"><span class="text-2xl">${sanitizeHTML(pot.icon)}</span> <div><b class="text-white">${sanitizeHTML(pot.name)}</b><br><span class="text-[10px] text-gray-400">${sanitizeHTML(pot.desc)}</span>${isFull ? '<span class="text-red-400 text-[10px] font-bold"> (Full 99)</span>' : ''}</div></div><div class="text-yellow-400 font-bold bg-gray-900 px-2 py-1 rounded shadow-inner text-xs flex flex-col items-center gap-1"><span>${herbIcon} ${rec.herbAmt}</span><span>💰 ${rec.gold}</span></div>`;
        const btnWrap = document.createElement('div');
        btnWrap.className = 'flex flex-col gap-1';
        const btn1 = document.createElement('button');
        btn1.className = `bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded text-xs font-bold transition active:scale-95${canCraft1 ? '' : ' opacity-50'}`;
        btn1.textContent = '×1';
        btn1.disabled = !canCraft1;
        btn1.onclick = () => { p.gold -= rec.gold; p.inventory[rec.herb] -= rec.herbAmt; addToInventory(rec.id, 1); playSound('heal'); queueSave(); showAlchemist(); };
        const btn5 = document.createElement('button');
        btn5.className = `bg-green-800 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-bold transition active:scale-95${canCraft5 ? '' : ' opacity-50'}`;
        btn5.textContent = '×5';
        btn5.disabled = !canCraft5;
        btn5.onclick = () => { p.gold -= rec.gold * 5; p.inventory[rec.herb] -= rec.herbAmt * 5; addToInventory(rec.id, 5); playSound('heal'); queueSave(); showAlchemist(); };
        btnWrap.appendChild(btn1);
        btnWrap.appendChild(btn5);
        row.appendChild(btnWrap);
        list.appendChild(row);
    });
    switchScreen('screen-alchemist');
}

function showChef() {
    const p = globalProgression; document.getElementById('chef-gold-display').innerText = p.gold; const list = document.getElementById('chef-craft-list'); list.innerHTML = '';
    RECIPES_CHEF.forEach(rec => {
        const food = CONSUMABLES[rec.id];
        const canCraft1 = p.gold >= rec.gold && (p.inventory[rec.fish] || 0) >= rec.fishAmt && (p.inventory[rec.id] || 0) < INVENTORY_STACK_CAP;
        const canCraft5 = p.gold >= rec.gold * 5 && (p.inventory[rec.fish] || 0) >= rec.fishAmt * 5 && (p.inventory[rec.id] || 0) + 5 <= INVENTORY_STACK_CAP;
        const isFull = (p.inventory[rec.id] || 0) >= INVENTORY_STACK_CAP;
        const row = document.createElement('div');
        row.className = `bg-gray-800 p-2 rounded-lg flex justify-between items-center border border-gray-700 hover:border-orange-500 transition gap-2`;
        row.innerHTML = `<div class="text-left flex items-center gap-2"><span class="text-2xl">${sanitizeHTML(food.icon)}</span> <div><b class="text-white">${sanitizeHTML(food.name)}</b><br><span class="text-[10px] text-gray-400">${sanitizeHTML(food.desc)}</span>${isFull ? '<span class="text-red-400 text-[10px] font-bold"> (Full 99)</span>' : ''}</div></div><div class="text-yellow-400 font-bold bg-gray-900 px-2 py-1 rounded shadow-inner text-xs flex flex-col items-center gap-1"><span>${sanitizeHTML(MAT_ICONS[rec.fish])} ${rec.fishAmt}</span><span>💰 ${rec.gold}</span></div>`;
        const btnWrap = document.createElement('div');
        btnWrap.className = 'flex flex-col gap-1';
        const btn1 = document.createElement('button');
        btn1.className = `bg-orange-700 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs font-bold transition active:scale-95${canCraft1 ? '' : ' opacity-50'}`;
        btn1.textContent = '×1';
        btn1.disabled = !canCraft1;
        btn1.onclick = () => { p.gold -= rec.gold; p.inventory[rec.fish] -= rec.fishAmt; addToInventory(rec.id, 1); playSound('win'); queueSave(); showChef(); };
        const btn5 = document.createElement('button');
        btn5.className = `bg-orange-800 hover:bg-orange-700 text-white px-2 py-1 rounded text-xs font-bold transition active:scale-95${canCraft5 ? '' : ' opacity-50'}`;
        btn5.textContent = '×5';
        btn5.disabled = !canCraft5;
        btn5.onclick = () => { p.gold -= rec.gold * 5; p.inventory[rec.fish] -= rec.fishAmt * 5; addToInventory(rec.id, 5); playSound('win'); queueSave(); showChef(); };
        btnWrap.appendChild(btn1);
        btnWrap.appendChild(btn5);
        row.appendChild(btnWrap);
        list.appendChild(row);
    });
    switchScreen('screen-chef');
}

// --- WORKSHOP MERCHANT ---
function showWorkshop() {
    document.getElementById('workshop-pebbles').innerText = globalProgression.inventory.soul_pebbles || 0;
    const list = document.getElementById('workshop-items-list');
    list.innerHTML = '';

    // Collect ALL mythic items (equipped + in inventory)
    const mythicItems = [];
    // Equipped items
    Object.values(globalProgression.equipped).forEach(item => {
        if(item && item.rarity === 'mythic') mythicItems.push({ item, source: 'equipped' });
    });
    // Inventory items
    (globalProgression.equipInventory || []).forEach((item, idx) => {
        if(item && item.rarity === 'mythic') mythicItems.push({ item, source: 'inventory', idx });
    });

    if(mythicItems.length === 0) {
        list.innerHTML = '<div class="text-gray-500 text-center py-8 bg-gray-900 rounded-xl border border-gray-700">No Mythic items found. Defeat Mythic Bosses to get them!</div>';
    } else {
        mythicItems.forEach(({ item, source }) => {
            const itemLvl = item.lvl || 1;
            const alreadyMaxed = itemLvl >= player.lvl;
            const hasPebbles = (globalProgression.inventory.soul_pebbles || 0) >= 10;
            const canEnhance = !alreadyMaxed && hasPebbles;

            const card = document.createElement('div');
            card.className = 'bg-gray-900 border-2 border-white rounded-xl p-4 flex justify-between items-center shadow-lg';
            card.style.boxShadow = '0 0 15px rgba(255,255,255,0.3)';
            card.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-3xl">${sanitizeHTML(item.icon || '✨')}</span>
                    <div>
                        <div class="font-black text-white text-sm drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">${sanitizeHTML(item.name)}</div>
                        <div class="text-xs text-gray-300">Slot: ${sanitizeHTML(item.type)}</div>
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
                        : `<button onclick="workshopEnhance(this)" data-item-id="${sanitizeHTML(item.id)}" data-source="${source}" class="bg-cyan-700 hover:bg-cyan-600 text-white font-bold px-3 py-2 rounded-lg transition active:scale-95 text-sm border border-cyan-400 shadow-md ${canEnhance ? '' : 'opacity-50 cursor-not-allowed'}" ${canEnhance ? '' : 'disabled'}>
                            Scale Enhance<br><span class="text-xs text-purple-300">🔮 10</span>
                           </button>`
                    }
                </div>
            `;
            list.appendChild(card);
        });
    }

    // Disenchant section: unequipped mythic items only
    const unequippedMythic = (globalProgression.equipInventory || []).filter(item => item && item.rarity === 'mythic');
    if (unequippedMythic.length > 0) {
        const disenchantHeader = document.createElement('div');
        disenchantHeader.innerHTML = `<h3 class="font-bold text-red-400 text-center mt-6 mb-2 uppercase tracking-wider text-sm">⚗️ Disenchant Mythic Items</h3>
            <p class="text-xs text-gray-400 text-center mb-3">Unequipped mythic items only. Gives 10 Soul Pebbles each.</p>`;
        list.appendChild(disenchantHeader);

        unequippedMythic.forEach(item => {
            const card = document.createElement('div');
            card.className = 'bg-gray-800 border border-red-700 rounded-xl p-3 flex items-center justify-between';
            card.innerHTML = `<div class="flex items-center gap-2">
                <span class="text-2xl">${item.icon || '⚔️'}</span>
                <div>
                    <div class="font-bold text-white text-sm">${sanitizeHTML(item.name)}</div>
                    <div class="text-xs text-red-300">Mythic</div>
                </div>
            </div>
            <button onclick="disenchantMythicItem('${sanitizeHTML(item.id)}')" 
                class="bg-red-800 hover:bg-red-700 text-white px-3 py-2 rounded font-bold text-xs transition active:scale-95">
                ⚗️ Disenchant<br><span class="text-purple-300">+10 🔮</span>
            </button>`;
            list.appendChild(card);
        });
    }

    // Legendary Core → Soul Pebble Exchange
    const legCores = globalProgression.inventory.ench_legendary || 0;
    const pebbles = globalProgression.inventory.soul_pebbles || 0;
    const canExchange = legCores >= 100;
    const exchangeDiv = document.createElement('div');
    exchangeDiv.className = 'mt-6 bg-gray-900 border border-purple-700 rounded-xl p-4 flex flex-col gap-2 shadow-lg';
    exchangeDiv.innerHTML = `
        <h3 class="font-bold text-purple-300 text-center uppercase tracking-widest text-sm mb-1">🔮 Legendary Core → Soul Pebble Exchange</h3>
        <div class="flex justify-between text-xs text-gray-400 mb-1">
            <span>Legendary Cores: <span class="text-yellow-300 font-bold">${legCores}</span></span>
            <span>Soul Pebbles: <span class="text-purple-300 font-bold">${pebbles}</span></span>
        </div>
        <button onclick="exchangeLegendaryCoresForPebble(showWorkshop)" class="w-full bg-purple-800 hover:bg-purple-700 border border-purple-500 text-white font-bold py-2 rounded-xl transition active:scale-95 text-sm shadow-md ${canExchange ? '' : 'opacity-50 cursor-not-allowed'}" ${canExchange ? '' : 'disabled'}>
            Exchange 100 Legendary Cores → 10 Soul Pebbles
        </button>
    `;
    list.appendChild(exchangeDiv);

    switchScreen('screen-workshop');
}

function workshopEnhance(btn) {
    if((globalProgression.inventory.soul_pebbles || 0) < 10) return;
    const itemId = btn.dataset.itemId;
    const source = btn.dataset.source;

    // Find and update the item
    let found = false;
    function recalcMythicItem(item) {
        const newLvl = player.lvl;
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
        const namePrefix = item.name.split(' [Lv.')[0];
        item.name = `${namePrefix} [Lv.${newLvl}]`;
    }
    if(source === 'equipped') {
        Object.values(globalProgression.equipped).forEach(item => {
            if(!found && item && item.id && item.rarity === 'mythic') {
                if(item.id === itemId) {
                    recalcMythicItem(item);
                    found = true;
                }
            }
        });
    } else {
        (globalProgression.equipInventory || []).forEach(item => {
            if(!found && item && item.id && item.rarity === 'mythic') {
                if(item.id === itemId) {
                    recalcMythicItem(item);
                    found = true;
                }
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
        queueSave();
        setTimeout(() => showWorkshop(), 1000);
    }
}

function disenchantMythicItem(itemId) {
    const p = globalProgression;
    const idx = (p.equipInventory || []).findIndex(i => i && i.id === itemId && i.rarity === 'mythic');
    if (idx === -1) { addLog('Item not found or not a mythic item!', 'text-red-400'); return; }
    p.equipInventory.splice(idx, 1);
    p.inventory.soul_pebbles = (p.inventory.soul_pebbles || 0) + 10;
    playSound('win');
    queueSave();
    showWorkshop();
}

// --- BURGLAR MERCHANT ---
function showBurglar() {
    const today = new Date().toDateString();
    if(globalProgression.burglarLastPurchaseDate !== today) {
        globalProgression.burglarDailyPurchasesPerItem = {};
        globalProgression.burglarLastPurchaseDate = today;
    }
    if(!globalProgression.burglarDailyPurchasesPerItem) globalProgression.burglarDailyPurchasesPerItem = {};
    document.getElementById('burglar-gold-display').innerText = globalProgression.gold;

    const list = document.getElementById('burglar-items-list');
    list.innerHTML = '';

    Object.values(USABLE_ITEMS).forEach(item => {
        const itemCount = (globalProgression.burglarDailyPurchasesPerItem[item.id] || 0);
        const canBuy = globalProgression.gold >= item.price && itemCount < 5;
        const ownedAmt = (globalProgression.usableItems || {})[item.id] || 0;

        const card = document.createElement('div');
        card.className = 'bg-gray-800 border border-gray-600 rounded-xl p-3 flex justify-between items-center transition hover:border-red-600';
        card.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-3xl">${sanitizeHTML(item.icon)}</span>
                <div>
                    <div class="font-bold text-white text-sm">${sanitizeHTML(item.name)}</div>
                    <div class="text-[10px] text-gray-400">${item.desc}</div>
                    <div class="text-[10px] mt-1">
                        ${item.cooldown > 0 ? `<span class="text-blue-300">⏱ ${item.cooldown}t cooldown</span>` : '<span class="text-green-300">⚡ No cooldown</span>'}
                        ${item.immuneToCDR ? '<span class="text-yellow-400 ml-1">🔒 CDR immune</span>' : ''}
                    </div>
                    <div class="text-[10px] text-gray-500">Owned: ${ownedAmt} · Today: ${itemCount}/5</div>
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
        globalProgression.burglarDailyPurchasesPerItem = {};
        globalProgression.burglarLastPurchaseDate = today;
    }
    if(!globalProgression.burglarDailyPurchasesPerItem) globalProgression.burglarDailyPurchasesPerItem = {};
    if((globalProgression.burglarDailyPurchasesPerItem[itemId] || 0) >= 5) return;
    const item = USABLE_ITEMS[itemId];
    if(!item || globalProgression.gold < item.price) return;

    globalProgression.gold -= item.price;
    if(!globalProgression.usableItems) globalProgression.usableItems = {};
    globalProgression.usableItems[itemId] = (globalProgression.usableItems[itemId] || 0) + 1;
    if (!player.equippedUsables) player.equippedUsables = [null, null, null, null, null, null, null];
    const numUnlocked = Math.min(7, 1 + Math.floor(player.lvl / 4));
    let emptySlot = -1;
    for (let i = 0; i < numUnlocked; i++) {
        if (player.equippedUsables[i] === null) { emptySlot = i; break; }
    }
    if (emptySlot !== -1) player.equippedUsables[emptySlot] = itemId;
    globalProgression.burglarDailyPurchasesPerItem[itemId] = (globalProgression.burglarDailyPurchasesPerItem[itemId] || 0) + 1;
    const ps = ensureProgressStats(); ps.goldSpent += item.price;
    playSound('win');
    queueSave();
    showBurglar();
}

// --- WEAPON/ARMOR SMITH ---
function showWeaponSmith() {
    const p = globalProgression;
    document.getElementById('ws-gold-display').innerText = p.gold;
    document.getElementById('ws-shards-display').innerText = p.inventory.titan_shard || 0;
    document.getElementById('ws-log').innerText = '';
    const wsDustEl = document.getElementById('ws-dust-display');
    if (wsDustEl) wsDustEl.innerText = p.inventory.ethereal_dust || 0;

    const list = document.getElementById('ws-weapon-list');
    list.innerHTML = '';

    const HP_ARMOR_SLOTS = ['head', 'shoulders', 'arms', 'chest', 'waist', 'legs', 'boots'];
    const DEF_ACCESSORY_SLOTS = ['necklace', 'ring', 'cape'];

    // Equipped weapon
    const equippedWeapon = p.equipped ? p.equipped['weapon'] : null;
    if (equippedWeapon) {
        const enhLvl = equippedWeapon.weaponEnhance || 0;
        const isMaxed = enhLvl >= 100;
        const enhBonus = enhLvl > 0 ? 5 * enhLvl * (5 + enhLvl) : 0;
        const enhLabel = enhLvl > 0 ? `+${enhBonus} dmg` : 'Not Enhanced';
        const maxBonus = isMaxed ? ' (+5% dmg bonus!)' : '';
        const canEnhance = !isMaxed && (p.inventory.titan_shard || 0) >= (30 + enhLvl * 10) && p.gold >= 100;

        const div = document.createElement('div');
        div.className = `bg-gray-800 border-2 rarity-${equippedWeapon.rarity} p-3 rounded-lg shadow-md`;
        div.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">${sanitizeHTML(equippedWeapon.icon)}</span>
                    <div>
                        <div class="font-bold text-white text-sm">${sanitizeHTML(equippedWeapon.name)} (Equipped)</div>
                        <div class="text-xs text-yellow-300">Enhance Lv. ${enhLvl}/100${isMaxed ? ' (MAX)' : ''}</div>
                        <div class="text-xs text-green-400">${enhLabel}${maxBonus}</div>
                    </div>
                </div>
                <button onclick="enhanceWeapon('${sanitizeHTML(equippedWeapon.id)}')" 
                    class="bg-yellow-700 hover:bg-yellow-600 text-white px-3 py-2 rounded font-bold text-xs transition active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    ${canEnhance ? '' : 'disabled'}>
                    🔨 Enhance<br><span class="text-yellow-300">100💰 + ${30 + enhLvl * 10}🔱</span>
                </button>
            </div>
            <div class="text-[10px] text-gray-400">Next level: +${30 + enhLvl * 10} dmg (${isMaxed ? 'MAX' : '40% fail rate'})</div>
        `;
        list.appendChild(div);
    }

    // Equipped HP armor slots
    const armorHeader = document.createElement('div');
    armorHeader.innerHTML = `<h3 class="font-bold text-blue-300 text-center mt-4 mb-2 uppercase tracking-wider text-sm">🛡️ Armor Upgrades (+100 HP each)</h3>`;
    list.appendChild(armorHeader);

    let anyArmorShown = false;
    HP_ARMOR_SLOTS.forEach(slot => {
        const item = p.equipped ? p.equipped[slot] : null;
        if (!item) return;
        anyArmorShown = true;
        const armorLvl = item.armorEnhance || 0;
        const isMaxed = armorLvl >= 100;
        const hpBonus = armorLvl * 100;
        const shardCost = 30 + armorLvl * 10;
        const canUpgrade = !isMaxed && (p.inventory.titan_shard || 0) >= shardCost && p.gold >= 100;

        const div = document.createElement('div');
        div.className = `bg-gray-800 border-2 rarity-${item.rarity} p-3 rounded-lg shadow-md`;
        div.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">${sanitizeHTML(item.icon)}</span>
                    <div>
                        <div class="font-bold text-white text-sm">${sanitizeHTML(item.name)} <span class="text-gray-400 text-xs">(${slot})</span></div>
                        <div class="text-xs text-blue-300">Armor Lv. ${armorLvl}/100${isMaxed ? ' (MAX +10% HP)' : ''}</div>
                        <div class="text-xs text-green-400">${hpBonus > 0 ? '+' + hpBonus + ' HP' : 'Not Enhanced'}${isMaxed ? ' +10% Max HP' : ''}</div>
                    </div>
                </div>
                <button onclick="upgradeArmor('${slot}')" 
                    class="bg-blue-700 hover:bg-blue-600 text-white px-3 py-2 rounded font-bold text-xs transition active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    ${canUpgrade ? '' : 'disabled'}>
                    ⬆️ Upgrade<br><span class="text-blue-300">100💰 + ${shardCost}🔱</span>
                </button>
            </div>
            <div class="text-[10px] text-gray-400">Next: +100 HP (${isMaxed ? 'MAX' : '40% fail rate'})</div>
        `;
        list.appendChild(div);
    });
    if (!anyArmorShown) {
        const noArmor = document.createElement('div');
        noArmor.className = 'text-gray-500 text-xs text-center py-2';
        noArmor.innerText = 'No armor equipped in head/shoulder/arm/chest/waist/legs/boots slots.';
        list.appendChild(noArmor);
    }

    // Equipped DEF accessory slots
    const accHeader = document.createElement('div');
    accHeader.innerHTML = `<h3 class="font-bold text-purple-300 text-center mt-4 mb-2 uppercase tracking-wider text-sm">💍 Accessory Upgrades (+5 DEF each)</h3>`;
    list.appendChild(accHeader);

    let anyAccShown = false;
    DEF_ACCESSORY_SLOTS.forEach(slot => {
        const item = p.equipped ? p.equipped[slot] : null;
        if (!item) return;
        anyAccShown = true;
        const armorLvl = item.armorEnhance || 0;
        const isMaxed = armorLvl >= 100;
        const defBonus = armorLvl * 5;
        const shardCost = 30 + armorLvl * 10;
        const canUpgrade = !isMaxed && (p.inventory.titan_shard || 0) >= shardCost && p.gold >= 100;

        const div = document.createElement('div');
        div.className = `bg-gray-800 border-2 rarity-${item.rarity} p-3 rounded-lg shadow-md`;
        div.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">${sanitizeHTML(item.icon)}</span>
                    <div>
                        <div class="font-bold text-white text-sm">${sanitizeHTML(item.name)} <span class="text-gray-400 text-xs">(${slot})</span></div>
                        <div class="text-xs text-purple-300">Acc Lv. ${armorLvl}/100${isMaxed ? ' (MAX +10% Mitigation)' : ''}</div>
                        <div class="text-xs text-green-400">${defBonus > 0 ? '+' + defBonus + ' DEF' : 'Not Enhanced'}${isMaxed ? ' +10% Reduced Dmg' : ''}</div>
                    </div>
                </div>
                <button onclick="upgradeArmor('${slot}')" 
                    class="bg-purple-700 hover:bg-purple-600 text-white px-3 py-2 rounded font-bold text-xs transition active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    ${canUpgrade ? '' : 'disabled'}>
                    ⬆️ Upgrade<br><span class="text-purple-300">100💰 + ${shardCost}🔱</span>
                </button>
            </div>
            <div class="text-[10px] text-gray-400">Next: +5 DEF (${isMaxed ? 'MAX' : '40% fail rate'})</div>
        `;
        list.appendChild(div);
    });
    if (!anyAccShown) {
        const noAcc = document.createElement('div');
        noAcc.className = 'text-gray-500 text-xs text-center py-2';
        noAcc.innerText = 'No accessories equipped in necklace/ring/cape slots.';
        list.appendChild(noAcc);
    }

    if (!equippedWeapon && !anyArmorShown && !anyAccShown) {
        list.innerHTML = '<p class="text-gray-500 text-sm text-center">No equipped items found. Equip items first.</p>';
    }

    // Titan Shard → Gold conversion section
    const convHeader = document.createElement('div');
    const shards = p.inventory.titan_shard || 0;
    convHeader.innerHTML = `<div class="bg-gray-800 border border-yellow-700 rounded-xl p-3 mt-4 flex items-center justify-between">
        <div>
            <div class="font-bold text-yellow-300 text-sm">🔱 Titan Shard → Gold</div>
            <div class="text-xs text-gray-400">Convert Titan Shards to Gold (1 shard = 10 gold)</div>
            <div class="text-xs text-gray-400 mt-1">Shards: <span class="text-cyan-300 font-bold">${shards}</span></div>
        </div>
        <button onclick="convertTitanShardToGold()"
            class="bg-yellow-700 hover:bg-yellow-600 text-white px-3 py-2 rounded font-bold text-xs transition active:scale-95 ${shards < 1 ? 'opacity-50 cursor-not-allowed' : ''}"
            ${shards < 1 ? 'disabled' : ''}>
            Convert 1🔱<br><span class="text-yellow-300">→ 10💰</span>
        </button>
    </div>`;
    list.appendChild(convHeader);
    switchScreen('screen-weaponsmith');
}

function enhanceWeapon(itemId) {
    const p = globalProgression;
    const log = document.getElementById('ws-log');

    // Only enhance equipped weapon
    let item = null;
    if(p.equipped && p.equipped['weapon'] && p.equipped['weapon'].id === itemId) {
        item = p.equipped['weapon'];
    }

    if(!item) { log.innerText = 'Weapon not found or not equipped!'; return; }
    const enhLvl = item.weaponEnhance || 0;
    if(enhLvl >= 100) { log.innerText = 'Already at max enhancement level!'; return; }
    if((p.inventory.titan_shard || 0) < (30 + enhLvl * 10)) { log.innerText = `Not enough Titan Shards! (${30 + enhLvl * 10} needed)`; playSound('lose'); return; }
    if(p.gold < 100) { log.innerText = 'Not enough Gold! (100 needed)'; playSound('lose'); return; }

    // Consume resources
    p.gold -= 100;
    p.inventory.titan_shard = (p.inventory.titan_shard || 0) - (30 + enhLvl * 10);

    // 40% failure rate
    if(Math.random() < 0.40) {
        log.className = 'anim-enhance-fail';
        void log.offsetWidth; // force reflow to restart animation
        log.innerText = '💥 Enhancement failed! Resources consumed.';
        playSound('lose');
    } else {
        const newLvl = enhLvl + 1;
        item.weaponEnhance = newLvl;
        // Apply bonus damage: level N adds (30 + (N-1)*10) damage
        const dmgAdd = 30 + enhLvl * 10; // +30 at lv1, +40 at lv2, +50 at lv3, etc.
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

    queueSave();
    showWeaponSmith();
}

function convertTitanShardToGold() {
    const p = globalProgression;
    const log = document.getElementById('ws-log');
    if ((p.inventory.titan_shard || 0) < 1) { if(log) log.innerText = '❌ Not enough Titan Shards!'; return; }
    p.inventory.titan_shard--;
    globalProgression.gold += 10;
    queueSave();
    if(log) log.innerText = '✅ 1 🔱 Titan Shard → 10 💰 Gold';
    showWeaponSmith();
}

function upgradeArmor(slot) {
    const p = globalProgression;
    const log = document.getElementById('ws-log');
    const item = (p.equipped || {})[slot];
    if (!item) {
        log.innerText = 'No item equipped in that slot!';
        return;
    }
    const armorLvl = item.armorEnhance || 0;
    if (armorLvl >= 100) {
        log.innerText = 'Already at maximum level!';
        return;
    }
    const shardCost = 30 + armorLvl * 10;
    const goldCost = 100;
    if ((p.inventory.titan_shard || 0) < shardCost) {
        log.innerText = `Need ${shardCost} 🔱 Titan Shards!`;
        return;
    }
    if (p.gold < goldCost) {
        log.innerText = `Need ${goldCost} 💰 Gold!`;
        return;
    }
    // 40% fail chance
    if (Math.random() < 0.4) {
        p.inventory.titan_shard -= shardCost;
        p.gold -= goldCost;
        queueSave();
        log.innerText = '❌ Enhancement failed!';
        showWeaponSmith();
        return;
    }
    p.inventory.titan_shard -= shardCost;
    p.gold -= goldCost;
    item.armorEnhance = armorLvl + 1;
    queueSave();
    player.maxHp = calculateMaxHp();
    log.innerText = `✅ Armor enhanced to Lv.${item.armorEnhance}!`;
    showWeaponSmith();
}


function showInvasion() {
    document.getElementById('invasion-gold-display').innerText = globalProgression.gold;
    const energyEl = document.getElementById('invasion-energy-display');
    if(energyEl) energyEl.innerText = globalProgression.energy || 0;

    // Ensure zombieStats exists
    if(!globalProgression.zombieStats) globalProgression.zombieStats = { totalKills: 0, maxWavesSurvived: 0, totalSessions: 0, pendingPotionRewards: 0, cooldownBuffEarned: false, titlesEarned: [] };
    const zs = globalProgression.zombieStats;

    // Populate stats
    const killsEl = document.getElementById('za-stat-kills');
    if(killsEl) killsEl.innerText = zs.totalKills || 0;
    const wavesEl = document.getElementById('za-stat-max-waves');
    if(wavesEl) wavesEl.innerText = zs.maxWavesSurvived || 0;
    const sessEl = document.getElementById('za-stat-sessions');
    if(sessEl) sessEl.innerText = zs.totalSessions || 0;

    // Populate rewards
    const rewardsList = document.getElementById('za-rewards-list');
    if(rewardsList) {
        let html = '';
        if((zs.pendingPotionRewards || 0) > 0) {
            html += `<button onclick="claimZombieRewards()" class="bg-yellow-800 hover:bg-yellow-700 border border-yellow-500 p-2 rounded-lg text-yellow-200 font-bold text-sm transition active:scale-95">
                🔮 Claim ${zs.pendingPotionRewards * 5} Soul Pebbles (from ${zs.pendingPotionRewards} reward batches)
            </button>`;
        }
        if(zs.cooldownBuffEarned && !zs.cooldownBuffClaimed) {
            html += `<button onclick="claimZombieCooldownBuff()" class="bg-purple-800 hover:bg-purple-700 border border-purple-500 p-2 rounded-lg text-purple-200 font-bold text-sm transition active:scale-95">
                ⚡ Claim: −1 Cooldown to All Skills (100 Waves Buff)
            </button>`;
        }
        if(zs.cooldownBuffEarned && zs.cooldownBuffClaimed) {
            html += `<div class="text-purple-300 text-xs">✅ −1 Cooldown buff active</div>`;
        }
        if(!html) html = '<div class="text-gray-500 text-sm text-center">No pending rewards.</div>';
        rewardsList.innerHTML = html;
    }

    // Populate titles
    const titlesList = document.getElementById('za-titles-list');
    if(titlesList && typeof ZOMBIE_TITLES !== 'undefined') {
        let titlesHtml = '';
        ZOMBIE_TITLES.forEach((t, idx) => {
            const earned = (zs.titlesEarned || []).includes(t.id);
            const cumBonus = idx + 1; // +1% per title earned up to this one
            titlesHtml += `<div class="flex justify-between items-center text-xs py-1 border-b border-gray-700 last:border-0">
                <span class="${earned ? 'text-amber-300 font-bold' : 'text-gray-500'}">${earned ? '🏆' : '🔒'} ${t.name}</span>
                <span class="${earned ? 'text-green-400' : 'text-gray-600'} flex flex-col items-end">
                    <span>${earned ? 'Earned' : t.wavesRequired + ' waves'}</span>
                    <span class="text-purple-300 text-[10px]">(+${cumBonus}% DMG, +${cumBonus}% AP, +${cumBonus}% DR)</span>
                </span>
            </div>`;
        });
        const titlesEarnedCount = (zs.titlesEarned || []).length;
        const currentBonus = titlesEarnedCount;
        titlesHtml += `<div class="mt-2 pt-2 border-t border-gray-600 text-xs text-center text-gray-300">
            📊 Current Title Bonus: <span class="text-green-400 font-bold">+${currentBonus}% DMG</span> / <span class="text-blue-400 font-bold">+${currentBonus}% Armor Pierce</span> / <span class="text-yellow-400 font-bold">+${currentBonus}% DR</span> <span class="text-gray-500">(${titlesEarnedCount}/10 titles earned)</span>
        </div>`;
        titlesList.innerHTML = titlesHtml;
    }

    // Level 100 lock check
    const startBtn = document.getElementById('za-start-btn');
    if(startBtn) {
        if(player.lvl < 100) {
            startBtn.disabled = true;
            startBtn.innerText = '🔒 Unlocks at Level 100';
            startBtn.className = 'w-full bg-gray-700 text-gray-400 font-black py-4 rounded-xl text-xl border-2 border-gray-600 opacity-60 cursor-not-allowed';
        } else {
            startBtn.disabled = false;
            startBtn.innerText = '🧟 DEFEND FROM ZOMBIES';
            startBtn.className = 'w-full bg-green-700 hover:bg-green-600 text-white font-black py-4 rounded-xl text-xl transition active:scale-95 shadow-lg border-2 border-green-400';
        }
    }

    switchScreen('screen-invasion');
}

function claimZombieRewards() {
    const zs = globalProgression.zombieStats;
    if(!zs || (zs.pendingPotionRewards || 0) <= 0) return;
    const pebbles = zs.pendingPotionRewards * 5;
    globalProgression.inventory.soul_pebbles = (globalProgression.inventory.soul_pebbles || 0) + pebbles;
    zs.pendingPotionRewards = 0;
    queueSave();
    showInvasion();
}

function claimZombieCooldownBuff() {
    const zs = globalProgression.zombieStats;
    if(!zs || !zs.cooldownBuffEarned || zs.cooldownBuffClaimed) return;
    zs.cooldownBuffClaimed = true;
    queueSave();
    showInvasion();
}

function startInvasion() {
    if(player.lvl < 100) {
        const log = document.getElementById('invasion-log') || document.getElementById('well-log');
        playSound('lose');
        // Show a brief overlay message
        const existing = document.getElementById('no-energy-overlay');
        if(existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.className = 'no-energy-overlay';
        overlay.id = 'no-energy-overlay';
        overlay.innerHTML = '<div class="no-energy-emoji">🔒</div><div class="no-energy-label">Level 100 Required!</div>';
        document.body.appendChild(overlay);
        setTimeout(() => { const el = document.getElementById('no-energy-overlay'); if(el) el.remove(); }, 2000);
        return;
    }
    if(!consumeEnergy(1)) {
        showNoEnergyAnimation();
        return;
    }
    if(!globalProgression.zombieStats) globalProgression.zombieStats = { totalKills: 0, maxWavesSurvived: 0, totalSessions: 0, pendingPotionRewards: 0, cooldownBuffEarned: false, titlesEarned: [] };
    globalProgression.zombieStats.totalSessions = (globalProgression.zombieStats.totalSessions || 0) + 1;
    zombieWaveCount = 0;
    zombieConsecutiveWaves = 0;
    zombieSessionKills = 0;
    invasionTotalKills = 0;
    invasionSpawned = 0;
    invasionKillGoal = 0; // 0 = unlimited (continuous until player leaves or energy runs out)
    invasionMaxOnScreen = 5;
    currentMode = 'invasion';
    queueSave();
    startBattle(true);
}

// --- PET BATTLE ---
function regenPetBattleEnergy() {
    const MAX_PET_ENERGY = 10;
    if (globalProgression.petBattleEnergy === undefined) globalProgression.petBattleEnergy = MAX_PET_ENERGY;
    // Daily reset: if the stored date differs from today, refill energy
    const todayStr = new Date().toDateString();
    if (globalProgression.petBattleEnergyDate !== todayStr) {
        globalProgression.petBattleEnergyDate = todayStr;
        globalProgression.petBattleEnergy = MAX_PET_ENERGY;
        queueSave();
    }
}

const MAX_PET_FAVORITES = 3;

function togglePetFavorite(petId) {
    if(!globalProgression.petFavorites) globalProgression.petFavorites = [];
    const favs = globalProgression.petFavorites;
    const idx = favs.indexOf(petId);
    if(idx !== -1) {
        favs.splice(idx, 1);
    } else {
        if(favs.length >= MAX_PET_FAVORITES) {
            alert(`You can only have ${MAX_PET_FAVORITES} favorite pets! Remove one first.`);
            return;
        }
        favs.push(petId);
    }
    queueSave();
    showPetBattle();
}

function showPetBattle() {
    regenPetBattleEnergy();
    document.getElementById('pet-battle-gold-display').innerText = globalProgression.gold;
    document.getElementById('pet-battle-energy-display').innerText = globalProgression.petBattleEnergy;
    // Show countdown to next daily energy reset (midnight)
    const resetTimerEl = document.getElementById('pet-battle-energy-timer');
    if (resetTimerEl) {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const msLeft = midnight - now;
        const hLeft = Math.floor(msLeft / 3600000);
        const mLeft = Math.floor((msLeft % 3600000) / 60000);
        resetTimerEl.innerText = `Resets in ${hLeft}h ${mLeft}m`;
    }
    petBattleActive = false;
    petBattlePlayerPet = null;

    // Show select area, hide battle area
    document.getElementById('pet-select-area').classList.remove('hidden');
    document.getElementById('pet-battle-area').classList.add('hidden');

    const ownedList = document.getElementById('pet-owned-list');
    const noMsg = document.getElementById('pet-no-pets-msg');
    ownedList.innerHTML = '';

    const owned = globalProgression.petsOwned || [];
    const favs = globalProgression.petFavorites || [];

    if(owned.length === 0) {
        noMsg.classList.remove('hidden');
    } else {
        noMsg.classList.add('hidden');
        // Sort: favorites first, then others
        const sortedOwned = [...owned].sort((a, b) => {
            const aFav = favs.includes(a) ? 0 : 1;
            const bFav = favs.includes(b) ? 0 : 1;
            return aFav - bFav;
        });
        sortedOwned.forEach(petId => {
            const pet = PET_DATA.find(p => p.id === petId);
            if(!pet) return;
            const isFav = favs.includes(petId);
            const wrapper = document.createElement('div');
            wrapper.className = `relative bg-gray-800 rounded-xl p-2 flex flex-col items-center transition border-2 ${isFav ? 'border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'border-pink-700'}`;
            // Favorite star button
            const starBtn = document.createElement('button');
            starBtn.className = `absolute top-1 right-1 text-sm leading-none z-10`;
            starBtn.innerHTML = isFav ? '⭐' : '☆';
            starBtn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
            starBtn.onclick = (e) => { e.stopPropagation(); togglePetFavorite(petId); };
            wrapper.appendChild(starBtn);
            // Pet button
            const btn = document.createElement('button');
            btn.className = 'flex flex-col items-center w-full active:scale-95';
            btn.innerHTML = `<span class="text-3xl">${pet.emoji}</span><span class="text-xs text-pink-300 font-bold mt-1">${pet.name}</span>${isFav ? '<span class="text-[9px] text-yellow-400">★ Favorite</span>' : ''}`;
            btn.onclick = () => startPetBattle(petId);
            wrapper.appendChild(btn);
            ownedList.appendChild(wrapper);
        });
    }
    switchScreen('screen-pet-battle');
}

function startPetBattle(playerPetId) {
    regenPetBattleEnergy();
    if((globalProgression.petBattleEnergy || 0) <= 0) {
        const energyMsg = document.getElementById('pet-energy-msg');
        if(energyMsg) { energyMsg.innerText = '😴 Your pet is tired! Energy resets daily at midnight.'; energyMsg.classList.remove('hidden'); }
        return;
    }
    const energyMsg = document.getElementById('pet-energy-msg');
    if(energyMsg) energyMsg.classList.add('hidden');
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
    petBattlePlayerHp = 5;
    petBattleEnemyHp = 5;
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
        const btn = document.getElementById(`pb-btn-${action}`);
        if(btn) { btn.disabled = false; btn.classList.remove('opacity-50'); }
    });
    document.getElementById('pb-cooldown-info').innerText = '';
    if(petBattleAutoMode) schedulePetAutoAction();
}

function updatePetBattleUI() {
    document.getElementById('pb-player-hp').innerText = Math.max(0, petBattlePlayerHp).toFixed(1);
    document.getElementById('pb-enemy-hp').innerText = Math.max(0, petBattleEnemyHp).toFixed(1);
    document.getElementById('pb-player-hp-bar').style.width = Math.max(0, (petBattlePlayerHp / 5) * 100) + '%';
    document.getElementById('pb-enemy-hp-bar').style.width = Math.max(0, (petBattleEnemyHp / 5) * 100) + '%';
    document.getElementById('pb-player-hp-bar').className = `h-2 rounded-full transition-all ${petBattlePlayerHp > 2.5 ? 'bg-green-500' : petBattlePlayerHp > 1 ? 'bg-yellow-500' : 'bg-red-500'}`;
    document.getElementById('pb-enemy-hp-bar').className = `h-2 rounded-full transition-all ${petBattleEnemyHp > 2.5 ? 'bg-green-500' : petBattleEnemyHp > 1 ? 'bg-yellow-500' : 'bg-red-500'}`;

    // Update cooldown info and button visuals
    const cdText = (petBattleLastAction && petBattleLastAction !== 'attack') ? `⏱ ${petBattleLastAction.charAt(0).toUpperCase() + petBattleLastAction.slice(1)} is on cooldown for 1 turn` : '';
    document.getElementById('pb-cooldown-info').innerText = cdText;

    ['attack', 'block', 'counter'].forEach(action => {
        const btn = document.getElementById(`pb-btn-${action}`);
        if(btn) {
            btn.disabled = !petBattleActive || (action !== 'attack' && action === petBattleLastAction);
            const lbl = btn.querySelector('.text-xs');
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
    const playerRec = petBattlePlayerPet ? (globalProgression.petWinLoss[petBattlePlayerPet.id] || {wins:0,losses:0}) : {wins:0,losses:0};
    const enemyRec = petBattleEnemyPet ? (globalProgression.petWinLoss[petBattleEnemyPet.id] || {wins:0,losses:0}) : {wins:0,losses:0};
    const playerRecEl = document.getElementById('pb-player-record');
    const enemyRecEl = document.getElementById('pb-enemy-record');
    if(playerRecEl) playerRecEl.innerText = `W: ${playerRec.wins} / L: ${playerRec.losses}`;
    if(enemyRecEl) enemyRecEl.innerText = `W: ${enemyRec.wins} / L: ${enemyRec.losses}`;
}

function petBattleAction(playerAction) {
    if(!petBattleActive || (playerAction !== 'attack' && playerAction === petBattleLastAction)) return;

    // Disable all buttons during animation
    ['attack', 'block', 'counter'].forEach(action => {
        const btn = document.getElementById(`pb-btn-${action}`);
        if(btn) btn.disabled = true;
    });

    // Add animation to emojis
    const animClass = playerAction === 'attack' ? 'anim-pet-attack' : playerAction === 'block' ? 'anim-pet-block' : 'anim-pet-counter';
    const playerEmojiEl = document.getElementById('pb-player-emoji');
    const enemyEmojiEl = document.getElementById('pb-enemy-emoji');
    if(playerEmojiEl) playerEmojiEl.classList.add(animClass);
    if(enemyEmojiEl) enemyEmojiEl.classList.add('anim-pet-attack');

    // Play action sound
    if(playerAction === 'block') playSound('buff'); else playSound('hit');

    // Show emoji particle
    showPetParticle(playerAction);

    // Enemy picks random action excluding its last action
    // In auto-battle mode the enemy always picks 'counter' so the player's 'attack' always wins
    const actions = ['attack', 'block', 'counter'];
    const enemyChoices = actions.filter(a => a !== petBattleEnemyLastAction);
    const enemyAction = petBattleAutoMode ? 'counter' : enemyChoices[Math.floor(Math.random() * enemyChoices.length)];

    const actionIcons = { attack: '⚔️', block: '🛡️', counter: '🔄' };
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

        const resultEl = document.getElementById('pb-result-text');
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
                const btn = document.getElementById(`pb-btn-${action}`);
                if(btn) btn.disabled = !petBattleActive || (action !== 'attack' && action === petBattleLastAction);
            });
        }
    }, 1000);
}

function petBattleRoundEnd(playerWon) {
    // Disable buttons while round ends and new enemy loads
    ['attack', 'block', 'counter'].forEach(action => {
        const btn = document.getElementById(`pb-btn-${action}`);
        if(btn) btn.disabled = true;
    });
    if(playerWon) {
        globalProgression.gold += 15;
        globalProgression.petBattleEnergy = Math.max(0, (globalProgression.petBattleEnergy || 0) - 1);
        globalProgression.petBattleLastEnergyTime = Date.now();
        // Drop a Titan Shard for winning
        globalProgression.inventory.titan_shard = (globalProgression.inventory.titan_shard || 0) + 1;
        const xpGain = Math.floor(getXpForNextLevel(player.lvl) * 0.01);
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
        const ps = ensureProgressStats();
        ps.battlesWon = (ps.battlesWon || 0) + 1;
        document.getElementById('pb-result-text').innerText = `🎉 You won! +15 Gold, +1 🔱 Titan Shard, +${xpGain} XP\nStreak: ${globalProgression.petBattleWinStreak}`;
        playSound('win');
        showPetBattleVictory();
        queueSave();
        document.getElementById('pet-battle-gold-display').innerText = globalProgression.gold;
        document.getElementById('pet-battle-energy-display').innerText = globalProgression.petBattleEnergy;
        // Heal and start next round
        setTimeout(() => {
            petBattlePlayerHp = 5;
            petBattleEnemyHp = 5;
            petBattleLastAction = null;
            petBattleEnemyLastAction = null;
            // Check energy for next round
            regenPetBattleEnergy();
            if((globalProgression.petBattleEnergy || 0) <= 0) {
                document.getElementById('pb-result-text').innerText = '😴 Out of energy! Recharges in 5 min.';
                ['attack', 'block', 'counter'].forEach(action => {
                    const btn = document.getElementById(`pb-btn-${action}`);
                    if(btn) { btn.disabled = true; btn.classList.add('opacity-50'); }
                });
                if(petBattleAutoMode) {
                    petBattleAutoMode = false;
                    if(petBattleAutoTimer) { clearTimeout(petBattleAutoTimer); petBattleAutoTimer = null; }
                    const autoBtn = document.getElementById('pb-btn-auto');
                    if(autoBtn) { autoBtn.classList.remove('auto-on'); autoBtn.innerText = '🤖 Auto'; }
                }
                return;
            }
            // New enemy pet
            petBattleEnemyPet = PET_DATA[Math.floor(Math.random() * PET_DATA.length)];
            document.getElementById('pb-enemy-emoji').innerText = petBattleEnemyPet.emoji;
            document.getElementById('pb-enemy-name').innerText = petBattleEnemyPet.name;
            updatePetBattleUI();
            updatePetBattleRecords();
            document.getElementById('pb-result-text').innerText = '✨ New enemy appeared! Choose your action.';
            // Re-enable action buttons now that a new pet is generated
            ['attack', 'block', 'counter'].forEach(action => {
                const btn = document.getElementById(`pb-btn-${action}`);
                if(btn) { btn.disabled = false; btn.classList.remove('opacity-50'); }
            });
            if(petBattleAutoMode) schedulePetAutoAction();
        }, 2000);
    } else {
        // Draw
        document.getElementById('pb-result-text').innerText = "Draw! Both pets fell — healing for next round.";
        setTimeout(() => {
            petBattlePlayerHp = 5;
            petBattleEnemyHp = 5;
            petBattleLastAction = null;
            petBattleEnemyLastAction = null;
            updatePetBattleUI();
            document.getElementById('pb-result-text').innerText = '✨ Round reset! Choose your action.';
            // Re-enable action buttons
            ['attack', 'block', 'counter'].forEach(action => {
                const btn = document.getElementById(`pb-btn-${action}`);
                if(btn) { btn.disabled = false; btn.classList.remove('opacity-50'); }
            });
            if(petBattleAutoMode) schedulePetAutoAction();
        }, 2000);
    }
}

function petBattleLose() {
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
    const ps = ensureProgressStats();
    ps.battlesLost = (ps.battlesLost || 0) + 1;
    playSound('lose');
    showPetBattleDefeat();
    queueSave();

    if(petBattleAutoMode && petBattlePlayerPet) {
        // Auto mode: restart with same pet instead of ending
        petBattleActive = false;
        document.getElementById('pb-result-text').innerText = '⚡ Auto: Restarting fight...';
        setTimeout(() => {
            if(petBattleAutoMode && petBattlePlayerPet) startPetBattle(petBattlePlayerPet.id);
        }, 2000);
    } else {
        petBattleActive = false;
        petBattleAutoMode = false;
        if(petBattleAutoTimer) { clearTimeout(petBattleAutoTimer); petBattleAutoTimer = null; }
        const autoBtn = document.getElementById('pb-btn-auto');
        if(autoBtn) { autoBtn.classList.remove('auto-on'); autoBtn.innerText = '🤖 Auto'; }
        document.getElementById('pb-result-text').innerText = '💀 You lost! Your pet was defeated.';
        // Disable action buttons until a new pet battle is started
        ['attack', 'block', 'counter'].forEach(action => {
            const btn = document.getElementById(`pb-btn-${action}`);
            if(btn) btn.disabled = true;
        });
        document.getElementById('pb-cooldown-info').innerText = 'Game over. Leave and try again.';
    }
}

function showPetBattleVictory() {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 flex items-center justify-center z-50 pointer-events-none';
    overlay.innerHTML = '<div class="text-6xl font-black text-yellow-400 anim-victory drop-shadow-lg">🎉 VICTORY!</div>';
    document.body.appendChild(overlay);
    const screen = document.getElementById('screen-pet-battle');
    if(screen) screen.classList.add('anim-screen-shake');
    setTimeout(() => { overlay.remove(); if(screen) screen.classList.remove('anim-screen-shake'); }, 2000);
}

function showPetBattleDefeat() {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 flex items-center justify-center z-50 pointer-events-none';
    overlay.innerHTML = '<div class="text-6xl font-black text-red-500 anim-defeat drop-shadow-lg">💀 DEFEAT</div>';
    document.body.appendChild(overlay);
    const screen = document.getElementById('screen-pet-battle');
    if(screen) screen.classList.add('anim-screen-shake');
    setTimeout(() => { overlay.remove(); if(screen) screen.classList.remove('anim-screen-shake'); }, 2000);
}

function showPetBattleStart() {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 flex items-center justify-center z-50 pointer-events-none';
    overlay.innerHTML = '<div class="text-6xl font-black text-green-400 drop-shadow-lg" style="animation: petStartPulse 0.6s ease-in-out 3 alternate;">⚡ START!</div>';
    document.body.appendChild(overlay);
    setTimeout(() => {
        overlay.remove();
        // Re-enable buttons after START animation
        ['attack', 'block', 'counter'].forEach(action => {
            const btn = document.getElementById(`pb-btn-${action}`);
            if(btn) {
                btn.disabled = false;
                btn.classList.remove('opacity-50');
                const lbl = btn.querySelector('.text-xs');
                if(lbl) lbl.innerText = action.charAt(0).toUpperCase() + action.slice(1);
            }
        });
        document.getElementById('pb-cooldown-info').innerText = '';
    }, 1800);
}

function togglePetBattleAuto() {
    petBattleAutoMode = !petBattleAutoMode;
    const btn = document.getElementById('pb-btn-auto');
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
        const attackBtn = document.getElementById('pb-btn-attack');
        if(attackBtn && attackBtn.disabled) { schedulePetAutoAction(); return; }
        // Always use 'attack' in auto mode (enemy will pick 'counter', so attack always wins)
        petBattleAction('attack');
    }, 1200);
}


function showRoundResultFlash(playerDmg, enemyDmg) {
    const el = document.createElement('div');
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
    const emoji = action === 'attack' ? '⚔️' : action === 'block' ? '🛡️' : '🔄';
    const pEl = document.getElementById('pb-player-emoji');
    if(!pEl) return;
    const rect = pEl.getBoundingClientRect();
    const particle = document.createElement('div');
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
    const autoBtn = document.getElementById('pb-btn-auto');
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
    healBtn.disabled = p.gold < WELL_HEAL_COST;
    xpBtn.disabled = !canUseXp || p.gold < WELL_BLESSING_COST;
    dropBtn.disabled = !canUseDrop || p.gold < WELL_BLESSING_COST;
    energy50Btn.disabled = !canUseEnergy50 || p.gold < WELL_ENERGY50_COST;
    energy100Btn.disabled = !canUseEnergy100 || p.gold < WELL_ENERGY100_COST;
    energyCapBtn.disabled = p.energyCapUnlocked || p.gold < WELL_ENERGY_CAP_COST || getMaxEnergy() < WELL_ENERGY_CAP_MIN_ENERGY;

    const btn250 = document.getElementById('well-energy250-btn');
    if(btn250) { btn250.disabled = p.gold < WELL_ENERGY250_COST; }
    const status250 = document.getElementById('well-energy250-status');
    if(status250) { status250.innerText = 'Always Available'; status250.className = 'font-bold text-emerald-300'; }

    document.getElementById('well-log').innerText = '';
    switchScreen('screen-well');
}

function useWellHeal() {
    const log = document.getElementById('well-log');
    if(globalProgression.gold < WELL_HEAL_COST) { log.innerText = 'Not enough Gold.'; playSound('lose'); return; }

    globalProgression.gold -= WELL_HEAL_COST;
    player.maxHp = calculateMaxHp();
    player.currentHp = player.maxHp;
    log.innerText = 'You feel renewed. HP fully restored!';
    playSound('heal');
    queueSave();
    showWell();
}

function buyWellXpBuff() {
    const today = new Date().toDateString();
    const log = document.getElementById('well-log');
    if((globalProgression.wellLastXpDate || '') === today) { log.innerText = 'XP Blessing already used today.'; playSound('lose'); return; }
    if(globalProgression.gold < WELL_BLESSING_COST) { log.innerText = 'Not enough Gold.'; playSound('lose'); return; }
    globalProgression.gold -= WELL_BLESSING_COST;
    globalProgression.wellXpBattles = 10;
    globalProgression.wellLastXpDate = today;
    log.innerText = '2x XP blessing is active for 10 battles!';
    playSound('win');
    queueSave();
    showWell();
}

function buyWellDropBuff() {
    const today = new Date().toDateString();
    const log = document.getElementById('well-log');
    if((globalProgression.wellLastDropDate || '') === today) { log.innerText = 'Drop Blessing already used today.'; playSound('lose'); return; }
    if(globalProgression.gold < WELL_BLESSING_COST) { log.innerText = 'Not enough Gold.'; playSound('lose'); return; }
    globalProgression.gold -= WELL_BLESSING_COST;
    globalProgression.wellDropBattles = 10;
    globalProgression.wellLastDropDate = today;
    log.innerText = '2x drop blessing is active for 10 battles!';
    playSound('win');
    queueSave();
    showWell();
}
function useWellEnergy50() {
    const p = globalProgression; const today = new Date().toDateString();
    const log = document.getElementById('well-log');
    if((p.wellLastEnergy50Date || '') === today) { log.innerText = 'Energy refill (50g) already used today.'; playSound('lose'); return; }
    if(p.gold < WELL_ENERGY50_COST) { log.innerText = 'Not enough Gold!'; playSound('lose'); return; }
    const maxEnergy = getMaxEnergy();
    p.gold -= WELL_ENERGY50_COST; p.energy = maxEnergy; p.wellLastEnergy50Date = today; queueSave(); updateEnergy();
    log.innerText = `⚡ Energy refilled to ${maxEnergy}!`; playSound('chest');
    showWell();
}
function useWellEnergy100() {
    const p = globalProgression; const today = new Date().toDateString();
    const log = document.getElementById('well-log');
    if((p.wellLastEnergy100Date || '') === today) { log.innerText = 'Energy refill (100g) already used today.'; playSound('lose'); return; }
    if(p.gold < WELL_ENERGY100_COST) { log.innerText = 'Not enough Gold!'; playSound('lose'); return; }
    const maxEnergy = getMaxEnergy();
    p.gold -= WELL_ENERGY100_COST; p.energy = maxEnergy; p.wellLastEnergy100Date = today; queueSave(); updateEnergy();
    log.innerText = `⚡ Energy refilled to ${maxEnergy}!`; playSound('chest');
    showWell();
}

function useWellEnergy250() {
    const p = globalProgression;
    const log = document.getElementById('well-log');
    if(p.gold < WELL_ENERGY250_COST) { if(log) log.innerText = `Not enough Gold! (Need ${WELL_ENERGY250_COST})`; playSound('lose'); return; }
    const maxEnergy = getMaxEnergy();
    p.gold -= WELL_ENERGY250_COST; p.energy = maxEnergy;
    const ps = ensureProgressStats(); ps.goldSpent = (ps.goldSpent || 0) + WELL_ENERGY250_COST;
    queueSave(); updateEnergy();
    if(log) log.innerText = `⚡ Energy refilled to ${maxEnergy}!`; playSound('heal');
    showWell();
}

function unlockEnergyCapUpgrade() {
    const p = globalProgression;
    const log = document.getElementById('well-log');
    if(p.energyCapUnlocked) { log.innerText = 'Energy cap already unlocked!'; return; }
    if(getMaxEnergy() < WELL_ENERGY_CAP_MIN_ENERGY) { log.innerText = `Reach ${WELL_ENERGY_CAP_MIN_ENERGY} Energy first! (You currently have ${getMaxEnergy()} max energy)`; playSound('lose'); return; }
    if(p.gold < WELL_ENERGY_CAP_COST) { log.innerText = `Not enough Gold! (Need ${WELL_ENERGY_CAP_COST})`; playSound('lose'); return; }
    p.gold -= WELL_ENERGY_CAP_COST;
    p.energyCapUnlocked = true;
    log.innerText = '❗ Energy cap upgraded to 150! Level up to reach energies 51-150.';
    playSound('win');
    queueSave();
    updateEnergy();
    showWell();
}

// --- QUESTS ---
function generateQuest(qNum) {
    const roll = Math.random(); 
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

    globalProgression[`questRwd${qNum}`] = Math.floor(baseReward * mult * (1 + player.lvl * 0.005));
}

function updateQuestUI(qNum) {
    const prog = globalProgression[`questProg${qNum}`]; const goal = globalProgression[`questGoal${qNum}`]; const rarity = globalProgression[`questRarity${qNum}`] || 'common';
    
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
    
    const btn = document.getElementById(`btn-claim-q${qNum}`);
    if(btn) {
        if(prog >= goal) { btn.disabled = false; btn.innerText = `CLAIM REWARD`; btn.className = 'w-full py-2 bg-yellow-500 text-black font-bold rounded animate-pulse transition active:scale-95 text-sm shadow-md'; } 
        else { btn.disabled = true; btn.innerText = "In Progress"; btn.className = 'w-full py-2 bg-gray-600 text-gray-400 font-bold rounded transition text-sm shadow-inner'; }
    }
    updateQuestNotifyBadge();
}

function checkDailyQuestReset() {
    const today = new Date().toDateString();
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
    const questOrder = [1, 2, 3, 4].sort((a, b) => {
        const aComplete = globalProgression[`questProg${a}`] >= globalProgression[`questGoal${a}`];
        const bComplete = globalProgression[`questProg${b}`] >= globalProgression[`questGoal${b}`];
        if (aComplete && !bComplete) return -1;
        if (!aComplete && bComplete) return 1;
        return 0;
    });

    for(let idx = 0; idx < questOrder.length; idx++) {
        const i = questOrder[idx];
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

        const type = globalProgression[`questType${i}`];
        const goal = globalProgression[`questGoal${i}`];
        const qt = document.getElementById(`quest-title-${i}`);
        const qd = document.getElementById(`quest-desc-${i}`);
        if(qt && qd) {
            if (type === 'hunting') { qt.innerText = 'Wilderness Hunter'; qd.innerText = `Slay ${goal} beasts in the Wilderness.`; }
            if (type === 'pillage') { qt.innerText = 'Village Pillager'; qd.innerText = `Defeat ${goal} foes in Pillage Village.`; }
            if (type === 'workshop') { qt.innerText = 'Workshop Raider'; qd.innerText = `Destroy ${goal} constructs in the Workshop.`; }
            if (type === 'dungeon') { qt.innerText = 'Dungeon Delver'; qd.innerText = `Destroy ${goal} aliens in the Dungeon Portal.`; }
        }
        // Update progress bar via the new IDs
        const prog = globalProgression[`questProg${i}`];
        const rwd = globalProgression[`questRwd${i}`];
        const rwdEl = document.getElementById(`quest-rwd-${i}`);
        if (rwdEl) rwdEl.innerText = `💰 ${rwd} G`;
        const barEl = document.getElementById(`quest-bar-${i}`);
        const txtEl = document.getElementById(`quest-text-${i}`);
        const btnEl = document.getElementById(`btn-claim-q${i}-slot${idx+1}`);
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
    const prog = globalProgression[`questProg${qNum}`]; const goal = globalProgression[`questGoal${qNum}`]; const rwd = globalProgression[`questRwd${qNum}`];
    if(prog >= goal && globalProgression.questsCompletedToday < 10) { 
        globalProgression.gold += rwd; 
        globalProgression.questsCompletedToday++;
        generateQuest(qNum); playSound('win'); queueSave(); showQuests(); 
    }
    updateQuestNotifyBadge();
}

function updateQuestNotifyBadge() {
    const badge = document.getElementById('quest-notify-badge');
    if (!badge) return;
    let hasClaimable = false;
    for (let i = 1; i <= 4; i++) {
        const prog = globalProgression[`questProg${i}`];
        const goal = globalProgression[`questGoal${i}`];
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
    const buyBtn = document.getElementById('btn-buy-ticket-dungeon');
    if(buyBtn) { buyBtn.disabled = globalProgression.gold < 100; if(globalProgression.gold < 100) buyBtn.classList.add('opacity-50'); else buyBtn.classList.remove('opacity-50'); }
    const list = document.getElementById('dungeon-list'); list.innerHTML = '';
    
    // Show max 6 dungeons: up to 5 unlocked + 1 locked (next tier)
    // Sliding window: once 6th tier unlocks, tier 1 disappears; always 6 shown max
    const maxShow = globalProgression.dungeonTier + 1; // next locked tier
    const minShow = Math.max(1, maxShow - 5); // at most 6 total
    
    for(let i = minShow; i <= maxShow; i++) {
        const isLocked = i > globalProgression.dungeonTier;
        const btn = document.createElement('button');
        btn.className = `p-4 rounded-xl border flex justify-between items-center transition ${isLocked ? 'bg-gray-900 border-gray-800 opacity-70 cursor-not-allowed' : 'bg-gray-800 border-yellow-900 hover:border-yellow-500 active:scale-95 shadow-lg'}`; btn.disabled = isLocked;
        const floorStart = (i - 1) * 5 + 1;
        const floorEnd = i * 5;
        btn.innerHTML = `<div class="text-left"><div class="font-bold text-lg ${isLocked ? 'text-gray-500' : 'text-yellow-400'}">🗼 Floors ${floorStart}–${floorEnd}</div><div class="text-xs text-gray-400">${isLocked ? 'Clear previous floors to unlock' : `2x XP · +10 ✨ per floor · +20 🔮 per 100 floors`}</div></div><div class="text-2xl">${isLocked ? '🔒' : '🗼'}</div>`;
        if(!isLocked) { btn.onclick = () => { if(globalProgression.tickets > 0) { globalProgression.tickets--; currentMode = 'dungeon'; activeDungeonTier = i; activeDungeonFloor = 1; startBattle(true); } else { alert("You need a Tower Ticket from the Shop!"); } }; } list.appendChild(btn);
    }
    switchScreen('screen-dungeons');
}

// --- GRAVEYARD ---
function showGraveyard() {
    document.getElementById('graveyard-gold-display').innerText = globalProgression.gold;
    const list = document.getElementById('graveyard-list'); list.innerHTML = '';
    
    const allBosses = Object.values(globalProgression.killedBosses || {});
    // Show only the most recent 20
    const bosses = allBosses.slice(-20);
    const today = new Date().toDateString();

    // Auto Complete button (if unlocked)
    if (globalProgression.autoGraveyardUnlocked) {
        const autoBtn = document.createElement('button');
        autoBtn.className = 'bg-emerald-700 hover:bg-emerald-600 border border-emerald-400 text-white font-bold py-3 rounded-xl text-lg shadow-lg w-full mb-2';
        autoBtn.textContent = '⚡ Auto Complete All Bosses';
        autoBtn.onclick = autoCompleteGraveyard;
        list.appendChild(autoBtn);
    }

    if(bosses.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'text-center text-gray-500 py-6 bg-gray-900 rounded-xl';
        empty.textContent = 'No bosses have been defeated yet.';
        list.appendChild(empty);
    } else {
        bosses.forEach(b => {
            const btn = document.createElement('div');
            btn.className = `bg-gray-800 border-2 border-gray-700 p-4 rounded-xl flex justify-between items-center shadow-md mb-2`;
            const canFight = globalProgression.gold >= 500;
            const revivedToday = (globalProgression.graveyardRevivalDates || {})[b.name] === today;
            const canRevive = canFight && !revivedToday;
            const statusText = revivedToday ? '<span class="text-xs text-gray-500 ml-1">(Revived today)</span>' : '';
            const avatarHtml = b.avatar && /\.(png|jpg|webp|gif)$/i.test(b.avatar)
                ? `<img src="${sanitizeHTML(b.avatar)}" alt="Boss" class="w-10 h-10 object-contain filter grayscale">`
                : `<span class="text-4xl filter grayscale drop-shadow-lg">${sanitizeHTML(b.avatar)}</span>`;
            
            btn.innerHTML = `
                <div class="flex items-center gap-3">
                    ${avatarHtml}
                    <div>
                        <div class="font-bold text-gray-300">${sanitizeHTML(b.name)}</div>
                        <div class="text-xs text-gray-500">Defeated Boss${statusText}</div>
                    </div>
                </div>
                <button onclick="fightGraveyardBoss('${sanitizeHTML(b.name)}')" class="bg-indigo-900 hover:bg-indigo-800 text-indigo-200 px-4 py-2 rounded font-bold transition active:scale-95 border border-indigo-700 shadow flex items-center gap-1 ${canRevive ? '' : 'opacity-50 cursor-not-allowed'}" ${canRevive ? '' : 'disabled'}>
                    <span>Resurrect</span><span class="text-yellow-400 text-xs">💰500</span>
                </button>
            `;
            list.appendChild(btn);
        });
    }
    switchScreen('screen-graveyard');
}

function autoCompleteGraveyard() {
    const today = new Date().toDateString();
    if (!globalProgression.graveyardRevivalDates) globalProgression.graveyardRevivalDates = {};
    const allBosses = Object.values(globalProgression.killedBosses || {});
    let pebbleCount = 0;
    const gearDrops = [];

    allBosses.forEach(b => {
        if (globalProgression.graveyardRevivalDates[b.name] === today) return; // already done today
        globalProgression.graveyardRevivalDates[b.name] = today;
        globalProgression.inventory.soul_pebbles = (globalProgression.inventory.soul_pebbles || 0) + 1;
        pebbleCount++;
        // Roll gear: 5% legendary, 15% epic, 30% rare, 50% common
        const rRoll = Math.random();
        let forceRarity;
        if (rRoll < 0.05) forceRarity = 'legendary';
        else if (rRoll < 0.20) forceRarity = 'epic';
        else if (rRoll < 0.50) forceRarity = 'rare';
        else forceRarity = 'common';
        const newEquip = rollEquipment(forceRarity);
        if (newEquip) {
            globalProgression.equipInventory.push(newEquip);
            globalProgression.newItems[newEquip.type.startsWith('ring') ? 'ring' : newEquip.type] = true;
            gearDrops.push(newEquip);
        }
    });

    playSound('win');
    queueSave();
    showGraveyard();

    // Show summary above the boss list
    const list = document.getElementById('graveyard-list');
    if (list) {
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'bg-emerald-900 border-2 border-emerald-400 rounded-xl p-4 text-center text-white font-bold shadow-lg mb-2';
        if (pebbleCount === 0) {
            summaryDiv.innerHTML = '<div class="text-base">All bosses already completed today!</div>';
        } else {
            summaryDiv.innerHTML = `
                <div class="text-lg">⚡ Auto Complete!</div>
                <div class="text-sm mt-1 text-purple-300">+${pebbleCount} Soul Pebble${pebbleCount !== 1 ? 's' : ''}</div>
                <div class="text-sm text-yellow-300">⚔️ ${gearDrops.length} Gear Drop${gearDrops.length !== 1 ? 's' : ''}</div>
            `;
        }
        // Insert after the auto-complete button (first child) or at top
        const autoBtn = list.firstChild;
        if (autoBtn && autoBtn.tagName === 'BUTTON') {
            list.insertBefore(summaryDiv, autoBtn.nextSibling);
        } else {
            list.insertBefore(summaryDiv, list.firstChild);
        }
    }
}

function fightGraveyardBoss(bossName) {
    const today = new Date().toDateString();
    if(!globalProgression.graveyardRevivalDates) globalProgression.graveyardRevivalDates = {};
    if(globalProgression.graveyardRevivalDates[bossName] === today) {
        playSound('lose');
        return; // Already revived today
    }
    if(globalProgression.gold >= 500) {
        globalProgression.gold -= 500;
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
