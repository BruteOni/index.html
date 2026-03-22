// --- MAGICAL ENHANCER ---
function showMagicalEnhancer() {
    if (!player || !globalProgression || !globalProgression.inventory) return;
    const p = globalProgression;
    document.getElementById('me-gold-display').innerText = p.gold;
    document.getElementById('me-stones-display').innerText = p.inventory.magic_stone || 0;
    
    const list = document.getElementById('me-item-list');
    list.innerHTML = '';
    document.getElementById('me-status').innerText = '';

    const classId = player.classId || 'warrior';
    const classSets = SET_BONUS_DEFS[classId];
    if(!classSets) { list.innerHTML = '<p class="text-gray-500 text-center">No set bonuses available for your class.</p>'; switchScreen('screen-magical-enhancer'); return; }

    // Gather only EQUIPPED mythical items
    const mythicItems = [];
    const equippedSlots = p.equipped || {};
    Object.entries(equippedSlots).forEach(([slot, item]) => {
        if(item && item.rarity === 'mythic') {
            mythicItems.push({ item, slot, isEquipped: true });
        }
    });

    if(mythicItems.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-center py-4">No Mythical equipment equipped. Equip Mythical gear first to enhance it.</p>';
        switchScreen('screen-magical-enhancer');
        return;
    }

    // Count equipped set pieces per set name
    const equippedSetCounts = {};
    Object.values(equippedSlots).forEach(item => {
        if(item && item.setBonus) {
            equippedSetCounts[item.setBonus.setKey] = (equippedSetCounts[item.setBonus.setKey] || 0) + 1;
        }
    });

    // Display each mythic item
    mythicItems.forEach(({ item, slot, idx, isEquipped }) => {
        const card = document.createElement('div');
        card.className = 'bg-gray-800 border border-blue-600 rounded-xl p-3 shadow-md';

        const alreadyEnhanced = !!item.setBonus;
        const setKey = item.setBonus ? item.setBonus.setKey : null;
        const setDef = setKey ? classSets[setKey] : null;
        const equippedCount = setKey ? (equippedSetCounts[setKey] || 0) : 0;

        // Get active tier
        let activeTier = 0;
        if(alreadyEnhanced) {
            activeTier = getActiveSetTier(equippedCount);
        }

        const header = `<div class="flex items-center gap-2 mb-2">
            <span class="text-2xl">${item.icon || '⚔️'}</span>
            <div class="flex-1">
                <div class="font-black text-white text-sm drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">${sanitizeHTML(item.name)}</div>
                <div class="text-xs text-gray-400">${sanitizeHTML(item.type)} ${isEquipped ? '(Equipped)' : '(Inventory)'}</div>
            </div>
        </div>`;

        if(alreadyEnhanced && setDef) {
            // Show existing set bonus
            const bonusHtml = Object.entries(setDef.bonuses).map(([tier, desc]) => {
                const tierNum = parseInt(tier, 10);
                const isActive = activeTier >= tierNum;
                const colorClass = isActive ? setDef.color + ' set-bonus-active' : 'text-gray-500';
                return `<div class="text-xs ${colorClass} ${isActive ? 'font-bold' : ''}">${tierNum}-piece: ${desc}</div>`;
            }).join('');
            card.innerHTML = header + `
                <div class="text-xs ${setDef.color} font-bold mb-1">✨ Set: ${setDef.name} (${equippedCount} equipped)</div>
                <div class="bg-gray-900 rounded-lg p-2 space-y-1">${bonusHtml}</div>
                <div class="text-xs text-gray-500 mt-2 italic">Already enhanced</div>`;
        } else {
            // Show enhance options
            const canAfford = (p.gold >= MAGICAL_ENHANCER_GOLD_COST) && ((p.inventory.magic_stone || 0) >= MAGICAL_ENHANCER_STONE_COST);
            const setOptions = Object.entries(classSets).map(([sk, sd]) => {
                const optBtn = `<button onclick="enhanceWithSet('${isEquipped ? 'equip_' + slot : 'inv_id_' + item.id}', '${sk}')"
                    class="text-left w-full rounded-lg p-2 mt-1 border ${sd.borderColor} bg-gray-900 hover:bg-gray-700 transition ${canAfford ? '' : 'opacity-50 cursor-not-allowed'}"
                    ${canAfford ? '' : 'disabled'}>
                    <div class="font-bold ${sd.color} text-sm">${sd.name}</div>
                    <div class="text-xs text-gray-400 mt-1">4pc: ${sd.bonuses[4]}</div>
                    <div class="text-xs text-gray-400">8pc: ${sd.bonuses[8]}</div>
                    <div class="text-xs text-gray-400">12pc: ${sd.bonuses[12]}</div>
                    <div class="text-xs text-gray-400">14pc: ${sd.bonuses[14]}</div>
                </button>`;
                return optBtn;
            }).join('');
            card.innerHTML = header + `
                <div class="text-xs text-gray-400 mb-2">Choose a Set Bonus <span class="text-blue-300">(50 💎 + 10,000 💰)</span>:</div>
                ${setOptions}`;
        }
        list.appendChild(card);
    });

    switchScreen('screen-magical-enhancer');
}

