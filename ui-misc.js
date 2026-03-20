// --- MAGICAL ENHANCER ---
function showMagicalEnhancer() {
    if (!player || !globalProgression || !globalProgression.inventory) return;
    let p = globalProgression;
    document.getElementById('me-gold-display').innerText = p.gold;
    document.getElementById('me-stones-display').innerText = p.inventory.magic_stone || 0;
    
    let list = document.getElementById('me-item-list');
    list.innerHTML = '';
    document.getElementById('me-status').innerText = '';

    let classId = player.classId || 'warrior';
    let classSets = SET_BONUS_DEFS[classId];
    if(!classSets) { list.innerHTML = '<p class="text-gray-500 text-center">No set bonuses available for your class.</p>'; switchScreen('screen-magical-enhancer'); return; }

    // Gather all mythical items: equipped + inventory
    let mythicItems = [];
    let equippedSlots = p.equipped || {};
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
        switchScreen('screen-magical-enhancer');
        return;
    }

    // Count equipped set pieces per set name
    let equippedSetCounts = {};
    Object.values(equippedSlots).forEach(item => {
        if(item && item.setBonus) {
            equippedSetCounts[item.setBonus.setKey] = (equippedSetCounts[item.setBonus.setKey] || 0) + 1;
        }
    });

    // Display each mythic item
    mythicItems.forEach(({ item, slot, idx, isEquipped }) => {
        let card = document.createElement('div');
        card.className = 'bg-gray-800 border border-blue-600 rounded-xl p-3 shadow-md';

        let alreadyEnhanced = !!item.setBonus;
        let setKey = item.setBonus ? item.setBonus.setKey : null;
        let setDef = setKey ? classSets[setKey] : null;
        let equippedCount = setKey ? (equippedSetCounts[setKey] || 0) : 0;

        // Get active tier
        let activeTier = 0;
        if(alreadyEnhanced) {
            activeTier = getActiveSetTier(equippedCount);
        }

        let header = `<div class="flex items-center gap-2 mb-2">
            <span class="text-2xl">${item.icon || '⚔️'}</span>
            <div class="flex-1">
                <div class="font-black text-white text-sm drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">${sanitizeHTML(item.name)}</div>
                <div class="text-xs text-gray-400">${sanitizeHTML(item.type)} ${isEquipped ? '(Equipped)' : '(Inventory)'}</div>
            </div>
        </div>`;

        if(alreadyEnhanced && setDef) {
            // Show existing set bonus
            let bonusHtml = Object.entries(setDef.bonuses).map(([tier, desc]) => {
                let tierNum = parseInt(tier, 10);
                let isActive = activeTier >= tierNum;
                let colorClass = isActive ? setDef.color + ' set-bonus-active' : 'text-gray-500';
                return `<div class="text-xs ${colorClass} ${isActive ? 'font-bold' : ''}">${tierNum}-piece: ${desc}</div>`;
            }).join('');
            card.innerHTML = header + `
                <div class="text-xs ${setDef.color} font-bold mb-1">✨ Set: ${setDef.name} (${equippedCount} equipped)</div>
                <div class="bg-gray-900 rounded-lg p-2 space-y-1">${bonusHtml}</div>
                <div class="text-xs text-gray-500 mt-2 italic">Already enhanced</div>`;
        } else {
            // Show enhance options
            let canAfford = (p.gold >= 10000) && ((p.inventory.magic_stone || 0) >= 50);
            let setOptions = Object.entries(classSets).map(([sk, sd]) => {
                let optBtn = `<button onclick="enhanceWithSet('${isEquipped ? 'equip_' + slot : 'inv_id_' + item.id}', '${sk}')"
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
    let p = globalProgression;
    if((p.inventory.magic_stone || 0) < 50) { document.getElementById('me-status').innerText = '❌ Need 50 Magic Stones!'; return; }
    if(p.gold < 10000) { document.getElementById('me-status').innerText = '❌ Need 10,000 Gold!'; return; }

    let classId = player.classId || 'warrior';
    let classSets = SET_BONUS_DEFS[classId];
    let setDef = classSets[setKey];
    if(!setDef) { document.getElementById('me-status').innerText = '❌ Invalid set!'; return; }

    let item = null;
    if(typeof itemRef === 'string' && itemRef.startsWith('equip_')) {
        let slot = itemRef.replace('equip_', '');
        item = p.equipped[slot];
    } else if(typeof itemRef === 'string' && itemRef.startsWith('inv_id_')) {
        let itemId = itemRef.replace('inv_id_', '');
        item = p.equipInventory.find(i => i && i.id === itemId);
    } else if(typeof itemRef === 'string' && itemRef.startsWith('inv_')) {
        // Legacy fallback for old-style index refs
        let idx = parseInt(itemRef.replace('inv_', ''), 10);
        item = p.equipInventory[idx];
    }

    if(!item) { document.getElementById('me-status').innerText = '❌ Item not found!'; return; }
    if(item.setBonus) { document.getElementById('me-status').innerText = '❌ Already enhanced!'; return; }

    p.inventory.magic_stone -= 50;
    p.gold -= 10000;
    item.setBonus = { setKey, setName: setDef.name };

    playSound('win');
    saveGame();
    document.getElementById('me-status').innerText = `✨ ${item.name} enhanced with ${setDef.name} set!`;
    showMagicalEnhancer();
}

// --- PROGRESS MENU ---
function showProgressMenu() {
    if (!player || !player.data || !globalProgression) return;
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
        { label: 'Mythic Boss Killed', value: (function() {
            let count = 0;
            if(globalProgression.killedBosses) {
                Object.values(globalProgression.killedBosses).forEach(b => { if(b && b.name) count++; });
            }
            let tracked = Math.max(ps.mythicBossFound || 0, ps.mythicBossKilled || 0, count);
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
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32-bit integer
    }
    return btoa(hash.toString());
}

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
    saveGame();
    let saveData = localStorage.getItem('EternalAscensionSaveDataV1') || localStorage.getItem('fogFighterSaveDataV22') || localStorage.getItem('fogFighterSaveDataV21') || localStorage.getItem('fogFighterSaveDataV20');
    if (!saveData) {
        document.getElementById('sl-modal-title').innerText = "Export Save Data";
        document.getElementById('sl-modal-desc').innerText = "No save data found.";
        document.getElementById('sl-modal-text').value = "";
        document.getElementById('modal-save-load').style.display = 'flex';
        return;
    }
    let dataWithChecksum = saveData + '|' + simpleHash(saveData);
    let encoded = btoa(unescape(encodeURIComponent(dataWithChecksum)));
    
    document.getElementById('sl-modal-title').innerText = "Export Save Data";
    document.getElementById('sl-modal-desc').innerText = "Copy this text to save your progress elsewhere.";
    document.getElementById('sl-modal-text').value = encoded;
    document.getElementById('sl-modal-text').readOnly = true;
    let btn = document.getElementById('sl-modal-btn');
    btn.innerText = "Copy to Clipboard";
    btn.className = "w-full bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 rounded transition active:scale-95 border border-blue-500";
    btn.onclick = () => {
        let text = document.getElementById('sl-modal-text').value;
        copyToClipboard(text, btn);
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
                if (checksum !== simpleHash(jsonData) && checksum !== btoa(jsonData.length.toString())) {
                    throw new Error("Checksum mismatch");
                }
            }
            let parsed = JSON.parse(jsonData);
            if(parsed.global && parsed.pState) {
                // Sanity-check key numeric fields to catch corrupted or tampered saves
                const gp = parsed.global;
                const ps = parsed.pState;
                if (typeof gp.gold !== 'number' || gp.gold < 0 || !isFinite(gp.gold)) throw new Error("Invalid gold value in save data");
                if (typeof ps.lvl !== 'number' || ps.lvl < 1 || ps.lvl > 200 || !isFinite(ps.lvl)) throw new Error("Invalid level in save data");
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
