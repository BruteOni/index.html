/**
 * ui-character.js
 * Handles the character sheet screen, including stat display, equipped gear slots,
 * equipped skill slots, and the skill guide overlay.
 *
 * Depends on globals: player, globalProgression, EQUIP_SLOTS, SLOT_FIXED_COLORS
 * Depends on functions: calculateMaxHp, getBaseDamage, getPlayerDef, getEquipBonusStat,
 *   getGearScore, hasBetterGear, saveGame, switchScreen, setAvatarDisplay, openSkillModal
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default icon shown for each empty equipment slot. */
const SLOT_DEFAULT_ICONS = {
    head: '🪖',
    shoulders: '🛡️',
    arms: '🦾',
    weapon: '⚔️',
    chest: '🦺',
    waist: '🪢',
    legs: '👖',
    boots: '🥾',
    necklace: '📿',
    cape: '🧥',
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Sets the textContent of a stat element by id.
 * Silently skips when the element does not exist in the DOM.
 *
 * @param {string} id    - The element id (e.g. 'char-stat-hp').
 * @param {string} value - The formatted value to display.
 */
function setStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ---------------------------------------------------------------------------
// Notification management
// ---------------------------------------------------------------------------

/**
 * Clears all new-item notifications from globalProgression, persists the save,
 * and re-renders the character screen.
 */
function clearCharNotifications() {
    globalProgression.newItems = {};
    saveGame();
    showCharacter();
}

// ---------------------------------------------------------------------------
// Character screen
// ---------------------------------------------------------------------------

/**
 * Renders the full character sheet and switches to the character screen.
 * Updates level, all combat stats, equipped gear slots, and equipped skill slots.
 */
function showCharacter() {
    const lvlEl = document.getElementById('char-lvl');
    if (lvlEl) lvlEl.textContent = player.lvl;

    setStat('char-stat-hp', `${calculateMaxHp()}`);
    setStat('char-stat-dmg', `${getBaseDamage()}`);
    setStat('char-stat-def', `${getPlayerDef()}`);

    const a = globalProgression.attributes;

    // HP Regen: revival attr (0.2% per point) + gear bonusHpRegen
    const hpRegenAmt = Math.floor(player.maxHp * ((a.revival || 0) * 0.002 + getEquipBonusStat('bonusHpRegen')));
    setStat('char-stat-regen', `${(player.treeBonusRegen || 0) + hpRegenAmt} HP/Turn`);

    // Gear score: based on total itemLevel * rarity across all equipped items
    let totalGS = 0;
    if (globalProgression.equipped) {
        Object.values(globalProgression.equipped).forEach(item => {
            if (item) totalGS += getGearScore(item);
        });
    }
    setStat('char-stat-gs', totalGS);

    // Dodge: resistance 0.25% per point + gear bonusDodge
    setStat('char-stat-dodge', `${(((a.resistance || 0) * 0.0025 + getEquipBonusStat('bonusDodge')) * 100).toFixed(1)}%`);
    // Hit: 80% base + reflexes 0.1% per point + gear bonusHit
    setStat('char-stat-hit', `${Math.min(100, (80 + ((a.reflexes || 0) * 0.1) + (getEquipBonusStat('bonusHit') * 100))).toFixed(1)}%`);
    // Crit: force 0.5% per point + gear bonusCritRate, capped at 75%
    setStat('char-stat-crit', `${Math.min(75, ((a.force || 0) * 0.5) + (getEquipBonusStat('bonusCritRate') * 100)).toFixed(1)}%`);
    // Crit Dmg: fury 0.25% per point + gear bonusCritDmg
    setStat('char-stat-critdmg', `${(100 + ((a.fury || 0) * 0.25) + (getEquipBonusStat('bonusCritDmg') * 100)).toFixed(0)}%`);
    // Dmg Reduction: tenacity 0.3% per point + gear bonusDmgReduction
    setStat('char-stat-dmgred', `${(((a.tenacity || 0) * 0.003 + getEquipBonusStat('bonusDmgReduction')) * 100).toFixed(1)}%`);
    // Dmg Reflect: gear bonusDmgReflect only (tenacity no longer directly gives reflect)
    setStat('char-stat-reflect', `${(getEquipBonusStat('bonusDmgReflect') * 100).toFixed(2)}%`);
    // Return: return attr 0.25% per point
    setStat('char-stat-return', `${(((a['return'] || 0) * 0.0025) * 100).toFixed(2)}%`);
    // Skill Dmg: gear bonusSkillDmg
    setStat('char-stat-skilldmg', `${(getEquipBonusStat('bonusSkillDmg') * 100).toFixed(1)}%`);
    // Armor Pierce: reflexes 0.3% per point + gear bonusArmorPierce
    setStat('char-stat-mitigation', `${(((a.reflexes || 0) * 0.003 + getEquipBonusStat('bonusArmorPierce')) * 100).toFixed(1)}%`);
    // Life Steal: vampire 0.25% per point + gear bonusVamp
    setStat('char-stat-lifesteal', `${(((a.vampire || 0) * 0.0025 + getEquipBonusStat('bonusVamp')) * 100).toFixed(2)}%`);
    // Counter Chance: agility 0.25% per point
    setStat('char-stat-counter', `${(((a.agility || 0) * 0.0025) * 100).toFixed(2)}%`);

    const pClass = document.getElementById('char-class-name');
    if (pClass) pClass.textContent = player.data.name;
    const pAv = document.getElementById('char-avatar-display');
    if (pAv) {
        setAvatarDisplay('char-avatar-display', player.data.avatar);
        if ((globalProgression.blackMarketTier || 0) >= 1) {
            pAv.classList.add('bm-avatar-glow');
        } else {
            pAv.classList.remove('bm-avatar-glow');
        }
    }

    EQUIP_SLOTS.forEach(slot => {
        const el = document.getElementById(`slot-${slot}`);
        if (!el) return;

        const isBetter = hasBetterGear(slot);
        const badge = isBetter ? `<div class="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce z-10 font-bold border border-red-400">!</div>` : '';

        const item = globalProgression.equipped[slot];
        if (item) {
            el.dataset.filled = "true";
            el.innerHTML = badge + (item.icon || '📦');
            el.className = `equip-slot rarity-${item.rarity}`;
        } else {
            el.dataset.filled = "false";
            el.className = `equip-slot`;
            const icon = SLOT_DEFAULT_ICONS[slot] || '💍';
            el.innerHTML = badge + icon;
        }
    });

    const skillSlots = document.getElementById('char-skill-slots');
    skillSlots.innerHTML = '';
    // Determine how many skill slots to show (5 base, +1 if Black Market tier 2 unlocked)
    let maxSlots = ((globalProgression.blackMarketTier || 0) >= 2) ? 6 : 5;
    // Ensure equippedSkills array is large enough
    while (player.equippedSkills.length < maxSlots) player.equippedSkills.push(null);
    for (let i = 0; i < maxSlots; i++) {
        const sIdx = player.equippedSkills[i];
        const btn = document.createElement('button');
        if (i === 0) {
            // Slot 0 is locked — always shows base skill, not clickable
            const sInfo = sIdx !== null && sIdx !== undefined ? player.data.skills[sIdx] : null;
            btn.className = `p-1 rounded-lg font-bold text-white shadow-lg flex flex-col items-center justify-center ${SLOT_FIXED_COLORS[0] || 'bg-gray-700'} h-12 w-full text-[10px] truncate leading-tight relative`;
            btn.innerHTML = (sInfo ? sInfo.name : 'Base') + '<span class="absolute top-0.5 right-0.5 text-[8px] text-yellow-300">🔒</span>';
            btn.disabled = true;
            btn.title = 'This slot is locked and cannot be changed';
        } else if (sIdx === 'woh') {
            btn.className = `p-1 rounded-lg font-bold text-black shadow-lg active:scale-95 flex flex-col items-center justify-center bg-yellow-400 h-12 w-full text-[10px] truncate leading-tight`;
            btn.innerHTML = '☀️ WoH';
            btn.onclick = () => openSkillModal(i);
        } else if (sIdx !== null && sIdx !== undefined) {
            const sInfo = player.data.skills[sIdx];
            if (!sInfo) {
                btn.className = `p-1 rounded-lg font-bold text-gray-500 bg-gray-800 border-2 border-dashed border-gray-600 active:scale-95 flex items-center justify-center h-12 w-full text-xl`;
                btn.innerHTML = '+';
                btn.onclick = () => openSkillModal(i);
            } else {
                let slotColor = SLOT_FIXED_COLORS[i] || (i === 5 ? 'bg-purple-700' : 'bg-green-700');
                btn.className = `p-1 rounded-lg font-bold text-white shadow-lg active:scale-95 flex flex-col items-center justify-center ${slotColor} h-12 w-full text-[10px] truncate leading-tight`;
                btn.textContent = sInfo.name;
                btn.onclick = () => openSkillModal(i);
            }
        } else {
            btn.className = `p-1 rounded-lg font-bold text-gray-500 bg-gray-800 border-2 border-dashed border-gray-600 active:scale-95 flex items-center justify-center h-12 w-full text-xl`;
            btn.innerHTML = i === 5 ? '⚡' : '+';
            btn.onclick = () => openSkillModal(i);
        }
        skillSlots.appendChild(btn);
    }

    switchScreen('screen-character');
}

// ---------------------------------------------------------------------------
// Skill guide screen
// ---------------------------------------------------------------------------

/**
 * Renders the skill guide overlay for the player's current class and switches
 * to the skill-guide screen.
 * Shows all skills grouped by path (base, path 1, path 2) with lock state.
 */
function showSkillGuide() {
    const classNameEl = document.getElementById('skill-guide-class-name');
    if (classNameEl) classNameEl.textContent = `${player.data.name} — all skills for this class`;
    const list = document.getElementById('skill-guide-list');
    if (!list) return;
    list.innerHTML = '';
    const skills = player.data.skills;
    // Path labels: indices 0-2 base, 3-5 first path, 6-8 second path
    const pathLabels = ['Base Skills', 'Path 1 Skills', 'Path 2 Skills'];
    const sections = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
    sections.forEach((indices, sIdx) => {
        const header = document.createElement('div');
        header.className = 'text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-700 pb-1 mt-1';
        header.textContent = pathLabels[sIdx];
        list.appendChild(header);
        indices.forEach(idx => {
            if (idx >= skills.length) return;
            const skill = skills[idx];
            const isUnlocked = player.unlockedSkills.includes(idx);
            const lockIcon = isUnlocked ? '✅' : '🔒';
            const lockColor = isUnlocked ? 'text-green-400' : 'text-gray-500';
            const card = document.createElement('div');
            card.className = `rounded-xl p-3 border ${isUnlocked ? 'border-green-700 bg-gray-800' : 'border-gray-700 bg-gray-900 opacity-70'}`;
            const dmgParts = [];
            if (skill.mult !== undefined && skill.mult > 0) dmgParts.push(`<span class="bg-orange-900 text-orange-300 px-1 rounded">⚔️ ${Math.round(skill.mult * 100)}% Dmg</span>`);
            if (skill.hits && skill.hits > 1) dmgParts.push(`<span class="bg-gray-700 text-gray-300 px-1 rounded">x${skill.hits} hits</span>`);
            if (skill.target === 'all') dmgParts.push(`<span class="bg-blue-900 text-blue-300 px-1 rounded">ALL enemies</span>`);
            const dmgInfo = dmgParts.join(' ');
            const cdInfo = skill.cd > 0 ? `<span class="bg-gray-700 text-yellow-300 px-1 rounded">⏱ CD: ${skill.cd}t</span>` : `<span class="bg-green-900 text-green-300 px-1 rounded">No CD</span>`;
            card.innerHTML = `
                <div class="flex items-center justify-between mb-1">
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-white text-sm">${sanitizeHTML(skill.name)}</span>
                        <span class="text-xs font-bold ${lockColor}">${lockIcon}</span>
                    </div>
                    <div class="flex gap-1 flex-wrap justify-end text-[10px]">${cdInfo}${dmgInfo ? ' ' + dmgInfo : ''}</div>
                </div>
                <div class="text-[11px] text-gray-300">${sanitizeHTML(skill.desc)}</div>
            `;
            list.appendChild(card);
        });
    });
    switchScreen('screen-skill-guide');
}