function enhanceWithSet(itemRef, setKey) {
    const p = globalProgression;
    if((p.inventory.magic_stone || 0) < MAGICAL_ENHANCER_STONE_COST) { document.getElementById('me-status').innerText = `❌ Need ${MAGICAL_ENHANCER_STONE_COST} Magic Stones!`; return; }
    if(p.gold < MAGICAL_ENHANCER_GOLD_COST) { document.getElementById('me-status').innerText = `❌ Need ${MAGICAL_ENHANCER_GOLD_COST.toLocaleString()} Gold!`; return; }

    const classId = player.classId || 'warrior';
    const classSets = SET_BONUS_DEFS[classId];
    const setDef = classSets[setKey];
    if(!setDef) { document.getElementById('me-status').innerText = '❌ Invalid set!'; return; }

    let item = null;
    if(typeof itemRef === 'string' && itemRef.startsWith('equip_')) {
        const slot = itemRef.replace('equip_', '');
        item = p.equipped[slot];
    } else if(typeof itemRef === 'string' && itemRef.startsWith('inv_id_')) {
        const itemId = itemRef.replace('inv_id_', '');
        item = p.equipInventory.find(i => i && i.id === itemId);
    } else if(typeof itemRef === 'string' && itemRef.startsWith('inv_')) {
        // Legacy fallback for old-style index refs
        const idx = parseInt(itemRef.replace('inv_', ''), 10);
        item = p.equipInventory[idx];
    }

    if(!item) { document.getElementById('me-status').innerText = '❌ Item not found!'; return; }
    if(item.setBonus) { document.getElementById('me-status').innerText = '❌ Already enhanced!'; return; }

    p.inventory.magic_stone -= MAGICAL_ENHANCER_STONE_COST;
    p.gold -= MAGICAL_ENHANCER_GOLD_COST;
    item.setBonus = { setKey, setName: setDef.name };

    playSound('win');
    queueSave();
    document.getElementById('me-status').innerText = `✨ ${item.name} enhanced with ${setDef.name} set!`;
    showMagicalEnhancer();
}

// --- REFORGER ---
function showReforger() {
    if (!player || !globalProgression || !globalProgression.inventory) return;
    const p = globalProgression;
    document.getElementById('rf-dust-display').innerText = p.inventory.ethereal_dust || 0;

    const list = document.getElementById('rf-item-list');
    list.innerHTML = '';
    document.getElementById('rf-status').innerText = '';

    // Gather ALL mythic items: equipped + inventory
    const mythicItems = [];
    const equippedSlots = p.equipped || {};
    Object.entries(equippedSlots).forEach(([slot, item]) => {
        if(item && item.rarity === 'mythic') {
            mythicItems.push({ item, slot, isEquipped: true });
        }
    });
    (p.equipInventory || []).forEach((item, idx) => {
        if(item && item.rarity === 'mythic') {
            mythicItems.push({ item, idx, isEquipped: false });
        }
    });

    if(mythicItems.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-center py-4">No Mythical equipment found. Mythical gear drops from Mythic Bosses.</p>';
        switchScreen('screen-reforger');
        return;
    }

    mythicItems.forEach(({ item, slot, idx, isEquipped }) => {
        const card = document.createElement('div');
        card.className = 'bg-gray-800 border border-teal-600 rounded-xl p-3 shadow-md';

        const itemLevel = item.itemLevel || item.lvl || 1;
        const canAfford = (p.inventory.ethereal_dust || 0) >= 10;
        const itemRef = isEquipped ? 'equip_' + slot : 'inv_id_' + item.id;

        const bonusHtml = (item.bonusStats && item.bonusStats.length > 0)
            ? item.bonusStats.map((bs, bsIdx) => {
                const statText = bs.stat === 'bonusCdReduc'
                    ? `CD -${bs.value}t`
                    : `+${(bs.value * 100).toFixed(2)}% ${bs.label}`;
                const isLocked = bs.locked === true;
                const rowStyle = isLocked ? 'border border-yellow-500 rounded px-1' : 'border border-transparent rounded px-1';
                const lockIcon = isLocked ? '🔒' : '🔓';
                const lockTitle = isLocked ? 'Unlock stat (will be re-rolled)' : 'Lock stat (will be kept on reforge)';
                const lockBtnStyle = isLocked ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400';
                return `<div class="flex items-center justify-between gap-1 ${rowStyle}">
                    <span class="text-xs text-cyan-300">${statText}</span>
                    <button onclick="toggleStatLock('${sanitizeHTML(itemRef)}', ${Number(bsIdx)})" class="text-xs ${lockBtnStyle} transition" title="${lockTitle}">${lockIcon}</button>
                </div>`;
            }).join('')
            : '<div class="text-xs text-gray-500 italic">No bonus stats</div>';

        card.innerHTML = `
            <div class="flex items-center gap-2 mb-2">
                <span class="text-2xl">${item.icon || '⚔️'}</span>
                <div class="flex-1">
                    <div class="font-black text-white text-sm drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">${sanitizeHTML(item.name)}</div>
                    <div class="text-xs text-gray-400">${sanitizeHTML(item.type)} ${isEquipped ? '(Equipped)' : '(Inventory)'} | Lv.${itemLevel}</div>
                </div>
            </div>
            <div class="bg-gray-900 rounded-lg p-2 mb-2 space-y-1">
                <div class="text-xs text-gray-500 font-bold mb-1">Current Stats: <span class="text-gray-600 font-normal">(🔒 to lock a stat)</span></div>
                ${bonusHtml}
            </div>
            <button onclick="reforgeItem('${sanitizeHTML(itemRef)}')"
                class="w-full bg-teal-800 hover:bg-teal-700 text-white px-3 py-2 rounded font-bold text-xs transition active:scale-95 ${canAfford ? '' : 'opacity-50 cursor-not-allowed'}"
                ${canAfford ? '' : 'disabled'}>
                🔄 Reforge Stats <span class="text-teal-300">(10 ✨ Ethereal Dust)</span>
            </button>`;
        list.appendChild(card);
    });

    switchScreen('screen-reforger');
}

