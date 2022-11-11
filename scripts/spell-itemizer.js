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
    const existingCopies = actor.items.filter(item => (item.getFlag(MODULE_ID, "isSpell") && item.name == copyName));
    if (existingCopies.length > 0) {
        // Only add to the first existing copy found
        await existingCopies[0].update({ ["system.quantity"]: existingCopies[0].system.quantity + 1 });
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
        let copy = await item.clone({ 
            "type": "consumable",
            "name": copyName,
            "system.consumableType": "potion",
            "flags.spell-itemizer-5e.isSpell": true, // todo: figure out how to make it use MODULE_ID
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

Hooks.on("dnd5e.restCompleted", (actor, result) => {
    if (result.longRest && actor.getFlag(MODULE_ID, "itemize")) {
        ClearItemized(actor);
    }
});

async function ClearItemized(actor) {
    const spellItems = actor.items.filter(item => item.getFlag(MODULE_ID, "isSpell")).map(item => item.id);
    if (spellItems.length > 0) {
        await actor.deleteEmbeddedDocuments("Item", spellItems);
        ui.notifications.info(game.i18n.localize(`${MODULE_ID}.clearMessage`));
    }
}