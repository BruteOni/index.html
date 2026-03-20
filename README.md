# Eternal Ascension: Way of the Hero

A single-page browser RPG / idle game featuring turn-based combat, class progression, equipment loot, skill trees, and more.

## How to Play

Open `index.html` in any modern browser — no installation or server required. Your progress is saved automatically in `localStorage`.

## Features

- **6 Playable Classes**: Warrior, Mage, Paladin, Ninja, Cleric, Archer — each with unique base attributes and weapons
- **Turn-Based Combat**: Battles with dodge, critical hits, armor pierce, counter-attacks, life steal, and reflect mechanics
- **13 Customizable Attributes**: Allocate stat points to tailor your hero (costs increase past 50 points per attribute)
- **Skill Tree**: 25-node linear progression with up to 6 equippable skill slots
- **5 Equipment Rarity Tiers**: Common → Rare → Epic → Legendary → Mythic, with class-specific set bonuses
- **Multiple Game Modes**: Normal, Quest, Training, Graveyard, Invasion, and Dungeons
- **Crafting Economy**: Alchemy (potions), Cooking (food buffs), Workshop (gear enhancement), Black Market
- **Pet System**: Find, collect, and battle pets with win-streak tracking
- **Energy System**: Regenerates 1 energy every 5 minutes; used to enter battles
- **Save / Export / Import**: Saves persist in `localStorage`; export your save as a text code to back it up

## File Structure

| File | Description |
|------|-------------|
| `index.html` | Main UI — all screens and modals |
| `styles.css` | Custom styles on top of Tailwind CSS |
| `game.js` | Core engine: save/load, audio, energy, progression, class system |
| `data.js` | Game constants: enemies, skills, items, recipes, set bonuses |
| `ui-combat.js` | Combat mechanics and battle UI |
| `ui-town.js` | Town hub: crafting, pets, dungeons, guilds |
| `ui-shop.js` | Shop, gambling, and Black Market |
| `ui-skills.js` | Skill tree and enhancements |
| `ui-equipment.js` | Equipment management and generation |
| `ui-attributes.js` | Attribute allocation system |
| `ui-character.js` | Character sheet display |
| `ui-inventory.js` | Inventory and combat bag |
| `ui-misc.js` | Progress menu, save export/import, Magical Enhancer |
| `skills-inject.js` | DOM setup for the skills grid |