function reforgeItem(itemRef) {
    const REFORGE_COST = 10;
    const p = globalProgression;
    if ((p.inventory.ethereal_dust || 0) < REFORGE_COST) {
        document.getElementById('rf-status').innerText = `❌ Need ${REFORGE_COST} Ethereal Dust!`;
        return;
    }

    let item = null;
    if (typeof itemRef === 'string' && itemRef.startsWith('equip_')) {
        const slot = itemRef.replace('equip_', '');
        item = p.equipped[slot];
    } else if (typeof itemRef === 'string' && itemRef.startsWith('inv_id_')) {
        const itemId = itemRef.replace('inv_id_', '');
        item = (p.equipInventory || []).find(i => i && i.id === itemId);
    }

    if (!item) { document.getElementById('rf-status').innerText = '❌ Item not found!'; return; }

    const lockedStats = (item.bonusStats || []).filter(bs => bs.locked === true);
    const lockedMsg = lockedStats.length > 0 ? ` ${lockedStats.length} locked stat(s) will be kept.` : '';
    if (!confirm(`Are you sure? This will re-roll all unlocked stats on this item.${lockedMsg}`)) return;

    const itemLevel = item.itemLevel || item.lvl || 1;
    const slotType = item.type;
    const lockedStatTypes = lockedStats.map(bs => bs.stat);
    const numNewStats = 5 - lockedStats.length; // mythic items always have 5 stats total
    const newStats = numNewStats > 0 ? generateBonusStats('mythic', itemLevel, slotType, numNewStats, lockedStatTypes) : [];
    item.bonusStats = [...lockedStats, ...newStats];

    p.inventory.ethereal_dust -= REFORGE_COST;
    playSound('win');
    queueSave();
    document.getElementById('rf-status').innerText = `🔄 ${item.name} stats have been reforged!`;
    showReforger();
}

function toggleStatLock(itemRef, statIdx) {
    const p = globalProgression;
    let item = null;
    if (typeof itemRef === 'string' && itemRef.startsWith('equip_')) {
        const slot = itemRef.replace('equip_', '');
        item = p.equipped[slot];
    } else if (typeof itemRef === 'string' && itemRef.startsWith('inv_id_')) {
        const itemId = itemRef.replace('inv_id_', '');
        item = (p.equipInventory || []).find(i => i && i.id === itemId);
    }
    if (!item || !item.bonusStats || !item.bonusStats[statIdx]) return;
    const stat = item.bonusStats[statIdx];
    stat.locked = !stat.locked;
    queueSave();
    showReforger();
}

