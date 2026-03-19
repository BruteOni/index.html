// --- SKILL SLOT COLOR CONSTANTS ---
const SLOT_FIXED_COLORS = ['bg-gray-700', 'bg-green-700', 'bg-green-700', 'bg-green-700', 'bg-green-700'];

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
    scrollBox.id = `tree-scroll-${pathName}`;
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
    rerollOnCooldown = false;  // Safety reset to prevent stuck state
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
        if(!player.nodeEnhancements) player.nodeEnhancements = {};
        if(!player.nodeEnhancements[p]) player.nodeEnhancements[p] = {};
        player.nodeEnhancements[p][idx] = enh;
        showEnhancementPopup(enh);
    }
    function unlockSkill(skillIdx) {
        if(!player.unlockedSkills.includes(skillIdx)) {
            player.unlockedSkills.push(skillIdx);
            showFloatText('hub-avatar', `🎯 NEW SKILL!`, 'text-yellow-400');
            showSkillUnlockPopup(skillIdx);
        }
    }
    
    if (path === 'offense' || path === 'defense') {
        player.skillPoints--;
        let attrs = ['hp', 'tenacity', 'agility', 'willpower', 'resistance', 'reflexes', 'fury', 'rawPower', 'force', 'revival', 'vampire'];
        let picked = attrs[Math.floor(Math.random() * attrs.length)];
        
        if(path === 'offense') {
            player.treeProgressOffense = (player.treeProgressOffense||0) + 1;
            if(index === 4) { unlockSkill(3); }
            else if(index === 9) { unlockSkill(4); }
            else if(index === 14) { unlockSkill(5); }
            else {
                player.statPoints += 1;
                showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-red-400');
                storeRolledEnhancement(path, index);
            }
        } else {
            player.treeProgressDefense = (player.treeProgressDefense||0) + 1;
            if(index === 4) { unlockSkill(6); }
            else if(index === 9) { unlockSkill(7); }
            else if(index === 14) { unlockSkill(8); }
            else {
                player.statPoints += 1;
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
            if(index === 4) { unlockSkill(3); }
            else if(index === 9) { unlockSkill(4); }
            else if(index === 14) { unlockSkill(5); }
            else {
                player.statPoints += 1;
                showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-orange-400');
                storeRolledEnhancement(path, index);
            }
        } else {
            player.treeProgressIce = (player.treeProgressIce||0) + 1;
            if(index === 4) { unlockSkill(6); }
            else if(index === 9) { unlockSkill(7); }
            else if(index === 14) { unlockSkill(8); }
            else {
                player.statPoints += 1;
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
            if(index === 4) { unlockSkill(3); }
            else if(index === 9) { unlockSkill(4); }
            else if(index === 14) { unlockSkill(5); }
            else {
                player.statPoints += 1;
                showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-yellow-400');
                storeRolledEnhancement(path, index);
            }
        } else {
            player.treeProgressGuardian = (player.treeProgressGuardian||0) + 1;
            if(index === 4) { unlockSkill(6); }
            else if(index === 9) { unlockSkill(7); }
            else if(index === 14) { unlockSkill(8); }
            else {
                player.statPoints += 1;
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
            if(index === 4) { unlockSkill(3); }
            else if(index === 9) { unlockSkill(4); }
            else if(index === 14) { unlockSkill(5); }
            else {
                player.statPoints += 1;
                showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-violet-400');
                storeRolledEnhancement(path, index);
            }
        } else {
            player.treeProgressVenom = (player.treeProgressVenom||0) + 1;
            if(index === 4) { unlockSkill(6); }
            else if(index === 9) { unlockSkill(7); }
            else if(index === 14) {
                if(player.data.skills[8] && !player.unlockedSkills.includes(8)) {
                    unlockSkill(8);
                } else {
                    player.statPoints += 1;
                    showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-lime-400');
                    storeRolledEnhancement(path, index);
                }
            } else {
                player.statPoints += 1;
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
            if(index === 4) { unlockSkill(3); }
            else if(index === 9) { unlockSkill(4); }
            else if(index === 14) { unlockSkill(5); }
            else {
                player.statPoints += 1;
                showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-pink-400');
                storeRolledEnhancement(path, index);
            }
        } else {
            player.treeProgressPlague = (player.treeProgressPlague||0) + 1;
            if(index === 4) { unlockSkill(6); }
            else if(index === 9) { unlockSkill(7); }
            else if(index === 14) { unlockSkill(8); }
            else {
                player.statPoints += 1;
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
            if(index === 4) { unlockSkill(3); }
            else if(index === 9) { unlockSkill(4); }
            else if(index === 14) { unlockSkill(5); }
            else {
                player.statPoints += 1;
                showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-sky-400');
                storeRolledEnhancement(path, index);
            }
        } else {
            player.treeProgressSurvival = (player.treeProgressSurvival||0) + 1;
            if(index === 4) { unlockSkill(6); }
            else if(index === 9) { unlockSkill(7); }
            else if(index === 14) { unlockSkill(8); }
            else {
                player.statPoints += 1;
                showFloatText('hub-avatar', `+1 ${picked.toUpperCase()}`, 'text-amber-400');
                storeRolledEnhancement(path, index);
            }
        }
    }
    
    player.maxHp = calculateMaxHp(); 
    playSound('win');
    saveGame();
    // Save scroll positions before re-rendering tree
    let scrollPositions = {};
    document.querySelectorAll('[id^="tree-scroll-"]').forEach(el => { scrollPositions[el.id] = el.scrollTop; });
    // Capture path and index for success animation
    let _enhPath = path, _enhIndex = index;
    showSkillTree();
    // Restore scroll positions
    document.querySelectorAll('[id^="tree-scroll-"]').forEach(el => { if(scrollPositions[el.id] !== undefined) el.scrollTop = scrollPositions[el.id]; });
    // Show success animation on newly unlocked node
    let enhNodeEl = document.getElementById(`node-enh-${_enhPath}-${_enhIndex}`);
    if(enhNodeEl) {
        enhNodeEl.classList.add('enh-reroll-success');
        showFloatText(`node-enh-${_enhPath}-${_enhIndex}`, '✨ ENHANCED!', 'text-green-400');
    }
}

function unlockInfinite(stat) {
    if(player.skillPoints < 1) return; player.skillPoints--;
    if(stat === 'hp') { player.treeBonusHp += 20; player.currentHp += 20; } if(stat === 'dmg') player.treeBonusDmg += 5; if(stat === 'def') player.treeBonusDef += 2;
    player.maxHp = calculateMaxHp(); saveGame();
    let scrollPositions = {};
    document.querySelectorAll('[id^="tree-scroll-"]').forEach(el => { scrollPositions[el.id] = el.scrollTop; });
    showSkillTree();
    document.querySelectorAll('[id^="tree-scroll-"]').forEach(el => { if(scrollPositions[el.id] !== undefined) el.scrollTop = scrollPositions[el.id]; });
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
    
    return { type: enhType, rarity: rarity };
}

function showEnhancementPopup(enh) {
    let def = ENHANCEMENT_DEFS[enh.type];
    let rarityColor = ENHANCEMENT_RARITY_COLORS[enh.rarity];
    let existing = document.getElementById('enhancement-popup');
    if(existing) existing.remove();
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
            <button onclick="document.getElementById('enhancement-popup').remove(); if(typeof showSkillTree === 'function') showSkillTree();" class="w-full bg-indigo-700 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl transition active:scale-95">
                Awesome!
            </button>
        </div>
    `;
    document.body.appendChild(popup);
}

function showSkillUnlockPopup(skillIdx) {
    let skill = player.data.skills[skillIdx];
    if(!skill) return;
    let existing = document.getElementById('skill-unlock-popup');
    if(existing) existing.remove();
    let popup = document.createElement('div');
    popup.id = 'skill-unlock-popup';
    popup.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;';
    popup.innerHTML = `
        <div class="bg-gray-900 border-2 border-yellow-400 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
            <div class="text-5xl mb-3">🎯</div>
            <div class="text-xs text-yellow-400 uppercase tracking-widest mb-1">New Skill Unlocked!</div>
            <div class="text-2xl font-black ${skill.color || 'text-white'} mb-3">${skill.name}</div>
            <div class="text-sm text-gray-300 bg-gray-800 rounded-xl p-3 mb-4">${skill.desc}</div>
            <button onclick="document.getElementById('skill-unlock-popup').remove(); if(typeof showSkillTree === 'function') showSkillTree();" class="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-xl transition active:scale-95">
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
        let scrollPositions = {};
        document.querySelectorAll('[id^="tree-scroll-"]').forEach(el => { scrollPositions[el.id] = el.scrollTop; });
        setTimeout(() => {
            try {
                rerollOnCooldown = false;
                showSkillTree();
                document.querySelectorAll('[id^="tree-scroll-"]').forEach(el => { if(scrollPositions[el.id] !== undefined) el.scrollTop = scrollPositions[el.id]; });
            } catch(e) {
                rerollOnCooldown = false;
                console.error('Error re-rendering skill tree after reroll:', e);
            }
        }, 500);
    } else {
        let scrollPositions = {};
        document.querySelectorAll('[id^="tree-scroll-"]').forEach(el => { scrollPositions[el.id] = el.scrollTop; });
        try {
            rerollOnCooldown = false;
            showSkillTree();
            document.querySelectorAll('[id^="tree-scroll-"]').forEach(el => { if(scrollPositions[el.id] !== undefined) el.scrollTop = scrollPositions[el.id]; });
        } catch(e) {
            rerollOnCooldown = false;
            console.error('Error re-rendering skill tree after reroll:', e);
        }
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
        showDamageNumber(`enemy-card-${i}`, dmg, false);
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

