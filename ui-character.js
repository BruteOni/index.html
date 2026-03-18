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
    document.getElementById('char-stat-dodge').innerText = `${(((a.resistance || 0) * 0.0025 + getEquipBonusStat('bonusDodge')) * 100).toFixed(1)}%`;
    // Hit: 80% base + reflexes 0.1% per point + gear bonusHit
    document.getElementById('char-stat-hit').innerText = `${Math.min(100, (80 + ((a.reflexes || 0) * 0.1) + (getEquipBonusStat('bonusHit') * 100))).toFixed(1)}%`;
    // Crit: force 0.5% per point + gear bonusCritRate, capped at 75%
    document.getElementById('char-stat-crit').innerText = `${Math.min(75, ((a.force || 0) * 0.5) + (getEquipBonusStat('bonusCritRate') * 100)).toFixed(1)}%`;
    // Crit Dmg: fury 0.25% per point + gear bonusCritDmg
    document.getElementById('char-stat-critdmg').innerText = `${(100 + ((a.fury || 0) * 0.25) + (getEquipBonusStat('bonusCritDmg') * 100)).toFixed(0)}%`;
    // Dmg Reduction: tenacity 0.3% per point + gear bonusDmgReduction
    document.getElementById('char-stat-dmgred').innerText = `${(((a.tenacity || 0) * 0.003 + getEquipBonusStat('bonusDmgReduction')) * 100).toFixed(1)}%`;
    // Dmg Reflect: gear bonusDmgReflect only (tenacity no longer directly gives reflect)
    document.getElementById('char-stat-reflect').innerText = `${(getEquipBonusStat('bonusDmgReflect') * 100).toFixed(2)}%`;
    // Skill Dmg: gear bonusSkillDmg
    document.getElementById('char-stat-skilldmg').innerText = `${(getEquipBonusStat('bonusSkillDmg') * 100).toFixed(1)}%`;
    // Armor Pierce: reflexes 0.3% per point + gear bonusArmorPierce
    document.getElementById('char-stat-mitigation').innerText = `${(((a.reflexes || 0) * 0.003 + getEquipBonusStat('bonusArmorPierce')) * 100).toFixed(1)}%`;
    // Life Steal: vampire 0.25% per point + gear bonusVamp
    if(document.getElementById('char-stat-lifesteal')) document.getElementById('char-stat-lifesteal').innerText = `${(((a.vampire || 0) * 0.0025 + getEquipBonusStat('bonusVamp')) * 100).toFixed(2)}%`;
    // Counter Chance: agility 0.25% per point
    if(document.getElementById('char-stat-counter')) document.getElementById('char-stat-counter').innerText = `${(((a.agility || 0) * 0.0025) * 100).toFixed(2)}%`;
    
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
