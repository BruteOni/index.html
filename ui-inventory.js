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
    ['ench_common', 'ench_rare', 'ench_epic', 'ench_legendary', 'herb_red', 'herb_blue', 'fish_1', 'fish_2', 'fish_3', 'fish_4', 'fish_5', 'fish_6', 'soul_pebbles', 'titan_shard', 'magic_stone'].forEach(key => {
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

