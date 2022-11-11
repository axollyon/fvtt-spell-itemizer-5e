import { MODULE_ID } from "./const.js";

Hooks.on("dnd5e.itemUsageConsumption", (item, config, options, usage) => {
    if (item.type != "spell" || item.system.level == 0) return true;
    else {
        const itemize = item.parent.getFlag(MODULE_ID, "itemize");
        if (!itemize) return true;
        else {
            Itemize(item, config, options, usage);
            return false;
        }
    }
});

async function Itemize(item, config, options, usage) {
    const actor = item.parent;

    // Commit pending data updates
    const { actorUpdates, itemUpdates, resourceUpdates } = usage;
    if ( !foundry.utils.isEmpty(itemUpdates) ) await item.update(itemUpdates);
    if ( config.consumeQuantity && (item.system.quantity === 0) ) await item.delete();
    if ( !foundry.utils.isEmpty(actorUpdates) ) await actor.update(actorUpdates);
    if ( resourceUpdates.length ) await actor.updateEmbeddedDocuments("Item", resourceUpdates);

    const copyName = `${item.name} ${item.labels.level}`;
    if (false) { // make it check if there's already an item with this name, and if so, increase the amount instead of adding a new one

    }
    else {
        let damage = item.system.damage.parts[0];
        let formula = "";
        let damageType = "";
        if (damage) {
            formula = damage[0];
            damageType = damage[1];
            formula = formula.replace("@mod", `${getProperty(actor, `system.abilities.${actor.system.attributes.spellcasting}.mod`)}`);
            const upcast = item.system.scaling.formula;
            if (upcast) {
                const extraDice = item.system.level - 1;
                for (let i = 0; i < extraDice; i++) {
                    formula += ` + ${upcast}`;
                }
            }
        }
        const flag = `flags.${MODULE_ID}.isSpell`;
        let copy = await item.clone({ 
            "type": "consumable",
            "name": copyName,
            "system.consumableType": "potion",
            flag: true,
            "system.uses": {
                "value": 1,
                "max": 1,
                "per": "charges",
                "recovery": '',
                "autoDestroy": true
            },
            "system.damage.parts": [[
                formula,
                damageType
            ]]
        });
        if (copy) item.parent.createEmbeddedDocuments('Item', [copy]);
    }


    ui.notifications.info(game.i18n.localize(`${MODULE_ID}.copyMessage`).replace("{copyName}", `${copyName}`))
}