// --- PROGRESS MENU ---
function showProgressMenu() {
    if (!player || !player.data || !globalProgression) return;
    const ps = ensureProgressStats();
    // Update level reached
    if (player.lvl > (ps.levelReached || 0)) ps.levelReached = player.lvl;
    // Update highest gold
    if (globalProgression.gold > (ps.highestGold || 0)) ps.highestGold = globalProgression.gold;

    function fmtTime(secs) {
        const s = Math.floor(secs || 0);
        const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60);
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
        { label: 'Mythic Boss Killed', value: (function() {
            let count = 0;
            if(globalProgression.killedBosses) {
                Object.values(globalProgression.killedBosses).forEach(b => { if(b && b.name) count++; });
            }
            const tracked = Math.max(ps.mythicBossFound || 0, ps.mythicBossKilled || 0, count);
            ps.mythicBossKilled = tracked;
            return tracked;
        })() },
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

    const html = rows.map(r =>
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
function copyToClipboard(text, btn) {
    const onSuccess = () => {
        btn.innerText = "Copied!";
        playSound('click');
        setTimeout(() => { btn.innerText = "Copy to Clipboard"; }, 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
            const ta = document.getElementById('sl-modal-text');
            if (ta) { ta.select(); try { document.execCommand('copy'); } catch(e) {} }
            onSuccess();
        });
    } else {
        const ta = document.getElementById('sl-modal-text');
        if (ta) { ta.select(); try { document.execCommand('copy'); } catch(e) {} }
        onSuccess();
    }
}

function showExport() {
    saveGame(); // Intentional: flush all pending queueSave() changes to localStorage before reading for export
    const saveData = localStorage.getItem('EternalAscensionSaveDataV1') || localStorage.getItem('fogFighterSaveDataV22') || localStorage.getItem('fogFighterSaveDataV21') || localStorage.getItem('fogFighterSaveDataV20');
    if (!saveData) {
        document.getElementById('sl-modal-title').innerText = "Export Save Data";
        document.getElementById('sl-modal-desc').innerText = "No save data found.";
        document.getElementById('sl-modal-text').value = "";
        document.getElementById('modal-save-load').style.display = 'flex';
        return;
    }
    const dataWithChecksum = saveData + '|' + simpleHash(saveData);
    const encoded = btoa(unescape(encodeURIComponent(dataWithChecksum)));
    
    document.getElementById('sl-modal-title').innerText = "Export Save Data";
    document.getElementById('sl-modal-desc').innerText = "Copy this text to save your progress elsewhere.";
    document.getElementById('sl-modal-text').value = encoded;
    document.getElementById('sl-modal-text').readOnly = true;
    const btn = document.getElementById('sl-modal-btn');
    btn.innerText = "Copy to Clipboard";
    btn.className = "w-full bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 rounded transition active:scale-95 border border-blue-500";
    btn.onclick = () => {
        const text = document.getElementById('sl-modal-text').value;
        copyToClipboard(text, btn);
    };
    document.getElementById('modal-save-load').style.display = 'flex';
}

function showImport() {
    document.getElementById('sl-modal-title').innerText = "Import Save Data";
    document.getElementById('sl-modal-desc').innerHTML = "<span class='text-red-400 font-bold'>Warning:</span> This will overwrite your current progress! Paste your code below.";
    document.getElementById('sl-modal-text').value = "";
    document.getElementById('sl-modal-text').readOnly = false;
    const btn = document.getElementById('sl-modal-btn');
    btn.innerText = "Load Save Data";
    btn.className = "w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded transition active:scale-95 border border-red-500";
    btn.onclick = () => {
        try {
            const encoded = document.getElementById('sl-modal-text').value.trim();
            if(!encoded) return;
            const decoded = decodeURIComponent(escape(atob(encoded)));
            let jsonData = decoded;
            if (decoded.includes('|')) {
                const parts = decoded.split('|');
                jsonData = parts[0];
                const checksum = parts[1];
                if (checksum !== simpleHash(jsonData) && checksum !== btoa(jsonData.length.toString())) {
                    throw new Error("Checksum mismatch");
                }
            }
            const parsed = JSON.parse(jsonData);
            if(parsed.global && parsed.pState) {
                // Sanity-check key numeric fields to catch corrupted or tampered saves
                const gp = parsed.global;
                const ps = parsed.pState;
                if (typeof gp.gold !== 'number' || gp.gold < 0 || !isFinite(gp.gold)) throw new Error("Invalid gold value in save data");
                if (typeof ps.lvl !== 'number' || ps.lvl < 1 || ps.lvl > MAX_LEVEL || !isFinite(ps.lvl)) throw new Error("Invalid level in save data");
                if (typeof ps.currentHp !== 'number' || ps.currentHp < 0 || !isFinite(ps.currentHp)) throw new Error("Invalid HP in save data");
                localStorage.setItem('EternalAscensionSaveDataV1', jsonData);
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
